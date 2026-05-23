<script lang="ts">
	import './layout.css';
	import { quizStore } from '$lib/store.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { parseMarkdown } from '$lib/utils/mdParser';
	import ParserPreviewModal from '$lib/components/ParserPreviewModal.svelte';

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

	let showPasswordPrompt = $state(false);
	let enteredPassword = $state('');

	function openPasswordPrompt() {
		if (quizStore.isAuthorizedToDelete) {
			quizStore.isAuthorizedToDelete = false;
			quizStore.adminPassword = '';
			localStorage.removeItem('cq_admin_auth');
			quizStore.showToast('已安全退出管理员授权状态', 'success');
		} else {
			enteredPassword = '';
			showPasswordPrompt = true;
		}
	}

	async function submitPassword() {
		if (!enteredPassword) {
			quizStore.showToast('请输入管理密码！', 'error');
			return;
		}

		try {
			const res = await fetch('/api/knowledge/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: enteredPassword })
			});
			const verifyResult = await res.json() as any;
			if (verifyResult.success) {
				quizStore.isAuthorizedToDelete = true;
				quizStore.adminPassword = enteredPassword;
				// Persist auth state + password for 24 hours
				localStorage.setItem('cq_admin_auth', JSON.stringify({
					v: 1,
					pw: enteredPassword,
					exp: Date.now() + 24 * 60 * 60 * 1000
				}));
				showPasswordPrompt = false;
				quizStore.showToast('管理员权限解锁成功！24小时内免验证', 'success');
			} else {
				quizStore.showToast(verifyResult.error || '密码验证失败', 'error');
			}
		} catch (e) {
			console.error('Password verification error:', e);
			quizStore.showToast('校验失败，网络连接异常', 'error');
		}
	}

	let showDbWarning = $state(true);
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

			<!-- Upload Button -->
			<button
				onclick={triggerUpload}
				class="flex items-center gap-2 bg-primary-container/20 border border-primary/30 text-primary px-4 py-2 rounded-xl hover:bg-primary-container/30 transition-all duration-300 active:scale-95"
			>
				<span class="material-symbols-outlined text-[20px]">upload_file</span>
				<span class="font-label-md text-label-md">答题库上传MD</span>
			</button>

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
			<button
				onclick={triggerUpload}
				class="p-2 text-primary hover:bg-surface-bright/10 rounded-full transition-all"
				title="答题库上传MD"
			>
				<span class="material-symbols-outlined">upload_file</span>
			</button>

		</div>

		<div class="flex gap-1 md:gap-2">
			{#if page.url.pathname === '/'}
				<!-- Admin Password Lock Button -->
				<button
					onclick={openPasswordPrompt}
					class="p-2 rounded-full transition-all flex items-center justify-center w-10 h-10 border border-outline-variant/15 {quizStore.isAuthorizedToDelete ? 'text-primary bg-primary/10 border-primary/30' : 'text-on-surface-variant hover:bg-surface-bright/10 hover:border-outline-variant/30'}"
					title={quizStore.isAuthorizedToDelete ? "管理员已解锁 (点击退出授权)" : "管理员授权解锁"}
				>
					<span class="material-symbols-outlined text-[20px] transition-all duration-300 {quizStore.isAuthorizedToDelete ? 'text-primary animate-pulse' : 'text-on-surface-variant'}" style={quizStore.isAuthorizedToDelete ? "font-variation-settings: 'FILL' 1;" : ""}>passkey</span>
				</button>
			{/if}
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
</nav>

{#if parsedQuestionsPreview.length > 0}
	<ParserPreviewModal
		questions={parsedQuestionsPreview}
		onConfirm={confirmImport}
		onCancel={cancelImport}
	/>
{/if}

{#if showPasswordPrompt}
	<div class="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0b1326]/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
		<div class="w-full max-w-sm glass-card rounded-3xl p-6 md:p-8 border border-primary/30 cyber-glow-primary text-center space-y-5 animate-in zoom-in-95 duration-300 relative overflow-hidden">
			<!-- Decorative glowing bubble -->
			<div class="absolute -top-16 -right-16 w-32 h-32 bg-primary/10 rounded-full blur-[40px] pointer-events-none"></div>

			<span class="material-symbols-outlined text-primary text-4xl animate-bounce">admin_panel_settings</span>
			<div>
				<h3 class="font-headline-sm text-headline-sm text-on-surface font-extrabold">管理员授权验证</h3>
				<p class="text-xs text-on-surface-variant mt-1.5 leading-relaxed">请输入管理密码以解锁知识问答题目的删除权限</p>
			</div>
			
			<input
				type="password"
				bind:value={enteredPassword}
				placeholder="请输入管理密码"
				class="w-full bg-[#0b1326]/60 border border-outline-variant/20 focus:border-primary rounded-xl px-4 py-2.5 text-xs text-on-surface text-center outline-none transition-all"
				onkeydown={(e) => e.key === 'Enter' && submitPassword()}
			/>
			
			<div class="flex justify-end gap-3 pt-2">
				<button
					onclick={() => showPasswordPrompt = false}
					class="px-4 py-2.5 border border-outline-variant/30 text-on-surface hover:bg-surface-bright/10 text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95"
				>
					取消
				</button>
				<button
					onclick={submitPassword}
					class="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/80 transition-all cursor-pointer active:scale-95 shadow-md shadow-primary/15"
				>
					确认解锁
				</button>
			</div>
		</div>
	</div>
{/if}



