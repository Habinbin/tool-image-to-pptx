import { describe, expect, it } from 'vitest';

import { countOffRatio, outputFileName, referenceSize, type SlideEntry } from './slides';

const entry = (name: string, size: { width: number; height: number } | null): SlideEntry =>
	({ id: name, name, file: null as never, extension: 'png', size }) as SlideEntry;

describe('referenceSize', () => {
	it('크기를 읽은 첫 항목을 쓴다', () => {
		expect(referenceSize([entry('a', null), entry('b', { width: 16, height: 10 })])).toEqual({
			width: 16,
			height: 10
		});
	});

	it('손상된 첫 장이 기준을 망치지 않는다', () => {
		expect(referenceSize([entry('a', null)])).toBeNull();
	});
});

describe('countOffRatio', () => {
	it('기준과 같은 비율은 세지 않는다', () => {
		const entries = [entry('a', { width: 4320, height: 2700 })];
		expect(countOffRatio(entries, 1.6)).toBe(0);
	});

	it('다른 비율만 센다', () => {
		const entries = [
			entry('a', { width: 4320, height: 2700 }),
			entry('b', { width: 1920, height: 1080 }),
			entry('c', null)
		];
		expect(countOffRatio(entries, 1.6)).toBe(1);
	});
});

describe('outputFileName', () => {
	it('확장자를 붙인다', () => {
		expect(outputFileName('발표')).toBe('발표.pptx');
	});

	it('중복 확장자를 만들지 않는다', () => {
		expect(outputFileName('발표.pptx')).toBe('발표.pptx');
	});

	it('비면 기본값을 쓴다', () => {
		expect(outputFileName('   ')).toBe('slides.pptx');
	});

	it('파일명에 못 쓰는 문자를 지운다', () => {
		expect(outputFileName('a/b:c*d')).toBe('abcd.pptx');
	});
});
