import { readFileSync } from 'node:fs';

import JSZip from 'jszip';
import { beforeAll, describe, expect, it } from 'vitest';

import { slideSizeOf } from './aspect';
import { buildPptx, type SlideImage } from './pptx';

const SAMPLE_DIR = '/home/habin/codes/toolbox/temp';
const NAMES = ['0.png', '1.png', '2.png', '3.png', '4.png', '5.png', '6.png', '7.png', '8.png'];

const SIZE = slideSizeOf('16:10');

let images: SlideImage[];
let zip: JSZip;

/** 1×1 투명 PNG. 압축 경로를 타지 않고 구조만 검사할 때 쓴다. */
const TINY_PNG = new Uint8Array(
	Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
		'base64'
	)
);
const tiny = (count: number): SlideImage[] =>
	Array.from({ length: count }, () => ({ bytes: TINY_PNG, extension: 'png' }));

beforeAll(async () => {
	images = NAMES.map((name) => ({
		bytes: new Uint8Array(readFileSync(`${SAMPLE_DIR}/${name}`)),
		extension: 'png'
	}));
	const blob = await buildPptx(images, { size: SIZE, title: 'Openlab' });
	zip = await JSZip.loadAsync(await blob.arrayBuffer());
}, 120_000);

describe('buildPptx', () => {
	it('슬라이드 수가 입력 이미지 수와 같다', () => {
		const slides = Object.keys(zip.files).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p));
		expect(slides).toHaveLength(NAMES.length);
	});

	it('presentation.xml 이 모든 슬라이드를 순서대로 참조한다', async () => {
		const xml = await zip.file('ppt/presentation.xml')!.async('string');
		const ids = [...xml.matchAll(/<p:sldId id="\d+" r:id="(rId\d+)"\/>/g)].map((m) => m[1]);
		expect(ids).toEqual(['rId3', 'rId4', 'rId5', 'rId6', 'rId7', 'rId8', 'rId9', 'rId10', 'rId11']);
	});

	it('슬라이드 크기가 사용자의 기존 PPT 와 같다', async () => {
		const xml = await zip.file('ppt/presentation.xml')!.async('string');
		expect(xml).toContain('<p:sldSz cx="9144000" cy="5715000" type="screen16x10"/>');
	});

	it('각 이미지가 슬라이드를 정확히 채운다 — 여백 0, 잘림 0', async () => {
		for (let n = 1; n <= NAMES.length; n += 1) {
			const xml = await zip.file(`ppt/slides/slide${n}.xml`)!.async('string');
			expect(xml).toContain('<a:off x="0" y="0"/>');
			expect(xml).toContain(`<a:ext cx="${SIZE.widthEmu}" cy="${SIZE.heightEmu}"/>`);
		}
	});

	it('슬라이드마다 자기 이미지를 참조한다', async () => {
		for (let n = 1; n <= NAMES.length; n += 1) {
			const rels = await zip.file(`ppt/slides/_rels/slide${n}.xml.rels`)!.async('string');
			expect(rels).toContain(`Target="../media/image${n}.png"`);
		}
	});

	it('원본 바이트를 그대로 보존한다 — 재인코딩하지 않는다', async () => {
		for (let n = 1; n <= NAMES.length; n += 1) {
			const stored = await zip.file(`ppt/media/image${n}.png`)!.async('uint8array');
			expect(stored).toEqual(images[n - 1].bytes);
		}
	}, 60_000);

	it('PowerPoint 가 요구하는 파트가 전부 있다', () => {
		for (const part of [
			'[Content_Types].xml',
			'_rels/.rels',
			'ppt/presentation.xml',
			'ppt/_rels/presentation.xml.rels',
			'ppt/slideMasters/slideMaster1.xml',
			'ppt/slideMasters/_rels/slideMaster1.xml.rels',
			'ppt/slideLayouts/slideLayout1.xml',
			'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
			'ppt/theme/theme1.xml',
			'docProps/core.xml',
			'docProps/app.xml'
		]) {
			expect(zip.file(part), `${part} 가 없다`).not.toBeNull();
		}
	});

	it('Content_Types 가 모든 슬라이드와 이미지 확장자를 선언한다', async () => {
		const xml = await zip.file('[Content_Types].xml')!.async('string');
		expect(xml).toContain('<Default Extension="png" ContentType="image/png"/>');
		for (let n = 1; n <= NAMES.length; n += 1) {
			expect(xml).toContain(`PartName="/ppt/slides/slide${n}.xml"`);
		}
	});

	it('진행률을 슬라이드마다 보고한다', async () => {
		const seen: number[] = [];
		await buildPptx(tiny(3), {
			size: SIZE,
			onProgress: (done, total) => {
				expect(total).toBe(3);
				seen.push(done);
			}
		});
		expect(seen).toEqual([1, 2, 3]);
	});

	it('여러 확장자가 섞여도 각각 선언한다', async () => {
		const mixed: SlideImage[] = [
			{ bytes: TINY_PNG, extension: 'png' },
			{ bytes: new Uint8Array([0xff, 0xd8, 0xff]), extension: 'jpeg' }
		];
		const blob = await buildPptx(mixed, { size: SIZE });
		const built = await JSZip.loadAsync(await blob.arrayBuffer());
		const xml = await built.file('[Content_Types].xml')!.async('string');
		expect(xml).toContain('Extension="png"');
		expect(xml).toContain('Extension="jpeg"');
		expect(built.file('ppt/media/image2.jpeg')).not.toBeNull();
	});

	it('이미지가 없으면 거부한다', async () => {
		await expect(buildPptx([], { size: SIZE })).rejects.toThrow('이미지가 없습니다');
	});

	it('제목의 XML 특수문자를 이스케이프한다', async () => {
		const blob = await buildPptx(tiny(1), { size: SIZE, title: 'A & B <live>' });
		const built = await JSZip.loadAsync(await blob.arrayBuffer());
		const xml = await built.file('docProps/core.xml')!.async('string');
		expect(xml).toContain('<dc:title>A &amp; B &lt;live&gt;</dc:title>');
	});
});
