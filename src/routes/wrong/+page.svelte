<script lang="ts">
	import { quizStore } from '$lib/store.svelte';
	import { goto } from '$app/navigation';
	import type { Question, WrongRecord } from '$lib/types';

	let activeFilter = $state<'all' | 'single' | 'multiple'>('all');
	let showConfirmModal = $state(false);
	let pendingQId = $state<number | null>(null);

	let modeText = $derived(
		quizStore.savedSessionDetails?.mode === 'wrong'
			? '错题攻坚'
			: quizStore.savedSessionDetails?.mode === 'random'
			? '随机练习'
			: quizStore.savedSessionDetails?.mode === 'sequential'
			? '顺序练习'
			: ''
	);

	// Derived list of wrong questions mapped with their wrong book records
	let wrongRecords = $derived(quizStore.wrongBook);
	let allQuestions = $derived(quizStore.questions);

	let wrongQuestionsDetail = $derived(() => {
		return wrongRecords.map((record: WrongRecord) => {
			const q = allQuestions.find((item: Question) => item.id === record.questionId);
			return {
				record,
				question: q
			};
		}).filter((item: { record: WrongRecord; question: Question | undefined }) => item.question !== undefined) as { record: WrongRecord, question: Question }[];
	});

	let filteredQuestions = $derived(() => {
		const list = wrongQuestionsDetail();
		if (activeFilter === 'all') return list;
		return list.filter((item: { record: WrongRecord; question: Question }) => item.question.type === activeFilter);
	});

	function practiceSingle(qId: number) {
		if (quizStore.hasSavedProgress) {
			pendingQId = qId;
			showConfirmModal = true;
		} else {
			executePracticeSingle(qId);
		}
	}

	function executePracticeSingle(qId: number) {
		const list = filteredQuestions().map(item => item.question);
		const targetIndex = list.findIndex(q => q.id === qId);
		if (targetIndex === -1) return;
		
		// Setup store active session to all filtered wrong questions
		quizStore.activeQuestions = list;
		quizStore.currentIndex = targetIndex;
		quizStore.selectedAnswers = [];
		quizStore.submitted = false;
		quizStore.exerciseMode = 'wrong';
		quizStore.saveSessionProgress();
		
		goto('/quiz');
	}

	function confirmRestart() {
		showConfirmModal = false;
		if (pendingQId !== null) {
			quizStore.clearSessionProgress();
			executePracticeSingle(pendingQId);
			pendingQId = null;
		}
	}

	function handleRemove(qId: number, event: Event) {
		event.stopPropagation();
		quizStore.removeFromWrongBook(qId);
	}

	function handleClearAll() {
		if (confirm('确定要清空错题本吗？此操作不可撤销。')) {
			quizStore.clearWrongBook();
		}
	}

	function backToHome() {
		goto('/');
	}
</script>

<svelte:head>
	<title>错题本 - CyberQuiz AI</title>
</svelte:head>

<div class="pt-24 pb-24 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
	<!-- Top Navigation Shell override (layout handles most, but we have wrong book actions) -->
	<div class="flex justify-between items-center mb-6">
		<button
			onclick={backToHome}
			class="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-all active:scale-95 cursor-pointer font-bold"
		>
			<span class="material-symbols-outlined">arrow_back_ios_new</span>
			返回面板
		</button>
		
		<button
			onclick={handleClearAll}
			disabled={wrongRecords.length === 0}
			class="flex items-center gap-2 px-4 py-2 border border-error/30 text-error rounded-xl hover:bg-error/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-label-md active:scale-95 cursor-pointer"
		>
			<span class="material-symbols-outlined text-[18px]">delete_sweep</span>
			清空错题本
		</button>
	</div>

	<!-- Header Hero Section -->
	<header
		class="glass-panel rounded-3xl p-8 mb-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border border-outline-variant/10"
	>
		<!-- Background Decorative Glows -->
		<div class="absolute -top-24 -left-24 w-64 h-64 bg-error/10 blur-[80px] rounded-full"></div>
		<div class="absolute -bottom-24 -right-24 w-64 h-64 bg-primary/10 blur-[80px] rounded-full"></div>

		<div class="relative z-10 flex flex-col items-center md:items-start text-center md:text-left gap-4">
			<div class="flex flex-col md:flex-row items-center gap-4">
				<div class="w-16 h-16 rounded-2xl bg-error/20 flex items-center justify-center text-error border border-error/30 flex-shrink-0">
					<span class="material-symbols-outlined text-[40px]" style="font-variation-settings: 'FILL' 1;">close</span>
				</div>
				<div>
					<h1 class="font-headline-xl text-headline-xl text-on-surface flex items-center gap-3">
						错题本 <span class="text-error font-extrabold">( {wrongRecords.length} 道 )</span>
					</h1>
					<p class="text-on-surface-variant text-body-md mt-1">巩固薄弱知识，反复练习提升正确率</p>
				</div>
			</div>

			<!-- Filter Tabs -->
			<div class="flex gap-3 mt-4 p-1 bg-surface-container-low rounded-2xl border border-outline-variant/10">
				<button
					onclick={() => activeFilter = 'all'}
					class="px-6 py-2 rounded-xl font-label-md transition-all cursor-pointer {activeFilter === 'all' ? 'primary-gradient text-white shadow-lg shadow-indigo-500/20' : 'text-on-surface-variant hover:bg-surface-bright/10'}"
				>
					全部 ({wrongQuestionsDetail().length})
				</button>
				<button
					onclick={() => activeFilter = 'single'}
					class="px-6 py-2 rounded-xl font-label-md transition-all cursor-pointer {activeFilter === 'single' ? 'primary-gradient text-white shadow-lg shadow-indigo-500/20' : 'text-on-surface-variant hover:bg-surface-bright/10'}"
				>
					单选题 ({wrongQuestionsDetail().filter(i => i.question.type === 'single').length})
				</button>
				<button
					onclick={() => activeFilter = 'multiple'}
					class="px-6 py-2 rounded-xl font-label-md transition-all cursor-pointer {activeFilter === 'multiple' ? 'primary-gradient text-white shadow-lg shadow-indigo-500/20' : 'text-on-surface-variant hover:bg-surface-bright/10'}"
				>
					多选题 ({wrongQuestionsDetail().filter(i => i.question.type === 'multiple').length})
				</button>
			</div>
		</div>

		<div class="relative z-10 w-48 md:w-56 h-48 md:h-56 flex-shrink-0">
			<img
				alt="Mistake Notebook Icon"
				class="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-pulse"
				src="https://lh3.googleusercontent.com/aida-public/AB6AXuALiR6gq-myC1kB-sxcPWPGwQMQLqytDChVx_JXdNZ9nybrFZdehVL_bJYeGZ1VIqO_R_5b_EHy4qYQ_0UYro0QJbAixJdTwRUXhNukH1CHHwMKFLEjUq1gzeigu9X7iSsD_Oh4_8Rj5OyPw1LsaC0yS_YuFyU4vNtdeRJA5zbL96M__KhjO8CVXtFs3iK5a_KxXzFM0s8mPq2KEdOkHQqRU8OI6j6U9VWqykYfrsYvVrTmXrWX-yXpMgUEAwrNkAPnKjN1jTcLftzs"
			/>
		</div>
	</header>

	{#if filteredQuestions().length === 0}
		<!-- Empty State for filtered selection -->
		<div class="glass-panel rounded-3xl p-12 text-center space-y-4">
			<span class="material-symbols-outlined text-[64px] text-on-surface-variant">auto_stories</span>
			<h3 class="font-headline-md text-headline-md text-on-surface">错题本中没有相应的错题</h3>
			<p class="text-on-surface-variant text-body-md max-w-md mx-auto">
				干得漂亮！这说明你已经攻克了这一类的题目。继续保持，多去主面板练习吧！
			</p>
		</div>
	{:else}
		<!-- Questions List Table / Accordion Layout -->
		<section class="glass-panel rounded-3xl overflow-hidden border border-outline-variant/10">
			<!-- Table Header -->
			<div class="hidden md:grid grid-cols-[60px_1fr_120px_200px_160px] px-8 py-4 bg-surface-container-high/50 border-b border-outline-variant/10 text-on-surface-variant font-label-md">
				<div>题号</div>
				<div>题目预览</div>
				<div class="text-center">错误次数</div>
				<div class="text-center">最后错误时间</div>
				<div class="text-right">操作</div>
			</div>

			<!-- Table Rows -->
			<div class="divide-y divide-outline-variant/5">
				{#each filteredQuestions() as { record, question }, idx}
					<div
						onclick={() => practiceSingle(question.id)}
						class="grid grid-cols-1 md:grid-cols-[60px_1fr_120px_200px_160px] px-8 py-5 items-center row-hover transition-all duration-200 cursor-pointer gap-4 md:gap-0"
					>
						<!-- ID -->
						<div class="font-code text-primary opacity-60 text-body-sm md:text-body-md">
							{question.id}
						</div>

						<!-- Title & Type Badge -->
						<div class="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 truncate">
							<span class="inline-flex self-start md:self-auto px-3 py-1 rounded-lg text-body-sm font-semibold border {question.type === 'single' ? 'bg-tertiary-container/10 text-tertiary border-tertiary/30' : 'bg-secondary-container/20 text-on-secondary-container border-secondary-container/30'}">
								{question.type === 'single' ? '单选题' : '多选题'}
							</span>
							<span class="text-on-surface truncate text-body-md pr-8 font-semibold">
								{question.title.replace(/```python[\s\S]*```/g, '[代码块]')}
							</span>
						</div>

						<!-- Wrong Count -->
						<div class="flex justify-between md:justify-center items-center">
							<span class="md:hidden text-on-surface-variant text-body-sm">错误次数：</span>
							<span class="font-bold text-error text-body-md">{record.count} 次</span>
						</div>

						<!-- Last Error Time -->
						<div class="flex justify-between md:justify-center items-center">
							<span class="md:hidden text-on-surface-variant text-body-sm">最后错误时间：</span>
							<span class="text-on-surface-variant font-code text-body-sm">{record.lastWrongTime}</span>
						</div>

						<!-- Actions -->
						<div class="flex md:justify-end gap-2">
							<button
								onclick={(e) => { e.stopPropagation(); practiceSingle(question.id); }}
								class="flex-1 md:flex-initial px-4 py-2 rounded-xl primary-gradient text-white text-body-sm font-bold glow-hover transition-all active:scale-95 cursor-pointer text-center"
							>
								重练
							</button>
							<button
								onclick={(e) => handleRemove(question.id, e)}
								class="px-3 py-2 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:text-error hover:bg-error/10 transition-all active:scale-95 cursor-pointer"
								title="移出错题本"
							>
								<span class="material-symbols-outlined text-[18px]">delete</span>
							</button>
						</div>
					</div>
				{/each}
			</div>

			<!-- Stats Footer -->
			<div class="bg-surface-container-high/30 p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-outline-variant/10">
				<span class="text-on-surface-variant text-body-sm">
					显示 1-{filteredQuestions().length} 之 {filteredQuestions().length} 道题
				</span>
			</div>
		</section>
	{/if}
</div>

{#if showConfirmModal}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
	>
		<div
			class="glass-panel max-w-md w-full rounded-3xl p-8 border border-outline-variant/20 shadow-2xl relative overflow-hidden animate-scale-up"
		>
			<!-- Decorative Light -->
			<div class="absolute -top-12 -right-12 w-32 h-32 bg-error/15 blur-2xl rounded-full"></div>
			
			<div class="flex items-center gap-4 text-error mb-4">
				<div class="w-12 h-12 rounded-2xl bg-error/15 flex items-center justify-center border border-error/25">
					<span class="material-symbols-outlined text-[28px]">warning</span>
				</div>
				<h3 class="font-headline-md text-headline-md text-on-surface">确认重新开始？</h3>
			</div>

			<p class="text-on-surface-variant font-body-md leading-relaxed mb-6">
				检测到您有未完成的答题进度（<span class="text-primary font-semibold">{modeText}，第 {quizStore.savedSessionDetails?.questionNumber} 题</span>）。重练错题会清除现有的答题记录，确定要开始吗？
			</p>

			<div class="flex gap-4">
				<button
					onclick={() => { showConfirmModal = false; pendingQId = null; }}
					class="flex-1 py-3 border border-outline-variant/30 text-on-surface hover:bg-surface-bright/10 font-bold rounded-xl transition-all cursor-pointer active:scale-95"
				>
					取消
				</button>
				<button
					onclick={confirmRestart}
					class="flex-1 py-3 bg-error text-white font-bold rounded-xl hover:bg-error/80 transition-all cursor-pointer active:scale-95 shadow-lg shadow-error/20"
				>
					确认重新开始
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	@keyframes scaleUp {
		from { transform: scale(0.95); opacity: 0; }
		to { transform: scale(1); opacity: 1; }
	}
	.animate-fade-in {
		animation: fadeIn 0.2s ease-out forwards;
	}
	.animate-scale-up {
		animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}
</style>
