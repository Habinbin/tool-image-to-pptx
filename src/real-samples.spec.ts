/**
 * 실제 Figma 내보내기로 도는 옵트인 검증.
 *
 * 기본 테스트는 repo 안 작은 픽스처만 쓴다 — 어디서 clone 해도 돌아야 하기 때문이다.
 * 하지만 이 툴이 실제로 감당해야 하는 것은 4320×2700 짜리 수십 장(수백 MB)이고,
 * 그건 작은 픽스처로 확인되지 않는다. 그래서 샘플 폴더를 가진 사람만 돌린다.
 *
 * ```sh
 * REAL_SAMPLES_DIR=/path/to/figma/exports pnpm test
 * ```
 */

import { readFileSync, readdirSync } from 'node:fs';

import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { detectPreset, slideSizeOf } from './aspect';
import { readImageSize } from './image-size';
import { sortByName } from './natural-sort';
import { buildPptx, type SlideImage } from './pptx';

const DIR = process.env.REAL_SAMPLES_DIR;

describe.skipIf(DIR === undefined)('실제 샘플', () => {
	it('큰 이미지 묶음을 원본 그대로 담고 비율을 맞춘다', async () => {
		const names = sortByName(
			readdirSync(DIR!)
				.filter((n) => /\.(png|jpe?g)$/i.test(n))
				.map((name) => ({ name }))
		).map((f) => f.name);
		expect(names.length).toBeGreaterThan(0);

		const images: SlideImage[] = names.map((name) => ({
			bytes: new Uint8Array(readFileSync(`${DIR}/${name}`)),
			extension: name.toLowerCase().endsWith('.png') ? 'png' : 'jpeg'
		}));
		const totalBytes = images.reduce((sum, i) => sum + i.bytes.length, 0);

		const first = readImageSize(images[0].bytes);
		expect(first).not.toBeNull();
		const size = slideSizeOf(detectPreset(first!) ?? '16:10');

		const started = performance.now();
		const blob = await buildPptx(images, { size });
		const elapsed = performance.now() - started;

		const zip = await JSZip.loadAsync(await blob.arrayBuffer());
		const slides = Object.keys(zip.files).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p));
		expect(slides).toHaveLength(images.length);

		// 재인코딩하지 않으므로 출력은 입력 총량보다 유의미하게 커지지 않는다.
		expect(blob.size).toBeGreaterThan(totalBytes);
		expect(blob.size).toBeLessThan(totalBytes * 1.05);

		console.log(
			`실제 샘플 ${images.length}장 / ${(totalBytes / 1024 / 1024).toFixed(1)}MB → ` +
				`${elapsed.toFixed(0)}ms, 출력 ${(blob.size / 1024 / 1024).toFixed(1)}MB`
		);
	}, 120_000);
});
