/**
 * 슬라이드 비율 결정.
 *
 * 사용자에게 묻지 않고 첫 이미지에서 감지한다. 프리셋으로 덮어쓸 수 있다.
 * @tool-ux-principles §1
 */

import type { ImageSize } from './image-size';

/** 1인치의 EMU. OOXML 의 길이 단위. */
export const EMU_PER_INCH = 914_400;

/** 슬라이드 가로 — 프리셋·감지 모두 10인치로 고정하고 세로만 비율에 맞춘다. */
export const SLIDE_WIDTH_EMU = 10 * EMU_PER_INCH;

/** 고를 수 있는 비율 프리셋. */
export type AspectPreset = '16:10' | '16:9' | '4:3';

/** 슬라이드 한 장의 EMU 크기와 OOXML `sldSz@type`. */
export interface SlideSize {
	widthEmu: number;
	heightEmu: number;
	/** PowerPoint 가 아는 이름. 프리셋과 일치하지 않으면 undefined. */
	type?: 'screen16x10' | 'screen16x9' | 'screen4x3';
}

const PRESETS: Record<AspectPreset, SlideSize> = {
	'16:10': { widthEmu: SLIDE_WIDTH_EMU, heightEmu: 5_715_000, type: 'screen16x10' },
	'16:9': { widthEmu: SLIDE_WIDTH_EMU, heightEmu: 5_143_500, type: 'screen16x9' },
	'4:3': { widthEmu: SLIDE_WIDTH_EMU, heightEmu: 6_858_000, type: 'screen4x3' }
};

export const PRESET_ORDER: AspectPreset[] = ['16:10', '16:9', '4:3'];

/**
 * 프리셋의 슬라이드 크기를 돌려준다.
 *
 * @param preset 비율 프리셋.
 * @returns 해당 프리셋의 EMU 크기.
 */
export function slideSizeOf(preset: AspectPreset): SlideSize {
	return PRESETS[preset];
}

/**
 * 이미지 크기에서 가장 가까운 프리셋을 고른다.
 *
 * 1% 이내로 맞으면 그 프리셋으로 본다. Figma에서 16:10 으로 뽑은 4320×2700 은
 * 정확히 1.6 이므로 `16:10` 이 된다. 어느 프리셋과도 다르면 null 을 주고,
 * 호출자가 이미지 비율 그대로 슬라이드를 만든다.
 *
 * @param size 첫 이미지의 픽셀 크기.
 * @returns 맞는 프리셋. 없으면 null.
 */
export function detectPreset(size: ImageSize): AspectPreset | null {
	if (size.height <= 0) return null;
	const ratio = size.width / size.height;
	for (const preset of PRESET_ORDER) {
		const { widthEmu, heightEmu } = PRESETS[preset];
		if (Math.abs(ratio - widthEmu / heightEmu) / (widthEmu / heightEmu) < 0.01) return preset;
	}
	return null;
}

/**
 * 이미지 비율을 그대로 쓰는 슬라이드 크기를 만든다.
 *
 * 프리셋에 없는 비율(예: 세로형 포스터)로 작업할 때 쓴다.
 *
 * @param size 기준 이미지의 픽셀 크기.
 * @returns 가로 10인치, 세로는 비율에 맞춘 크기.
 */
export function slideSizeFromImage(size: ImageSize): SlideSize {
	if (size.width <= 0 || size.height <= 0) return PRESETS['16:10'];
	return {
		widthEmu: SLIDE_WIDTH_EMU,
		heightEmu: Math.round((SLIDE_WIDTH_EMU * size.height) / size.width)
	};
}
