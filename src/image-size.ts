/**
 * 이미지 헤더만 읽어 픽셀 크기를 구한다.
 *
 * 디코딩하지 않는다. Figma에서 뽑은 4320×2700 PNG 는 한 장이 10MB 에 이르고
 * 50장이면 400MB 가 넘는데, 비율 하나 알자고 전부 디코딩하면 브라우저가 죽는다.
 * 앞부분 몇십 바이트만 보면 되는 일이다.
 */

/** 이미지의 픽셀 크기. */
export interface ImageSize {
	width: number;
	height: number;
}

/** MIME 타입 → PPTX 안에서 쓸 확장자. */
const EXTENSION_BY_TYPE: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpeg',
	'image/jpg': 'jpeg',
	'image/gif': 'gif',
	'image/webp': 'webp'
};

/**
 * PPTX media 파트에 쓸 확장자를 정한다.
 *
 * @param type 파일의 MIME 타입.
 * @param name 파일명 (MIME 이 비어 있을 때의 폴백).
 * @returns 소문자 확장자. 알 수 없으면 null.
 */
export function mediaExtension(type: string, name: string): string | null {
	const byType = EXTENSION_BY_TYPE[type.toLowerCase()];
	if (byType !== undefined) return byType;

	const suffix = name.toLowerCase().split('.').pop() ?? '';
	if (suffix === 'jpg') return 'jpeg';
	return ['png', 'jpeg', 'gif', 'webp'].includes(suffix) ? suffix : null;
}

/**
 * 바이트에서 이미지 크기를 읽는다.
 *
 * PNG · JPEG · GIF · WebP 를 지원한다.
 *
 * @param bytes 파일 전체 또는 최소한 헤더를 포함한 앞부분.
 * @returns 크기. 형식을 못 알아보거나 헤더가 잘렸으면 null.
 */
export function readImageSize(bytes: Uint8Array): ImageSize | null {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	// PNG — 8바이트 시그니처 뒤 IHDR 청크에 크기가 있다.
	if (
		bytes.length >= 24 &&
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47
	) {
		return { width: view.getUint32(16), height: view.getUint32(20) };
	}

	// GIF — 헤더 6바이트 뒤 리틀엔디언 16비트 두 개.
	if (bytes.length >= 10 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
		return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
	}

	// WebP — RIFF 컨테이너. VP8 / VP8L / VP8X 세 갈래.
	if (
		bytes.length >= 30 &&
		bytes[0] === 0x52 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x46 &&
		bytes[8] === 0x57 &&
		bytes[9] === 0x45 &&
		bytes[10] === 0x42 &&
		bytes[11] === 0x50
	) {
		const format = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
		if (format === 'VP8 ') {
			return {
				width: view.getUint16(26, true) & 0x3fff,
				height: view.getUint16(28, true) & 0x3fff
			};
		}
		if (format === 'VP8L') {
			const bits = view.getUint32(21, true);
			return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
		}
		if (format === 'VP8X') {
			const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
			const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
			return { width, height };
		}
		return null;
	}

	// JPEG — SOF 마커를 만날 때까지 세그먼트를 건너뛴다.
	if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
		let offset = 2;
		while (offset + 9 < bytes.length) {
			if (bytes[offset] !== 0xff) {
				offset += 1;
				continue;
			}
			const marker = bytes[offset + 1];
			// SOF0~SOF15 중 DHT(c4)·JPG(c8)·DAC(cc) 를 제외한 것이 프레임 헤더다.
			if (
				marker >= 0xc0 &&
				marker <= 0xcf &&
				marker !== 0xc4 &&
				marker !== 0xc8 &&
				marker !== 0xcc
			) {
				return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) };
			}
			offset += 2 + view.getUint16(offset + 2);
		}
		return null;
	}

	return null;
}
