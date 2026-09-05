import type { ToolManifest } from '@betlab/toolkit-ui/tool';
import PresentationIcon from '@lucide/svelte/icons/presentation';

export const manifest: ToolManifest = {
	id: 'image-to-pptx',
	title: '이미지 → PPT',
	description:
		'이미지를 드롭하면 한 장씩 슬라이드에 꽉 채운 PPTX로 내보냅니다. 비율과 순서는 자동으로 잡습니다.',
	category: 'Document Tools',
	icon: PresentationIcon
};
