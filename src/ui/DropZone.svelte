<script lang="ts">
	interface Props {
		accept?: string;
		multiple?: boolean;
		/** 목록이 이미 있을 때 쓰는 좁은 형태. */
		compact?: boolean;
		label?: string;
		hint?: string;
		onfiles: (files: File[]) => void;
	}

	let {
		accept,
		multiple = true,
		compact = false,
		label = '파일을 여기에 놓으세요',
		hint,
		onfiles
	}: Props = $props();

	let dragging = $state(false);
	let input: HTMLInputElement;

	/**
	 * 드롭·선택된 파일을 상위로 넘긴다.
	 *
	 * @param list 브라우저가 준 FileList. 비어 있으면 아무것도 하지 않는다.
	 */
	function emit(list: FileList | null): void {
		if (list === null || list.length === 0) return;
		onfiles(Array.from(list));
	}
</script>

<div
	role="presentation"
	class="wrap"
	class:compact
	ondragover={(e: DragEvent) => {
		e.preventDefault();
		dragging = true;
	}}
	ondragleave={() => (dragging = false)}
	ondrop={(e: DragEvent) => {
		e.preventDefault();
		dragging = false;
		emit(e.dataTransfer?.files ?? null);
	}}
>
	<input
		bind:this={input}
		type="file"
		{accept}
		{multiple}
		hidden
		onchange={(e) => {
			emit(e.currentTarget.files);
			e.currentTarget.value = '';
		}}
	/>

	<button type="button" class="zone" class:dragging onclick={() => input.click()}>
		<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
			<path
				d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
		<span class="label">{label}</span>
	</button>
	{#if hint && !compact}<p class="hint">{hint}</p>{/if}
</div>

<style>
	/*
		드롭 영역에 테두리나 색 면을 두르지 않는다. 파일은 이 화면 어디에 놓아도
		받으므로, 네모를 그려 놓으면 "저 안에만 놓아야 한다"고 잘못 읽힌다.
		남기는 것은 무엇을 하면 되는지 알려주는 버튼 하나뿐이다.
	*/
	.wrap {
		display: flex;
		width: 100%;
		flex-direction: column;
		align-items: center;
		gap: var(--space-12);
	}

	.wrap.compact {
		align-items: stretch;
	}

	/* 주 행동이므로 채운 버튼 — 배경은 잉크, 글자는 그 위에 음각처럼 뚫린다. */
	.zone {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-8);
		padding: var(--space-12) var(--space-24);
		border: 1px solid transparent;
		border-radius: var(--radius-control);
		background-color: var(--accent);
		color: var(--on-accent);
		font-family: var(--font);
		font-size: var(--text-body);
		font-weight: 600;
		cursor: pointer;
		transition:
			background-color 0.2s,
			border-color 0.2s,
			color 0.2s;
	}

	.zone:hover,
	.zone.dragging {
		background-color: var(--accent-hover);
	}

	/* 목록이 이미 있을 때의 보조 행동. 검은 버튼이 둘이면 무엇이 주인지 흐려진다. */
	.compact .zone {
		width: 100%;
		padding: var(--space-8) var(--space-16);
		border-color: var(--line-strong);
		background-color: transparent;
		color: var(--ink-muted);
		font-size: var(--text-body-sm);
		font-weight: 500;
	}

	.compact .zone:hover,
	.compact .zone.dragging {
		border-color: var(--accent);
		background-color: transparent;
		color: var(--ink);
	}

	.icon {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
	}

	.hint {
		margin: 0;
		max-width: 56ch;
		text-align: center;
		font-size: var(--text-body-sm);
		color: var(--ink-muted);
	}
</style>
