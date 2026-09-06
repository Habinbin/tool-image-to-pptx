import PresentationIcon from '@lucide/svelte/icons/presentation';

/**
 * 런처와 헤더에 쓰이는 메타데이터.
 *
 * 제목·설명은 호스트가 헤더를 그릴 때도 여기서 가져간다 — 두 번 적지 않는다.
 * 타입을 공유 패키지에서 가져오지 않는다: 이 툴은 자립해야 하고,
 * 호스트가 자기 `ToolManifest` 로 구조적으로 검사한다.
 */
export const manifest = {
	id: 'image-to-pptx',
	title: 'PNG to PPT',
	description:
		'이미지를 드롭하면 한 장씩 슬라이드에 꽉 채운 PPTX로 내보냅니다. 비율과 순서는 자동으로 잡습니다.',
	category: '문서 도구',
	icon: PresentationIcon,
	/** 'embed' — 툴박스 안 라우트로 렌더한다. @standalone-tool-deployment */
	surface: 'embed' as const
};
