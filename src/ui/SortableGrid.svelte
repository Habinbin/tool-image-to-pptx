<script lang="ts" generics="T extends { id: string }">
	import type { Snippet } from 'svelte';

	interface Props {
		items: T[];
		/** 재정렬 결과. 새 배열을 넘긴다 — 입력을 변형하지 않는다. */
		onreorder: (next: T[]) => void;
		/** 개별 제거. 없으면 제거 버튼을 그리지 않는다. */
		onremove?: (item: T) => void;
		/** 카드 본문. 항목과 1부터 시작하는 순번을 받는다. */
		item: Snippet<[T, number]>;
	}

	let { items, onreorder, onremove, item }: Props = $props();

	let draggingIndex = $state<number | null>(null);
	let overIndex = $state<number | null>(null);

	/**
	 * 끌어온 항목을 목표 위치로 옮긴 새 배열을 만든다.
	 *
	 * @param from 원래 인덱스.
	 * @param to 놓을 인덱스.
	 * @returns 재정렬된 새 배열.
	 */
	function move(from: number, to: number): T[] {
		const next = [...items];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		return next;
	}
</script>

<ul>
	{#each items as entry, index (entry.id)}
		<li
			draggable="true"
			class:over={overIndex === index && draggingIndex !== index}
			class:dragging={draggingIndex === index}
			ondragstart={() => (draggingIndex = index)}
			ondragend={() => {
				draggingIndex = null;
				overIndex = null;
			}}
			ondragover={(e) => {
				e.preventDefault();
				overIndex = index;
			}}
			ondrop={(e) => {
				e.preventDefault();
				if (draggingIndex !== null && draggingIndex !== index)
					onreorder(move(draggingIndex, index));
				draggingIndex = null;
				overIndex = null;
			}}
		>
			<div class="head">
				<!-- 순번은 태그다 — 알약 반경 -->
				<span class="ordinal">{index + 1}</span>
				{#if onremove}
					<button type="button" class="remove" aria-label="제거" onclick={() => onremove(entry)}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
						</svg>
					</button>
				{/if}
			</div>
			{@render item(entry, index + 1)}
		</li>
	{/each}
</ul>

<style>
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: var(--space-20);
	}

	/*
		카드는 8px 반경, 1px 헤어라인, 그림자 없음.
		이 시스템은 깊이를 그림자가 아니라 면의 색 차이로 만든다.
	*/
	li {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background-color: var(--surface);
		border: 1px solid var(--line);
		border-radius: var(--radius-control);
		transition:
			border-color 0.2s,
			opacity 0.2s;
	}

	li.over {
		border-color: var(--accent-hover);
	}

	li.dragging {
		opacity: 0.4;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-8) var(--space-12);
		border-bottom: 1px solid var(--line);
		cursor: grab;
	}

	.ordinal {
		border-radius: var(--radius-pill);
		background-color: var(--surface-sunken);
		padding: 2px var(--space-8);
		font-size: var(--text-caption);
		font-weight: 600;
		color: var(--ink-muted);
	}

	.remove {
		border: 0;
		background: transparent;
		border-radius: var(--radius-pill);
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		color: var(--ink-faint);
		cursor: pointer;
		opacity: 0;
		transition:
			opacity 0.2s,
			color 0.2s,
			background-color 0.2s;
	}

	.remove svg {
		width: 14px;
		height: 14px;
	}

	li:hover .remove,
	.remove:focus-visible {
		opacity: 1;
	}

	.remove:hover {
		background-color: var(--surface-sunken);
		color: var(--ink);
	}
</style>
