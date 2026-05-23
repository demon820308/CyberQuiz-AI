<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { quizStore } from '$lib/store.svelte';

	const semesterId = $derived(page.params.semester || '');

	const semesterNames: Record<string, string> = {
		grade7_up: '七年级上学期',
		grade7_down: '七年级下学期',
		grade8_up: '八年级上学期',
		grade8_down: '八年级下学期',
		grade9_up: '九年级上学期',
		grade9_down: '九年级下学期'
	};

	let semesterName = $derived(semesterNames[semesterId] || '同步学期');

	interface SubjectCard {
		id: string;
		name: string;
		desc: string;
		icon: string;
		gradient: string;
		glowColor: string;
		iconColor: string;
	}

	const subjects: SubjectCard[] = [
		{
			id: 'ethics',
			name: '道德与法治',
			desc: '树立正确价值观，培养法治意识',
			icon: 'gavel',
			gradient: 'from-indigo-600/30 to-purple-500/20',
			glowColor: 'shadow-indigo-500/10 border-indigo-500/30',
			iconColor: 'text-indigo-400'
		},
		{
			id: 'history',
			name: '历史',
			desc: '探索历史脉络，启迪智慧人生',
			icon: 'account_balance',
			gradient: 'from-cyan-600/30 to-blue-500/20',
			glowColor: 'shadow-cyan-500/10 border-cyan-500/30',
			iconColor: 'text-cyan-400'
		},
		{
			id: 'geography',
			name: '地理',
			desc: '认识世界格局，探索地理奥秘',
			icon: 'public',
			gradient: 'from-blue-600/30 to-teal-500/20',
			glowColor: 'shadow-blue-500/10 border-blue-500/30',
			iconColor: 'text-blue-400'
		},
		{
			id: 'biology',
			name: '生物',
			desc: '探索生命科学，了解生命奥秘',
			icon: 'biotech',
			gradient: 'from-purple-600/30 to-rose-500/20',
			glowColor: 'shadow-purple-500/10 border-purple-500/30',
			iconColor: 'text-purple-400'
		}
	];

	// Dynamically count questions per subject within the current semester
	function getSubjectCount(subjectId: string): number {
		return quizStore.knowledgeQuestions.filter(
			q => q.semester === semesterId && q.subject === subjectId
		).length;
	}

	function goBack() {
		goto('/knowledge');
	}

	function selectSubject(subjectId: string) {
		goto(`/knowledge/${semesterId}/${subjectId}`);
	}
</script>

<svelte:head>
	<title>{semesterName} 学科选择 - CyberQuiz AI</title>
</svelte:head>

<div class="pt-24 pb-20 px-4 md:px-margin-desktop max-w-[1280px] mx-auto min-h-screen flex flex-col justify-start relative">
	
	<!-- Background Decorative Glows -->
	<div class="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
	<div class="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] pointer-events-none"></div>

	<!-- Level Navigation Bar (Top-left Back button + Title) -->
	<div class="flex items-center gap-4 mb-6 z-10">
		<button
			onclick={goBack}
			class="w-10 h-10 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-high hover:text-primary border border-outline-variant/15 flex items-center justify-center transition-all duration-300 active:scale-90 cursor-pointer text-on-surface"
			title="返回学期选择"
		>
			<span class="material-symbols-outlined text-[20px]">arrow_back_ios_new</span>
		</button>
		<div class="text-xs text-on-surface-variant font-code uppercase tracking-wider">
			<a href="/knowledge" class="hover:text-primary transition-colors">知识问答</a>
			<span class="mx-2 text-outline">/</span>
			<span class="text-on-surface font-semibold">{semesterName}</span>
		</div>
	</div>

	<!-- Header Hero Section -->
	<div class="mb-8 z-10 flex justify-between items-start">
		<div>
			<div class="flex items-center gap-3 mb-2">
				<h2 class="font-headline-xl text-headline-xl text-on-surface font-extrabold">{semesterName}</h2>
			</div>
			<p class="text-on-surface-variant text-body-lg max-w-xl">
				选择你要练习的学科，开始你的知识探索之旅
			</p>
		</div>
	</div>

	<!-- Subjects Grid (2x2 Card Bento Layout) -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-gutter items-stretch z-10">
		{#each subjects as sub}
			<button
				onclick={() => selectSubject(sub.id)}
				class="group text-left glass-card rounded-3xl p-8 border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 hover:-translate-y-1 bg-surface-container-low/40 hover:bg-surface-container-high/30 flex flex-col md:flex-row items-center justify-between gap-6 min-h-[160px] relative overflow-hidden shadow-lg {sub.glowColor} cursor-pointer"
			>
				<!-- Subtle dynamic glow backplate -->
				<div class="absolute -right-24 -top-24 w-48 h-48 bg-primary/5 group-hover:bg-primary/10 rounded-full blur-3xl transition-all duration-700 pointer-events-none"></div>

				<!-- Left Side: Icon & Details -->
				<div class="flex items-center gap-5 flex-grow">
					<!-- Glow Icon frame -->
					<div class="w-20 h-20 rounded-2xl bg-surface-container-high border border-outline-variant/15 flex items-center justify-center {sub.iconColor} group-hover:scale-115 group-hover:rotate-2 transition-all duration-500 shadow-inner shrink-0 relative">
						<span class="material-symbols-outlined text-[42px]">{sub.icon}</span>
						<!-- Accent border tags -->
						<div class="absolute top-1.5 left-1.5 w-2 h-2 border-t border-l border-primary/30"></div>
						<div class="absolute bottom-1.5 right-1.5 w-2 h-2 border-b border-r border-primary/30"></div>
					</div>
					
					<div class="space-y-1.5">
						<h3 class="font-headline-md text-headline-md font-extrabold text-on-surface group-hover:text-primary transition-colors">
							{sub.name}
						</h3>
						<p class="text-xs text-on-surface-variant leading-relaxed font-medium">
							{sub.desc}
						</p>
						
						<!-- Question counts info -->
						<div class="inline-flex items-center gap-1.5 text-xs text-on-surface-variant font-code bg-surface-container-lowest/80 px-3 py-1 rounded-xl border border-outline-variant/10">
							<span class="material-symbols-outlined text-[15px] text-primary">description</span>
							<span>已导入: <strong class="text-primary font-bold">{getSubjectCount(sub.id)} 题</strong></span>
						</div>
					</div>
				</div>

				<!-- Right Side: Action Trigger -->
				<div class="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary text-primary group-hover:text-on-primary flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow shrink-0 self-end md:self-center">
					<span class="material-symbols-outlined text-[20px] font-bold">arrow_forward_ios</span>
				</div>
			</button>
		{/each}
	</div>

	<!-- Hint Alert Bar at the Bottom -->
	<div class="mt-8 z-10 glass-card rounded-2xl p-4 border border-outline-variant/10 bg-primary/5 flex items-center justify-center gap-3">
		<span class="material-symbols-outlined text-primary text-[20px] animate-pulse">lightbulb</span>
		<p class="text-xs text-on-surface-variant font-medium">
			选择学科开始练习，<span class="text-primary font-bold">AI</span> 将根据你的答题情况智能推荐知识点
		</p>
	</div>
</div>
