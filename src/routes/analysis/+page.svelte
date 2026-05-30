<script lang="ts">
	import { quizStore } from '$lib/store.svelte';
	import { goto } from '$app/navigation';
	import { generateAIDiagnosis } from '$lib/utils/aiAdvisor';
	import type { Question } from '$lib/types';

	// Stats derivations in Svelte 5
	let questions = $derived(quizStore.questions);
	let wrongBook = $derived(quizStore.wrongBook);
	let history = $derived(quizStore.history);

	let totalQuestions = $derived(questions.length);
	
	let singleCount = $derived(questions.filter(q => q.type === 'single').length);
	let multipleCount = $derived(questions.filter(q => q.type === 'multiple').length);
	
	let singlePercent = $derived(totalQuestions > 0 ? Math.round((singleCount / totalQuestions) * 100) : 0);
	let multiplePercent = $derived(totalQuestions > 0 ? 100 - singlePercent : 0);

	// Difficulty counts
	let easyCount = $derived(questions.filter(q => q.difficulty === 'easy').length);
	let mediumCount = $derived(questions.filter(q => q.difficulty === 'medium').length);
	let hardCount = $derived(questions.filter(q => q.difficulty === 'hard').length);

	let easyPct = $derived(totalQuestions > 0 ? Math.round((easyCount / totalQuestions) * 100) : 0);
	let mediumPct = $derived(totalQuestions > 0 ? Math.round((mediumCount / totalQuestions) * 100) : 0);
	let hardPct = $derived(totalQuestions > 0 ? 100 - easyPct - mediumPct : 0);

	// Calculate local report as baseline for category references
	let offlineReport = $derived(generateAIDiagnosis(questions, history, wrongBook));

	// Categories grouping
	let categoriesAnalysis = $derived(() => {
		const groups: { [key: string]: number } = {};
		questions.forEach(q => {
			groups[q.category] = (groups[q.category] || 0) + 1;
		});

		// Format into sorted array
		return Object.entries(groups)
			.map(([name, count]) => {
				const pct = totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : 0;
				return { name, count, pct };
			})
			.sort((a, b) => b.count - a.count);
	});

	// Accuracy per question based on history
	let questionAttempts = $derived(() => {
		const map: { [key: number]: { correct: number; total: number } } = {};
		history.forEach(h => {
			if (!map[h.questionId]) {
				map[h.questionId] = { correct: 0, total: 0 };
			}
			map[h.questionId].total += 1;
			if (h.correct) map[h.questionId].correct += 1;
		});
		return map;
	});

	// Question Table Pagination State
	let currentPage = $state(1);
	const pageSize = 5;
	
	let paginatedQuestions = $derived(() => {
		const start = (currentPage - 1) * pageSize;
		return questions.slice(start, start + pageSize);
	});

	let totalPages = $derived(Math.ceil(totalQuestions / pageSize));

	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
		}
	}

	function viewExplanation(qId: number) {
		const q = questions.find(item => item.id === qId);
		if (!q) return;

		// Select this single question, set as submitted (so it renders the explanation instantly)
		quizStore.activeQuestions = [q];
		quizStore.currentIndex = 0;
		quizStore.selectedAnswers = [...q.answer]; // Show correct answers selected by default
		quizStore.submitted = true;
		quizStore.exerciseMode = 'sequential';

		goto('/quiz');
	}

	function triggerDirectMistakesPractice(categoryName: string) {
		const matchingWrongIds = new Set(
			wrongBook
				.filter(w => {
					const q = questions.find(item => item.id === w.questionId);
					return q && q.category === categoryName;
				})
				.map(w => w.questionId)
		);

		const filterQuestions = questions.filter(q => matchingWrongIds.has(q.id));
		if (filterQuestions.length === 0) {
			quizStore.showToast('该模块暂无错题可以练习！', 'error');
			return;
		}

		quizStore.activeQuestions = filterQuestions;
		quizStore.currentIndex = 0;
		quizStore.selectedAnswers = [];
		quizStore.submitted = false;
		quizStore.exerciseMode = 'wrong';
		
		quizStore.showToast(`已为您筛选出 ${filterQuestions.length} 道『${categoryName}』错题进行地狱突破`, 'success');
		goto('/quiz');
	}
</script>

<svelte:head>
	<title>数据分析 - CyberQuiz AI</title>
</svelte:head>

<div class="pt-24 pb-20 px-4 md:px-margin-desktop max-w-[1440px] mx-auto">
	<!-- Title & Hero Section -->
	<div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-stack-lg relative gap-6">
		<div class="z-10">
			<div class="flex items-center gap-3 mb-2 flex-wrap">
				<h2 class="font-headline-xl text-headline-xl text-on-surface">当前激活题库数据分析</h2>
				<span class="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary font-label-md">
					{totalQuestions} 题
				</span>
			</div>
			<p class="text-on-surface-variant text-body-lg max-w-2xl leading-relaxed">
				离线智能诊断引擎根据您的解题历史与错题数据，实时生成可视化的统计雷达与多维度复习策略。
			</p>
		</div>

		<!-- Abstract Floating Graphic -->
		<div class="hidden lg:block relative w-[240px] h-[160px] pointer-events-none flex-shrink-0">
			<div class="relative w-full h-full flex items-center justify-center">
				<div class="absolute w-40 h-40 bg-indigo-500/10 rounded-full blur-[60px] animate-pulse"></div>
				<img
					alt="Dashboard Abstract"
					class="w-36 h-36 object-contain rounded-3xl transform rotate-12 glass-card border-indigo-500/30 cyber-book-img"
					src="https://lh3.googleusercontent.com/aida-public/AB6AXuAdwYHKeS--NW7HBcAovF1jbSFCWXtGY0HZD5fR_lAGTVKcxpmvGJAOLmW_hJWT14gJDDFHJf-F8okfOTiS8fuCap6XIISzRlaOYMvUZ21v8OLbe1foRoKptLNtmXGfN8ksAWACh6qZmkXxGfL3MJahdQzzt9-N26fsttxz6NoEM3tN746EAIQwvGIwSWFUcxdYKJMRW76g32wrpPy1H6Pc7expagtlOIg8Ue-GtZ9MjtipqPdMc_ODrP4SVxWwltG8uU93x9O6d8rh"
				/>
			</div>
		</div>
	</div>

	<!-- Bento Dashboard Grid - Row 1 (Metadata Summaries) -->
	<div class="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-stack-lg items-stretch">
		<!-- Question Distribution (Donut Chart) -->
		<div class="md:col-span-6 glass-card rounded-3xl p-stack-md gradient-border flex flex-col justify-between border border-outline-variant/10 min-h-[380px]">
			<div class="flex justify-between items-center mb-stack-md">
				<h3 class="font-headline-md text-headline-md text-on-surface">题型分布</h3>
				<span class="material-symbols-outlined text-outline text-[20px] cursor-help" title="单选题和多选题的比重">info</span>
			</div>
			
			<div class="flex-grow flex items-center justify-around py-4">
				<div class="relative w-40 h-40">
					<!-- CSS conic gradient donut chart -->
					<div
						class="donut-chart w-full h-full flex items-center justify-center transition-all duration-500 rounded-full"
						style="background: conic-gradient(#6366F1 0% {singlePercent}%, #A855F7 {singlePercent}% 100%)"
					>
						<div class="donut-hole w-28 h-28 flex flex-col items-center justify-center bg-[#0b1326] rounded-full shadow-inner border border-outline-variant/10">
							<span class="font-headline-xl text-[28px] text-on-surface font-extrabold">{totalQuestions}</span>
							<span class="text-on-surface-variant text-body-sm">总题数</span>
						</div>
					</div>
				</div>
			</div>
			
			<div class="flex flex-col gap-3 mt-4">
				<div class="flex justify-between items-center bg-surface-container-low/40 p-3 rounded-2xl border border-outline-variant/5">
					<div class="flex items-center gap-3">
						<div class="w-3.5 h-3.5 rounded-full bg-[#6366F1]"></div>
						<span class="text-on-surface-variant text-body-sm">单选题</span>
					</div>
					<span class="text-on-surface font-bold font-code">{singleCount} 道 ({singlePercent}%)</span>
				</div>
				<div class="flex justify-between items-center bg-surface-container-low/40 p-3 rounded-2xl border border-outline-variant/5">
					<div class="flex items-center gap-3">
						<div class="w-3.5 h-3.5 rounded-full bg-[#A855F7]"></div>
						<span class="text-on-surface-variant text-body-sm">多选题</span>
					</div>
					<span class="text-on-surface font-bold font-code">{multipleCount} 道 ({multiplePercent}%)</span>
				</div>
			</div>
		</div>

		<!-- Difficulty Distribution -->
		<div class="md:col-span-6 glass-card rounded-3xl p-stack-md gradient-border flex flex-col justify-between border border-outline-variant/10 min-h-[380px]">
			<div class="flex justify-between items-center mb-stack-md">
				<h3 class="font-headline-md text-headline-md text-on-surface">难度分布</h3>
				<span class="material-symbols-outlined text-outline text-[20px]" title="题库的难度层级分布">info</span>
			</div>
			
			<div class="flex-grow flex flex-col justify-center gap-6 my-auto">
				<div class="flex flex-col gap-1.5">
					<div class="flex justify-between text-body-sm">
						<span class="text-on-surface-variant font-medium">简单难度 (Easy)</span>
						<span class="text-tertiary font-bold font-code">{easyCount} 题 ({easyPct}%)</span>
					</div>
					<div class="h-2.5 bg-surface-variant rounded-full overflow-hidden border border-outline-variant/5">
						<div class="h-full bg-tertiary rounded-full shadow-[0_0_10px_rgba(74,225,118,0.4)]" style="width: {easyPct}%"></div>
					</div>
				</div>
				
				<div class="flex flex-col gap-1.5">
					<div class="flex justify-between text-body-sm">
						<span class="text-on-surface-variant font-medium">中等难度 (Medium)</span>
						<span class="text-primary font-bold font-code">{mediumCount} 题 ({mediumPct}%)</span>
					</div>
					<div class="h-2.5 bg-surface-variant rounded-full overflow-hidden border border-outline-variant/5">
						<div class="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(99,102,241,0.4)]" style="width: {mediumPct}%"></div>
					</div>
				</div>
				
				<div class="flex flex-col gap-1.5">
					<div class="flex justify-between text-body-sm">
						<span class="text-on-surface-variant font-medium">困难难度 (Hard)</span>
						<span class="text-error font-bold font-code">{hardCount} 题 ({hardPct}%)</span>
					</div>
					<div class="h-2.5 bg-surface-variant rounded-full overflow-hidden border border-outline-variant/5">
						<div class="h-full bg-error rounded-full shadow-[0_0_10px_rgba(239,68,68,0.4)]" style="width: {hardPct}%"></div>
					</div>
				</div>
			</div>
			
			<div class="text-body-sm text-on-surface-variant mt-4 text-center border-t border-outline-variant/5 pt-3">
				难度分布自动适应导入题库的难度占比
			</div>
		</div>
	</div>

	<!-- Bento Dashboard Grid - Row 2 (Detailed Knowledge Coverage) -->
	<div class="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-stack-lg">
		<!-- Knowledge Points Coverage (Bar List) -->
		<div class="md:col-span-12 glass-card rounded-3xl p-stack-md gradient-border flex flex-col border border-outline-variant/10">
			<div class="flex justify-between items-center mb-stack-md">
				<h3 class="font-headline-md text-headline-md text-on-surface">知识点覆盖与掌握情况</h3>
				<span class="material-symbols-outlined text-outline text-[20px] cursor-help" title="当前题库在各知识领域的覆盖量与您的做题情况">info</span>
			</div>
			
			{#if categoriesAnalysis().length === 0}
				<div class="text-center py-8 text-on-surface-variant text-body-md">
					暂无足够分类数据，请上传包含知识点/分类的题库。
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
					{#each categoriesAnalysis() as cat}
						{@const isWeak = offlineReport.weakestCategories.some(w => w.name === cat.name)}
						{@const isStrong = offlineReport.strongestCategories.includes(cat.name)}
						{@const wrongCount = wrongBook.filter(w => {
							const q = questions.find(item => item.id === w.questionId);
							return q && q.category === cat.name;
						}).reduce((sum, w) => sum + w.count, 0)}

						<div class="bg-surface-container-low/20 p-4 rounded-2xl border border-outline-variant/5 space-y-3 hover:border-primary/20 transition-all duration-300">
							<div class="flex justify-between items-center text-body-sm">
								<div class="flex items-center gap-2">
									<span class="text-on-surface font-extrabold text-body-md">{cat.name}</span>
									{#if isWeak}
										<span class="px-2 py-0.5 text-[10px] bg-error/10 text-error border border-error/20 rounded font-semibold flex items-center gap-0.5">
											<span class="w-1 h-1 rounded-full bg-error"></span>薄弱
										</span>
									{:else if isStrong}
										<span class="px-2 py-0.5 text-[10px] bg-tertiary/10 text-tertiary border border-tertiary/20 rounded font-semibold flex items-center gap-0.5">
											<span class="w-1 h-1 rounded-full bg-tertiary"></span>精通
										</span>
									{/if}
								</div>
								
								<span class="text-on-surface-variant font-code text-body-sm">{cat.count} 题占 ({cat.pct}%)</span>
							</div>

							<div class="h-2.5 w-full bg-surface-variant rounded-full overflow-hidden border border-outline-variant/5">
								<div
									class="h-full rounded-full transition-all duration-500 {isWeak ? 'bg-gradient-to-r from-error to-pink-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]' : isStrong ? 'bg-gradient-to-r from-tertiary to-emerald-400 shadow-[0_0_8px_rgba(74,225,118,0.3)]' : 'bg-gradient-to-r from-primary to-indigo-400'}"
									style="width: {cat.pct}%"
								></div>
							</div>

							<!-- Category Micro actions -->
							<div class="flex justify-between items-center text-[12px] pt-1 text-on-surface-variant">
								<div class="flex gap-4">
									<span class="flex items-center gap-1">
										<span class="material-symbols-outlined text-[14px]">menu_book</span>
										题库占比: {cat.count}题
									</span>
									{#if wrongCount > 0}
										<span class="flex items-center gap-1 text-error font-bold font-code">
											<span class="material-symbols-outlined text-[14px] text-error">close</span>
											积压错题: {wrongCount}道
										</span>
									{:else}
										<span class="flex items-center gap-1 text-tertiary font-bold">
											<span class="material-symbols-outlined text-[14px] text-tertiary">check</span>
											暂无积压错题
										</span>
									{/if}
								</div>

								{#if wrongCount > 0}
									<button
										onclick={() => triggerDirectMistakesPractice(cat.name)}
										class="text-error hover:text-white border border-error/30 hover:bg-error px-2 py-0.5 rounded transition-all active:scale-95 cursor-pointer font-bold"
									>
										地狱攻坚
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Questions Overview Table -->
	<section class="glass-card rounded-3xl p-stack-md gradient-border border border-outline-variant/10">
		<div class="flex justify-between items-center mb-6 flex-wrap gap-4">
			<h3 class="font-headline-md text-headline-md text-on-surface">
				题库结构一览 <span class="text-body-md text-on-surface-variant font-normal ml-2">(分页浏览全部)</span>
			</h3>
		</div>
		
		<div class="overflow-x-auto">
			<table class="w-full text-left border-collapse min-w-[700px]">
				<thead>
					<tr class="border-b border-outline-variant/10 text-on-surface-variant font-label-md">
						<th class="pb-4 font-normal">题号</th>
						<th class="pb-4 font-normal">题型</th>
						<th class="pb-4 font-normal">题目预览</th>
						<th class="pb-4 font-normal">知识点</th>
						<th class="pb-4 font-normal">标签 (Tags)</th>
						<th class="pb-4 font-normal">难度</th>
						<th class="pb-4 font-normal">答题正确率</th>
						<th class="pb-4 font-normal text-right">操作</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-outline-variant/5">
					{#each paginatedQuestions() as q}
						{@const attempts = questionAttempts()[q.id]}
						{@const rate = attempts ? Math.round((attempts.correct / attempts.total) * 100) : null}
						
						<tr class="group hover:bg-surface-bright/5 transition-colors">
							<td class="py-5 font-code text-primary">{q.id}</td>
							<td class="py-5">
								<span class="px-2 py-0.5 rounded border text-[12px] font-semibold {q.type === 'single' ? 'bg-tertiary/10 text-tertiary border-tertiary/20' : 'bg-secondary/10 text-secondary border-secondary/20'}">
									{q.type === 'single' ? '单选' : '多选'}
								</span>
							</td>
							<td class="py-5 max-w-[280px] truncate text-on-surface font-medium" title={q.title}>
								{q.title.replace(/```python[\s\S]*```/g, '[代码]')}
							</td>
							<td class="py-5 text-on-surface-variant font-medium">{q.category}</td>
							<!-- Tags list column -->
							<td class="py-5 max-w-[160px] truncate">
								{#if q.knowledgeTags && q.knowledgeTags.length > 0}
									<div class="flex gap-1 overflow-hidden truncate">
										{#each q.knowledgeTags as tag}
											<span class="px-1.5 py-0.5 rounded bg-surface-container-high/40 text-on-surface-variant text-[10px] border border-outline-variant/5 font-medium">
												{tag}
											</span>
										{/each}
									</div>
								{:else}
									<span class="text-on-surface-variant opacity-40 text-[11px]">-</span>
								{/if}
							</td>
							<td class="py-5">
								{#if q.difficulty === 'easy'}
									<span class="text-tertiary flex items-center gap-1.5 text-body-sm font-semibold">
										<span class="w-1.5 h-1.5 rounded-full bg-tertiary"></span>简单
									</span>
								{:else if q.difficulty === 'hard'}
									<span class="text-error flex items-center gap-1.5 text-body-sm font-semibold">
										<span class="w-1.5 h-1.5 rounded-full bg-error"></span>困难
									</span>
								{:else}
									<span class="text-primary flex items-center gap-1.5 text-body-sm font-semibold">
										<span class="w-1.5 h-1.5 rounded-full bg-primary"></span>中等
									</span>
								{/if}
							</td>
							<td class="py-5 font-bold font-code text-body-md">
								{rate !== null ? `${rate}%` : '暂无尝试'}
							</td>
							<td class="py-5 text-right">
								<button
									onclick={() => viewExplanation(q.id)}
									class="text-primary-container hover:text-primary border border-primary-container/30 hover:border-primary px-3 py-1 rounded-lg text-body-sm transition-all active:scale-95 cursor-pointer font-bold"
								>
									查看解析
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Table Pagination Footer -->
		{#if totalPages > 1}
			<div class="bg-surface-container-high/20 p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-outline-variant/10 mt-4 rounded-b-2xl">
				<span class="text-on-surface-variant text-body-sm">
					显示第 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalQuestions)} 道题，共 {totalQuestions} 道
				</span>
				<div class="flex gap-2">
					<button
						onclick={() => goToPage(currentPage - 1)}
						disabled={currentPage === 1}
						class="w-10 h-10 rounded-lg flex items-center justify-center border border-outline-variant/20 text-on-surface-variant disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-bright/10 transition-all cursor-pointer"
					>
						<span class="material-symbols-outlined">chevron_left</span>
					</button>
					
					{#each Array.from({ length: totalPages }, (_, i) => i + 1) as pageNum}
						{#if pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1}
							<button
								onclick={() => goToPage(pageNum)}
								class="w-10 h-10 rounded-lg flex items-center justify-center font-bold font-code transition-all cursor-pointer {currentPage === pageNum ? 'primary-gradient text-white shadow-lg' : 'border border-outline-variant/20 text-on-surface-variant hover:bg-surface-bright/10'}"
							>
								{pageNum}
							</button>
						{:else if pageNum === 2 || pageNum === totalPages - 1}
							<span class="w-8 h-10 flex items-end justify-center text-on-surface-variant">...</span>
						{/if}
					{/each}

					<button
						onclick={() => goToPage(currentPage + 1)}
						disabled={currentPage === totalPages}
						class="w-10 h-10 rounded-lg flex items-center justify-center border border-outline-variant/20 text-on-surface-variant disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-bright/10 transition-all cursor-pointer"
					>
						<span class="material-symbols-outlined">chevron_right</span>
					</button>
				</div>
			</div>
		{/if}
	</section>
</div>
