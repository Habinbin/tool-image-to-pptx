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
	/**
	 * 놓일 자리. 카드가 아니라 **카드 사이의 틈**을 가리킨다 —
	 * 0 은 맨 앞, items.length 는 맨 뒤. 그래서 화면의 삽입선과 1:1로 맞는다.
	 */
	let dropIndex = $state<number | null>(null);

	/**
	 * 포인터가 카드의 어느 쪽 절반에 있는지로 삽입할 틈을 정한다.
	 *
	 * @param event 카드 위에서 발생한 dragover.
	 * @param index 그 카드의 인덱스.
	 * @returns 삽입할 틈의 인덱스.
	 */
	function gapFrom(event: DragEvent, index: number): number {
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		return event.clientX < rect.left + rect.width / 2 ? index : index + 1;
	}

	/**
	 * 그 틈에 놓아도 순서가 그대로인지. 끌고 있는 카드의 양옆 틈이 여기 해당한다.
	 *
	 * @param gap 삽입할 틈의 인덱스.
	 * @returns 결과가 같으면 true.
	 */
	function isNoop(gap: number): boolean {
		return draggingIndex !== null && (gap === draggingIndex || gap === draggingIndex + 1);
	}

	/**
	 * 끌어온 항목을 틈으로 옮긴 새 배열을 만든다.
	 *
	 * 먼저 빼내면 뒤쪽 인덱스가 하나씩 당겨지므로, 뒤로 보낼 때는 1을 뺀다.
	 *
	 * @param from 원래 인덱스.
	 * @param gap 놓을 틈의 인덱스.
	 * @returns 재정렬된 새 배열.
	 */
	function move(from: number, gap: number): T[] {
		const next = [...items];
		const [moved] = next.splice(from, 1);
		next.splice(gap > from ? gap - 1 : gap, 0, moved);
		return next;
	}

	function reset(): void {
		draggingIndex = null;
		dropIndex = null;
	}

	function drop(): void {
		if (draggingIndex !== null && dropIndex !== null && !isNoop(dropIndex)) {
			onreorder(move(draggingIndex, dropIndex));
		}
		reset();
	}
</script>

<ul>
	{#each items as entry, index (entry.id)}
		<li
			draggable="true"
			class:dragging={draggingIndex === index}
			ondragstart={() => (draggingIndex = index)}
			ondragend={reset}
			ondragover={(e) => {
				e.preventDefault();
				dropIndex = gapFrom(e, index);
			}}
			ondrop={(e) => {
				e.preventDefault();
				drop();
			}}
		>
			<!--
				놓일 자리를 카드 사이 틈에 세로 막대로 보여준다. 카드 테두리만 밝히면
				"이 카드와 바꾸는 것"인지 "이 카드 앞에 끼우는 것"인지 알 수 없다.
			-->
			{#if dropIndex === index && !isNoop(index)}
				<span class="marker before" aria-hidden="true"></span>
			{/if}
			{#if dropIndex === index + 1 && index === items.length - 1 && !isNoop(index + 1)}
				<span class="marker after" aria-hidden="true"></span>
			{/if}

			<div class="card">
				<div class="head">
					<!-- 순번은 태그다 — 알약 반경 -->
					<span class="seq">{index + 1}</span>
					{#if onremove}
						<button type="button" class="remove" aria-label="제거" onclick={() => onremove(entry)}>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
							</svg>
						</button>
					{/if}
				</div>
				{@render item(entry, index + 1)}
			</div>
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

	/* 삽입선이 카드 밖(틈)에 그려지므로 li 는 자르지 않는다. 자르기는 .card 의 몫. */
	li {
		position: relative;
		display: flex;
		cursor: grab;
		transition: opacity 0.2s;
	}

	li:active {
		cursor: grabbing;
	}

	li.dragging {
		opacity: 0.4;
	}

	/*
		카드는 8px 반경, 1px 헤어라인, 그림자 없음.
		이 시스템은 깊이를 그림자가 아니라 면의 색 차이로 만든다.
	*/
	.card {
		display: flex;
		width: 100%;
		flex-direction: column;
		overflow: hidden;
		background-color: var(--surface);
		border: 1px solid var(--line);
		border-radius: var(--radius-control);
	}

	/* 틈(--space-20) 한가운데에 세운다. 카드에 붙이면 어느 쪽 자리인지 헷갈린다. */
	.marker {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		border-radius: var(--radius-pill);
		background-color: var(--accent);
	}

	.marker.before {
		left: calc(-1 * var(--space-20) / 2 - 1px);
	}

	.marker.after {
		right: calc(-1 * var(--space-20) / 2 - 1px);
	}

	/*
		순번 줄은 얇게. 이미지가 주인공이고 순번은 위치를 확인하는 표식일 뿐이라,
		띠가 두꺼우면 카드마다 눈이 한 번씩 걸린다.
	*/
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 24px;
		padding: 0 var(--space-8);
		border-bottom: 1px solid var(--line);
	}

	.seq {
		font-size: var(--text-caption);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--ink-faint);
	}

	.remove {
		border: 0;
		background: transparent;
		border-radius: var(--radius-pill);
		display: grid;
		place-items: center;
		width: 18px;
		height: 18px;
		color: var(--ink-faint);
		cursor: pointer;
		opacity: 0;
		transition:
			opacity 0.2s,
			color 0.2s,
			background-color 0.2s;
	}

	.remove svg {
		width: 12px;
		height: 12px;
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
