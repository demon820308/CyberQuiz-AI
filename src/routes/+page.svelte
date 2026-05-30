<script lang="ts">
	import { quizStore } from '$lib/store.svelte';
	import { goto } from '$app/navigation';

	let showConfirmModal = $state(false);
	let pendingMode = $state<'sequential' | 'random' | 'wrong' | null>(null);

	// Handle quick start
	function startPractice(mode: 'sequential' | 'random' | 'wrong') {
		if (mode === 'wrong' && quizStore.wrongBook.length === 0) {
			// Alert or no-op if wrong book is empty
			return;
		}
		if (quizStore.hasSavedProgress) {
			pendingMode = mode;
			showConfirmModal = true;
		} else {
			executeStartPractice(mode);
		}
	}

	function executeStartPractice(mode: 'sequential' | 'random' | 'wrong') {
		quizStore.initSession(mode);
		goto('/quiz');
	}

	function confirmRestart() {
		showConfirmModal = false;
		if (pendingMode) {
			executeStartPractice(pendingMode);
		}
	}

	function resumePractice() {
		goto('/quiz');
	}

	// Calculate stats
	let totalQuestions = $derived(quizStore.questions.length);
	let wrongBookCount = $derived(quizStore.wrongBook.length);
	
	let accuracy = $derived(() => {
		const totalAttempts = quizStore.history.length;
		if (totalAttempts === 0) return 0;
		const correctAttempts = quizStore.history.filter(h => h.correct).length;
		return Math.round((correctAttempts / totalAttempts) * 100);
	});

	let modeText = $derived(() => {
		const mode = quizStore.savedSessionDetails?.mode;
		if (mode === 'wrong') return '错题攻坚';
		if (mode === 'random') return '随机练习';
		if (mode === 'sequential') return '顺序练习';
		return '';
	});
</script>

<svelte:head>
	<title>CyberQuiz AI - 智能刷题面板</title>
</svelte:head>

<div class="pt-24 px-margin-mobile md:px-margin-desktop max-w-[1280px] mx-auto pb-24 md:pb-12">
	<!-- Hero Section -->
	<section
		class="relative overflow-hidden glass-card rounded-3xl p-8 md:p-12 mb-stack-lg border border-outline-variant/10"
	>
		<!-- Animated Glows -->
		<div class="absolute -top-24 -left-24 w-80 h-80 bg-primary/20 blur-[100px] rounded-full animate-pulse"></div>
		<div class="absolute -bottom-24 -right-24 w-80 h-80 bg-secondary/15 blur-[100px] rounded-full animate-pulse"></div>

		<div class="relative z-10 grid md:grid-cols-2 items-center gap-8">
			<div class="text-left">
				<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-body-sm font-semibold mb-6">
					<span class="material-symbols-outlined text-[16px] animate-bounce">bolt</span>
					AI 智能备考系统已就绪
				</div>
				<h2 class="font-headline-xl text-headline-xl mb-4 text-on-surface leading-tight">
					准备好开始刷题了吗？<span class="text-primary font-bold">（当前题库：{quizStore.activeBankName}）</span>
				</h2>
				<p class="font-body-lg text-body-lg text-on-surface-variant">
					当前题库共 <span class="text-primary font-bold">{totalQuestions}</span> 道题，错题本中存有
					<span class="text-error font-bold">{wrongBookCount}</span> 道错题。
				</p>
				<div class="mt-8 flex flex-wrap gap-4">
					{#if quizStore.hasSavedProgress && quizStore.savedSessionDetails}
						<button
							onclick={resumePractice}
							class="px-8 py-4 bg-gradient-to-r from-[#6366F1] to-[#A855F7] text-white font-bold rounded-2xl primary-glow hover:scale-105 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
						>
							<span class="material-symbols-outlined animate-pulse">play_circle</span>
							继续上次练习 ({modeText()} | 第 {quizStore.savedSessionDetails.questionNumber} / {quizStore.savedSessionDetails.totalQuestions} 题)
						</button>
						<button
							onclick={() => startPractice('sequential')}
							class="px-8 py-4 border border-outline-variant/30 text-on-surface hover:bg-surface-bright/10 font-bold rounded-2xl transition-all active:scale-95 cursor-pointer inline-flex items-center gap-2"
						>
							<span class="material-symbols-outlined">restart_alt</span>
							重新开始
						</button>
					{:else}
						<button
							onclick={() => startPractice('sequential')}
							class="px-8 py-4 bg-gradient-to-r from-[#6366F1] to-[#A855F7] text-white font-bold rounded-2xl primary-glow hover:scale-105 active:scale-95 transition-all cursor-pointer"
						>
							立即开始练习
						</button>
					{/if}
					<a
						href="/wrong"
						class="px-8 py-4 border border-outline-variant/30 text-on-surface hover:bg-surface-bright/10 font-bold rounded-2xl transition-all inline-flex items-center gap-2 active:scale-95"
					>
						<span class="material-symbols-outlined">menu_book</span>
						进入错题本
					</a>
				</div>
			</div>

			<!-- Floating 3D Graphic (Stylized Cyber Bookshelf) -->
			<div class="hidden md:flex justify-center items-center relative">
				<div class="absolute w-64 h-64 bg-primary/20 blur-[80px] rounded-full animate-pulse"></div>
				<div class="floating relative">
					<img
						alt="Cyber Bookshelf 3D Graphic"
						class="w-72 h-72 object-contain drop-shadow-[0_0_40px_rgba(99,102,241,0.4)] cyber-book-img"
						src="https://lh3.googleusercontent.com/aida-public/AB6AXuAdwYHKeS--NW7HBcAovF1jbSFCWXtGY0HZD5fR_lAGTVKcxpmvGJAOLmW_hJWT14gJDDFHJf-F8okfOTiS8fuCap6XIISzRlaOYMvUZ21v8OLbe1foRoKptLNtmXGfN8ksAWACh6qZmkXxGfL3MJahdQzzt9-N26fsttxz6NoEM3tN746EAIQwvGIwSWFUcxdYKJMRW76g32wrpPy1H6Pc7expagtlOIg8Ue-GtZ9MjtipqPdMc_ODrP4SVxWwltG8uU93x9O6d8rh"
					/>
				</div>
			</div>
		</div>
	</section>


	<!-- Bento Practice Modes Section -->
	<h3 class="font-headline-lg text-headline-lg text-on-surface mb-6 flex items-center gap-2">
		<span class="material-symbols-outlined text-primary">explore</span>
		智能练习模式
	</h3>

	<section class="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-stack-lg">
		<!-- Sequential Practice Card -->
		<div class="glass-card rounded-3xl p-8 gradient-border flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300">
			<div class="space-y-4">
				<div class="flex justify-between items-start">
					<div class="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
						<span class="material-symbols-outlined text-[28px]">format_list_numbered</span>
					</div>
					<span class="px-3 py-1 bg-primary/10 text-primary rounded-lg text-body-sm font-semibold">
						基础巩固
					</span>
				</div>
				<h4 class="font-headline-md text-headline-md text-on-surface">顺序练习</h4>
				<p class="text-on-surface-variant text-body-md leading-relaxed">
					按照题目导入顺序依次作答，支持系统化扫盲，确保覆盖到每一个知识盲区。
				</p>
			</div>
			<button
				onclick={() => startPractice('sequential')}
				class="mt-8 w-full py-4 bg-surface-container-high hover:bg-primary-container/20 hover:text-primary text-on-surface font-bold rounded-2xl transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
			>
				开始顺序练习
				<span class="material-symbols-outlined text-sm">arrow_forward</span>
			</button>
		</div>

		<!-- Random Practice Card -->
		<div class="glass-card rounded-3xl p-8 gradient-border flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300">
			<div class="space-y-4">
				<div class="flex justify-between items-start">
					<div class="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary border border-secondary/20">
						<span class="material-symbols-outlined text-[28px]">shuffle</span>
					</div>
					<span class="px-3 py-1 bg-secondary/10 text-secondary rounded-lg text-body-sm font-semibold">
						模拟实战
					</span>
				</div>
				<h4 class="font-headline-md text-headline-md text-on-surface">随机乱序练习</h4>
				<p class="text-on-surface-variant text-body-md leading-relaxed">
					打乱题目顺序，拒绝机械性位置记忆，模拟考场中的随机出题场景，有效提高应变力。
				</p>
			</div>
			<button
				onclick={() => startPractice('random')}
				class="mt-8 w-full py-4 bg-surface-container-high hover:bg-secondary-container/25 hover:text-secondary text-on-surface font-bold rounded-2xl transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
			>
				开始随机练习
				<span class="material-symbols-outlined text-sm">arrow_forward</span>
			</button>
		</div>

		<!-- Wrong Book Practice Card -->
		<div class="glass-card rounded-3xl p-8 gradient-border flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300 {wrongBookCount === 0 ? 'opacity-70' : ''}">
			<div class="space-y-4">
				<div class="flex justify-between items-start">
					<div class="w-12 h-12 bg-error/10 rounded-2xl flex items-center justify-center text-error border border-error/20">
						<span class="material-symbols-outlined text-[28px]">menu_book</span>
					</div>
					<span class="px-3 py-1 bg-error/10 text-error rounded-lg text-body-sm font-semibold">
						薄弱击破
					</span>
				</div>
				<h4 class="font-headline-md text-headline-md text-on-surface">错题本强化</h4>
				<p class="text-on-surface-variant text-body-md leading-relaxed">
					精准锁定过去答错的题目，按照错误频次智能推荐练习，重点巩固薄弱难关。
				</p>
			</div>
			<button
				onclick={() => startPractice('wrong')}
				disabled={wrongBookCount === 0}
				class="mt-8 w-full py-4 {wrongBookCount === 0 ? 'bg-surface-container-high/50 text-on-surface-variant cursor-not-allowed' : 'bg-surface-container-high hover:bg-error-container/20 hover:text-error text-on-surface cursor-pointer'} font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
			>
				{wrongBookCount === 0 ? '暂无错题' : '开始错题攻坚'}
				<span class="material-symbols-outlined text-sm">arrow_forward</span>
			</button>
		</div>
	</section>

	<!-- Quick Stats Overview -->
	<h3 class="font-headline-lg text-headline-lg text-on-surface mb-6 flex items-center gap-2">
		<span class="material-symbols-outlined text-primary">insights</span>
		学习概况
	</h3>

	<section class="grid grid-cols-2 md:grid-cols-4 gap-gutter mb-6">
		<div class="glass-card rounded-2xl p-6 text-center">
			<span class="text-on-surface-variant text-body-sm block mb-1">已导入题库</span>
			<span class="font-headline-xl text-headline-xl font-extrabold text-primary">{totalQuestions}</span>
			<span class="text-on-surface-variant text-body-sm block mt-1">道题目</span>
		</div>
		<div class="glass-card rounded-2xl p-6 text-center">
			<span class="text-on-surface-variant text-body-sm block mb-1">错题积累</span>
			<span class="font-headline-xl text-headline-xl font-extrabold text-error">{wrongBookCount}</span>
			<span class="text-on-surface-variant text-body-sm block mt-1">道错题</span>
		</div>
		<div class="glass-card rounded-2xl p-6 text-center">
			<span class="text-on-surface-variant text-body-sm block mb-1">平均正确率</span>
			<span class="font-headline-xl text-headline-xl font-extrabold text-tertiary">{accuracy()}%</span>
			<span class="text-on-surface-variant text-body-sm block mt-1">累计作答</span>
		</div>
		<div class="glass-card rounded-2xl p-6 text-center">
			<span class="text-on-surface-variant text-body-sm block mb-1">作答记录数</span>
			<span class="font-headline-xl text-headline-xl font-extrabold text-secondary">{quizStore.history.length}</span>
			<span class="text-on-surface-variant text-body-sm block mt-1">次练习</span>
		</div>
	</section>
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
				检测到您有未完成的答题进度（<span class="text-primary font-semibold">{modeText()}，第 {quizStore.savedSessionDetails?.questionNumber} 题</span>）。重新开始会清除现有的答题记录，确定要从头开始新练习吗？
			</p>

			<div class="flex gap-4">
				<button
					onclick={() => showConfirmModal = false}
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
