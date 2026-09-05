<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		/** 목록으로 돌아가는 경로. 껍데기가 정한다. 없으면 뒤로가기를 그리지 않는다. */
		backHref?: string;
		actions?: Snippet;
		children: Snippet;
	}

	let { title, description, backHref, actions, children }: Props = $props();
</script>

<!--
	스펙의 Sticky Mini-Nav 를 그대로 따른다 —
	흰 배경, 제품명 21px/600, 액션 링크 14px/400, 1px #d2d2d7 하단 헤어라인.
	그림자는 없다.
-->
<div class="tool-root shell">
	<header>
		<div class="bar">
			{#if backHref}
				<a class="back" href={backHref} aria-label="목록으로">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</a>
			{/if}
			<div class="titles">
				<h1>{title}</h1>
				{#if description}<p>{description}</p>{/if}
			</div>
			{#if actions}<div class="actions">{@render actions()}</div>{/if}
		</div>
	</header>

	<main>{@render children()}</main>
</div>

<style>
	.shell {
		min-height: 100vh;
	}

	header {
		background-color: var(--surface-panel);
		border-bottom: 1px solid var(--color-hairline);
	}

	.bar {
		display: flex;
		align-items: center;
		gap: var(--spacing-16);
		max-width: var(--page-max-width);
		margin: 0 auto;
		padding: var(--spacing-16) var(--spacing-24);
	}

	.back {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		color: var(--ink-muted);
		text-decoration: none;
	}

	.back svg {
		width: 20px;
		height: 20px;
	}

	.back:hover {
		color: var(--ink);
	}

	.titles {
		flex: 1;
		min-width: 0;
	}

	h1 {
		margin: 0;
		font-size: var(--text-subheading);
		line-height: var(--leading-subheading);
		letter-spacing: var(--tracking-subheading);
		font-weight: var(--weight-semibold);
		color: var(--ink);
	}

	p {
		margin: 2px 0 0;
		font-size: var(--text-body-sm);
		line-height: var(--leading-body-sm);
		letter-spacing: var(--tracking-body-sm);
		/* 부제는 300 — 스펙이 말하는 whisper-voice */
		font-weight: var(--weight-light);
		color: var(--ink-muted);
	}

	.actions {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: var(--spacing-8);
	}

	main {
		max-width: var(--page-max-width);
		margin: 0 auto;
		padding: var(--spacing-40) var(--spacing-24) var(--spacing-56);
	}
</style>
