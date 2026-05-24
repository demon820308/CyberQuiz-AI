<script lang="ts">
	import { quizStore } from '$lib/store.svelte';
	import { parseMarkdown } from '$lib/utils/mdParser';
	import { parseKnowledgeMarkdown } from '$lib/utils/knowledgeParser';
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';

	let users = $state<any[]>([]);
	let userSearchQuery = $state('');
	let isChangingPassword = $state(false);
	let newPassword = $state('');
	let confirmNewPassword = $state('');

	// Choice bank upload states
	let choiceBankNameInput = $state('');
	let choiceFileInput = $state<HTMLInputElement | null>(null);
	let choiceParsedQuestions = $state<any[]>([]);
	let choiceFileName = $state('');
	let isUploadingChoice = $state(false);

	// Knowledge Q&A upload states
	let knowledgeSemesterInput = $state('grade7_up');
	let knowledgeSubjectInput = $state('ethics');
	let knowledgeDifficultyInput = $state<'easy' | 'medium' | 'hard'>('medium');
	let knowledgeFileInput = $state<HTMLInputElement | null>(null);
	let knowledgeParsedQuestions = $state<any[]>([]);
	let knowledgeFileName = $state('');
	let knowledgeRawText = $state('');
	let isUploadingKnowledge = $state(false);
	let knowledgeTab = $state<'upload' | 'text'>('text');

	const semesters = [
		{ id: 'grade7_up', name: '七年级上学期' },
		{ id: 'grade7_down', name: '七年级下学期' },
		{ id: 'grade8_up', name: '八年级上学期' },
		{ id: 'grade8_down', name: '八年级下学期' },
		{ id: 'grade9_up', name: '九年级上学期' },
		{ id: 'grade9_down', name: '九年级下学期' }
	];

	const subjects = [
		{ id: 'ethics', name: '道德与法治' },
		{ id: 'history', name: '历史' },
		{ id: 'geography', name: '地理' },
		{ id: 'biology', name: '生物' }
	];

	onMount(async () => {
		if (quizStore.currentUser?.role === 'admin') {
			users = await quizStore.fetchUsers();
		}
	});

	// Filter users based on query
	let filteredUsers = $derived(
		users.filter(u => {
			if (!userSearchQuery.trim()) return true;
			const q = userSearchQuery.trim().toLowerCase();
			return u.username.toLowerCase().includes(q) || u.nickname.toLowerCase().includes(q);
		})
	);

	async function handleUserDelete(username: string) {
		if (username.toLowerCase() === 'admin') {
			quizStore.showToast('无法清退超级管理员账号！', 'error');
			return;
		}

		if (confirm(`确认清退用户「${username}」吗？\n该操作会彻底删除该用户的账户、个人题库、答题进度和所有错题本记录，且不可逆！`)) {
			const success = await quizStore.deleteUser(username);
			if (success) {
				users = users.filter(u => u.username !== username);
			}
		}
	}

	async function handlePasswordChange(e: Event) {
		e.preventDefault();
		if (newPassword.length < 6) {
			quizStore.showToast('新密码长度不能低于 6 位！', 'error');
			return;
		}
		if (newPassword !== confirmNewPassword) {
			quizStore.showToast('两次输入的密码不一致！', 'error');
			return;
		}

		isChangingPassword = true;
		const result = await quizStore.changeAdminPassword(newPassword);
		isChangingPassword = false;

		if (result.success) {
			newPassword = '';
			confirmNewPassword = '';
		} else {
			quizStore.showToast(result.error || '密码修改失败！', 'error');
		}
	}

	// Choice Upload Handlers
	function handleChoiceFileSelected(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		choiceFileName = file.name;
		const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
		if (!choiceBankNameInput) choiceBankNameInput = baseName;

		const reader = new FileReader();
		reader.onload = (e) => {
			const text = e.target?.result as string;
			if (text) {
				try {
					const questions = parseMarkdown(text);
					if (questions.length > 0) {
						choiceParsedQuestions = questions;
						quizStore.showToast(`成功解析选择题：${questions.length} 道`, 'success');
					} else {
						quizStore.showToast('未解析到客观选择题，请检查 Markdown 格式', 'error');
						choiceParsedQuestions = [];
					}
				} catch (err) {
					quizStore.showToast('解析失败，请检查 Markdown 格式', 'error');
					choiceParsedQuestions = [];
				}
			}
		};
		reader.readAsText(file);
	}

	async function handleChoiceUploadSubmit(e: Event) {
		e.preventDefault();
		if (!choiceBankNameInput.trim()) {
			quizStore.showToast('请填写公共题库名称！', 'error');
			return;
		}
		if (choiceParsedQuestions.length === 0) {
			quizStore.showToast('请先选择并解析有效的 Markdown 题库文件！', 'error');
			return;
		}

		isUploadingChoice = true;
		const success = await quizStore.uploadBank(choiceBankNameInput, choiceParsedQuestions, true);
		isUploadingChoice = false;

		if (success) {
			choiceBankNameInput = '';
			choiceParsedQuestions = [];
			choiceFileName = '';
			if (choiceFileInput) choiceFileInput.value = '';
		}
	}

	// Knowledge Upload Handlers
	function handleKnowledgeFileSelected(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		knowledgeFileName = file.name;
		const reader = new FileReader();
		reader.onload = (e) => {
			const text = e.target?.result as string;
			if (text) {
				try {
					const questions = parseKnowledgeMarkdown(text);
					if (questions.length > 0) {
						knowledgeParsedQuestions = questions;
						quizStore.showToast(`成功解析问答题：${questions.length} 道`, 'success');
					} else {
						quizStore.showToast('未解析到问答题，请检查 Markdown 格式', 'error');
						knowledgeParsedQuestions = [];
					}
				} catch (err) {
					quizStore.showToast('解析失败，请检查 Markdown 格式', 'error');
					knowledgeParsedQuestions = [];
				}
			}
		};
		reader.readAsText(file);
	}

	function handleKnowledgeTextChange() {
		if (knowledgeRawText && knowledgeRawText.trim()) {
			knowledgeParsedQuestions = parseKnowledgeMarkdown(knowledgeRawText);
		} else {
			knowledgeParsedQuestions = [];
		}
	}

	async function handleKnowledgeUploadSubmit(e: Event) {
		e.preventDefault();
		if (knowledgeParsedQuestions.length === 0) {
			quizStore.showToast('未解析到主观问答题！请粘帖或选择符合格式的文件', 'error');
			return;
		}

		isUploadingKnowledge = true;

		// Map parameters
		const mapped = knowledgeParsedQuestions.map(q => ({
			...q,
			semester: knowledgeSemesterInput,
			subject: knowledgeSubjectInput,
			difficulty: knowledgeDifficultyInput
		}));

		try {
			const headers: Record<string, string> = { 'Content-Type': 'application/json' };
			if (quizStore.currentUser) {
				headers['X-User-Username'] = quizStore.currentUser.username;
			}
			const res = await fetch('/api/knowledge', {
				method: 'POST',
				headers,
				body: JSON.stringify(mapped)
			});
			if (res.ok) {
				quizStore.showToast(`成功导入 ${mapped.length} 道主观问答题！`, 'success');
				// Reset states
				knowledgeParsedQuestions = [];
				knowledgeRawText = '';
				knowledgeFileName = '';
				if (knowledgeFileInput) knowledgeFileInput.value = '';
			} else {
				const errData: any = await res.json().catch(() => ({}));
				quizStore.showToast(`导入失败: ${errData.error || '云端报错'}`, 'error');
			}
		} catch (err) {
			console.error(err);
			quizStore.showToast('导入网络请求失败！', 'error');
		} finally {
			isUploadingKnowledge = false;
		}
	}
</script>

<svelte:head>
	<title>后台管理中心 - CyberQuiz AI</title>
</svelte:head>

<div class="min-h-screen bg-surface-container-lowest/15 pt-24 pb-16 px-margin-mobile md:px-margin-desktop relative overflow-hidden">
	<!-- Decorative Background Glows -->
	<div class="absolute -top-[15%] -left-[10%] w-[55%] h-[55%] bg-primary/10 rounded-full blur-[140px] pointer-events-none"></div>
	<div class="absolute top-[40%] right-[-10%] w-[50%] h-[50%] bg-secondary/8 rounded-full blur-[140px] pointer-events-none"></div>

	{#if !quizStore.currentUser || quizStore.currentUser.role !== 'admin'}
		<!-- Access Denied Card -->
		<div class="max-w-md mx-auto my-12" in:fade>
			<div class="glass-card p-8 rounded-3xl border border-error/25 cyber-glow-error text-center space-y-6">
				<span class="material-symbols-outlined text-[64px] text-error animate-bounce">gavel</span>
				<div class="space-y-2">
					<h3 class="font-headline-md text-headline-md text-on-surface font-extrabold">访问权限不足</h3>
					<p class="text-on-surface-variant text-body-md">您当前不是超级管理员角色。后台管理控制台仅限系统管理员账号登录访问。</p>
				</div>
				<a
					href="/"
					class="inline-flex items-center gap-2 px-6 py-3 bg-surface-container border border-outline-variant/30 text-on-surface hover:text-primary hover:border-primary/50 transition-all rounded-xl cursor-pointer font-bold text-xs"
				>
					<span class="material-symbols-outlined text-[16px]">home</span>
					<span>返回首页</span>
				</a>
			</div>
		</div>
	{:else}
		<!-- Management Console Dashboard -->
		<div class="max-w-6xl mx-auto space-y-8 relative z-10" in:fade>
			
			<!-- Hero Page Header -->
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-outline-variant/15">
				<div class="space-y-2">
					<div class="flex items-center gap-2 text-primary font-bold text-label-lg">
						<span class="material-symbols-outlined text-[20px]">admin_panel_settings</span>
						<span>SYSTEM MANAGER</span>
					</div>
					<h2 class="font-headline-lg text-headline-lg font-extrabold text-on-surface">后台管理中心</h2>
					<p class="text-on-surface-variant/80 text-body-md max-w-xl leading-relaxed">
						超级管理员控制台。支持批量清退注册用户、修改管理员登录密码，以及全球公共客观题库、主观问答题库的集中导入与更新。
					</p>
				</div>
				
				<div class="flex items-center gap-3 bg-surface border border-outline-variant/20 py-2.5 px-4 rounded-2xl shadow-sm self-start">
					<span class="material-symbols-outlined text-primary text-[24px]">account_circle</span>
					<div>
						<div class="text-[11px] text-on-surface-variant font-bold">超级管理员会话</div>
						<div class="text-sm font-extrabold text-on-surface">
							{quizStore.currentUser.nickname} (admin)
						</div>
					</div>
				</div>
			</div>

			<!-- Grid Layout -->
			<div class="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
				
				<!-- Left Column: User manager & Password changing -->
				<div class="space-y-8">
					<!-- User Management Card -->
					<div class="glass-card p-6 rounded-[28px] border border-outline-variant/20 bg-surface/30 space-y-6">
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
							<div class="space-y-1">
								<h3 class="font-title-md text-on-surface font-extrabold flex items-center gap-2">
									<span class="material-symbols-outlined text-primary">groups</span>
									<span>注册用户管理</span>
								</h3>
								<p class="text-xs text-on-surface-variant">查看所有已注册的用户列表，超级管理员具有清退（物理销毁）权限。</p>
							</div>
							
							<!-- Search Input -->
							<div class="relative w-full sm:w-60">
								<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[18px]">search</span>
								<input
									type="text"
									placeholder="搜索用户名或昵称"
									bind:value={userSearchQuery}
									class="w-full bg-[#0b1326]/60 border border-outline-variant/25 focus:border-primary rounded-xl pl-9 pr-4 py-2 text-xs text-on-surface transition-all outline-none"
								/>
							</div>
						</div>

						<!-- Users Table -->
						<div class="overflow-x-auto rounded-xl border border-outline-variant/15">
							<table class="w-full text-left border-collapse text-xs">
								<thead>
									<tr class="bg-surface-container/60 text-on-surface-variant/80 border-b border-outline-variant/15 font-bold font-code">
										<th class="p-3">账号用户名</th>
										<th class="p-3">显示昵称</th>
										<th class="p-3">系统角色</th>
										<th class="p-3">注册时间</th>
										<th class="p-3 text-right">管理操作</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-outline-variant/10">
									{#each filteredUsers as user (user.username)}
										<tr class="row-hover transition-colors font-medium">
											<td class="p-3 font-code text-on-surface font-bold">{user.username}</td>
											<td class="p-3">{user.nickname}</td>
											<td class="p-3">
												<span class="px-2 py-0.5 rounded-full text-[10px] font-bold {user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-surface-variant text-on-surface-variant'}">
													{user.role === 'admin' ? '管理员' : '普通用户'}
												</span>
											</td>
											<td class="p-3 text-on-surface-variant font-code">
												{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '未知'}
											</td>
											<td class="p-3 text-right">
												{#if user.username !== 'admin'}
													<button
														onclick={() => handleUserDelete(user.username)}
														class="px-2.5 py-1 text-[11px] font-bold border border-error/30 text-error bg-error/5 hover:bg-error/15 rounded-lg active:scale-95 transition-all cursor-pointer"
													>
														清退
													</button>
												{:else}
													<span class="text-[10px] text-on-surface-variant/50 pr-2">系统锁定</span>
												{/if}
											</td>
										</tr>
									{:else}
										<tr>
											<td colspan="5" class="p-8 text-center text-on-surface-variant/60 font-bold">
												未查询到匹配的注册账户
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>

					<!-- Password Change Card -->
					<div class="glass-card p-6 rounded-[28px] border border-outline-variant/20 bg-surface/30 space-y-4">
						<div class="space-y-1">
							<h3 class="font-title-md text-on-surface font-extrabold flex items-center gap-2">
								<span class="material-symbols-outlined text-primary">lock_reset</span>
								<span>修改管理员密码</span>
							</h3>
							<p class="text-xs text-on-surface-variant">为了系统安全，请定期修改默认超级管理员账户的登录密码。</p>
						</div>

						<form onsubmit={handlePasswordChange} class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
							<div class="space-y-1">
								<label for="new_pw" class="text-xs text-on-surface-variant font-bold ml-0.5">管理员新密码</label>
								<input
									type="password"
									id="new_pw"
									placeholder="不能少于6位"
									bind:value={newPassword}
									class="w-full px-4 py-2.5 bg-surface-container/30 border border-outline-variant/25 focus:border-primary focus:bg-surface-container/60 outline-none rounded-xl text-xs text-on-surface transition-all"
									required
								/>
							</div>

							<div class="space-y-1">
								<label for="new_pw_conf" class="text-xs text-on-surface-variant font-bold ml-0.5">确认输入新密码</label>
								<input
									type="password"
									id="new_pw_conf"
									placeholder="重新输入一遍新密码"
									bind:value={confirmNewPassword}
									class="w-full px-4 py-2.5 bg-surface-container/30 border border-outline-variant/25 focus:border-primary focus:bg-surface-container/60 outline-none rounded-xl text-xs text-on-surface transition-all"
									required
								/>
							</div>

							<button
								type="submit"
								disabled={isChangingPassword}
								class="w-full sm:col-span-2 py-2.5 bg-primary text-on-primary font-label-sm text-xs font-bold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary/10"
							>
								{#if isChangingPassword}
									<div class="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
									<span>正在提交修改...</span>
								{:else}
									<span class="material-symbols-outlined text-[16px]">check_circle</span>
									<span>确认修改密码</span>
								{/if}
							</button>
						</form>
					</div>

				</div>

				<!-- Right Column: Import global datasets (Objective Choice, Subjective Q&A) -->
				<div class="space-y-8">
					
					<!-- 1. Global Choice Bank Upload -->
					<div class="glass-card p-6 rounded-[28px] border border-outline-variant/20 bg-surface/30 space-y-4">
						<div class="space-y-1">
							<h3 class="font-title-md text-on-surface font-extrabold flex items-center gap-2">
								<span class="material-symbols-outlined text-primary">cloud_upload</span>
								<span>导入官方公共题库</span>
							</h3>
							<p class="text-xs text-on-surface-variant">上传客观选择题。导入后作为全球公共题库，所有注册用户均可见并可自行应用装载。</p>
						</div>

						<form onsubmit={handleChoiceUploadSubmit} class="space-y-4">
							<div class="space-y-1">
								<label for="globChoiceBankName" class="text-xs text-on-surface-variant font-bold ml-0.5">题库命名</label>
								<input
									type="text"
									id="globChoiceBankName"
									placeholder="例如: 2026年道德与法治中考模拟题"
									bind:value={choiceBankNameInput}
									class="w-full px-4 py-2.5 bg-surface-container/30 border border-outline-variant/25 focus:border-primary focus:bg-surface-container/60 outline-none rounded-xl text-xs text-on-surface transition-all"
									required
								/>
							</div>

							<!-- File Drop Area -->
							<div
								onclick={() => choiceFileInput?.click()}
								class="border-2 border-dashed border-outline-variant/35 rounded-2xl p-5 text-center hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 cursor-pointer select-none space-y-1.5 group"
							>
								<span class="material-symbols-outlined text-2xl text-on-surface-variant group-hover:text-primary group-hover:scale-110 transition-all duration-300">upload_file</span>
								<div class="space-y-0.5">
									<p class="text-xs font-bold text-on-surface">选择 Markdown 选择题库文件</p>
									{#if choiceFileName}
										<p class="text-[10px] text-primary font-bold">{choiceFileName}</p>
									{:else}
										<p class="text-[9px] text-on-surface-variant/60">文件需包含 ## 题目内容 及 ## 选项等</p>
									{/if}
								</div>
								
								<input
									type="file"
									accept=".md,.txt"
									bind:this={choiceFileInput}
									onchange={handleChoiceFileSelected}
									class="hidden"
								/>
							</div>

							{#if choiceParsedQuestions.length > 0}
								<div transition:slide class="flex items-center gap-2 p-2.5 bg-secondary-container/10 border border-secondary/20 rounded-xl font-medium">
									<span class="material-symbols-outlined text-secondary text-[16px]">verified</span>
									<span class="text-[10px] text-on-secondary-container">
										成功解析选择题：<strong class="font-bold text-secondary">{choiceParsedQuestions.length} 道</strong>
									</span>
								</div>
							{/if}

							<button
								type="submit"
								disabled={isUploadingChoice || choiceParsedQuestions.length === 0}
								class="w-full py-2.5 bg-primary text-on-primary font-label-sm text-xs font-bold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary/10"
							>
								{#if isUploadingChoice}
									<div class="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
									<span>正在上传公共题库...</span>
								{:else}
									<span class="material-symbols-outlined text-[16px]">publish</span>
									<span>发布至公共选择题库</span>
								{/if}
							</button>
						</form>
					</div>

					<!-- 2. Global Subjective Q&A Upload -->
					<div class="glass-card p-6 rounded-[28px] border border-outline-variant/20 bg-surface/30 space-y-4">
						<div class="space-y-1">
							<h3 class="font-title-md text-on-surface font-extrabold flex items-center gap-2">
								<span class="material-symbols-outlined text-primary">auto_awesome</span>
								<span>导入官方主观问答题</span>
							</h3>
							<p class="text-xs text-on-surface-variant">上传主观问答题。管理员可以将其命名并导入至指定的系统同步科目及学期下。</p>
						</div>

						<form onsubmit={handleKnowledgeUploadSubmit} class="space-y-4">
							<div class="grid grid-cols-2 gap-3">
								<div class="space-y-1">
									<label for="know_sem" class="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider font-code">目标学期</label>
									<select
										id="know_sem"
										bind:value={knowledgeSemesterInput}
										class="w-full bg-[#0b1326]/60 border border-outline-variant/20 focus:border-primary rounded-xl px-3 py-2 text-xs text-on-surface outline-none transition-all"
									>
										{#each semesters as s}
											<option value={s.id} class="bg-[#0b1326]">{s.name}</option>
										{/each}
									</select>
								</div>

								<div class="space-y-1">
									<label for="know_sub" class="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider font-code">目标科目</label>
									<select
										id="know_sub"
										bind:value={knowledgeSubjectInput}
										class="w-full bg-[#0b1326]/60 border border-outline-variant/20 focus:border-primary rounded-xl px-3 py-2 text-xs text-on-surface outline-none transition-all"
									>
										{#each subjects as sub}
											<option value={sub.id} class="bg-[#0b1326]">{sub.name}</option>
										{/each}
									</select>
								</div>
							</div>

							<div class="space-y-1">
								<label for="know_diff" class="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider font-code">默认题目难度</label>
								<select
									id="know_diff"
									bind:value={knowledgeDifficultyInput}
									class="w-full bg-[#0b1326]/60 border border-outline-variant/20 focus:border-primary rounded-xl px-3 py-2 text-xs text-on-surface outline-none transition-all"
								>
									<option value="easy" class="bg-[#0b1326]">简单 (Easy)</option>
									<option value="medium" class="bg-[#0b1326]">中等 (Medium)</option>
									<option value="hard" class="bg-[#0b1326]">困难 (Hard)</option>
								</select>
							</div>

							<div class="flex border-b border-outline-variant/10">
								<button
									type="button"
									onclick={() => { knowledgeTab = 'text'; knowledgeParsedQuestions = []; }}
									class="px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer
										{knowledgeTab === 'text' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-primary'}"
								>
									手动粘帖 MD
								</button>
								<button
									type="button"
									onclick={() => { knowledgeTab = 'upload'; knowledgeParsedQuestions = []; }}
									class="px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer
										{knowledgeTab === 'upload' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-primary'}"
								>
									文件上传 MD
								</button>
							</div>

							{#if knowledgeTab === 'upload'}
								<div
									onclick={() => knowledgeFileInput?.click()}
									class="border-2 border-dashed border-outline-variant/35 rounded-2xl p-5 text-center hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 cursor-pointer select-none space-y-1.5 group"
								>
									<span class="material-symbols-outlined text-2xl text-on-surface-variant group-hover:text-primary group-hover:scale-110 transition-all duration-300">cloud_upload</span>
									<div class="space-y-0.5">
										<p class="text-xs font-bold text-on-surface">选择 Markdown 问答题文件</p>
										{#if knowledgeFileName}
											<p class="text-[10px] text-primary font-bold">{knowledgeFileName}</p>
										{:else}
											<p class="text-[9px] text-on-surface-variant/60">文件需包含 ## 标准答案 及 ## 记忆锚点 等</p>
										{/if}
									</div>
									
									<input
										type="file"
										accept=".md"
										bind:this={knowledgeFileInput}
										onchange={handleKnowledgeFileSelected}
										class="hidden"
									/>
								</div>
							{:else}
								<div class="space-y-1">
									<textarea
										placeholder="粘帖包含主观问答题的 Markdown 文本内容..."
										bind:value={knowledgeRawText}
										oninput={handleKnowledgeTextChange}
										class="w-full h-28 bg-[#0b1326]/60 border border-outline-variant/20 focus:border-primary rounded-xl px-3 py-2 text-xs text-on-surface outline-none transition-all font-mono resize-none font-medium"
									></textarea>
								</div>
							{/if}

							{#if knowledgeParsedQuestions.length > 0}
								<div transition:slide class="flex items-center gap-2 p-2.5 bg-secondary-container/10 border border-secondary/20 rounded-xl font-medium">
									<span class="material-symbols-outlined text-secondary text-[16px]">verified</span>
									<span class="text-[10px] text-on-secondary-container">
										成功解析问答题：<strong class="font-bold text-secondary">{knowledgeParsedQuestions.length} 道</strong>
									</span>
								</div>
							{/if}

							<button
								type="submit"
								disabled={isUploadingKnowledge || knowledgeParsedQuestions.length === 0}
								class="w-full py-2.5 bg-primary text-on-primary font-label-sm text-xs font-bold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary/10"
							>
								{#if isUploadingKnowledge}
									<div class="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
									<span>正在上传问答题...</span>
								{:else}
									<span class="material-symbols-outlined text-[16px]">task_alt</span>
									<span>导入官方主观问答题库</span>
								{/if}
							</button>
						</form>
					</div>

				</div>

			</div>
		</div>
	{/if}
</div>
