<script lang="ts">
	import type { Question } from '../types';

	// Svelte 5 props
	let {
		questions = [],
		onConfirm = () => {},
		onCancel = () => {}
	}: {
		questions: Question[];
		onConfirm: () => void;
		onCancel: () => void;
	} = $props();

	// Stats derivations
	let totalCount = $derived(questions.length);
	let singleCount = $derived(questions.filter(q => q.type === 'single').length);
	let multipleCount = $derived(questions.filter(q => q.type === 'multiple').length);

	let easyCount = $derived(questions.filter(q => q.difficulty === 'easy').length);
	let mediumCount = $derived(questions.filter(q => q.difficulty === 'medium').length);
	let hardCount = $derived(questions.filter(q => q.difficulty === 'hard').length);

	let categories = $derived(() => {
		const cats = new Set(questions.map(q => q.category));
		return Array.from(cats);
	});

	// Select first 3 questions for preview
	let previewList = $derived(questions.slice(0, 3));
</script>

<div class="fixed inset-0 z-[999] flex items-center justify-center bg-[#0b1326]/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
	<!-- Modal Panel -->
	<div class="relative w-full max-w-3xl max-h-[85vh] glass-card rounded-3xl p-6 md:p-8 border border-primary/30 cyber-glow-primary overflow-hidden flex flex-col justify-between animate-in zoom-in-95 duration-300">
		
		<!-- Glowing Background Accents -->
		<div class="absolute -top-32 -right-32 w-80 h-80 bg-primary/10 rounded-full blur-[80px] pointer-events-none"></div>
		<div class="absolute -bottom-32 -left-32 w-80 h-80 bg-secondary/10 rounded-full blur-[80px] pointer-events-none"></div>

		<!-- Header -->
		<header class="relative z-10 flex justify-between items-center pb-4 border-b border-outline-variant/10 flex-shrink-0">
			<div class="flex items-center gap-3">
				<span class="material-symbols-outlined text-primary text-3xl animate-bounce">upload_file</span>
				<div>
					<h2 class="font-headline-md text-headline-md text-on-surface">题库导入预览</h2>
					<p class="text-on-surface-variant text-body-sm mt-0.5">请核对解析出的题目属性，确认无误后导入数据库</p>
				</div>
			</div>
			<button 
				onclick={onCancel}
				class="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-full transition-all cursor-pointer"
				title="关闭"
			>
				<span class="material-symbols-outlined">close</span>
			</button>
		</header>

		<!-- Content Area -->
		<div class="relative z-10 flex-grow overflow-y-auto py-6 space-y-6 max-h-[55vh] pr-2">
			<!-- Parsed Summary Stats Row -->
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<!-- Count Card -->
				<div class="bg-surface-container-low/40 p-4 rounded-2xl border border-outline-variant/5">
					<div class="text-[12px] text-on-surface-variant font-bold">总解析题数</div>
					<div class="font-headline-xl text-headline-xl font-extrabold text-primary mt-1 font-code">
						{totalCount} <span class="text-body-md font-normal text-on-surface-variant">道</span>
					</div>
				</div>

				<!-- Type Card -->
				<div class="bg-surface-container-low/40 p-4 rounded-2xl border border-outline-variant/5 space-y-1">
					<div class="text-[12px] text-on-surface-variant font-bold">题型结构</div>
					<div class="flex justify-between text-body-sm pt-1">
						<span class="text-on-surface-variant">单选题:</span>
						<span class="text-on-surface font-bold font-code">{singleCount} 道</span>
					</div>
					<div class="flex justify-between text-body-sm">
						<span class="text-on-surface-variant">多选题:</span>
						<span class="text-on-surface font-bold font-code">{multipleCount} 道</span>
					</div>
				</div>

				<!-- Difficulty Card -->
				<div class="bg-surface-container-low/40 p-4 rounded-2xl border border-outline-variant/5 space-y-1">
					<div class="text-[12px] text-on-surface-variant font-bold">难度配比</div>
					<div class="flex justify-between text-body-sm pt-1">
						<span class="text-tertiary">简单: {easyCount}</span>
						<span class="text-primary font-bold">中等: {mediumCount}</span>
						<span class="text-error font-bold">困难: {hardCount}</span>
					</div>
					<div class="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden flex mt-1">
						<div class="h-full bg-tertiary" style="width: {totalCount > 0 ? (easyCount / totalCount) * 100 : 0}%"></div>
						<div class="h-full bg-primary" style="width: {totalCount > 0 ? (mediumCount / totalCount) * 100 : 0}%"></div>
						<div class="h-full bg-error" style="width: {totalCount > 0 ? (hardCount / totalCount) * 100 : 0}%"></div>
					</div>
				</div>
			</div>

			<!-- Detected Categories Tags -->
			<div class="space-y-2">
				<h3 class="text-body-md font-extrabold text-on-surface flex items-center gap-1.5">
					<span class="material-symbols-outlined text-[18px] text-primary">label</span>
					检测到的知识分类 ({categories().length} 个)
				</h3>
				<div class="flex flex-wrap gap-2">
					{#each categories() as cat}
						<span class="px-3 py-1 rounded-xl bg-primary/10 border border-primary/20 text-primary font-label-md text-body-sm">
							{cat}
						</span>
					{/each}
				</div>
			</div>

			<!-- Dynamic Sample Previews -->
			<div class="space-y-4">
				<h3 class="text-body-md font-extrabold text-on-surface flex items-center gap-1.5">
					<span class="material-symbols-outlined text-[18px] text-primary">preview</span>
					部分题目数据缩略预览 (前 {previewList.length} 道)
				</h3>
				
				<div class="space-y-4">
					{#each previewList as q, idx}
						<div class="bg-surface-container-low/20 p-5 rounded-2xl border border-outline-variant/10 space-y-3">
							<div class="flex justify-between items-center flex-wrap gap-2">
								<div class="flex items-center gap-2">
									<span class="font-code text-primary font-bold">Q{q.id}</span>
									<span class="px-2 py-0.5 rounded text-[10px] font-semibold border {q.type === 'single' ? 'bg-tertiary/10 text-tertiary border-tertiary/20' : 'bg-secondary/10 text-secondary border-secondary/20'}">
										{q.type === 'single' ? '单选题' : '多选题'}
									</span>
								</div>

								<div class="flex gap-2">
									<span class="px-2 py-0.5 bg-surface-container-high/60 rounded text-[11px] font-medium text-on-surface-variant font-code">
										{q.category}
									</span>
									<span class="px-2 py-0.5 rounded text-[11px] font-bold {q.difficulty === 'easy' ? 'text-tertiary bg-tertiary/5' : q.difficulty === 'hard' ? 'text-error bg-error/5' : 'text-primary bg-primary/5'}">
										{q.difficulty === 'easy' ? '简单' : q.difficulty === 'hard' ? '困难' : '中等'}
									</span>
								</div>
							</div>

							<h4 class="font-semibold text-on-surface text-body-md leading-relaxed">
								{q.title}
							</h4>

							<!-- Options preview -->
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-body-sm pl-2">
								{#each Object.entries(q.options) as [key, val]}
									<div class="text-on-surface-variant flex items-center gap-2">
										<span class="font-bold text-primary font-code">{key}:</span>
										<span class="truncate">{val}</span>
									</div>
								{/each}
							</div>

							<!-- Correct Answers preview -->
							<div class="text-body-sm flex items-center gap-2 pt-1 border-t border-outline-variant/5">
								<span class="text-tertiary font-bold">正确答案:</span>
								<span class="font-code text-on-surface bg-tertiary/10 px-2 py-0.5 rounded border border-tertiary/20 font-bold">
									{q.answer.join(', ')}
								</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Footer actions -->
		<footer class="relative z-10 flex gap-4 pt-4 border-t border-outline-variant/10 flex-shrink-0">
			<button
				onclick={onCancel}
				class="flex-1 px-6 py-3 border border-outline-variant/30 text-on-surface rounded-2xl hover:bg-surface-bright/10 transition-all active:scale-[0.98] font-bold cursor-pointer"
			>
				取消导入
			</button>
			<button
				onclick={onConfirm}
				class="flex-1 px-6 py-3 primary-gradient text-white rounded-2xl hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all active:scale-[0.98] font-bold cursor-pointer text-center"
			>
				确认导入数据库
			</button>
		</footer>
	</div>
</div>
