<script lang="ts">
	/*
		폰트를 툴이 직접 싣는다. 호스트에서 빌려 쓰면 툴박스 안에서와 단독 배포에서
		서로 다른 글꼴로 뜬다. 스펙의 SF Pro 는 Apple 전용이라 웹에 없고,
		스펙이 지정한 대체 폰트가 Inter 다.
	*/
	import '@fontsource-variable/inter';
	import './ui/theme.css';

	import Button from './ui/Button.svelte';
	import DropZone from './ui/DropZone.svelte';
	import ProgressBar from './ui/ProgressBar.svelte';
	import SegmentedControl from './ui/SegmentedControl.svelte';
	import SortableGrid from './ui/SortableGrid.svelte';
	import TextField from './ui/TextField.svelte';
	import ToolShell from './ui/ToolShell.svelte';

	import {
		PRESET_ORDER,
		detectPreset,
		slideSizeFromImage,
		slideSizeOf,
		type AspectPreset
	} from './aspect';
	import { buildPptx } from './pptx';
	import {
		acceptFiles,
		countOffRatio,
		outputFileName,
		referenceSize,
		type SlideEntry
	} from './slides';

	interface Props {
		/** 목록으로 돌아갈 경로. 껍데기가 정한다. 단독 배포에서는 비운다. */
		backHref?: string;
	}

	let { backHref }: Props = $props();

	const ACCEPT = 'image/png,image/jpeg,image/gif,image/webp';

	let entries = $state<SlideEntry[]>([]);
	let rejected = $state<string[]>([]);
	let fileName = $state('slides');
	/** null 이면 첫 이미지에서 감지한 값을 쓴다. */
	let presetOverride = $state<AspectPreset | null>(null);
	let exporting = $state(false);
	let exported = $state(0);
	let batch = 0;

	const detected = $derived.by(() => {
		const size = referenceSize(entries);
		return size === null ? null : detectPreset(size);
	});

	const slideSize = $derived.by(() => {
		if (presetOverride !== null) return slideSizeOf(presetOverride);
		if (detected !== null) return slideSizeOf(detected);
		const size = referenceSize(entries);
		return size === null ? slideSizeOf('16:10') : slideSizeFromImage(size);
	});

	const offRatio = $derived(countOffRatio(entries, slideSize.widthEmu / slideSize.heightEmu));

	const previews = $derived(
		new Map(entries.map((entry) => [entry.id, URL.createObjectURL(entry.file)]))
	);

	$effect(() => {
		const urls = [...previews.values()];
		return () => urls.forEach((url) => URL.revokeObjectURL(url));
	});

	/**
	 * 드롭·선택된 파일을 목록 끝에 붙인다.
	 *
	 * 새로 들어온 묶음만 자연 정렬한다 — 이미 드래그로 잡아둔 순서를 흐트러뜨리지 않는다.
	 *
	 * @param files 새로 들어온 파일들.
	 */
	async function add(files: File[]): Promise<void> {
		batch += 1;
		const result = await acceptFiles(files, `b${batch}`);
		entries = [...entries, ...result.entries];
		rejected = result.rejected;
	}

	/** 목록과 상태를 처음으로 되돌린다. */
	function reset(): void {
		entries = [];
		rejected = [];
		presetOverride = null;
		exported = 0;
	}

	/** 현재 목록을 PPTX 로 만들어 내려받는다. */
	async function exportPptx(): Promise<void> {
		if (entries.length === 0 || exporting) return;
		exporting = true;
		exported = 0;
		try {
			const images = await Promise.all(
				entries.map(async (entry) => ({
					bytes: new Uint8Array(await entry.file.arrayBuffer()),
					extension: entry.extension
				}))
			);
			const blob = await buildPptx(images, {
				size: slideSize,
				title: fileName.trim() || 'Slides',
				onProgress: (done) => (exported = done)
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = outputFileName(fileName);
			link.click();
			URL.revokeObjectURL(url);
		} finally {
			exporting = false;
		}
	}
</script>

<ToolShell
	title="Images to PPTX"
	description="Drop images and export a PPTX with one full-bleed slide per image."
	{backHref}
>
	{#snippet actions()}
		{#if entries.length > 0}
			<Button variant="ghost" onclick={reset}>Clear all</Button>
		{/if}
	{/snippet}

	{#if entries.length === 0}
		<div class="empty">
			<DropZone
				accept={ACCEPT}
				onfiles={add}
				label="Drop images here"
				hint="Slides follow filename order (0, 1, 2 … 10). PNG · JPEG · GIF · WebP"
			/>
		</div>
	{:else}
		<div class="stack">
			<section class="bar">
				<div class="controls">
					<TextField bind:value={fileName} label="File name" suffix=".pptx" />
					<SegmentedControl
						bind:value={
							() => presetOverride ?? detected ?? '16:10', (v: AspectPreset) => (presetOverride = v)
						}
						options={PRESET_ORDER.map((p) => ({ value: p, label: p }))}
						label="Slide ratio"
						detected={presetOverride === null && detected !== null}
					/>
				</div>

				<div class="export">
					{#if exporting}
						<ProgressBar value={exported} total={entries.length} label="Building slides" />
					{/if}
					<Button variant="filled" onclick={exportPptx} disabled={exporting}>
						{exporting ? 'Building…' : `Export PPTX (${entries.length})`}
					</Button>
				</div>
			</section>

			{#if rejected.length > 0 || offRatio > 0}
				<ul class="notes">
					{#if rejected.length > 0}
						<li>Skipped, not an image: {rejected.join(', ')}</li>
					{/if}
					{#if offRatio > 0}
						<li>
							{offRatio} image{offRatio > 1 ? 's' : ''} will be stretched — aspect ratio differs from
							the slide.
						</li>
					{/if}
				</ul>
			{/if}

			<SortableGrid
				items={entries}
				onreorder={(next) => (entries = next)}
				onremove={(entry) => (entries = entries.filter((e) => e.id !== entry.id))}
			>
				{#snippet item(entry: SlideEntry)}
					<!--
						PPTX 는 이미지를 슬라이드 크기로 늘려 채운다(a:stretch fillRect).
						썸네일도 슬라이드 비율에 object-fill 이라야 미리보기가 곧 결과가 된다.
					-->
					<img
						src={previews.get(entry.id)}
						alt={entry.name}
						loading="lazy"
						style:aspect-ratio="{slideSize.widthEmu} / {slideSize.heightEmu}"
					/>
					<p class="name" title={entry.name}>{entry.name}</p>
				{/snippet}
			</SortableGrid>

			<DropZone accept={ACCEPT} compact onfiles={add} label="Add more images" />
		</div>
	{/if}
</ToolShell>

<style>
	.empty {
		padding-top: var(--spacing-48);
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-40);
	}

	/*
		스펙은 #f5f5f7 섹션 안에 카드를 두지 말라고 한다. 컨트롤 줄은 카드가 아니라
		헤어라인으로 구분된 띠로 둔다 — 면을 하나 더 얹지 않는다.
	*/
	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--spacing-24);
		padding-bottom: var(--spacing-24);
		border-bottom: 1px solid var(--color-hairline);
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--spacing-24);
	}

	.export {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: var(--spacing-12);
		min-width: 240px;
	}

	.notes {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-4);
		font-size: var(--text-body-sm);
		line-height: var(--leading-body-sm);
		letter-spacing: var(--tracking-body-sm);
		color: var(--ink-muted);
	}

	img {
		display: block;
		width: 100%;
		background-color: var(--surface-filled);
		object-fit: fill;
	}

	.name {
		margin: 0;
		padding: var(--spacing-8) var(--spacing-12);
		font-size: var(--text-caption);
		line-height: var(--leading-caption);
		letter-spacing: var(--tracking-caption);
		color: var(--ink-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
