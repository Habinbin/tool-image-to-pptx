<script lang="ts">
	/*
		폰트를 툴이 직접 싣는다. 호스트에서 빌려 쓰면 툴박스 안에서와 단독 배포에서
		다른 글꼴로 뜬다. @typography-and-language
	*/
	import '@fontsource-variable/noto-sans-kr';
	import './ui/theme.css';

	import Button from './ui/Button.svelte';
	import DropZone from './ui/DropZone.svelte';
	import ProgressBar from './ui/ProgressBar.svelte';
	import SegmentedControl from './ui/SegmentedControl.svelte';
	import SortableGrid from './ui/SortableGrid.svelte';
	import TextField from './ui/TextField.svelte';

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

<!--
	본문만 그린다. 제목·설명·뒤로가기는 호스트(툴박스 또는 단독 앱)의 몫이다.
	그래서 이 툴은 자기가 어느 화면 구성 안에 있는지 몰라도 된다. @theme-contract
-->
<div class="tool-root">
	{#if entries.length === 0}
		<div class="empty">
			<DropZone
				accept={ACCEPT}
				onfiles={add}
				label="이미지를 여기에 놓으세요"
				hint="파일명 순서(0, 1, 2 … 10)대로 슬라이드가 만들어집니다. PNG · JPEG · GIF · WebP"
			/>
		</div>
	{:else}
		<div class="stack">
			<section class="bar">
				<div class="controls">
					<TextField bind:value={fileName} label="파일 이름" suffix=".pptx" />
					<SegmentedControl
						bind:value={
							() => presetOverride ?? detected ?? '16:10', (v: AspectPreset) => (presetOverride = v)
						}
						options={PRESET_ORDER.map((p) => ({ value: p, label: p }))}
						label="슬라이드 비율"
						detected={presetOverride === null && detected !== null}
					/>
				</div>

				<div class="export">
					{#if exporting}
						<ProgressBar value={exported} total={entries.length} label="슬라이드 생성" />
					{/if}
					<Button variant="filled" onclick={exportPptx} disabled={exporting}>
						{exporting ? '만드는 중…' : `PPT 내보내기 (${entries.length}장)`}
					</Button>
				</div>
			</section>

			{#if rejected.length > 0 || offRatio > 0}
				<ul class="notes">
					{#if rejected.length > 0}
						<li>이미지가 아니라 제외됨: {rejected.join(', ')}</li>
					{/if}
					{#if offRatio > 0}
						<li>{offRatio}장이 슬라이드와 비율이 달라 늘어나 보입니다.</li>
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

			<DropZone accept={ACCEPT} compact onfiles={add} label="이미지 더 추가" />
		</div>
	{/if}
</div>

<style>
	.empty {
		padding-top: var(--space-32);
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-32);
	}

	/* 컨트롤 줄은 카드가 아니라 헤어라인 띠 — 캔버스 위에 면을 하나 더 얹지 않는다. */
	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--space-24);
		padding-bottom: var(--space-24);
		border-bottom: 1px solid var(--line);
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--space-24);
	}

	.export {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: var(--space-12);
		min-width: 220px;
	}

	.notes {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		font-size: var(--text-body-sm);
		color: var(--warning);
	}

	img {
		display: block;
		width: 100%;
		background-color: var(--surface-sunken);
		object-fit: fill;
	}

	.name {
		margin: 0;
		padding: var(--space-8) var(--space-12);
		font-size: var(--text-caption);
		color: var(--ink-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
