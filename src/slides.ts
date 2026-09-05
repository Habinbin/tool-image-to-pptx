/**
 * 화면이 다루는 슬라이드 목록 상태의 순수 부분.
 *
 * DOM 없이 테스트할 수 있도록 Svelte 밖에 둔다.
 */

import { mediaExtension, readImageSize, type ImageSize } from './image-size';
import { sortByName } from './natural-sort';

/** 목록에 올라간 이미지 한 장. */
export interface SlideEntry {
	/** `SortableGrid` 가 요구하는 안정적인 키. */
	id: string;
	name: string;
	file: File;
	/** PPTX media 파트 확장자. */
	extension: string;
	/** 헤더에서 읽은 픽셀 크기. 못 읽었으면 null. */
	size: ImageSize | null;
}

/** {@link acceptFiles} 의 결과. */
export interface AcceptResult {
	entries: SlideEntry[];
	/** 이미지가 아니라서 제외된 파일명들. */
	rejected: string[];
}

/** 헤더를 읽기 위해 앞에서 잘라낼 바이트 수. 어떤 형식이든 이보다 훨씬 앞에 크기가 있다. */
const HEADER_BYTES = 65_536;

/**
 * 드롭된 파일을 슬라이드 항목으로 바꾼다.
 *
 * 이미지가 아닌 파일은 조용히 버리지 않고 `rejected` 로 돌려준다 —
 * 사용자가 무엇이 빠졌는지 알아야 한다.
 *
 * 크기는 헤더 앞부분만 읽어서 구한다. 원본을 디코딩하지 않으므로
 * 4320×2700 짜리 수십 장을 넣어도 메모리가 터지지 않는다.
 *
 * @param files 드롭·선택된 파일들.
 * @param idPrefix 항목 id 접두사. 호출마다 다른 값을 줘야 키가 겹치지 않는다.
 * @returns 받아들인 항목과 거부된 파일명.
 */
export async function acceptFiles(files: File[], idPrefix: string): Promise<AcceptResult> {
	const entries: SlideEntry[] = [];
	const rejected: string[] = [];

	for (const [index, file] of files.entries()) {
		const extension = mediaExtension(file.type, file.name);
		if (extension === null) {
			rejected.push(file.name);
			continue;
		}
		const head = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer());
		entries.push({
			id: `${idPrefix}-${index}`,
			name: file.name,
			file,
			extension,
			size: readImageSize(head)
		});
	}

	return { entries: sortByName(entries), rejected };
}

/**
 * 비율 감지의 기준이 될 첫 이미지 크기를 고른다.
 *
 * 크기를 읽지 못한 항목은 건너뛴다 — 손상된 첫 장 하나가 전체 비율을 망치지 않는다.
 *
 * @param entries 슬라이드 목록.
 * @returns 기준 크기. 읽을 수 있는 항목이 하나도 없으면 null.
 */
export function referenceSize(entries: readonly SlideEntry[]): ImageSize | null {
	return entries.find((e) => e.size !== null)?.size ?? null;
}

/**
 * 기준과 다른 비율을 가진 항목 수를 센다.
 *
 * 슬라이드 크기는 하나로 고정되므로, 비율이 다른 이미지는 늘어나 보인다.
 * 내보내기 전에 그 사실을 알려주기 위한 값이다.
 *
 * @param entries 슬라이드 목록.
 * @param slideRatio 슬라이드의 가로/세로 비율.
 * @returns 1% 이상 어긋나는 항목 수.
 */
export function countOffRatio(entries: readonly SlideEntry[], slideRatio: number): number {
	return entries.filter((e) => {
		if (e.size === null || e.size.height === 0) return false;
		return Math.abs(e.size.width / e.size.height - slideRatio) / slideRatio >= 0.01;
	}).length;
}

/**
 * 내보낼 파일명을 만든다.
 *
 * @param raw 사용자가 입력한 이름. 비어 있으면 기본값을 쓴다.
 * @returns `.pptx` 로 끝나는 안전한 파일명.
 */
export function outputFileName(raw: string): string {
	const trimmed = raw
		.trim()
		.replace(/[\\/:*?"<>|]/g, '')
		.replace(/\.pptx$/i, '');
	return `${trimmed === '' ? 'slides' : trimmed}.pptx`;
}
