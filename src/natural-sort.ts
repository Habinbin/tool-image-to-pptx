/**
 * 파일명을 사람이 기대하는 순서로 정렬한다.
 *
 * 사전순은 `10.png` 을 `2.png` 앞에 놓는다. 사용자는 Figma에서 `0`~`8` 처럼
 * 번호를 매겨 내보내므로, 숫자 구간을 숫자로 비교해야 한다.
 */

const SEGMENT = /(\d+)|(\D+)/g;

/**
 * 이름을 숫자·비숫자 구간으로 쪼갠다.
 *
 * @param name 파일명.
 * @returns 숫자 구간은 number, 나머지는 소문자 string 인 배열.
 */
function segments(name: string): (number | string)[] {
	const out: (number | string)[] = [];
	for (const match of name.matchAll(SEGMENT)) {
		out.push(match[1] !== undefined ? Number(match[1]) : match[0].toLowerCase());
	}
	return out;
}

/**
 * 두 파일명을 자연 순서로 비교한다.
 *
 * @param a 왼쪽 파일명.
 * @param b 오른쪽 파일명.
 * @returns `Array.prototype.sort` 규약에 맞는 음수/0/양수.
 */
export function compareNatural(a: string, b: string): number {
	const left = segments(a);
	const right = segments(b);

	for (let i = 0; i < Math.min(left.length, right.length); i += 1) {
		const l = left[i];
		const r = right[i];
		if (l === r) continue;
		if (typeof l === 'number' && typeof r === 'number') return l - r;
		// 숫자 구간이 문자 구간보다 앞선다 — `1a` 가 `a1` 앞에 온다.
		if (typeof l === 'number') return -1;
		if (typeof r === 'number') return 1;
		return l < r ? -1 : 1;
	}
	return left.length - right.length;
}

/**
 * 파일 목록을 이름 기준 자연 순서로 정렬한 새 배열을 만든다.
 *
 * @param files 정렬할 항목들. `name` 을 가진 무엇이든 된다.
 * @returns 정렬된 새 배열. 입력은 변형하지 않는다.
 */
export function sortByName<T extends { name: string }>(files: readonly T[]): T[] {
	return [...files].sort((a, b) => compareNatural(a.name, b.name));
}
