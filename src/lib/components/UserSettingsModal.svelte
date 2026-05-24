<script lang="ts">
	import { quizStore } from '$lib/store.svelte';
	import { fade, scale } from 'svelte/transition';

	// Props
	let { isOpen = $bindable(false) } = $props();

	// Local States
	let newNickname = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	
	let infoMessage = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let isLoading = $state(false);

	// Synchronize nickname when modal opens
	$effect(() => {
		if (isOpen && quizStore.currentUser) {
			newNickname = quizStore.currentUser.nickname;
			newPassword = '';
			confirmPassword = '';
			errorMessage = null;
			infoMessage = null;
		}
	});

	async function handleUpdateNickname(e: Event) {
		e.preventDefault();
		errorMessage = null;
		infoMessage = null;

		if (!newNickname.trim()) {
			errorMessage = '请输入新显示昵称！';
			return;
		}

		isLoading = true;
		const res = await quizStore.updateProfileNickname(newNickname);
		isLoading = false;

		if (res.success) {
			infoMessage = '昵称修改成功！';
		} else {
			errorMessage = res.error || '修改失败，请重试';
		}
	}

	async function handleUpdatePassword(e: Event) {
		e.preventDefault();
		errorMessage = null;
		infoMessage = null;

		if (newPassword.length < 6) {
			errorMessage = '新密码长度不能低于 6 位！';
			return;
		}
		if (newPassword !== confirmPassword) {
			errorMessage = '两次输入的密码不一致！';
			return;
		}

		isLoading = true;
		const res = await quizStore.updateProfilePassword(newPassword);
		isLoading = false;

		if (res.success) {
			infoMessage = '密码修改成功！';
			newPassword = '';
			confirmPassword = '';
		} else {
			errorMessage = res.error || '修改失败，请重试';
		}
	}
</script>

{#if isOpen && quizStore.currentUser}
	<div
		transition:fade={{ duration: 300 }}
		class="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-md px-4"
		onclick={() => isOpen = false}
	>
		<!-- Main Card -->
		<div
			transition:scale={{ start: 0.95, duration: 200 }}
			class="relative bg-surface/85 border border-outline-variant/30 backdrop-blur-md shadow-2xl rounded-[28px] p-6 md:p-8 max-w-[440px] w-full space-y-6"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Card Header -->
			<div class="flex items-center justify-between pb-3 border-b border-outline-variant/15">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-primary text-[24px]">manage_accounts</span>
					<h3 class="font-headline-sm text-headline-sm font-extrabold text-on-surface">个人账户设置</h3>
				</div>
				<button
					onclick={() => isOpen = false}
					class="p-1 rounded-full text-on-surface-variant hover:bg-surface-bright/20 hover:text-on-surface transition-all"
				>
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<!-- User Info Overview -->
			<div class="bg-surface-container-high/40 border border-outline-variant/10 p-4 rounded-2xl flex items-center gap-3">
				<span class="material-symbols-outlined text-primary text-[32px]">account_circle</span>
				<div class="space-y-0.5">
					<div class="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">当前登录账号</div>
					<div class="text-sm font-extrabold text-on-surface flex items-center gap-1.5">
						{quizStore.currentUser.nickname}
						<span class="text-[10px] font-code text-primary-container px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
							@{quizStore.currentUser.username}
						</span>
					</div>
				</div>
			</div>

			<!-- Dynamic Messages -->
			{#if errorMessage}
				<div class="flex items-start gap-2.5 p-3.5 rounded-xl border bg-error-container/20 text-error border-error/20 font-body-sm text-xs">
					<span class="material-symbols-outlined shrink-0 text-[18px]">error</span>
					<span>{errorMessage}</span>
				</div>
			{/if}
			{#if infoMessage}
				<div class="flex items-start gap-2.5 p-3.5 rounded-xl border bg-tertiary-container/20 text-tertiary border-tertiary/20 font-body-sm text-xs">
					<span class="material-symbols-outlined shrink-0 text-[18px]">check_circle</span>
					<span>{infoMessage}</span>
				</div>
			{/if}

			<!-- Actions tabs -->
			<div class="space-y-5">
				<!-- Section 1: Update Nickname -->
				<form onsubmit={handleUpdateNickname} class="space-y-3">
					<div class="flex flex-col gap-1.5">
						<label for="new_nickname" class="font-label-sm text-on-surface-variant text-xs font-bold ml-0.5">修改显示昵称</label>
						<div class="relative flex items-center">
							<span class="material-symbols-outlined absolute left-3 text-on-surface-variant text-[20px]">face</span>
							<input
								type="text"
								id="new_nickname"
								bind:value={newNickname}
								placeholder="新昵称"
								class="w-full pl-10 pr-4 py-2.5 bg-surface-container/30 border border-outline-variant/25 focus:border-primary focus:bg-surface-container/60 outline-none rounded-xl text-xs text-on-surface transition-all"
								disabled={isLoading}
								required
							/>
						</div>
					</div>
					<button
						type="submit"
						class="w-full py-2.5 bg-surface-container border border-outline-variant/30 text-on-surface hover:text-primary hover:border-primary/40 font-label-sm text-xs font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
						disabled={isLoading || newNickname === quizStore.currentUser.nickname}
					>
						<span class="material-symbols-outlined text-[16px]">edit</span>
						<span>更新昵称</span>
					</button>
				</form>

				<div class="border-t border-outline-variant/10 my-4"></div>

				<!-- Section 2: Update Password -->
				<form onsubmit={handleUpdatePassword} class="space-y-3">
					<div class="space-y-2.5">
						<div class="flex flex-col gap-1.5">
							<label for="new_pw_set" class="font-label-sm text-on-surface-variant text-xs font-bold ml-0.5">修改账户密码</label>
							<div class="relative flex items-center">
								<span class="material-symbols-outlined absolute left-3 text-on-surface-variant text-[20px]">lock</span>
								<input
									type="password"
									id="new_pw_set"
									bind:value={newPassword}
									placeholder="设置新密码 (不少于6位)"
									class="w-full pl-10 pr-4 py-2.5 bg-surface-container/30 border border-outline-variant/25 focus:border-primary focus:bg-surface-container/60 outline-none rounded-xl text-xs text-on-surface transition-all"
									disabled={isLoading}
									required
								/>
							</div>
						</div>

						<div class="flex flex-col gap-1.5">
							<div class="relative flex items-center">
								<span class="material-symbols-outlined absolute left-3 text-on-surface-variant text-[20px]">lock</span>
								<input
									type="password"
									bind:value={confirmPassword}
									placeholder="确认输入新密码"
									class="w-full pl-10 pr-4 py-2.5 bg-surface-container/30 border border-outline-variant/25 focus:border-primary focus:bg-surface-container/60 outline-none rounded-xl text-xs text-on-surface transition-all"
									disabled={isLoading}
									required
								/>
							</div>
						</div>
					</div>

					<button
						type="submit"
						class="w-full py-2.5 bg-primary text-on-primary font-label-sm text-xs font-bold rounded-xl hover:bg-primary/95 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary/10"
						disabled={isLoading || !newPassword}
					>
						<span class="material-symbols-outlined text-[16px]">lock_reset</span>
						<span>修改密码</span>
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
