<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	/**
	 * 스펙의 액션 셋. filled 는 파랑 하나, outlined 는 그 짝, ghost 는 인라인 링크.
	 * filled 둘을 나란히 쌓지 않는다 — 스펙의 Do 항목.
	 */
	type Variant = 'filled' | 'outlined' | 'ghost';

	interface Props extends HTMLButtonAttributes {
		variant?: Variant;
		/** 작은 컨트롤용. 서비스 카드의 알약 버튼 크기(14px)에 해당한다. */
		compact?: boolean;
		children: Snippet;
	}

	let { variant = 'outlined', compact = false, children, ...rest }: Props = $props();
</script>

<button class="btn {variant}" class:compact {...rest}>
	{@render children()}
</button>

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-8);
		/* 알약은 이 시스템에서 협상 대상이 아니다. */
		border-radius: var(--radius-pill);
		padding: 11px 15px;
		font-family: var(--font-text);
		font-size: var(--text-body);
		line-height: 1.2;
		letter-spacing: var(--tracking-body);
		font-weight: var(--weight-regular);
		border: 1px solid transparent;
		cursor: pointer;
		transition:
			background-color 0.2s,
			border-color 0.2s,
			opacity 0.2s;
	}

	.btn.compact {
		padding: 8px 15px;
		font-size: var(--text-body-sm);
		letter-spacing: var(--tracking-body-sm);
	}

	.btn:disabled {
		cursor: not-allowed;
		opacity: 0.4;
	}

	.filled {
		background-color: var(--color-apple-blue);
		color: var(--ink-on-accent);
	}

	.filled:hover:not(:disabled) {
		background-color: var(--color-link-blue);
	}

	.outlined {
		background-color: transparent;
		border-color: var(--color-link-blue);
		color: var(--color-link-blue);
	}

	.outlined:hover:not(:disabled) {
		background-color: color-mix(in srgb, var(--color-link-blue) 6%, transparent);
	}

	.ghost {
		background-color: transparent;
		color: var(--color-link-blue);
		padding: var(--spacing-4) var(--spacing-8);
	}

	.ghost:hover:not(:disabled) {
		text-decoration: underline;
	}
</style>
