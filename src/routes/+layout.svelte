<script lang="ts">
	import './layout.css';
	import { quizStore } from '$lib/store.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { parseMarkdown } from '$lib/utils/mdParser';
	import ParserPreviewModal from '$lib/components/ParserPreviewModal.svelte';
	import ConvertModal from '$lib/components/ConvertModal.svelte';
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

	// ── AI Convert ─────────────────────────────────────────────────────────
	let convertFileInput: HTMLInputElement | null = null;
	let convertMdContent = $state('');

	function triggerConvert() {
		convertFileInput?.click();
	}

	function handleConvertFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			const text = e.target?.result as string;
			if (text && text.trim().length > 0) {
				convertMdContent = text;
			} else {
				quizStore.showToast('文件内容为空', 'error');
			}
		};
		reader.onerror = () => {
			quizStore.showToast('读取文件出错', 'error');
		};
		reader.readAsText(file);
		target.value = '';
	}

	async function confirmConvertReplace(questions: Question[]) {
		quizStore.questions = [...questions];
		await quizStore.saveQuestions();
		quizStore.initSession(quizStore.exerciseMode);
		quizStore.clearSessionProgress();
		quizStore.showToast(`AI 转化成功！已替换题库，共 ${questions.length} 道题目`, 'success');
		convertMdContent = '';
		goto('/');
	}

	async function confirmConvertMerge(questions: Question[]) {
		const existingIds = new Set(quizStore.questions.map(q => q.id));
		// Re-assign IDs for merged questions to avoid conflicts
		const maxId = quizStore.questions.reduce((max, q) => Math.max(max, q.id), 0);
		const toAdd = questions.map((q, idx) => ({
			...q,
			id: maxId + idx + 1
		}));
		quizStore.questions = [...quizStore.questions, ...toAdd];
		await quizStore.saveQuestions();
		quizStore.initSession(quizStore.exerciseMode);
		quizStore.clearSessionProgress();
		quizStore.showToast(`AI 转化成功！已合并导入 ${toAdd.length} 道新题目，题库共 ${quizStore.questions.length} 道`, 'success');
		convertMdContent = '';
		goto('/');
	}

	function cancelConvert() {
		convertMdContent = '';
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

<!-- Hidden File Input for AI convert -->
<input
	type="file"
	accept=".md"
	class="hidden"
	bind:this={convertFileInput}
	onchange={handleConvertFileSelect}
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
			Dashboard
		</a>
		<a
			class="transition-colors font-label-md text-label-md pb-1 {page.url.pathname === '/quiz' ? 'text-primary font-bold border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}"
			href="/quiz"
		>
			Library / Study
		</a>
		<a
			class="transition-colors font-label-md text-label-md pb-1 {page.url.pathname === '/wrong' ? 'text-primary font-bold border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}"
			href="/wrong"
		>
			Wrong Book
		</a>
		<a
			class="transition-colors font-label-md text-label-md pb-1 {page.url.pathname === '/analysis' ? 'text-primary font-bold border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}"
			href="/analysis"
		>
			Analytics
		</a>
		<a
			class="transition-colors font-label-md text-label-md pb-1 {page.url.pathname === '/assistant' ? 'text-primary font-bold border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}"
			href="/assistant"
		>
			AI Assistant
		</a>
	</nav>

	<div class="flex items-center gap-4">
		<!-- Desktop Buttons -->
		<div class="hidden md:flex items-center gap-2">
			<!-- Upload Button -->
			<button
				onclick={triggerUpload}
				class="flex items-center gap-2 bg-primary-container/20 border border-primary/30 text-primary px-4 py-2 rounded-xl hover:bg-primary-container/30 transition-all duration-300 active:scale-95"
			>
				<span class="material-symbols-outlined text-[20px]">upload_file</span>
				<span class="font-label-md text-label-md">Upload .md</span>
			</button>
			<!-- AI Convert Button -->
			<button
				onclick={triggerConvert}
				class="flex items-center gap-2 bg-gradient-to-r from-[#A855F7]/15 to-[#EC4899]/15 border border-secondary/30 text-secondary px-4 py-2 rounded-xl hover:from-[#A855F7]/25 hover:to-[#EC4899]/25 transition-all duration-300 active:scale-95"
			>
				<span class="material-symbols-outlined text-[20px]">auto_awesome</span>
				<span class="font-label-md text-label-md">AI 转化</span>
			</button>
		</div>

		<!-- Mobile Buttons -->
		<div class="flex md:hidden items-center gap-1">
			<button
				onclick={triggerUpload}
				class="p-2 text-primary hover:bg-surface-bright/10 rounded-full transition-all"
				title="Upload .md"
			>
				<span class="material-symbols-outlined">upload_file</span>
			</button>
			<button
				onclick={triggerConvert}
				class="p-2 text-secondary hover:bg-secondary/10 rounded-full transition-all"
				title="AI 转化"
			>
				<span class="material-symbols-outlined">auto_awesome</span>
			</button>
		</div>

		<div class="flex gap-1 md:gap-2">
			<button class="p-2 text-on-surface-variant hover:bg-surface-bright/10 rounded-full transition-all">
				<span class="material-symbols-outlined">notifications</span>
			</button>
			<button class="p-2 text-on-surface-variant hover:bg-surface-bright/10 rounded-full transition-all">
				<span class="material-symbols-outlined">settings</span>
			</button>
		</div>
		
		<img
			alt="User profile"
			class="w-8 h-8 rounded-full border border-outline/20 object-cover"
			src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFuARggglZUX9iFXPWGYYfWkNE10Sh2a-kscze1lYf2aN5JQ2tbGv0Tu2f0MKNC3SGsaAvN4VRvftk3dVLj6y02GlKkZ6PYiK2nPFllj0oh5Trk39vzZRHrW5s0P5ScnAYKRYFTZHJwZdY8lqjLL3z14LYsg-9SkGrtZ3J_6z2iBuQur6GyUX1UOmjO-bP4gNjS_3mSdyT2dFn5OlPhbFMFl_abjXEHxZdnOdl3vWbOmUchIFzqVtQcZOTzRbcRQtkEX3S9fk-fKVj"
		/>
	</div>
</header>

<!-- Main Page Wrapper -->
<main class="min-h-screen">
	{@render children()}
</main>

<!-- Bottom Navigation Shell (Mobile Only) -->
<nav
	class="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-3 bg-surface-container-lowest/90 backdrop-blur-2xl border-t border-outline-variant/10 shadow-[0_-4px_20px_rgba(0,0,0,0.4)] rounded-t-xl"
>
	<a
		href="/"
		class="flex flex-col items-center justify-center {page.url.pathname === '/' ? 'text-primary bg-primary-container/10 rounded-xl px-2 py-1 shadow-[0_0_15px_rgba(192,193,255,0.2)]' : 'text-on-surface-variant'}"
	>
		<span class="material-symbols-outlined" style={page.url.pathname === '/' ? "font-variation-settings: 'FILL' 1;" : ""}>home</span>
		<span class="font-label-md text-xs mt-0.5">Home</span>
	</a>
	
	<a
		href="/quiz"
		class="flex flex-col items-center justify-center {page.url.pathname === '/quiz' ? 'text-primary bg-primary-container/10 rounded-xl px-2 py-1 shadow-[0_0_15px_rgba(192,193,255,0.2)]' : 'text-on-surface-variant'}"
	>
		<span class="material-symbols-outlined" style={page.url.pathname === '/quiz' ? "font-variation-settings: 'FILL' 1;" : ""}>school</span>
		<span class="font-label-md text-xs mt-0.5">Study</span>
	</a>
	
	<a
		href="/wrong"
		class="flex flex-col items-center justify-center {page.url.pathname === '/wrong' ? 'text-primary bg-primary-container/10 rounded-xl px-2 py-1 shadow-[0_0_15px_rgba(192,193,255,0.2)]' : 'text-on-surface-variant'}"
	>
		<span class="material-symbols-outlined" style={page.url.pathname === '/wrong' ? "font-variation-settings: 'FILL' 1;" : ""}>menu_book</span>
		<span class="font-label-md text-xs mt-0.5">Wrongs</span>
	</a>
	
	<a
		href="/analysis"
		class="flex flex-col items-center justify-center {page.url.pathname === '/analysis' ? 'text-primary bg-primary-container/10 rounded-xl px-2 py-1 shadow-[0_0_15px_rgba(192,193,255,0.2)]' : 'text-on-surface-variant'}"
	>
		<span class="material-symbols-outlined" style={page.url.pathname === '/analysis' ? "font-variation-settings: 'FILL' 1;" : ""}>insights</span>
		<span class="font-label-md text-xs mt-0.5">Stats</span>
	</a>

	<a
		href="/assistant"
		class="flex flex-col items-center justify-center {page.url.pathname === '/assistant' ? 'text-primary bg-primary-container/10 rounded-xl px-2 py-1 shadow-[0_0_15px_rgba(192,193,255,0.2)]' : 'text-on-surface-variant'}"
	>
		<span class="material-symbols-outlined" style={page.url.pathname === '/assistant' ? "font-variation-settings: 'FILL' 1;" : ""}>psychology</span>
		<span class="font-label-md text-xs mt-0.5">AI助理</span>
	</a>
</nav>

{#if parsedQuestionsPreview.length > 0}
	<ParserPreviewModal
		questions={parsedQuestionsPreview}
		onConfirm={confirmImport}
		onCancel={cancelImport}
	/>
{/if}

{#if convertMdContent}
	<ConvertModal
		mdContent={convertMdContent}
		onConfirmReplace={confirmConvertReplace}
		onConfirmMerge={confirmConvertMerge}
		onCancel={cancelConvert}
	/>
{/if}
