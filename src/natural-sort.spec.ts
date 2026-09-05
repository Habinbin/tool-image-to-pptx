import { describe, expect, it } from 'vitest';

import { compareNatural, sortByName } from './natural-sort';

describe('compareNatural', () => {
	it('숫자를 사전순이 아니라 값으로 비교한다', () => {
		expect(compareNatural('2.png', '10.png')).toBeLessThan(0);
	});

	it('같은 이름은 0이다', () => {
		expect(compareNatural('a.png', 'a.png')).toBe(0);
	});

	it('대소문자를 무시한다', () => {
		expect(compareNatural('Slide2.png', 'slide2.png')).toBe(0);
	});
});

describe('sortByName', () => {
	it('Figma 내보내기 번호 순서를 유지한다', () => {
		const files = [
			{ name: '10.png' },
			{ name: '2.png' },
			{ name: '0.png' },
			{ name: '1.png' },
			{ name: '8.png' }
		];
		expect(sortByName(files).map((f) => f.name)).toEqual([
			'0.png',
			'1.png',
			'2.png',
			'8.png',
			'10.png'
		]);
	});

	it('접두사가 있어도 번호로 정렬한다', () => {
		const files = [{ name: 'slide-11.png' }, { name: 'slide-2.png' }];
		expect(sortByName(files).map((f) => f.name)).toEqual(['slide-2.png', 'slide-11.png']);
	});

	it('입력 배열을 변형하지 않는다', () => {
		const files = [{ name: 'b.png' }, { name: 'a.png' }];
		sortByName(files);
		expect(files[0].name).toBe('b.png');
	});
});
