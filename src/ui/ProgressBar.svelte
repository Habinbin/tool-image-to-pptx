<script lang="ts">
	interface Props {
		/** 완료 개수. */
		value: number;
		/** 전체 개수. 0이면 아무것도 그리지 않는다. */
		total: number;
		label?: string;
	}

	let { value, total, label }: Props = $props();

	const percent = $derived(total > 0 ? Math.round((value / total) * 100) : 0);
</script>

{#if total > 0}
	<div class="wrap">
		<div class="row">
			<span>{label ?? '처리 중'}</span>
			<span>{value} / {total}</span>
		</div>
		<div class="track">
			<div class="fill" style:width="{percent}%"></div>
		</div>
	</div>
{/if}

<style>
	.wrap {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	.row {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-caption);
		color: var(--ink-muted);
	}

	.track {
		height: 4px;
		border-radius: var(--radius-pill);
		background-color: var(--surface-sunken);
		overflow: hidden;
	}

	.fill {
		height: 100%;
		border-radius: var(--radius-pill);
		background-color: var(--accent);
		transition: width 0.2s;
	}
</style>
