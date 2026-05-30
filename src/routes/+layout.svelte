<script lang="ts">
	import './layout.css';
	import { quizStore } from '$lib/store.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { parseMarkdown } from '$lib/utils/mdParser';
	import ParserPreviewModal from '$lib/components/ParserPreviewModal.svelte';
	import UserAuthModal from '$lib/components/UserAuthModal.svelte';
	import UserSettingsModal from '$lib/components/UserSettingsModal.svelte';

	import type { Question } from '$lib/types';
	import { untrack } from 'svelte';

	let { data, children } = $props();

	// Hydrate the store reactively with server-side data in Svelte 5
	$effect(() => {
		const currentData = data;
		untrack(() => {
			quizStore.hydrate(currentData);
		});
	});

	// ── Upload .md (local parser) ──────────────────────────────────────────
	let fileInput: HTMLInputElement | null = null;
	let parsedQuestionsPreview = $state<Question[]>([]);

	function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			const text = e.target?.result as string;
			if (text) {
				try {
					const parsed = parseMarkdown(text);
					if (parsed.length > 0) {
						parsedQuestionsPreview = parsed;
					} else {
						quizStore.showToast('未解析到有效题目，请检查 Markdown 格式', 'error');
					}
				} catch (err) {
					console.error('Failed to parse upload:', err);
					quizStore.showToast('解析失败，请检查 Markdown 格式', 'error');
				}
			}
		};
		reader.onerror = () => {
			quizStore.showToast('读取文件出错', 'error');
		};
		reader.readAsText(file);
		// Reset input so the same file can be re-selected
		target.value = '';
	}

	async function confirmImport() {
		if (parsedQuestionsPreview.length > 0) {
			quizStore.questions = [...parsedQuestionsPreview];
			await quizStore.saveQuestions();
			quizStore.initSession(quizStore.exerciseMode);
			quizStore.clearSessionProgress();
			quizStore.showToast(`成功解析并导入 ${parsedQuestionsPreview.length} 道题目！`, 'success');
			parsedQuestionsPreview = [];
			goto('/');
		}
	}

	function cancelImport() {
		parsedQuestionsPreview = [];
		quizStore.showToast('已取消导入', 'error');
	}

	function triggerUpload() {
		fileInput?.click();
	}

	let isSettingsOpen = $state(false);

	let showDbWarning = $state(true);

	let activeTheme = $state('pi-light');
	let isThemeMenuOpen = $state(false);

	$effect(() => {
		const savedTheme = localStorage.getItem('cq_theme') || 'pi-light';
		activeTheme = savedTheme;
		document.documentElement.setAttribute('data-theme', savedTheme);
	});

	function setTheme(themeName: string) {
		activeTheme = themeName;
		localStorage.setItem('cq_theme', themeName);
		document.documentElement.setAttribute('data-theme', themeName);
		isThemeMenuOpen = false;
		quizStore.showToast(`主题已切换为：${getThemeDisplayName(themeName)}`, 'success');
	}

	function getThemeDisplayName(themeName: string) {
		switch (themeName) {
			case 'cyber': return '赛博霓虹';
			case 'pi-light': return '极简浅色 (Pi)';
			case 'pi-dark': return '极简深色 (Pi)';
			default: return themeName;
		}
	}
</script>

<svelte:head>
	<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220%22 width=%22100%22 height=%22100%22><text y=%220.9em%22 font-size=%2290%22>📚</text></svg>" />
</svelte:head>

<!-- Hidden File Input for .md upload -->
<input
	type="file"
	accept=".md"
	class="hidden"
	bind:this={fileInput}
	onchange={handleFileUpload}
/>



<!-- Toast Notification -->
{#if quizStore.toastMessage}
	<div
		class="fixed top-20 right-6 z-[999] glass-card px-6 py-4 rounded-2xl flex items-center gap-3 border-l-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300 {quizStore.toastType === 'success' ? 'border-l-tertiary border-tertiary/20 text-on-surface' : 'border-l-error border-error/20 text-error'}"
	>
		<span class="material-symbols-outlined {quizStore.toastType === 'success' ? 'text-tertiary' : 'text-error'}">
			{quizStore.toastType === 'success' ? 'check_circle' : 'error'}
		</span>
		<span class="font-label-md text-label-md">{quizStore.toastMessage}</span>
	</div>
{/if}

<!-- TopAppBar Desktop/Mobile Header -->
<header
	class="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-16 fixed top-0 z-50 bg-surface-container/80 backdrop-blur-xl border-b border-outline-variant/20 shadow-sm"
>
	<a href="/" class="flex items-center gap-2 hover:opacity-80 transition-opacity">
		<span class="material-symbols-outlined text-primary text-2xl">school</span>
		<h1 class="font-headline-md text-headline-md font-extrabold text-primary tracking-tight">
			CyberQuiz AI
		</h1>
	</a>

	<!-- Desktop Navigation -->
	<nav class="hidden md:flex items-center gap-8">
		<a
			class="transition-colors font-label-md text-label-md pb-1 {page.url.pathname === '/' ? 'text-primary font-bold border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}"
			href="/"
		>
			首页
		</a>
		<a
			class="transition-colors font-label-md text-label-md pb-1 {page.url.pathname === '/quiz' ? 'text-primary font-bold border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}"
			href="/quiz"
		>
			答题
		</a>

		<a
			class="transition-colors font-label-md text-label-md pb-1 {page.url.pathname === '/wrong' ? 'text-primary font-bold border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}"
			href="/wrong"
		>
			错题本
		</a>
		<a
			class="transition-colors font-label-md text-label-md pb-1 {page.url.pathname === '/analysis' ? 'text-primary font-bold border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}"
			href="/analysis"
		>
			题库分析
		</a>
		<a
			class="transition-colors font-label-md text-label-md pb-1 {page.url.pathname === '/assistant' ? 'text-primary font-bold border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}"
			href="/assistant"
		>
			AI助理
		</a>
		{#if quizStore.currentUser?.role === 'admin'}
			<a
				class="transition-colors font-label-md text-label-md pb-1 {page.url.pathname === '/management' ? 'text-primary font-bold border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}"
				href="/management"
			>
				后台管理
			</a>
		{/if}
	</nav>

	<div class="flex items-center gap-4">
		<!-- Desktop Buttons -->
		<div class="hidden md:flex items-center gap-2">
			<!-- Knowledge Q&A Shortcut Button -->
			<a
				href="/knowledge"
				class="flex items-center gap-2 bg-secondary-container/20 border border-secondary/30 text-secondary px-4 py-2 rounded-xl hover:bg-secondary-container/30 transition-all duration-300 active:scale-95"
			>
				<span class="material-symbols-outlined text-[20px]">book</span>
				<span class="font-label-md text-label-md">知识问答题</span>
			</a>

		</div>

		<!-- Mobile Buttons -->
		<div class="flex md:hidden items-center gap-1">
			<a
				href="/knowledge"
				class="p-2 text-secondary hover:bg-surface-bright/10 rounded-full transition-all"
				title="知识问答题"
			>
				<span class="material-symbols-outlined">book</span>
			</a>
		</div>

		<div class="flex gap-1 md:gap-2">
			{#if quizStore.currentUser?.role === 'admin'}
				<a
					href="/management"
					class="p-2 rounded-full transition-all flex items-center justify-center w-10 h-10 border border-outline-variant/15 text-primary bg-primary/10 border-primary/30"
					title="系统后台管理中心"
				>
					<span class="material-symbols-outlined text-[20px] text-primary" style="font-variation-settings: 'FILL' 1;">admin_panel_settings</span>
				</a>
			{/if}
			<button class="p-2 text-on-surface-variant hover:bg-surface-bright/10 rounded-full transition-all">
				<span class="material-symbols-outlined">notifications</span>
			</button>

			<!-- Dynamic Theme Selector Button -->
			<div class="relative">
				<button
					onclick={() => isThemeMenuOpen = !isThemeMenuOpen}
					class="p-2 text-on-surface-variant hover:bg-surface-bright/10 rounded-full transition-all flex items-center justify-center w-10 h-10 border border-outline-variant/10 cursor-pointer"
					title="切换系统主题风格"
				>
					<span class="material-symbols-outlined text-[20px]">
						{activeTheme === 'cyber' ? 'palette' : activeTheme === 'pi-light' ? 'light_mode' : 'dark_mode'}
					</span>
				</button>
				
				{#if isThemeMenuOpen}
					<!-- Dropdown Backdrop to close on click outside -->
					<div class="fixed inset-0 z-40" onclick={() => isThemeMenuOpen = false}></div>
					
					<div class="absolute right-0 mt-2.5 w-52 glass-card rounded-2xl p-2 border border-outline-variant/20 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
						<div class="px-3 py-1.5 text-[10px] font-bold tracking-widest text-on-surface-variant/50 uppercase">
							系统主题风格
						</div>
						<button
							onclick={() => setTheme('cyber')}
							class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-semibold hover:bg-surface-bright/20 transition-all cursor-pointer {activeTheme === 'cyber' ? 'text-primary bg-primary/10 font-bold' : 'text-on-surface'}"
						>
							<span class="material-symbols-outlined text-[16px] {activeTheme === 'cyber' ? 'text-primary' : 'text-on-surface-variant'}">brightness_auto</span>
							<div class="flex-grow">赛博霓虹</div>
							{#if activeTheme === 'cyber'}
								<span class="material-symbols-outlined text-primary text-[16px]">check</span>
							{/if}
						</button>
						<button
							onclick={() => setTheme('pi-light')}
							class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-semibold hover:bg-surface-bright/20 transition-all cursor-pointer {activeTheme === 'pi-light' ? 'text-primary bg-primary/10 font-bold' : 'text-on-surface'}"
						>
							<span class="material-symbols-outlined text-[16px] {activeTheme === 'pi-light' ? 'text-primary' : 'text-on-surface-variant'}">light_mode</span>
							<div class="flex-grow">极简浅色 (Pi)</div>
							{#if activeTheme === 'pi-light'}
								<span class="material-symbols-outlined text-primary text-[16px]">check</span>
							{/if}
						</button>
						<button
							onclick={() => setTheme('pi-dark')}
							class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-semibold hover:bg-surface-bright/20 transition-all cursor-pointer {activeTheme === 'pi-dark' ? 'text-primary bg-primary/10 font-bold' : 'text-on-surface'}"
						>
							<span class="material-symbols-outlined text-[16px] {activeTheme === 'pi-dark' ? 'text-primary' : 'text-on-surface-variant'}">dark_mode</span>
							<div class="flex-grow">极简深色 (Pi)</div>
							{#if activeTheme === 'pi-dark'}
								<span class="material-symbols-outlined text-primary text-[16px]">check</span>
							{/if}
						</button>
					</div>
				{/if}
			</div>

			<button
				onclick={() => {
					if (quizStore.currentUser) {
						isSettingsOpen = true;
					} else {
						quizStore.showToast('请先登录以进行个人设置', 'error');
					}
				}}
				class="p-2 text-on-surface-variant hover:bg-surface-bright/10 rounded-full transition-all"
				title="个人设置"
			>
				<span class="material-symbols-outlined">settings</span>
			</button>
		</div>
		
		{#if quizStore.currentUser}
			<div class="flex items-center gap-2 border border-outline-variant/15 bg-surface-container-high/40 py-1 pl-3 pr-2.5 rounded-2xl">
				<span class="font-label-md text-label-md text-primary font-bold">{quizStore.currentUser.nickname}</span>
				<button
					onclick={() => quizStore.logout()}
					class="p-1 rounded-full text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-all flex items-center justify-center"
					title="注销登录"
				>
					<span class="material-symbols-outlined text-[18px]">logout</span>
				</button>
			</div>
		{/if}
	</div>
</header>

{#if quizStore.isD1 && quizStore.dbError && showDbWarning}
	<div
		class="fixed top-16 left-0 w-full z-40 bg-error-container/95 backdrop-blur-md border-b border-error/30 px-margin-mobile md:px-margin-desktop py-3 flex items-center justify-between shadow-[0_4px_12px_rgba(0,0,0,0.15)] animate-in fade-in slide-in-from-top-2 duration-300"
	>
		<div class="flex items-center gap-3">
			<span class="material-symbols-outlined text-error text-[22px] shrink-0 animate-pulse">warning</span>
			<span class="font-body-sm text-label-md text-on-error-container">
				云端数据库（D1）加载失败，已自动降级为浏览器本地缓存。错误原因：<code class="bg-surface-container-high/60 px-1.5 py-0.5 rounded font-mono text-xs text-error border border-error/20">{quizStore.dbError}</code>。请在 Cloudflare Pages 后台检查 D1 绑定，并确保已初始化数据库表结构。
			</span>
		</div>
		<div class="flex items-center gap-4 shrink-0">
			<a
				href="https://github.com/demon820308/CyberQuiz-AI#%E7%AC%AC%E4%BA%8C%E6%AD%A5%E5%88%9D%E5%A7%8B%E5%8C%96%E7%94%9F%E4%BA%A7%E7%8E%AF%E5%A2%83%E6%95%B0%E6%8D%AE%E5%BA%93%E8%A1%A8%E7%BB%93%E6%9E%84"
				target="_blank"
				class="text-xs text-primary font-bold underline hover:text-primary/80 transition-colors"
			>
				查看部署指南
			</a>
			<button
				onclick={() => showDbWarning = false}
				class="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-bright/20 transition-all active:scale-90"
				title="关闭提示"
			>
				<span class="material-symbols-outlined text-[18px]">close</span>
			</button>
		</div>
	</div>
{/if}

<!-- Main Page Wrapper -->
<main class="min-h-screen transition-all duration-300 {quizStore.isD1 && quizStore.dbError && showDbWarning ? 'pt-14 md:pt-12' : ''}">
	{@render children()}
</main>

<!-- Bottom Navigation Shell (Mobile Only) -->
<nav
	class="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-1 py-3 bg-surface-container-lowest/90 backdrop-blur-2xl border-t border-outline-variant/10 shadow-[0_-4px_20px_rgba(0,0,0,0.4)] rounded-t-xl"
>
	<a
		href="/"
		class="flex flex-col items-center justify-center {page.url.pathname === '/' ? 'text-primary bg-primary-container/10 rounded-xl px-2 py-1 shadow-[0_0_15px_rgba(192,193,255,0.2)]' : 'text-on-surface-variant'}"
	>
		<span class="material-symbols-outlined" style={page.url.pathname === '/' ? "font-variation-settings: 'FILL' 1;" : ""}>home</span>
		<span class="font-label-md text-xs mt-0.5">首页</span>
	</a>
	
	<a
		href="/quiz"
		class="flex flex-col items-center justify-center {page.url.pathname === '/quiz' ? 'text-primary bg-primary-container/10 rounded-xl px-2 py-1 shadow-[0_0_15px_rgba(192,193,255,0.2)]' : 'text-on-surface-variant'}"
	>
		<span class="material-symbols-outlined" style={page.url.pathname === '/quiz' ? "font-variation-settings: 'FILL' 1;" : ""}>school</span>
		<span class="font-label-md text-xs mt-0.5">答题</span>
	</a>


	
	<a
		href="/wrong"
		class="flex flex-col items-center justify-center {page.url.pathname === '/wrong' ? 'text-primary bg-primary-container/10 rounded-xl px-2 py-1 shadow-[0_0_15px_rgba(192,193,255,0.2)]' : 'text-on-surface-variant'}"
	>
		<span class="material-symbols-outlined" style={page.url.pathname === '/wrong' ? "font-variation-settings: 'FILL' 1;" : ""}>menu_book</span>
		<span class="font-label-md text-xs mt-0.5">错题本</span>
	</a>
	
	<a
		href="/analysis"
		class="flex flex-col items-center justify-center {page.url.pathname === '/analysis' ? 'text-primary bg-primary-container/10 rounded-xl px-2 py-1 shadow-[0_0_15px_rgba(192,193,255,0.2)]' : 'text-on-surface-variant'}"
	>
		<span class="material-symbols-outlined" style={page.url.pathname === '/analysis' ? "font-variation-settings: 'FILL' 1;" : ""}>insights</span>
		<span class="font-label-md text-xs mt-0.5">分析</span>
	</a>

	<a
		href="/assistant"
		class="flex flex-col items-center justify-center {page.url.pathname === '/assistant' ? 'text-primary bg-primary-container/10 rounded-xl px-2 py-1 shadow-[0_0_15px_rgba(192,193,255,0.2)]' : 'text-on-surface-variant'}"
	>
		<span class="material-symbols-outlined" style={page.url.pathname === '/assistant' ? "font-variation-settings: 'FILL' 1;" : ""}>psychology</span>
		<span class="font-label-md text-xs mt-0.5">AI助理</span>
	</a>
	{#if quizStore.currentUser?.role === 'admin'}
		<a
			href="/management"
			class="flex flex-col items-center justify-center {page.url.pathname === '/management' ? 'text-primary bg-primary-container/10 rounded-xl px-2 py-1 shadow-[0_0_15px_rgba(192,193,255,0.2)]' : 'text-on-surface-variant'}"
		>
			<span class="material-symbols-outlined" style={page.url.pathname === '/management' ? "font-variation-settings: 'FILL' 1;" : ""}>admin_panel_settings</span>
			<span class="font-label-md text-xs mt-0.5">管理</span>
		</a>
	{/if}
</nav>

{#if parsedQuestionsPreview.length > 0}
	<ParserPreviewModal
		questions={parsedQuestionsPreview}
		onConfirm={confirmImport}
		onCancel={cancelImport}
	/>
{/if}



<UserAuthModal />
<UserSettingsModal bind:isOpen={isSettingsOpen} />



