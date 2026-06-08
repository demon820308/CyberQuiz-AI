<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { quizStore } from '$lib/store.svelte';
	import { onMount } from 'svelte';

	let { data } = $props();
	const volume = $derived(data.volume);
	const chapters = $derived(volume?.chapters || []);

	// Svelte 5 Runes for local state
	let activeAnchorId = $state('');
	let filterMode = $state<'all' | 'formulas' | 'templates' | 'warnings'>('all');
	let fontSize = $state(15); // in pixels
	let isSidebarOpen = $state(true);
	let searchQuery = $state('');

	// Go back to the reading list
	function goBack() {
		goto('/reading');
	}

	// Scroll to specific chapter anchor
	function scrollToAnchor(id: string) {
		const element = document.getElementById(id);
		if (element) {
			const yOffset = -90; // offset for sticky top bar
			const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
			window.scrollTo({ top: y, behavior: 'smooth' });
			activeAnchorId = id;
		}
	}

	// Dynamic active anchor tracking (ScrollSpy)
	$effect(() => {
		if (chapters.length === 0) return;

		const handleScroll = () => {
			const scrollPos = window.scrollY + 120; // Trigger slightly before it hits top
			const elements = chapters.map(ch => ({
				id: ch.anchorId,
				el: document.getElementById(ch.anchorId)
			}));

			for (let i = elements.length - 1; i >= 0; i--) {
				const item = elements[i];
				if (item.el && item.el.offsetTop <= scrollPos) {
					activeAnchorId = item.id;
					break;
				}
			}
		};

		window.addEventListener('scroll', handleScroll);
		// Run once initially
		handleScroll();

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});

	// Dynamic Scroll to Top helper
	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	// Outline filtering based on search
	let filteredChaptersList = $derived(
		chapters.filter(ch => {
			if (!searchQuery.trim()) return true;
			return ch.title.toLowerCase().includes(searchQuery.trim().toLowerCase());
		})
	);
</script>

<svelte:head>
	<title>{volume?.title || '阅读理解'} - CyberQuiz AI</title>
</svelte:head>

<div class="pt-16 pb-20 min-h-screen bg-surface-container-lowest flex flex-col relative">
	
	<!-- Top Sticky Navigation & Controls Bar -->
	<header class="sticky top-16 z-30 w-full bg-surface-container/90 backdrop-blur-xl border-b border-outline-variant/15 px-4 md:px-6 py-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
		
		<!-- Left: Back Button & Title -->
		<div class="flex items-center gap-3">
			<button
				onclick={goBack}
				class="w-9 h-9 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-high hover:text-primary border border-outline-variant/15 flex items-center justify-center transition-all duration-300 active:scale-90 cursor-pointer text-on-surface shrink-0"
				title="返回列表"
			>
				<span class="material-symbols-outlined text-[18px]">arrow_back_ios_new</span>
			</button>
			<div class="space-y-0.5">
				<h2 class="font-bold text-base md:text-lg text-on-surface leading-tight">
					{volume?.title || '加载中...'}
				</h2>
				<div class="text-[10px] text-on-surface-variant font-code uppercase tracking-wider flex items-center gap-2">
					<a href="/reading" class="hover:text-primary transition-colors">阅读理解</a>
					<span>/</span>
					<span class="text-primary font-semibold">正文精讲</span>
				</div>
			</div>
		</div>

		<!-- Middle/Right: Quick Filters & Font Settings -->
		<div class="flex flex-wrap items-center gap-4">
			<!-- Quick filter tabs -->
			<div class="flex p-1 bg-surface-container-low rounded-xl border border-outline-variant/10 shrink-0 font-code text-xs">
				<button
					onclick={() => filterMode = 'all'}
					class="px-3.5 py-1.5 rounded-lg transition-all font-bold cursor-pointer {filterMode === 'all' ? 'primary-gradient text-white shadow' : 'text-on-surface-variant hover:bg-surface-bright/10'}"
				>
					全部
				</button>
				<button
					onclick={() => filterMode = 'formulas'}
					class="px-3.5 py-1.5 rounded-lg transition-all font-bold cursor-pointer {filterMode === 'formulas' ? 'bg-secondary text-on-secondary shadow' : 'text-on-surface-variant hover:bg-surface-bright/10'}"
				>
					公式
				</button>
				<button
					onclick={() => filterMode = 'templates'}
					class="px-3.5 py-1.5 rounded-lg transition-all font-bold cursor-pointer {filterMode === 'templates' ? 'bg-primary text-on-primary shadow' : 'text-on-surface-variant hover:bg-surface-bright/10'}"
				>
					模板
				</button>
				<button
					onclick={() => filterMode = 'warnings'}
					class="px-3.5 py-1.5 rounded-lg transition-all font-bold cursor-pointer {filterMode === 'warnings' ? 'bg-error text-on-error shadow' : 'text-on-surface-variant hover:bg-surface-bright/10'}"
				>
					避坑
				</button>
			</div>

			<!-- Font size controls -->
			<div class="flex items-center gap-1.5 bg-surface-container-low px-2 py-1 rounded-xl border border-outline-variant/10">
				<button
					onclick={() => fontSize = Math.max(12, fontSize - 1)}
					class="w-7 h-7 rounded-lg hover:bg-surface-bright/10 text-on-surface-variant flex items-center justify-center transition-all cursor-pointer font-bold text-xs select-none"
					title="缩小字号"
				>
					A-
				</button>
				<span class="text-[11px] font-bold font-code text-on-surface-variant px-1 w-8 text-center">{fontSize}px</span>
				<button
					onclick={() => fontSize = Math.min(22, fontSize + 1)}
					class="w-7 h-7 rounded-lg hover:bg-surface-bright/10 text-on-surface-variant flex items-center justify-center transition-all cursor-pointer font-bold text-xs select-none"
					title="放大字号"
				>
					A+
				</button>
			</div>

			<!-- Sidebar toggler (desktop only) -->
			<button
				onclick={() => isSidebarOpen = !isSidebarOpen}
				class="hidden lg:flex w-9 h-9 rounded-xl border border-outline-variant/15 text-on-surface-variant hover:text-primary hover:bg-primary/10 flex items-center justify-center transition-all cursor-pointer"
				title={isSidebarOpen ? '收起目录大纲' : '展开目录大纲'}
			>
				<span class="material-symbols-outlined text-[20px]">{isSidebarOpen ? 'menu_open' : 'menu'}</span>
			</button>
		</div>
	</header>

	<!-- Main Reader Workspace (Split Outline + Content) -->
	<div class="flex-grow flex relative w-full max-w-[1440px] mx-auto items-stretch">
		
		<!-- Left: Outline Navigation Sidebar -->
		{#if isSidebarOpen}
			<aside class="hidden lg:block w-72 shrink-0 border-r border-outline-variant/10 bg-surface-container-lowest/80 backdrop-blur-md p-5 sticky top-[215px] md:top-[128px] h-[calc(100vh-128px)] overflow-y-auto z-20 flex flex-col gap-4">
				
				<!-- Sidebar Search -->
				<div class="relative w-full">
					<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">search</span>
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="快速筛选目录章节"
						class="w-full bg-surface-container-high/40 border border-outline-variant/15 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-9 pr-3 py-2 text-xs text-on-surface transition-all outline-none"
					/>
				</div>

				<div class="flex-grow overflow-y-auto space-y-1.5 pr-1 font-sans">
					<h3 class="text-[10px] font-bold text-on-surface-variant/40 tracking-widest uppercase mb-3 select-none flex items-center gap-1.5">
						<span class="material-symbols-outlined text-[14px]">format_list_bulleted</span>
						目录大纲索引
					</h3>
					
					{#if filteredChaptersList.length === 0}
						<p class="text-xs text-on-surface-variant/60 italic text-center py-4">未找到匹配章节</p>
					{:else}
						{#each filteredChaptersList as ch}
							<!-- Renders structured TOC with indentations -->
							<button
								onclick={() => scrollToAnchor(ch.anchorId)}
								class="w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-start gap-2
									{activeAnchorId === ch.anchorId ? 'bg-primary/10 text-primary border-l-2 border-primary' : 'text-on-surface-variant hover:bg-surface-bright/10 hover:text-on-surface'}
									{ch.level === 1 ? 'pl-3 font-extrabold text-on-surface' : 'pl-6 font-semibold'}"
							>
								<span class="material-symbols-outlined text-[15px] shrink-0 mt-0.5 opacity-60">
									{ch.level === 1 ? 'folder' : 'article'}
								</span>
								<span class="truncate">{ch.title}</span>
							</button>
						{/each}
					{/if}
				</div>
			</aside>
		{/if}

		<!-- Center: Document Content Reader Pane -->
		<main class="flex-grow px-4 md:px-12 py-8 max-w-4xl mx-auto overflow-hidden
			{filterMode === 'formulas' ? 'filter-formulas' : ''}
			{filterMode === 'templates' ? 'filter-templates' : ''}
			{filterMode === 'warnings' ? 'filter-warnings' : ''}">
			
			<div class="reading-content transition-all duration-300" style="font-size: {fontSize}px">
				{#each chapters as ch}
					<section id={ch.anchorId} class="mb-12 scroll-mt-24">
						{#if ch.level === 1}
							<h2 class="font-headline-xl text-headline-xl font-extrabold text-primary border-b border-outline-variant/15 pb-3.5 mb-6 mt-4 flex items-center gap-3 tracking-tight">
								<span class="material-symbols-outlined text-primary text-3xl">local_library</span>
								{ch.title}
							</h2>
						{:else if ch.level === 2}
							<h3 class="font-headline-lg text-headline-lg font-extrabold text-secondary mt-8 mb-4.5 flex items-center gap-2 tracking-tight">
								<span class="material-symbols-outlined text-secondary text-[22px]">menu_book</span>
								{ch.title}
							</h3>
						{/if}
						<div class="prose max-w-none text-on-surface-variant leading-relaxed">
							{@html ch.contentHtml}
						</div>
					</section>
				{/each}
			</div>

			<!-- Quick Navigation bottom bar (Floating back-to-top / list) -->
			<div class="mt-12 pt-6 border-t border-outline-variant/15 flex items-center justify-between">
				<button
					onclick={goBack}
					class="px-4 py-2 border border-outline-variant/25 text-on-surface hover:text-primary hover:bg-primary/5 text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95"
				>
					返回分卷列表
				</button>
				<button
					onclick={scrollToTop}
					class="flex items-center gap-1.5 px-4 py-2 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-xl hover:bg-primary hover:text-on-primary transition-all cursor-pointer active:scale-95 shadow-sm"
				>
					<span class="material-symbols-outlined text-[16px]">arrow_upward</span>
					<span>返回顶部</span>
				</button>
			</div>
		</main>
	</div>

	<!-- Floating Navigation drawer trigger on mobile -->
	<div class="lg:hidden fixed bottom-20 right-6 z-40 flex flex-col gap-3">
		<button
			onclick={scrollToTop}
			class="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-on-primary shadow-lg flex items-center justify-center transition-all cursor-pointer"
			title="返回顶部"
		>
			<span class="material-symbols-outlined text-[20px]">arrow_upward</span>
		</button>
	</div>
</div>

<style>
	/* Custom Styles for Interactive Filtering inside Markdown Content */
	
	/* Formulas Filter Mode: Hide all paragraphs, lists, quotes, warning cards, and templates */
	.filter-formulas :global(.reading-content p:not(.formula-card p):not(.step-flow-card p)),
	.filter-formulas :global(.reading-content ul:not(.formula-card ul)),
	.filter-formulas :global(.reading-content blockquote),
	.filter-formulas :global(.reading-content .error-warning-card),
	.filter-formulas :global(.reading-content .template-card) {
		display: none !important;
	}

	/* Templates Filter Mode: Hide all paragraphs, lists, quotes, warning cards, and formulas */
	.filter-templates :global(.reading-content p:not(.template-text p):not(.template-card p)),
	.filter-templates :global(.reading-content ul:not(.template-card ul)),
	.filter-templates :global(.reading-content blockquote),
	.filter-templates :global(.reading-content .error-warning-card),
	.filter-templates :global(.reading-content .formula-card),
	.filter-templates :global(.reading-content .step-flow-card) {
		display: none !important;
	}

	/* Warnings/避坑 Filter Mode: Hide everything except error warning cards and headers */
	.filter-warnings :global(.reading-content p:not(.error-warning-card p)),
	.filter-warnings :global(.reading-content ul:not(.error-warning-card ul)),
	.filter-warnings :global(.reading-content blockquote),
	.filter-warnings :global(.reading-content .template-card),
	.filter-warnings :global(.reading-content .formula-card),
	.filter-warnings :global(.reading-content .step-flow-card) {
		display: none !important;
	}
</style>
