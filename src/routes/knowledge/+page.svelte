<script lang="ts">
	import { goto } from '$app/navigation';
	import { quizStore } from '$lib/store.svelte';

	interface SemesterCard {
		id: string;
		grade: string;
		term: string;
		desc: string;
		icon: string;
		gradient: string;
		glowColor: string;
		iconColor: string;
	}

	const semesters: SemesterCard[] = [
		{
			id: 'grade7_up',
			grade: '七年级',
			term: '上学期',
			desc: '同步知识问答题，夯实基础 · 稳步提升',
			icon: 'menu_book',
			gradient: 'from-blue-600/20 to-cyan-500/20',
			glowColor: 'shadow-blue-500/10 border-blue-500/30',
			iconColor: 'text-blue-400'
		},
		{
			id: 'grade7_down',
			grade: '七年级',
			term: '下学期',
			desc: '同步知识问答题，查漏补缺 · 巩固提高',
			icon: 'trending_up',
			gradient: 'from-purple-600/20 to-indigo-500/20',
			glowColor: 'shadow-purple-500/10 border-purple-500/30',
			iconColor: 'text-purple-400'
		},
		{
			id: 'grade8_up',
			grade: '八年级',
			term: '上学期',
			desc: '同步知识问答题，系统学习 · 能力进阶',
			icon: 'science',
			gradient: 'from-cyan-600/20 to-teal-500/20',
			glowColor: 'shadow-cyan-500/10 border-cyan-500/30',
			iconColor: 'text-cyan-400'
		},
		{
			id: 'grade8_down',
			grade: '八年级',
			term: '下学期',
			desc: '同步知识问答题，综合运用 · 冲刺提优',
			icon: 'architecture',
			gradient: 'from-amber-600/20 to-orange-500/20',
			glowColor: 'shadow-amber-500/10 border-amber-500/30',
			iconColor: 'text-amber-400'
		},
		{
			id: 'grade9_up',
			grade: '九年级',
			term: '上学期',
			desc: '同步知识问答题，中考导向 · 专项突破',
			icon: 'target',
			gradient: 'from-fuchsia-600/20 to-pink-500/20',
			glowColor: 'shadow-fuchsia-500/10 border-fuchsia-500/30',
			iconColor: 'text-fuchsia-400'
		},
		{
			id: 'grade9_down',
			grade: '九年级',
			term: '下学期',
			desc: '同步知识问答题，考前冲刺 · 精准提分',
			icon: 'rocket_launch',
			gradient: 'from-rose-600/20 to-red-500/20',
			glowColor: 'shadow-rose-500/10 border-rose-500/30',
			iconColor: 'text-rose-400'
		}
	];

	// Dynamically count actual questions per semester from store
	function getCount(semId: string): number {
		return quizStore.knowledgeQuestions.filter(q => q.semester === semId).length;
	}

	function selectSemester(id: string) {
		goto(`/knowledge/${id}`);
	}
</script>

<svelte:head>
	<title>知识问答 - CyberQuiz AI</title>
</svelte:head>

<div class="pt-24 pb-20 px-4 md:px-margin-desktop max-w-[1280px] mx-auto min-h-screen flex flex-col justify-start relative">
	
	<!-- Background Decorative Glows -->
	<div class="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
	<div class="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] pointer-events-none"></div>

	<!-- Header Hero Title Section -->
	<div class="mb-8 z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
		<div>
			<div class="flex items-center gap-3 mb-2">
				<span class="material-symbols-outlined text-primary text-3xl animate-pulse">auto_awesome</span>
				<h2 class="font-headline-xl text-headline-xl text-on-surface font-extrabold">知识问答</h2>
			</div>
			<p class="text-on-surface-variant text-body-lg max-w-xl">
				请选择学期，开始你的智能练习之旅 ✦
			</p>
		</div>
	</div>

	<!-- Bento Semesters Cards Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter items-stretch z-10">
		{#each semesters as sem}
			<button
				onclick={() => selectSemester(sem.id)}
				class="group text-left glass-card rounded-3xl p-6 border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 hover:-translate-y-1 bg-surface-container-low/40 hover:bg-surface-container-high/30 flex flex-col justify-between min-h-[220px] relative overflow-hidden shadow-lg {sem.glowColor} cursor-pointer"
			>
				<!-- Subtle internal glowing spot on hover -->
				<div class="absolute -right-16 -top-16 w-32 h-32 bg-primary/5 group-hover:bg-primary/10 rounded-full blur-2xl transition-all duration-700 pointer-events-none"></div>

				<!-- Card Content Header -->
				<div class="w-full flex justify-between items-start mb-6">
					<div>
						<div class="flex items-center gap-2">
							<span class="font-headline-xl text-headline-md font-extrabold text-on-surface group-hover:text-primary transition-colors">{sem.grade}</span>
							<span class="px-2.5 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-primary font-label-md text-xs">{sem.term}</span>
						</div>
						<p class="text-xs text-on-surface-variant leading-relaxed mt-2 pr-8 font-medium">
							{sem.desc}
						</p>
					</div>
					
					<!-- Animated Icon Container -->
					<div class="w-14 h-14 rounded-2xl bg-surface-container-high border border-outline-variant/15 flex items-center justify-center {sem.iconColor} group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-inner">
						<span class="material-symbols-outlined text-[28px]">{sem.icon}</span>
					</div>
				</div>

				<!-- Card Metadata Footer -->
				<div class="w-full border-t border-outline-variant/10 pt-4 flex items-center justify-between">
					<div class="flex gap-4">
						<div class="flex items-center gap-1.5 text-xs text-on-surface-variant font-code">
							<span class="material-symbols-outlined text-[16px] text-primary">description</span>
							<span>已导入: <strong class="text-on-surface">{getCount(sem.id)} 题</strong></span>
						</div>
					</div>

					<!-- Direct Arrow Circle -->
					<div class="w-8 h-8 rounded-full bg-primary/10 group-hover:bg-primary text-primary group-hover:text-on-primary flex items-center justify-center transition-all duration-500 group-hover:translate-x-1 shadow">
						<span class="material-symbols-outlined text-[16px] font-bold">arrow_forward_ios</span>
					</div>
				</div>
			</button>
		{/each}
	</div>

	<!-- Hint Alert Bar at the Bottom -->
	<div class="mt-8 z-10 glass-card rounded-2xl p-4 border border-outline-variant/10 bg-primary/5 flex items-center justify-center gap-3">
		<span class="material-symbols-outlined text-primary text-[20px] animate-pulse">lightbulb</span>
		<p class="text-xs text-on-surface-variant font-medium">
			选择对应学期开始练习，<span class="text-primary font-bold">AI</span> 将根据您的答题情况智能推荐薄弱知识点
		</p>
	</div>
</div>
