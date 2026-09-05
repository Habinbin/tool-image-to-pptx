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
		label = 'Drop files here',
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
		{#if !compact}
			<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path
					d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		{/if}
		<span class="label">{label}</span>
		{#if hint && !compact}<span class="hint">{hint}</span>{/if}
	</button>
</div>

<style>
	.wrap {
		width: 100%;
	}

	/*
		큰 드롭 영역은 텍스트 블록에 가깝다. 스펙은 페이지를 full-bleed 로 두되
		텍스트는 내부에서 980px 정도로 모으라고 한다.
	*/
	.wrap:not(.compact) {
		max-width: 720px;
		margin: 0 auto;
	}

	/*
		드롭 영역은 알약이 아니라 면(surface)이다. 스펙의 두 반경 중
		카드·이미지·입력 쪽인 8px 을 쓴다.
	*/
	.zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-8);
		width: 100%;
		padding: var(--spacing-56) var(--spacing-24);
		background-color: var(--surface-panel);
		border: 1px dashed var(--color-hairline);
		border-radius: var(--radius-card);
		cursor: pointer;
		transition:
			border-color 0.2s,
			background-color 0.2s;
	}

	.zone:hover,
	.zone.dragging {
		border-color: var(--color-link-blue);
		background-color: var(--surface-wash);
	}

	.compact .zone {
		flex-direction: row;
		padding: var(--spacing-12) var(--spacing-24);
	}

	.icon {
		width: 28px;
		height: 28px;
		color: var(--ink-faint);
		margin-bottom: var(--spacing-4);
	}

	.label {
		font-family: var(--font-text);
		font-size: var(--text-body);
		line-height: var(--leading-body);
		letter-spacing: var(--tracking-body);
		font-weight: var(--weight-regular);
		color: var(--ink);
	}

	.compact .label {
		font-size: var(--text-body-sm);
		letter-spacing: var(--tracking-body-sm);
		color: var(--ink-secondary);
	}

	.hint {
		font-size: var(--text-body-sm);
		line-height: var(--leading-body-sm);
		letter-spacing: var(--tracking-body-sm);
		font-weight: var(--weight-light);
		color: var(--ink-muted);
		text-align: center;
		max-width: 56ch;
	}
</style>
