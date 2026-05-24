<script lang="ts">
	import { quizStore } from '$lib/store.svelte';
	import { fade, scale } from 'svelte/transition';

	// Svelte 5 Local States
	let isLoginTab = $state(true);
	let username = $state('');
	let nickname = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	
	let errorMessage = $state<string | null>(null);
	let isLoading = $state(false);
	let shakeActive = $state(false);
	let isPasswordVisible = $state(false);
	let isDupName = $state(false); // To trigger warning when username is taken

	// Trigger error state with shake feedback
	function triggerError(msg: string) {
		errorMessage = msg;
		shakeActive = true;
		setTimeout(() => {
			shakeActive = false;
		}, 400000 / 1000); // 400ms matching animation
	}

	// Real-time checking when username input loses focus (registration only)
	async function checkUsernameDuplicate() {
		if (isLoginTab || !username.trim()) return;
		
		const cleanUser = username.trim().toLowerCase();
		if (cleanUser.length < 2) return;

		try {
			const res = await fetch('/api/users/auth', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'check', username: cleanUser })
			});
			const data = (await res.json()) as any;
			if (data.success && data.exists) {
				isDupName = true;
				errorMessage = '⚠️ 该用户名已被占用，注册后可能覆盖不了，请选择另一个新名字！';
			} else {
				isDupName = false;
				if (errorMessage?.includes('占用')) {
					errorMessage = null;
				}
			}
		} catch (e) {
			console.error('Username check failed:', e);
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		errorMessage = null;

		// Client side validation
		if (!username.trim()) {
			triggerError('请输入用户名！');
			return;
		}
		if (!password) {
			triggerError('请输入密码！');
			return;
		}

		if (isLoginTab) {
			// Login Flow
			isLoading = true;
			const res = await quizStore.login(username, password);
			isLoading = false;
			if (!res.success) {
				triggerError(res.error || '登录失败，请检查用户名和密码');
			}
		} else {
			// Registration Flow
			if (!nickname.trim()) {
				triggerError('请输入显示昵称！');
				return;
			}
			if (password.length < 6) {
				triggerError('密码长度不能低于6位！');
				return;
			}
			if (password !== confirmPassword) {
				triggerError('两次输入的密码不一致！');
				return;
			}
			if (isDupName) {
				triggerError('此用户名已被占用，请换个名字！');
				return;
			}

			isLoading = true;
			const res = await quizStore.register(username, nickname, password);
			isLoading = false;
			if (!res.success) {
				triggerError(res.error || '注册失败，请稍后重试');
			}
		}
	}
</script>

<!-- Full Screen Modal Cover -->
{#if quizStore.hydrated && quizStore.currentUser === null}
	<div
		transition:fade={{ duration: 400 }}
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl px-4 py-8"
	>
		<!-- Background Decorative Radial Glows -->
		<div class="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>
		<div class="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-secondary/15 rounded-full blur-[120px] pointer-events-none"></div>

		<!-- Main Auth Card -->
		<div
			transition:scale={{ start: 0.9, duration: 300 }}
			class="relative bg-surface/75 border border-outline-variant/30 backdrop-blur-md shadow-2xl rounded-[28px] p-6 md:p-8 max-w-[420px] w-full {shakeActive ? 'animate-shake' : ''}"
		>
			<!-- Card Header & Brand -->
			<div class="flex flex-col items-center text-center gap-2 mb-6">
				<div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center shadow-lg shadow-primary/20 mb-1">
					<span class="material-symbols-outlined text-on-primary text-[32px]">school</span>
				</div>
				<h2 class="font-headline-md text-headline-md font-extrabold text-primary tracking-tight">CyberQuiz AI</h2>
				<p class="font-body-md text-on-surface-variant/80 text-sm">轻量化答题进度云端隔离系统</p>
			</div>

			<!-- Tabs Selector -->
			<div class="relative flex p-1 bg-surface-container-high/60 border border-outline-variant/15 rounded-2xl mb-6">
				<!-- Sliding Bubble Background Indicator -->
				<div
					class="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary shadow-sm rounded-xl transition-all duration-300 ease-out"
					style="left: {isLoginTab ? '4px' : 'calc(50% + 4px)'}"
				></div>
				
				<button
					type="button"
					onclick={() => { isLoginTab = true; errorMessage = null; isDupName = false; }}
					class="relative z-10 flex-1 py-2 font-label-md text-label-md text-center transition-colors duration-200 {isLoginTab ? 'text-on-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}"
				>
					账号登录
				</button>
				<button
					type="button"
					onclick={() => { isLoginTab = false; errorMessage = null; }}
					class="relative z-10 flex-1 py-2 font-label-md text-label-md text-center transition-colors duration-200 {!isLoginTab ? 'text-on-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}"
				>
					新用户注册
				</button>
			</div>

			<!-- Dynamic Alert Panel -->
			{#if errorMessage}
				<div
					transition:fade={{ duration: 150 }}
					class="flex items-start gap-2.5 p-3.5 mb-5 rounded-2xl border {isDupName ? 'bg-warning-container/80 text-on-warning-container border-warning/30' : 'bg-error-container/80 text-on-error-container border-error/30'} font-body-sm text-xs transition-all"
				>
					<span class="material-symbols-outlined shrink-0 text-[18px] {isDupName ? 'text-warning' : 'text-error'}">
						{isDupName ? 'warning' : 'error'}
					</span>
					<span>{errorMessage}</span>
				</div>
			{/if}

			<!-- Auth Form -->
			<form onsubmit={handleSubmit} class="flex flex-col gap-4">
				<!-- Username -->
				<div class="flex flex-col gap-1.5">
					<label for="username" class="font-label-sm text-on-surface-variant text-[13px] ml-1">用户名 / 账号 (唯一键)</label>
					<div class="relative flex items-center">
						<span class="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px] pointer-events-none">account_circle</span>
						<input
							type="text"
							id="username"
							placeholder="数字、字母或汉字，如 user123"
							bind:value={username}
							onblur={checkUsernameDuplicate}
							class="w-full pl-11 pr-4 py-3 bg-surface-container/40 border border-outline-variant/30 rounded-2xl font-body-md text-sm text-on-surface focus:outline-none focus:border-primary focus:bg-surface-container/60 transition-all placeholder:text-on-surface-variant/40"
							disabled={isLoading}
							required
						/>
					</div>
				</div>

				<!-- Nickname (Register Only) -->
				{#if !isLoginTab}
					<div transition:fade={{ duration: 150 }} class="flex flex-col gap-1.5">
						<label for="nickname" class="font-label-sm text-on-surface-variant text-[13px] ml-1">显示昵称 (显示在页面顶部)</label>
						<div class="relative flex items-center">
							<span class="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px] pointer-events-none">face</span>
							<input
								type="text"
								id="nickname"
								placeholder="您喜欢的昵称，如 小明同学"
								bind:value={nickname}
								class="w-full pl-11 pr-4 py-3 bg-surface-container/40 border border-outline-variant/30 rounded-2xl font-body-md text-sm text-on-surface focus:outline-none focus:border-primary focus:bg-surface-container/60 transition-all placeholder:text-on-surface-variant/40"
								disabled={isLoading}
								required
							/>
						</div>
					</div>
				{/if}

				<!-- Password -->
				<div class="flex flex-col gap-1.5">
					<label for="password" class="font-label-sm text-on-surface-variant text-[13px] ml-1">密码</label>
					<div class="relative flex items-center">
						<span class="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px] pointer-events-none">lock</span>
						<input
							type={isPasswordVisible ? 'text' : 'password'}
							id="password"
							placeholder={isLoginTab ? '请输入登录密码' : '设置不少于6位的密码'}
							bind:value={password}
							class="w-full pl-11 pr-11 py-3 bg-surface-container/40 border border-outline-variant/30 rounded-2xl font-body-md text-sm text-on-surface focus:outline-none focus:border-primary focus:bg-surface-container/60 transition-all placeholder:text-on-surface-variant/40"
							disabled={isLoading}
							required
						/>
						<button
							type="button"
							onclick={() => isPasswordVisible = !isPasswordVisible}
							class="absolute right-3 p-1 rounded-full text-on-surface-variant hover:bg-surface-bright/10 active:scale-95 transition-all"
						>
							<span class="material-symbols-outlined text-[20px]">{isPasswordVisible ? 'visibility_off' : 'visibility'}</span>
						</button>
					</div>
				</div>

				<!-- Confirm Password (Register Only) -->
				{#if !isLoginTab}
					<div transition:fade={{ duration: 150 }} class="flex flex-col gap-1.5">
						<label for="confirmPassword" class="font-label-sm text-on-surface-variant text-[13px] ml-1">确认密码</label>
						<div class="relative flex items-center">
							<span class="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px] pointer-events-none">lock</span>
							<input
								type={isPasswordVisible ? 'text' : 'password'}
								id="confirmPassword"
								placeholder="请再次输入您的密码"
								bind:value={confirmPassword}
								class="w-full pl-11 pr-4 py-3 bg-surface-container/40 border border-outline-variant/30 rounded-2xl font-body-md text-sm text-on-surface focus:outline-none focus:border-primary focus:bg-surface-container/60 transition-all placeholder:text-on-surface-variant/40"
								disabled={isLoading}
								required
							/>
						</div>
					</div>
				{/if}

				<!-- Submit Button -->
				<button
					type="submit"
					class="w-full py-3.5 mt-2 bg-primary text-on-primary font-label-md text-label-md rounded-2xl hover:bg-primary/95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:bg-primary/50"
					disabled={isLoading}
				>
					{#if isLoading}
						<div class="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
						<span>请稍后...</span>
					{:else}
						<span class="material-symbols-outlined text-[20px]">{isLoginTab ? 'login' : 'person_add'}</span>
						<span>{isLoginTab ? '立即登录' : '创建账户并登录'}</span>
					{/if}
				</button>
			</form>
		</div>
	</div>
{/if}

<style>
	/* Error shake animation */
	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		15%, 45%, 75% { transform: translateX(-8px); }
		30%, 60%, 90% { transform: translateX(8px); }
	}
	.animate-shake {
		animation: shake 0.4s ease-in-out;
	}
</style>
