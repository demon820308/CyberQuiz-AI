<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();
	const volumes = $derived(data.volumes || []);

	// Define style map for each volume to create a harmonious cyber-themed dashboard
	const volumeStyles: Record<string, { gradient: string; glow: string; text: string; icon: string }> = {
		volume1: {
			gradient: 'from-blue-600/15 to-cyan-500/15',
			glow: 'shadow-blue-500/5 border-blue-500/20 hover:border-blue-500/50 hover:shadow-blue-500/10',
			text: 'text-blue-400',
			icon: 'chrome_reader_mode'
		},
		volume2: {
			gradient: 'from-purple-600/15 to-indigo-500/15',
			glow: 'shadow-purple-500/5 border-purple-500/20 hover:border-purple-500/50 hover:shadow-purple-500/10',
			text: 'text-purple-400',
			icon: 'description'
		},
		volume3: {
			gradient: 'from-amber-600/15 to-orange-500/15',
			glow: 'shadow-amber-500/5 border-amber-500/20 hover:border-amber-500/50 hover:shadow-amber-500/10',
			text: 'text-amber-400',
			icon: 'history_edu'
		},
		volume4: {
			gradient: 'from-rose-600/15 to-red-500/15',
			glow: 'shadow-rose-500/5 border-rose-500/20 hover:border-rose-500/50 hover:shadow-rose-500/10',
			text: 'text-rose-400',
			icon: 'menu_book'
		},
		volume5: {
			gradient: 'from-cyan-600/15 to-blue-500/15',
			glow: 'shadow-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/50 hover:shadow-cyan-500/10',
			text: 'text-cyan-400',
			icon: 'analytics'
		},
		volume6: {
			gradient: 'from-fuchsia-600/15 to-pink-500/15',
			glow: 'shadow-fuchsia-500/5 border-fuchsia-500/20 hover:border-fuchsia-500/50 hover:shadow-fuchsia-500/10',
			text: 'text-fuchsia-400',
			icon: 'workspace_premium'
		}
	};

	function selectVolume(volumeId: string) {
		goto(`/reading/${volumeId}`);
	}
</script>

<svelte:head>
	<title>语文阅读理解精讲 - CyberQuiz AI</title>
</svelte:head>

<div class="pt-24 pb-20 px-4 md:px-margin-desktop max-w-[1280px] mx-auto min-h-screen flex flex-col justify-start relative">
	
	<!-- Background Decorative Glows -->
	<div class="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
	<div class="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] pointer-events-none"></div>

	<!-- Header Hero Title Section -->
	<div class="mb-10 z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
		<div>
			<div class="flex items-center gap-3 mb-2.5">
				<span class="material-symbols-outlined text-primary text-3xl animate-pulse">auto_stories</span>
				<h2 class="font-headline-xl text-headline-xl text-on-surface font-extrabold tracking-tight">语文阅读理解</h2>
			</div>
			<p class="text-on-surface-variant text-body-lg max-w-xl">
				同步精细化满分答题模板、公式与核心避坑技巧，助你中考冲刺拿高分 ✦
			</p>
		</div>
	</div>

	<!-- Bento Semesters Cards Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter items-stretch z-10 flex-grow">
		{#each volumes as vol}
			{@const style = volumeStyles[vol.id] || volumeStyles.volume1}
			<button
				onclick={() => selectVolume(vol.id)}
				class="group text-left glass-card rounded-3xl p-6 border transition-all duration-500 hover:-translate-y-1.5 bg-surface-container-low/40 hover:bg-surface-container-high/45 flex flex-col justify-between min-h-[260px] relative overflow-hidden shadow-lg {style.glow} cursor-pointer"
			>
				<!-- Abstract cover background generated pattern -->
				<div class="absolute inset-0 bg-cover bg-center opacity-5 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none" style="background-image: url('/cyber_book_cover.png')"></div>
				
				<!-- Subtle internal glowing spot on hover -->
				<div class="absolute -right-16 -top-16 w-32 h-32 bg-primary/5 group-hover:bg-primary/10 rounded-full blur-2xl transition-all duration-700 pointer-events-none"></div>

				<!-- Card Content Header -->
				<div class="w-full flex justify-between items-start mb-6 z-10">
					<div class="space-y-2.5 flex-grow pr-4">
						<span class="px-2.5 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-primary font-label-md text-xs select-none">中考精讲</span>
						<h3 class="font-headline-md text-headline-md font-extrabold text-on-surface group-hover:text-primary transition-colors leading-tight">
							{vol.title}
						</h3>
						<p class="text-xs text-on-surface-variant leading-relaxed font-medium line-clamp-2">
							{vol.desc}
						</p>
					</div>
					
					<!-- Animated Icon Container -->
					<div class="w-14 h-14 rounded-2xl bg-surface-container-high border border-outline-variant/15 flex items-center justify-center {style.text} group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-inner shrink-0">
						<span class="material-symbols-outlined text-[28px]">{style.icon}</span>
					</div>
				</div>

				<!-- Card Metadata Footer -->
				<div class="w-full border-t border-outline-variant/10 pt-4 flex items-center justify-between z-10">
					<div class="flex items-center gap-4 text-[11px] text-on-surface-variant font-code">
						<div class="flex items-center gap-1">
							<span class="material-symbols-outlined text-[15px] text-primary">bookmark</span>
							<span><strong>{vol.chapterCount}</strong> 个章节</span>
						</div>
						<div class="flex items-center gap-1">
							<span class="material-symbols-outlined text-[15px] text-secondary">schedule</span>
							<span>约 <strong>{vol.readingTime}</strong> 分钟</span>
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
	<div class="mt-10 z-10 glass-card rounded-2xl p-4.5 border border-outline-variant/10 bg-primary/5 flex items-center justify-center gap-3">
		<span class="material-symbols-outlined text-primary text-[22px] animate-pulse">menu_book</span>
		<p class="text-xs text-on-surface-variant font-medium">
			点击任意分卷进入沉浸式阅读面板，支持<span class="text-primary font-bold">大纲索引快速跳转</span>与<span class="text-primary font-bold">高分公式一键复制</span>
		</p>
	</div>
</div>
