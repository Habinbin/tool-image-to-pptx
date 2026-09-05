import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { mediaExtension, readImageSize } from './image-size';

/** repo 안 픽스처. 테스트는 이 체크아웃 밖의 무엇에도 기대지 않는다. */
const SAMPLE = new URL('./fixtures/0.png', import.meta.url).pathname;
const WIDE = new URL('./fixtures/wide-16x9.png', import.meta.url).pathname;

describe('readImageSize', () => {
	it('PNG 크기를 읽는다', () => {
		const bytes = new Uint8Array(readFileSync(SAMPLE));
		expect(readImageSize(bytes)).toEqual({ width: 320, height: 200 });
	});

	it('헤더만으로 읽는다 — 전체를 넘기지 않아도 된다', () => {
		const head = new Uint8Array(readFileSync(SAMPLE)).slice(0, 64);
		expect(readImageSize(head)).toEqual({ width: 320, height: 200 });
	});

	it('비율이 다른 이미지도 읽는다', () => {
		const bytes = new Uint8Array(readFileSync(WIDE));
		expect(readImageSize(bytes)).toEqual({ width: 320, height: 180 });
	});

	it('GIF 크기를 읽는다', () => {
		const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x40, 0x01, 0xf0, 0x00]);
		expect(readImageSize(gif)).toEqual({ width: 320, height: 240 });
	});

	it('알 수 없는 형식은 null 이다', () => {
		expect(readImageSize(new Uint8Array([1, 2, 3, 4]))).toBeNull();
	});

	it('잘린 헤더에서 죽지 않는다', () => {
		expect(readImageSize(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
	});
});

describe('mediaExtension', () => {
	it('MIME 을 우선한다', () => {
		expect(mediaExtension('image/png', 'a.bin')).toBe('png');
	});

	it('jpg 를 jpeg 로 정규화한다', () => {
		expect(mediaExtension('image/jpg', 'a.jpg')).toBe('jpeg');
		expect(mediaExtension('', 'a.JPG')).toBe('jpeg');
	});

	it('MIME 이 비면 확장자로 폴백한다', () => {
		expect(mediaExtension('', 'a.webp')).toBe('webp');
	});

	it('지원하지 않는 형식은 null 이다', () => {
		expect(mediaExtension('application/pdf', 'a.pdf')).toBeNull();
	});
});
