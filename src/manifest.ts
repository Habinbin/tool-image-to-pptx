import PresentationIcon from '@lucide/svelte/icons/presentation';

/**
 * 런처 카드 메타데이터.
 *
 * 타입을 공유 패키지에서 가져오지 않는다 — 이 툴은 자립해야 한다.
 * 껍데기(toolbox)가 자기 `ToolManifest` 로 이 객체를 구조적으로 검사한다.
 */
export const manifest = {
	id: 'image-to-pptx',
	title: 'Images to PPTX',
	description:
		'Drop images and export a PPTX with one full-bleed slide per image. Ratio and order are detected automatically.',
	category: 'Document Tools',
	icon: PresentationIcon,
	/** 'embed' — 툴박스 안 라우트로 렌더한다. @standalone-tool-deployment */
	surface: 'embed' as const
};
