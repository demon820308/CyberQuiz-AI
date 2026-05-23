<script lang="ts">
	import { quizStore } from '$lib/store.svelte';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';

	$effect(() => {
		// Only run when the store's hydration status is ready
		const isReady = quizStore.isD1 ? quizStore.hydrated : true;
		if (isReady && quizStore.activeQuestions.length === 0) {
			untrack(() => {
				if (quizStore.hasSavedProgress) {
					quizStore.resumeSessionProgress();
				} else {
					quizStore.initSession('sequential');
				}
			});
		}
	});

	// Derived state values in Svelte 5
	let currentQ = $derived(quizStore.currentQuestion);
	let activeLen = $derived(quizStore.activeQuestions.length);
	let currentNum = $derived(quizStore.currentIndex + 1);
	let progressPercent = $derived(activeLen > 0 ? (currentNum / activeLen) * 100 : 0);

	// Multi-select helper check
	let isOptionSelected = $derived((key: string) => {
		return quizStore.selectedAnswers.includes(key);
	});

	function handleOptionClick(key: string) {
		quizStore.toggleOption(key);
	}

	let isCorrectAnswer = $derived(
		currentQ
			? [...currentQ.answer].sort().join(',') === [...quizStore.selectedAnswers].sort().join(',')
			: false
	);

	let nextButtonText = $derived(() => {
		if (quizStore.exerciseMode === 'wrong' && quizStore.submitted) {
			const currentQId = currentQ?.id;
			const isCleared = !quizStore.wrongBook.some(r => r.questionId === currentQId);
			
			if (isCleared) {
				const otherWrongCount = quizStore.activeQuestions.filter(q => q.id !== currentQId).length;
				if (otherWrongCount === 0) {
					return '返回（错题已清空）';
				}
				return '下一题';
			}
		}
		return quizStore.currentIndex === activeLen - 1 ? '重新开始练习' : '下一题';
	});

	async function handleSubmit() {
		if (quizStore.selectedAnswers.length === 0) return;
		await quizStore.submitAnswer();
	}

	function handleNext() {
		if (nextButtonText() === '返回（错题已清空）') {
			quizStore.clearSessionProgress();
			goto('/wrong');
			return;
		}
		quizStore.nextQuestion();
	}

	function exitPractice() {
		if (quizStore.exerciseMode === 'wrong') {
			goto('/wrong');
		} else {
			goto('/');
		}
	}
</script>

<svelte:head>
	<title>CyberQuiz AI - 正在进行刷题</title>
</svelte:head>

<!-- Top Navigation Bar -->
<header
	class="fixed top-0 left-0 w-full z-50 h-16 px-margin-mobile md:px-margin-desktop flex items-center justify-between bg-surface-container/60 backdrop-blur-xl border-b border-outline-variant/20 shadow-sm"
>
	<div class="flex items-center gap-stack-md">
		<button
			onclick={exitPractice}
			class="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-variant/50 hover:bg-surface-variant transition-all active:scale-95 cursor-pointer"
		>
			<span class="material-symbols-outlined text-on-surface-variant">arrow_back_ios_new</span>
		</button>
		<div class="flex items-center gap-2">
			<span class="text-2xl">📚</span>
			<h1 class="font-headline-md text-headline-md text-on-surface tracking-tight">知识问答</h1>
		</div>
	</div>
	<button
		onclick={exitPractice}
		class="flex items-center gap-2 px-4 py-2 rounded-xl border border-error/30 text-error hover:bg-error/10 transition-colors active:scale-95 cursor-pointer"
	>
		<span class="material-symbols-outlined">logout</span>
		<span class="font-label-md text-label-md">退出练习</span>
	</button>
</header>

<main class="pt-24 pb-32 max-w-[800px] mx-auto px-margin-mobile md:px-0 space-y-stack-lg">
	{#if activeLen === 0}
		<!-- Empty State -->
		<div class="glass-panel rounded-3xl p-12 text-center space-y-6">
			<div class="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary border border-primary/20">
				<span class="material-symbols-outlined text-5xl">inbox</span>
			</div>
			<div class="space-y-2">
				<h2 class="font-headline-lg text-headline-lg text-on-surface">当前练习列表为空</h2>
				<p class="text-on-surface-variant text-body-md">
					如果你正在使用“错题本模式”，可能目前还没有产生任何错题。你可以尝试在主页开始顺序练习！
				</p>
			</div>
			<button
				onclick={exitPractice}
				class="px-8 py-4 bg-gradient-to-r from-[#6366F1] to-[#A855F7] text-white font-bold rounded-2xl primary-glow hover:scale-105 active:scale-95 transition-all cursor-pointer"
			>
				{quizStore.exerciseMode === 'wrong' ? '返回错题本' : '返回主页'}
			</button>
		</div>
	{:else if currentQ}
		<!-- Progress Indicator -->
		<div class="flex items-center gap-gutter">
			<div class="flex-shrink-0 font-headline-md text-headline-md text-primary">
				<span class="font-body-md text-on-surface-variant">第</span>
				<span class="font-bold">{currentNum}/{activeLen}</span>
				<span class="font-body-md text-on-surface-variant">题</span>
			</div>
			<div class="flex-grow h-2 bg-surface-variant rounded-full relative overflow-hidden">
				<div
					class="absolute left-0 top-0 h-full primary-gradient progress-glow rounded-full transition-all duration-300"
					style="width: {progressPercent}%"
				></div>
			</div>
			<div class="flex-shrink-0 font-label-md text-label-md text-on-surface-variant">
				{Math.round(progressPercent)}%
			</div>
		</div>

		{#if !quizStore.submitted}
			<!-- Answering State -->
			<div class="glass-panel rounded-3xl p-8 relative overflow-hidden group">
				<div class="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full"></div>
				<div class="relative z-10 flex flex-col md:flex-row justify-between items-start gap-stack-lg">
					<div class="space-y-stack-md flex-1">
						<div class="flex items-center gap-3">
							<span class="px-3 py-1 rounded-lg bg-primary-container/20 text-primary border border-primary/30 font-label-md text-label-md">
								{currentQ.type === 'single' ? '单选题' : '多选题'}
							</span>
							<span class="text-on-surface-variant font-label-md text-label-md">
								难度: {currentQ.difficulty === 'easy' ? '简单' : currentQ.difficulty === 'hard' ? '困难' : '中等'}
							</span>
							<span class="text-on-surface-variant font-label-md text-label-md">
								分类: {currentQ.category}
							</span>
						</div>
						<h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface leading-tight whitespace-pre-wrap">
							{currentQ.title}
						</h2>
						<p class="text-on-surface-variant font-body-md">
							{currentQ.type === 'single' ? '请选择一个正确的选项' : '请选择所有正确的选项（可多选）'}
						</p>
					</div>
					
					<!-- Floating 3D Graphic (Stylized Icon) -->
					<div class="hidden md:flex relative w-36 h-36 items-center justify-center flex-shrink-0">
						<div class="absolute inset-0 bg-primary/10 blur-2xl rounded-full"></div>
						<div class="floating relative">
							<div class="w-24 h-24 rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#A855F7] opacity-20 absolute top-0 left-0 animate-pulse"></div>
							<span class="material-symbols-outlined text-primary text-[72px]" style="font-variation-settings: 'FILL' 1;">
								{currentQ.type === 'single' ? 'radio_button_checked' : 'check_box'}
							</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Options Container -->
			<div class="space-y-stack-md">
				{#each Object.entries(currentQ.options) as [key, val]}
					<label
						onclick={() => handleOptionClick(key)}
						class="glass-panel rounded-2xl p-6 flex items-center justify-between cursor-pointer border transition-all duration-300 group active:scale-[0.99] {isOptionSelected(key) ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'border-transparent hover:border-primary/40'}"
					>
						<div class="flex items-center gap-gutter">
							<div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold font-code transition-all {isOptionSelected(key) ? 'bg-primary text-on-primary shadow-lg shadow-indigo-500/20' : 'bg-surface-variant text-on-surface-variant group-hover:text-primary'}">
								{key}
							</div>
							<span class="font-body-md text-on-surface transition-colors {isOptionSelected(key) ? 'text-primary font-bold' : ''}">
								{val}
							</span>
						</div>
						<!-- Selection Circle or Box -->
						<div class="flex-shrink-0 flex items-center justify-center">
							{#if currentQ.type === 'single'}
								<div class="w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center {isOptionSelected(key) ? 'border-primary' : 'border-outline-variant/30 group-hover:border-primary/50'}">
									{#if isOptionSelected(key)}
										<div class="w-3 h-3 rounded-full bg-primary"></div>
									{/if}
								</div>
							{:else}
								<div class="w-6 h-6 rounded border-2 transition-all flex items-center justify-center {isOptionSelected(key) ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/30 group-hover:border-primary/50'}">
									{#if isOptionSelected(key)}
										<span class="material-symbols-outlined text-[18px]">check</span>
									{/if}
								</div>
							{/if}
						</div>
					</label>
				{/each}
			</div>

			<!-- Submit Button -->
			<div class="pt-4">
				<button
					onclick={handleSubmit}
					disabled={quizStore.selectedAnswers.length === 0}
					class="w-full h-14 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all {quizStore.selectedAnswers.length === 0 ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed opacity-55' : 'bg-gradient-to-r from-[#6366F1] to-[#A855F7] text-white primary-glow hover:scale-[1.01] active:scale-95 cursor-pointer'}"
				>
					提交答案
					<span class="material-symbols-outlined">send</span>
				</button>
			</div>
		{:else}
			<!-- Explanation / Submitted State -->
			<div class="flex flex-col items-center text-center gap-stack-sm py-6 animate-in fade-in slide-in-from-top-4 duration-700">
				{#if isCorrectAnswer}
					<!-- Correct state -->
					<div class="w-20 h-20 bg-tertiary-container/20 rounded-full flex items-center justify-center glow-success border border-tertiary/30 mb-stack-md">
						<span class="material-symbols-outlined text-tertiary text-5xl font-bold animate-ping absolute opacity-30">check_circle</span>
						<span class="material-symbols-outlined text-tertiary text-5xl font-bold" style="font-variation-settings: 'FILL' 1;">check_circle</span>
					</div>
					<h1 class="font-headline-xl text-headline-xl text-tertiary font-extrabold">回答正确</h1>
					<p class="font-body-lg text-on-surface-variant">太棒了！你选择的答案是正确的 🎉</p>
				{:else}
					<!-- Incorrect state -->
					<div class="w-20 h-20 bg-error-container/20 rounded-full flex items-center justify-center border border-error/30 mb-stack-md">
						<span class="material-symbols-outlined text-error text-5xl font-bold" style="font-variation-settings: 'FILL' 1;">cancel</span>
					</div>
					<h1 class="font-headline-xl text-headline-xl text-error font-extrabold">回答错误</h1>
					<p class="font-body-lg text-on-surface-variant">没关系，分析解析能帮你加深记忆 💪</p>
				{/if}
			</div>

			<!-- Question Content (ReadOnly) -->
			<div class="glass-card p-8 rounded-3xl border-l-4 {isCorrectAnswer ? 'border-l-tertiary bg-tertiary/5' : 'border-l-error bg-error/5'}">
				<div class="flex items-center gap-2 mb-stack-md">
					<span class="bg-primary/10 text-primary px-3 py-1 rounded-lg font-label-md text-label-md flex items-center gap-1">
						<span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">
							{currentQ.type === 'single' ? 'radio_button_checked' : 'check_box'}
						</span>
						{currentQ.type === 'single' ? '单选题' : '多选题'}
					</span>
					<span class="text-on-surface-variant font-label-md text-label-md">
						分类: <span class="text-on-surface">{currentQ.category}</span>
					</span>
				</div>
				<h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface leading-snug whitespace-pre-wrap">
					{currentQ.title}
				</h2>
			</div>

			<!-- Graded Options Section -->
			<div class="flex flex-col gap-stack-md">
				<h3 class="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest px-2">你的作答</h3>
				
				{#each Object.entries(currentQ.options) as [key, val]}
					{@const isSelected = isOptionSelected(key)}
					{@const isCorrect = currentQ.answer.includes(key)}
					
					<div class="glass-card p-5 rounded-2xl border flex items-center justify-between group cursor-default transition-all {isSelected ? (isCorrect ? 'border-tertiary bg-tertiary/5' : 'border-error bg-error/5') : (isCorrect ? 'border-tertiary/40 bg-surface-container/20 opacity-80' : 'border-outline-variant/10 opacity-50')}">
						<div class="flex items-center gap-4">
							<div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold font-code border {isSelected ? (isCorrect ? 'bg-tertiary/20 text-tertiary border-tertiary/30' : 'bg-error/20 text-error border-error/30') : (isCorrect ? 'bg-tertiary/10 text-tertiary/80 border-tertiary/20' : 'bg-surface-variant text-on-surface-variant border-transparent')}">
								{key}
							</div>
							<span class="font-body-md text-on-surface">
								{val}
							</span>
						</div>

						<div class="flex-shrink-0">
							{#if isSelected}
								{#if isCorrect}
									<span class="material-symbols-outlined text-tertiary text-2xl" style="font-variation-settings: 'FILL' 1;">check_circle</span>
								{:else}
									<span class="material-symbols-outlined text-error text-2xl" style="font-variation-settings: 'FILL' 1;">cancel</span>
								{/if}
							{:else}
								{#if isCorrect}
									<!-- Correct but not selected -->
									<span class="material-symbols-outlined text-tertiary/40 text-xl">check_circle</span>
								{:else}
									<div class="w-6 h-6 rounded border border-outline-variant/20"></div>
								{/if}
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<!-- Correct Answers Bar -->
			<div class="flex flex-col gap-stack-md">
				<h3 class="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest px-2">正确答案</h3>
				<div class="flex flex-wrap gap-4">
					{#each currentQ.answer as correctAns}
						<div class="bg-tertiary/10 border border-tertiary/35 px-6 py-3 rounded-2xl flex items-center gap-3">
							<span class="bg-tertiary/25 text-tertiary px-2 py-0.5 rounded text-sm font-bold font-code">{correctAns}</span>
							<span class="text-on-surface font-body-md font-semibold">{currentQ.options[correctAns]}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Detailed Explanation Card -->
			<div class="glass-card p-8 rounded-3xl border border-primary/20 bg-primary/5 flex flex-col gap-stack-md animate-in fade-in duration-500 delay-200">
				<div class="flex items-center gap-stack-sm">
					<div class="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
						<span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">lightbulb</span>
					</div>
					<h3 class="font-headline-md text-headline-md text-primary-container">详细解析</h3>
				</div>
				
				<div class="text-on-surface-variant leading-relaxed whitespace-pre-wrap font-body-md border-t border-outline-variant/10 pt-4">
					{currentQ.explanation}
				</div>
			</div>

			<!-- Primary Actions Bottom Bar -->
			<div class="flex flex-col md:flex-row gap-gutter pt-4">
				<button
					onclick={handleNext}
					class="flex-1 h-14 bg-gradient-to-r from-[#6366F1] to-[#A855F7] text-white rounded-2xl font-bold flex items-center justify-center gap-2 glow-primary transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg shadow-indigo-500/25"
				>
					{nextButtonText()}
					<span class="material-symbols-outlined">
						{nextButtonText() === '返回（错题已清空）' ? 'keyboard_return' : 'arrow_forward'}
					</span>
				</button>
				<button
					onclick={exitPractice}
					class="flex-1 h-14 border border-outline-variant/30 rounded-2xl font-bold text-on-surface hover:bg-surface-bright/10 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
				>
					<span class="material-symbols-outlined">auto_stories</span>
					{quizStore.exerciseMode === 'wrong' ? '返回错题本' : '返回题库'}
				</button>
			</div>
		{/if}
	{/if}
</main>
