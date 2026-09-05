<script lang="ts">
	import {
		Button,
		DropZone,
		ProgressBar,
		SegmentedControl,
		SortableGrid,
		TextField,
		ToolShell
	} from '@betlab/toolkit-ui';
	import AlertTriangleIcon from '@lucide/svelte/icons/triangle-alert';
	import DownloadIcon from '@lucide/svelte/icons/download';

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
	 * 새로 들어온 묶음만 자연 정렬한다 — 이미 사용자가 드래그로 잡아둔 순서를
	 * 파일 추가가 흐트러뜨리면 안 된다.
	 *
	 * @param files 새로 들어온 파일들.
	 */
	async function add(files: File[]): Promise<void> {
		batch += 1;
		const result = await acceptFiles(files, `b${batch}`);
		entries = [...entries, ...result.entries];
		rejected = result.rejected;
	}

	/** 목록과 상태를 내보내기 전 기본값으로 되돌린다. */
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
	title="이미지 → PPT"
	description="이미지를 드롭하면 한 장씩 슬라이드에 꽉 채운 PPTX로 내보냅니다."
>
	{#snippet actions()}
		{#if entries.length > 0}
			<Button variant="ghost" size="sm" onclick={reset}>전체 지우기</Button>
		{/if}
	{/snippet}

	{#if entries.length === 0}
		<div class="py-10">
			<DropZone
				accept={ACCEPT}
				onfiles={add}
				label="이미지를 여기에 놓으세요"
				hint="파일명 순서(0, 1, 2 … 10)대로 슬라이드가 만들어집니다. PNG · JPEG · GIF · WebP"
			/>
		</div>
	{:else}
		<div class="flex flex-col gap-6">
			<div
				class="flex flex-wrap items-end justify-between gap-4 rounded-panel border
				       border-hairline bg-elevated px-5 py-4"
			>
				<div class="flex flex-wrap items-end gap-5">
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

				<div class="flex min-w-56 flex-col gap-2">
					{#if exporting}
						<ProgressBar value={exported} total={entries.length} label="슬라이드 생성" />
					{/if}
					<Button variant="primary" block onclick={exportPptx} disabled={exporting}>
						<DownloadIcon class="size-4" />
						{exporting ? '만드는 중…' : `PPT 내보내기 (${entries.length}장)`}
					</Button>
				</div>
			</div>

			{#if rejected.length > 0 || offRatio > 0}
				<ul class="flex flex-col gap-1.5 text-xs text-warning">
					{#if rejected.length > 0}
						<li class="flex items-center gap-1.5">
							<AlertTriangleIcon class="size-3.5 shrink-0" />
							이미지가 아니라 제외됨: {rejected.join(', ')}
						</li>
					{/if}
					{#if offRatio > 0}
						<li class="flex items-center gap-1.5">
							<AlertTriangleIcon class="size-3.5 shrink-0" />
							{offRatio}장이 슬라이드와 비율이 달라 늘어나 보입니다.
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
						PPTX 는 이미지를 슬라이드 크기로 늘려서 채운다(a:stretch fillRect).
						썸네일도 슬라이드 비율 박스에 object-fill 로 늘려야 미리보기가
						실제 결과와 같아진다. @tool-ux-principles §3
					-->
					<img
						src={previews.get(entry.id)}
						alt={entry.name}
						loading="lazy"
						style:aspect-ratio="{slideSize.widthEmu} / {slideSize.heightEmu}"
						class="w-full bg-sunken object-fill"
					/>
					<p class="truncate px-2.5 py-2 text-xs text-ink-muted" title={entry.name}>
						{entry.name}
					</p>
				{/snippet}
			</SortableGrid>

			<DropZone accept={ACCEPT} compact onfiles={add} label="이미지 더 추가" />
		</div>
	{/if}
</ToolShell>
