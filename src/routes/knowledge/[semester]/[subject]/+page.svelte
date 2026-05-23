<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { quizStore } from '$lib/store.svelte';
	import KnowledgeImportModal from '$lib/components/KnowledgeImportModal.svelte';

	const semesterId = $derived(page.params.semester || '');
	const subjectId = $derived(page.params.subject || '');

	let showKnowledgeImport = $state(false);

	function confirmKnowledgeImport(questions: any[], semester: string, subject: string) {
		quizStore.addKnowledgeQuestions(questions.map(q => ({
			...q,
			semester,
			subject
		})));
		showKnowledgeImport = false;
		quizStore.showToast(`成功导入 ${questions.length} 道知识问答题！`, 'success');
		resetPagination();
	}

	const semesterNames: Record<string, string> = {
		grade7_up: '七年级上学期',
		grade7_down: '七年级下学期',
		grade8_up: '八年级上学期',
		grade8_down: '八年级下学期',
		grade9_up: '九年级上学期',
		grade9_down: '九年级下学期'
	};

	const subjectNames: Record<string, string> = {
		ethics: '道德与法治',
		history: '历史',
		geography: '地理',
		biology: '生物'
	};

	let semesterName = $derived(semesterNames[semesterId] || '同步学期');
	let subjectName = $derived(subjectNames[subjectId] || '学科');

	// Local states for list controls
	let searchQuery = $state('');
	let activeDifficulty = $state<'all' | 'easy' | 'medium' | 'hard'>('all');
	let currentPage = $state(1);
	let jumpPageInput = $state('');

	// Expanded question IDs state
	let expandedQuestionIds = $state<Set<number>>(new Set());

	// Computed questions filtered reactively
	let allMatchingQuestions = $derived(
		quizStore.knowledgeQuestions
			.filter(q => q.semester === semesterId && q.subject === subjectId)
			.filter(item => {
				if (!searchQuery || !searchQuery.trim()) return true;
				const q = searchQuery.trim().toLowerCase();
				return item.tag.toLowerCase().includes(q) ||
					item.content.toLowerCase().includes(q) ||
					item.keywords.some(k => k.toLowerCase().includes(q));
			})
			.filter(item => {
				if (!activeDifficulty || activeDifficulty === 'all') return true;
				return item.difficulty === activeDifficulty;
			})
	);

	// Pagination parameters
	const pageSize = 8;
	let totalQuestionsCount = $derived(allMatchingQuestions.length);
	let totalPages = $derived(Math.max(1, Math.ceil(totalQuestionsCount / pageSize)));

	// Paginated list
	let paginatedQuestions = $derived(() => {
		const start = (currentPage - 1) * pageSize;
		return allMatchingQuestions.slice(start, start + pageSize);
	});

	// Dynamic title mapping for subject icons
	const subjectIcons: Record<string, string> = {
		ethics: 'gavel',
		history: 'account_balance',
		geography: 'public',
		biology: 'biotech'
	};
	let subjectIcon = $derived(subjectIcons[subjectId] || 'description');

	function goBack() {
		goto(`/knowledge/${semesterId}`);
	}

	function toggleExpand(id: number) {
		const next = new Set(expandedQuestionIds);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		expandedQuestionIds = next;
	}

	function resetPagination() {
		currentPage = 1;
		jumpPageInput = '';
	}

	function handleSearchInput() {
		resetPagination();
	}

	function selectDifficulty(diff: 'all' | 'easy' | 'medium' | 'hard') {
		activeDifficulty = diff;
		resetPagination();
	}

	function setPage(pageNo: number) {
		if (pageNo >= 1 && pageNo <= totalPages) {
			currentPage = pageNo;
		}
	}

	function handleJumpPage() {
		const target = parseInt(jumpPageInput.trim());
		if (!isNaN(target) && target >= 1 && target <= totalPages) {
			currentPage = target;
		} else {
			jumpPageInput = '';
		}
	}

	// Helper to format linebreaks into beautiful HTML paragraphs
	function formatParagraphs(text: string): string {
		if (!text) return '';
		return text
			.split('\n')
			.map(para => {
				const trimmed = para.trim();
				if (!trimmed) return '';
				
				// Format inline bold markers **text** into styling
				let formatted = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary font-extrabold text-glow-primary">$1</strong>');
				
				// Format numbered bullets e.g. (1) or ① nicely
				if (formatted.startsWith('（') || formatted.match(/^(\d+\.|[①②③④⑤⑥⑦⑧⑨⑩])\s*/)) {
					return `<p class="pl-4 text-on-surface text-justify leading-relaxed mt-2.5 font-medium relative"><span class="absolute left-0 text-primary">•</span>${formatted}</p>`;
				}
				
				return `<p class="text-on-surface-variant text-justify leading-relaxed mt-2 font-medium">${formatted}</p>`;
			})
			.join('');
	}

	// Formatter specifically for Logical Structure list items
	function formatLogicalStructure(text: string): string {
		if (!text) return '';
		return text
			.split('\n')
			.map(line => {
				const trimmed = line.trim();
				if (!trimmed) return '';
				
				// Remove markdown bullets (* or -) and parse bold
				let clean = trimmed.replace(/^[-*]\s*/, '');
				clean = clean.replace(/\*\*(.*?)\*\*/g, '<span class="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-bold mx-1">$1</span>');
				
				// Style arrow descriptors e.g. ->
				clean = clean.replace(/\s*->\s*/g, ' <span class="material-symbols-outlined text-xs text-primary font-extrabold mx-1.5 align-middle">double_arrow</span> ');
				
				return `<div class="flex items-start gap-2 bg-surface-container-low/40 p-3 rounded-xl border border-outline-variant/5 my-2 hover:border-primary/20 transition-colors"><span class="text-primary mt-0.5">•</span><div class="text-xs font-semibold leading-relaxed text-on-surface">${clean}</div></div>`;
			})
			.join('');
	}
	let showDeleteConfirm = $state(false);
	let questionIdToDelete = $state<number | null>(null);

	function handleDeleteClick(id: number) {
		questionIdToDelete = id;
		showDeleteConfirm = true;
	}

	async function confirmDelete() {
		if (questionIdToDelete !== null) {
			const id = questionIdToDelete;
			questionIdToDelete = null;
			showDeleteConfirm = false;
			await quizStore.removeKnowledgeQuestion(id);
			
			// Adjust current page if paginatedQuestions list becomes empty
			if (paginatedQuestions().length === 0 && currentPage > 1) {
				currentPage -= 1;
			}
		}
	}
</script>

<svelte:head>
	<title>{semesterName} - {subjectName} 问答题库 - CyberQuiz AI</title>
</svelte:head>

<div class="pt-24 pb-24 px-4 md:px-margin-desktop max-w-[1280px] mx-auto min-h-screen flex flex-col justify-start relative">
	
	<!-- Background Decorative Glows -->
	<div class="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
	<div class="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] pointer-events-none"></div>

	<!-- Level Navigation Bar (Top-left Back button + Title) -->
	<div class="flex items-center gap-4 mb-6 z-10">
		<button
			onclick={goBack}
			class="w-10 h-10 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-high hover:text-primary border border-outline-variant/15 flex items-center justify-center transition-all duration-300 active:scale-90 cursor-pointer text-on-surface"
			title="返回学科选择"
		>
			<span class="material-symbols-outlined text-[20px]">arrow_back_ios_new</span>
		</button>
		<div class="text-xs text-on-surface-variant font-code uppercase tracking-wider">
			<a href="/knowledge" class="hover:text-primary transition-colors">知识问答</a>
			<span class="mx-2 text-outline">/</span>
			<a href="/knowledge/{semesterId}" class="hover:text-primary transition-colors">{semesterName}</a>
			<span class="mx-2 text-outline">/</span>
			<span class="text-on-surface font-semibold">{subjectName}</span>
		</div>
	</div>

	<!-- Hero subject metadata block (Recreates Figure 1 header area) -->
	<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 z-10">
		<div class="flex items-center gap-4">
			<div class="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner shrink-0 relative">
				<span class="material-symbols-outlined text-[32px]">{subjectIcon}</span>
				<!-- Corners accents -->
				<div class="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-primary/40"></div>
				<div class="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-primary/40"></div>
			</div>
			<div>
				<h2 class="font-headline-xl text-headline-xl text-on-surface font-extrabold flex items-center gap-3">
					{subjectName}
				</h2>
				<p class="text-xs font-code text-on-surface-variant/80 uppercase tracking-widest mt-1">
					共 <span class="text-primary font-bold">{totalQuestionsCount}</span> 题 // SEMESTER SYNCED
				</p>
			</div>
		</div>

		<!-- Interactive Console: Search Bar & Filters -->
		<div class="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
			<!-- Search Bar -->
			<div class="relative flex-grow sm:w-[280px]">
				<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[20px]">search</span>
				<input
					type="text"
					bind:value={searchQuery}
					oninput={handleSearchInput}
					placeholder="搜索题目关键词"
					class="w-full bg-[#0b1326]/60 border border-outline-variant/20 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-11 pr-4 py-2.5 text-xs text-on-surface transition-all outline-none"
				/>
			</div>

			<!-- Difficulty tabs filter -->
			<div class="flex p-1 bg-surface-container-low rounded-xl border border-outline-variant/10 shrink-0 font-code text-xs">
				<button
					onclick={() => selectDifficulty('all')}
					class="px-4 py-1.5 rounded-lg transition-all font-bold cursor-pointer {activeDifficulty === 'all' ? 'primary-gradient text-white shadow' : 'text-on-surface-variant hover:bg-surface-bright/10'}"
				>
					全部
				</button>
				<button
					onclick={() => selectDifficulty('easy')}
					class="px-4 py-1.5 rounded-lg transition-all font-bold cursor-pointer {activeDifficulty === 'easy' ? 'primary-gradient text-white shadow' : 'text-on-surface-variant hover:bg-surface-bright/10'}"
				>
					简单
				</button>
				<button
					onclick={() => selectDifficulty('medium')}
					class="px-4 py-1.5 rounded-lg transition-all font-bold cursor-pointer {activeDifficulty === 'medium' ? 'primary-gradient text-white shadow' : 'text-on-surface-variant hover:bg-surface-bright/10'}"
				>
					中等
				</button>
				<button
					onclick={() => selectDifficulty('hard')}
					class="px-4 py-1.5 rounded-lg transition-all font-bold cursor-pointer {activeDifficulty === 'hard' ? 'primary-gradient text-white shadow' : 'text-on-surface-variant hover:bg-surface-bright/10'}"
				>
					困难
				</button>
			</div>

			<!-- Q&A Import button -->
			<button
				onclick={() => showKnowledgeImport = true}
				class="flex items-center justify-center gap-2 bg-primary/10 border border-primary/30 text-primary px-4 py-2.5 rounded-xl hover:bg-primary/20 transition-all duration-300 active:scale-95 cursor-pointer font-bold text-xs shrink-0"
			>
				<span class="material-symbols-outlined text-[18px]">upload_file</span>
				<span>导入问答</span>
			</button>
		</div>
	</div>

	<!-- Empty state -->
	{#if paginatedQuestions().length === 0}
		<div class="z-10 glass-panel rounded-3xl p-16 text-center space-y-4">
			<span class="material-symbols-outlined text-[64px] text-on-surface-variant/40 animate-pulse">quiz</span>
			<h3 class="font-headline-md text-headline-md text-on-surface">未找到相关问答题</h3>
			<p class="text-on-surface-variant text-body-md max-w-md mx-auto">
				换个搜索词或重置难度筛选试试吧！
			</p>
		</div>
	{:else}
		<!-- Q&A Questions List -->
		<div class="space-y-3 z-10 mb-8">
			{#each paginatedQuestions() as q, idx}
				<div 
					class="glass-panel rounded-2xl p-5 md:p-6 border border-outline-variant/10 hover:border-primary/20 bg-surface-container-low/30 transition-all duration-300 relative overflow-hidden"
				>
					<!-- Glowing side anchor -->
					<div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b {q.difficulty === 'easy' ? 'from-green-500 to-emerald-600' : q.difficulty === 'medium' ? 'from-primary to-secondary' : 'from-error to-pink-600'}"></div>
					
					<!-- Card Header Info -->
					<div class="flex justify-between items-start flex-wrap gap-3 mb-3">
						<div class="flex items-center gap-3">
							<!-- Index Tag -->
							<div class="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-bold font-code text-xs text-primary shadow-sm shrink-0">
								{(currentPage - 1) * pageSize + idx + 1}
							</div>
							<!-- Subject Category Tag -->
							<span class="text-xs font-extrabold text-[#38bdf8] text-glow-primary">
								{q.tag}
							</span>
						</div>

						<div class="flex items-center gap-3">
							<!-- Difficulty Badge -->
							<span class="px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-wider border uppercase font-code
								{q.difficulty === 'easy' ? 'bg-green-500/10 text-green-400 border-green-500/25' : 
								 q.difficulty === 'medium' ? 'bg-primary/10 text-primary border-primary/25' : 
								 'bg-error/10 text-error border-error/25'}"
							>
								{q.difficulty === 'easy' ? '简单' : q.difficulty === 'medium' ? '中等' : '困难'}
							</span>

							{#if quizStore.isAuthorizedToDelete && quizStore.knowledgeQuestions.some(cq => cq.id === q.id)}
								<!-- Trash Delete Button -->
								<button
									onclick={() => handleDeleteClick(q.id)}
									class="p-1.5 rounded-lg border border-error/25 bg-error/5 text-error hover:bg-error/15 hover:border-error/50 hover:shadow-[0_0_12px_rgba(239,68,68,0.2)] transition-all active:scale-95 cursor-pointer flex items-center justify-center"
									title="永久删除此问答题"
								>
									<span class="material-symbols-outlined text-[20px]">delete</span>
								</button>
							{/if}

							<!-- Toggle expand action -->
							<button
								onclick={() => toggleExpand(q.id)}
								class="p-1.5 rounded-lg border border-outline-variant/15 text-on-surface-variant hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-all active:scale-95 cursor-pointer"
								title="查看分析与标准答案"
							>
								<span class="material-symbols-outlined text-[20px] transition-transform duration-300 {expandedQuestionIds.has(q.id) ? 'rotate-180 text-primary' : ''}">
									expand_more
								</span>
							</button>
						</div>
					</div>

					<!-- Prompt Body -->
					<div class="pl-0 md:pl-11 py-1 text-on-surface-variant text-xs whitespace-pre-line leading-relaxed font-semibold">
						{@html formatParagraphs(q.content)}
					</div>

					<!-- Expanded Detailed Q&A Panel (Matches user's exact specification) -->
					{#if expandedQuestionIds.has(q.id)}
						<div class="pl-0 md:pl-11 mt-4 pt-4 border-t border-outline-variant/10 space-y-4 animate-in slide-in-from-top-4 duration-300">
							
							<!-- 1. 标准答案 (Standard Answer) -->
							<div class="space-y-3 bg-[#10b981]/5 p-5 rounded-2xl border border-[#10b981]/15">
								<div class="flex items-center gap-2 text-emerald-400 font-extrabold text-body-lg">
									<span class="material-symbols-outlined text-[20px]">assignment_turned_in</span>
									<span>标准答案</span>
								</div>
								<div class="text-xs leading-relaxed font-medium space-y-2">
									{@html formatParagraphs(q.standardAnswer)}
								</div>
							</div>

							<!-- Grid split for logic structure and keywords tags -->
							<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
								
								<!-- 2. 逻辑架构 (Logical Structure) -->
								<div class="space-y-3 bg-surface-container-high/40 p-5 rounded-2xl border border-outline-variant/10">
									<div class="flex items-center gap-2 text-primary font-extrabold text-body-md">
										<span class="material-symbols-outlined text-[18px]">account_tree</span>
										<span>逻辑架构</span>
									</div>
									<div class="text-xs leading-relaxed">
										{@html formatLogicalStructure(q.logicalStructure)}
									</div>
								</div>

								<!-- 3. 关键词 (Keywords Tags) -->
								<div class="space-y-3 bg-surface-container-high/40 p-5 rounded-2xl border border-outline-variant/10 flex flex-col justify-start">
									<div class="flex items-center gap-2 text-secondary font-extrabold text-body-md">
										<span class="material-symbols-outlined text-[18px]">sell</span>
										<span>核心关键词</span>
									</div>
									<p class="text-xs text-on-surface-variant leading-relaxed">记忆答案时，重点把握以下得分关键词：</p>
									<div class="flex flex-wrap gap-2 pt-2">
										{#each q.keywords as word}
											<span class="px-3 py-1 bg-secondary/10 border border-secondary/25 text-secondary text-xs font-bold rounded-lg tracking-wide shadow-sm hover:scale-105 transition-transform duration-200 cursor-help" title="核心踩分点：{word}">
												{word}
											</span>
										{/each}
									</div>
								</div>

							</div>

							<!-- 4. 记忆锚点 (Memory Anchors) -->
							<div class="space-y-4 bg-amber-500/5 p-5 rounded-2xl border border-amber-500/15">
								<div class="flex items-center gap-2 text-amber-400 font-extrabold text-body-lg pb-1.5 border-b border-amber-500/10">
									<span class="material-symbols-outlined text-[20px]">lightbulb_circle</span>
									<span>记忆锚点</span>
								</div>

								<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
									<!-- 口诀 -->
									<div class="space-y-1 bg-surface-container-lowest/60 p-3.5 rounded-xl border border-outline-variant/5">
										<div class="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
											<span class="material-symbols-outlined text-[16px]">key</span>
											<span>口诀记忆</span>
										</div>
										<p class="text-xs text-on-surface font-semibold leading-relaxed pt-1 select-all">{q.mnemonic.formula}</p>
									</div>
									<!-- 场景 -->
									<div class="space-y-1 bg-surface-container-lowest/60 p-3.5 rounded-xl border border-outline-variant/5">
										<div class="flex items-center gap-1.5 text-blue-400 font-bold text-xs">
											<span class="material-symbols-outlined text-[16px]">explore</span>
											<span>关联场景</span>
										</div>
										<p class="text-xs text-on-surface-variant leading-relaxed pt-1">{q.mnemonic.scene}</p>
									</div>
									<!-- 避坑 -->
									<div class="space-y-1 bg-surface-container-lowest/60 p-3.5 rounded-xl border border-outline-variant/5">
										<div class="flex items-center gap-1.5 text-error font-bold text-xs">
											<span class="material-symbols-outlined text-[16px]">report</span>
											<span>容易避坑</span>
										</div>
										<p class="text-xs text-on-surface-variant leading-relaxed pt-1">{q.mnemonic.avoid}</p>
									</div>
								</div>
							</div>

						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Pagination Footer Bar (Recreates Figure 1 footer) -->
		{#if totalPages > 1}
			<div class="z-10 flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-container-low/40 border border-outline-variant/10 p-5 rounded-3xl shadow-lg">
				<!-- Total items description -->
				<span class="text-xs text-on-surface-variant font-code">
					显示第 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalQuestionsCount)} 题，共 {totalQuestionsCount} 道
				</span>

				<!-- Page Numbers controls -->
				<div class="flex items-center gap-1.5 shrink-0">
					<!-- Prev page button -->
					<button
						onclick={() => setPage(currentPage - 1)}
						disabled={currentPage === 1}
						class="w-9 h-9 rounded-xl border border-outline-variant/15 flex items-center justify-center text-on-surface hover:text-primary hover:bg-primary/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-on-surface transition-all active:scale-95 shrink-0 cursor-pointer"
					>
						<span class="material-symbols-outlined text-[18px]">chevron_left</span>
					</button>

					<!-- Render page page pills -->
					{#each Array(totalPages) as _, i}
						{@const pNum = i + 1}
						{#if pNum === 1 || pNum === totalPages || (pNum >= currentPage - 2 && pNum <= currentPage + 2)}
							<button
								onclick={() => setPage(pNum)}
								class="w-9 h-9 rounded-xl font-bold font-code text-xs transition-all active:scale-95 shrink-0 cursor-pointer
									{currentPage === pNum ? 'primary-gradient text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]' : 'border border-outline-variant/15 text-on-surface hover:bg-surface-bright/10'}"
							>
								{pNum}
							</button>
						{:else}
							<!-- Print ellipses selectively -->
							{#if pNum === 2 && currentPage > 4}
								<span class="w-6 text-center text-outline text-[12px] font-bold shrink-0">...</span>
							{:else}
								{#if pNum === totalPages - 1 && currentPage < totalPages - 3}
									<span class="w-6 text-center text-outline text-[12px] font-bold shrink-0">...</span>
								{/if}
							{/if}
						{/if}
					{/each}

					<!-- Next page button -->
					<button
						onclick={() => setPage(currentPage + 1)}
						disabled={currentPage === totalPages}
						class="w-9 h-9 rounded-xl border border-outline-variant/15 flex items-center justify-center text-on-surface hover:text-primary hover:bg-primary/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-on-surface transition-all active:scale-95 shrink-0 cursor-pointer"
					>
						<span class="material-symbols-outlined text-[18px]">chevron_right</span>
					</button>
				</div>

				<!-- Jump to input field block -->
				<div class="flex items-center gap-2 text-xs font-medium text-on-surface-variant font-code shrink-0">
					<span>跳转至</span>
					<input
						type="text"
						bind:value={jumpPageInput}
						class="w-12 bg-[#0b1326]/60 border border-outline-variant/20 focus:border-primary rounded-xl px-2 py-1.5 text-center text-xs text-on-surface outline-none"
						placeholder={currentPage.toString()}
					/>
					<span>页</span>
					<button
						onclick={handleJumpPage}
						class="px-4 py-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-xl hover:bg-primary/25 hover:border-primary transition-all duration-300 active:scale-95 cursor-pointer"
					>
						确定
					</button>
				</div>
			</div>
		{/if}
	{/if}
</div>

{#if showKnowledgeImport}
	<KnowledgeImportModal
		initialSemester={semesterId}
		initialSubject={subjectId}
		lockSelections={true}
		onConfirm={confirmKnowledgeImport}
		onCancel={() => showKnowledgeImport = false}
	/>
{/if}

{#if showDeleteConfirm}
	<div class="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0b1326]/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
		<div class="w-full max-w-sm glass-card rounded-3xl p-6 md:p-8 border border-error/30 cyber-glow-error text-center space-y-5 animate-in zoom-in-95 duration-300 relative overflow-hidden">
			<!-- Decorative red glowing bubble -->
			<div class="absolute -top-16 -right-16 w-32 h-32 bg-error/10 rounded-full blur-[40px] pointer-events-none"></div>

			<span class="material-symbols-outlined text-error text-4xl animate-bounce">warning</span>
			<div>
				<h3 class="font-headline-sm text-headline-sm text-on-surface font-extrabold">确定要删除该问答题吗？</h3>
				<p class="text-xs text-on-surface-variant mt-1.5 leading-relaxed">删除操作是永久性的，对应的云端 D1 数据库记录与本地缓存都将被物理销毁，且无法恢复！</p>
			</div>
			
			<div class="flex justify-end gap-3 pt-2">
				<button
					onclick={() => { showDeleteConfirm = false; questionIdToDelete = null; }}
					class="px-4 py-2.5 border border-outline-variant/30 text-on-surface hover:bg-surface-bright/10 text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95"
				>
					取消
				</button>
				<button
					onclick={confirmDelete}
					class="px-5 py-2.5 bg-error text-white text-xs font-bold rounded-xl hover:bg-error/80 transition-all cursor-pointer active:scale-95 shadow-md shadow-error/15"
				>
					确定删除
				</button>
			</div>
		</div>
	</div>
{/if}
