<script lang="ts" generics="V extends string">
	interface Option {
		value: V;
		label: string;
	}

	interface Props {
		value: V;
		options: Option[];
		label: string;
		/** 값이 자동 감지된 것임을 알린다. 사용자가 손대지 않아도 된다는 신호. */
		detected?: boolean;
	}

	let { value = $bindable(), options, label, detected = false }: Props = $props();
</script>

<div class="group">
	<span class="label">
		{label}
		{#if detected}<span class="tag">자동 감지</span>{/if}
	</span>
	<!-- 선택 상태는 filled 파랑 — 스펙이 #0071e3 에 허용한 두 용도 중 하나 -->
	<div class="track">
		{#each options as option (option.value)}
			<button
				type="button"
				class="seg"
				class:selected={value === option.value}
				onclick={() => (value = option.value)}
			>
				{option.label}
			</button>
		{/each}
	</div>
</div>

<style>
	.group {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	.label {
		display: flex;
		align-items: center;
		gap: var(--space-8);
		font-size: var(--text-caption);
		color: var(--ink-muted);
	}

	/* 태그는 알약 — 스펙의 radius.tags */
	.tag {
		border-radius: var(--radius-pill);
		background-color: var(--surface-sunken);
		padding: 2px var(--space-8);
		font-size: var(--text-caption);
		color: var(--ink-muted);
	}

	.track {
		display: inline-flex;
		gap: var(--space-4);
	}

	.seg {
		border: 1px solid var(--line);
		border-radius: var(--radius-pill);
		background-color: var(--surface);
		padding: 8px 15px;
		font-family: var(--font);
		font-size: var(--text-body-sm);
		line-height: 1.2;
		font-weight: 500;
		color: var(--ink-muted);
		cursor: pointer;
		transition:
			background-color 0.2s,
			border-color 0.2s,
			color 0.2s;
	}

	.seg:hover:not(.selected) {
		border-color: var(--accent-hover);
		color: var(--accent-hover);
	}

	.seg.selected {
		background-color: var(--accent);
		border-color: var(--accent);
		color: var(--on-accent);
	}
</style>
