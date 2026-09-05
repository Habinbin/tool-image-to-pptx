import { describe, expect, it } from 'vitest';

import { detectPreset, slideSizeFromImage, slideSizeOf } from './aspect';

describe('detectPreset', () => {
	it('Figma 16:10 내보내기(4320×2700)를 16:10 으로 본다', () => {
		expect(detectPreset({ width: 4320, height: 2700 })).toBe('16:10');
	});

	it('1920×1080 을 16:9 로 본다', () => {
		expect(detectPreset({ width: 1920, height: 1080 })).toBe('16:9');
	});

	it('1024×768 을 4:3 으로 본다', () => {
		expect(detectPreset({ width: 1024, height: 768 })).toBe('4:3');
	});

	it('프리셋에 없는 비율은 null 이다', () => {
		expect(detectPreset({ width: 1000, height: 1000 })).toBeNull();
	});

	it('높이가 0이면 null 이다', () => {
		expect(detectPreset({ width: 100, height: 0 })).toBeNull();
	});
});

describe('slideSizeOf', () => {
	it('16:10 이 사용자의 기존 PPT 와 같은 EMU 를 낸다', () => {
		// temp/Openlab.pptx 의 <p:sldSz cx="9144000" cy="5715000" type="screen16x10"/>
		expect(slideSizeOf('16:10')).toEqual({
			widthEmu: 9_144_000,
			heightEmu: 5_715_000,
			type: 'screen16x10'
		});
	});
});

describe('slideSizeFromImage', () => {
	it('프리셋 밖 비율을 그대로 옮긴다', () => {
		const size = slideSizeFromImage({ width: 1000, height: 2000 });
		expect(size.widthEmu).toBe(9_144_000);
		expect(size.heightEmu).toBe(18_288_000);
		expect(size.type).toBeUndefined();
	});
});
