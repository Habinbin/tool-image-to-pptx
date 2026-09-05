<script lang="ts">
	interface Props {
		value: string;
		label: string;
		placeholder?: string;
		/** 사용자가 바꿀 수 없는 꼬리표. 확장자 같은 것. */
		suffix?: string;
	}

	let { value = $bindable(), label, placeholder, suffix }: Props = $props();
</script>

<label>
	<span class="label">{label}</span>
	<!-- 스펙의 Form Input: 8px 반경, 1px #d2d2d7 테두리, #f5f5f7 채움, 포커스 링 #0071e3 -->
	<span class="field">
		<input bind:value {placeholder} type="text" />
		{#if suffix}<span class="suffix">{suffix}</span>{/if}
	</span>
</label>

<style>
	label {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-8);
	}

	.label {
		font-size: var(--text-caption);
		line-height: var(--leading-caption);
		letter-spacing: var(--tracking-caption);
		font-weight: var(--weight-regular);
		color: var(--ink-muted);
	}

	.field {
		display: flex;
		align-items: center;
		gap: var(--spacing-4);
		background-color: var(--surface-canvas);
		border: 1px solid var(--color-hairline);
		border-radius: var(--radius-card);
		padding: 9px var(--spacing-12);
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}

	.field:focus-within {
		border-color: var(--color-apple-blue);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-apple-blue) 25%, transparent);
	}

	input {
		flex: 1;
		min-width: 8ch;
		border: 0;
		background: transparent;
		padding: 0;
		font-family: var(--font-text);
		font-size: var(--text-body-sm);
		line-height: var(--leading-body-sm);
		letter-spacing: var(--tracking-body-sm);
		color: var(--ink);
	}

	input:focus {
		outline: none;
	}

	input::placeholder {
		color: var(--ink-faint);
	}

	.suffix {
		font-size: var(--text-body-sm);
		letter-spacing: var(--tracking-body-sm);
		color: var(--ink-faint);
	}
</style>
