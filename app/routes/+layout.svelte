<script lang="ts">
	let { children } = $props();
</script>

{@render children()}

<style>
	/*
		툴의 `.tool-root` 는 `flex: 1` 로 남은 높이를 받아 빈 상태의 드롭 영역을 가운데 둔다.
		툴박스에서는 껍데기가 그 높이를 정해 주므로, 단독으로 뜰 때 여기가 그 역할만 대신한다.

		배경색을 토큰이 아니라 값으로 적는 이유: `--surface-raised` 는 `.tool-root` 스코프
		안에서만 살아 있어 `body` 가 읽지 못한다. 대신 `--betlab-surface-raised` 를 정의하면
		호스트가 테마를 덮어쓴 셈이 되어, 단독 실행에서 툴 자신의 기본값을 쓴다는 계약이 깨진다.
		그래서 툴의 기본값과 같은 값을 여기 한 번 적는다.
	*/
	:global(body) {
		display: flex;
		min-height: 100dvh;
		flex-direction: column;
		margin: 0;
		background-color: #f5f5f7;
	}
</style>
