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
		padding: var(--spacing-8) var(--spacing-12);
		transition:
			border-color 0.2s,
			outline-color 0.2s;
		outline: 2px solid transparent;
		outline-offset: -1px;
	}

	/* 스펙의 Form Input 은 포커스 '링' 을 말한다. 그림자가 아니라 outline 으로 그린다. */
	.field:focus-within {
		border-color: var(--color-apple-blue);
		outline-color: var(--color-apple-blue);
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

	/* 링은 래퍼가 그린다. 안쪽 input 까지 그리면 두 겹이 된다. */
	input:focus,
	input:focus-visible {
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
