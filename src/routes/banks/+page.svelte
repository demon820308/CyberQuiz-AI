<script lang="ts">
	import { quizStore } from '$lib/store.svelte';
	import { parseMarkdown } from '$lib/utils/mdParser';
	import { fade, slide } from 'svelte/transition';

	let bankNameInput = $state('');
	let fileInput = $state<HTMLInputElement | null>(null);
	let parsedQuestions = $state<any[]>([]);
	let isUploading = $state(false);
	
	let activeTab = $state<'public' | 'private'>('public');

	// Filter banks
	let publicBanks = $derived(quizStore.questionBanks.filter(b => b.is_global === 1));
	let privateBanks = $derived(quizStore.questionBanks.filter(b => b.is_global === 0));
	let targetBanks = $derived(activeTab === 'public' ? publicBanks : privateBanks);

	function handleFileSelected(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		// Auto fill bank name with file name without extension
		const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
		if (!bankNameInput) bankNameInput = baseName;

		const reader = new FileReader();
		reader.onload = (e) => {
			const text = e.target?.result as string;
			if (text) {
				try {
					const questions = parseMarkdown(text);
					if (questions.length > 0) {
						parsedQuestions = questions;
						quizStore.showToast(`成功解析到 ${questions.length} 道选择题，输入名称后可提交导入`, 'success');
					} else {
						quizStore.showToast('未解析到有效客观选择题，请检查 Markdown 格式', 'error');
						parsedQuestions = [];
					}
				} catch (err) {
					console.error('MD Parse failed:', err);
					quizStore.showToast('解析失败，请检查 Markdown 格式', 'error');
					parsedQuestions = [];
				}
			}
		};
		reader.readAsText(file);
	}

	async function handleUploadSubmit(e: Event) {
		e.preventDefault();
		if (!bankNameInput.trim()) {
			quizStore.showToast('请填写题库名称！', 'error');
			return;
		}
		if (parsedQuestions.length === 0) {
			quizStore.showToast('请先选择并解析有效的 Markdown 题库文件！', 'error');
			return;
		}

		isUploading = true;
		const success = await quizStore.uploadBank(bankNameInput, parsedQuestions, false); // always private for normal users
		isUploading = false;
		if (success) {
			bankNameInput = '';
			parsedQuestions = [];
			if (fileInput) fileInput.value = '';
			activeTab = 'private'; // Swtich to private tab to see new bank
		}
	}

	function handleApply(bankId: number) {
		quizStore.applyBank(bankId);
	}

	function handleDelete(bankId: number, e: Event) {
		e.stopPropagation();
		if (confirm('确认物理删除该题库吗？该操作不可逆，且会删除该题库下的所有题目！')) {
			quizStore.deleteBank(bankId);
		}
	}
</script>

<div class="min-h-screen bg-surface-container-lowest/15 pt-24 pb-16 px-margin-mobile md:px-margin-desktop relative overflow-hidden">
	<!-- Futuristic Radial Glows -->
	<div class="absolute -top-[15%] -left-[10%] w-[55%] h-[55%] bg-primary/10 rounded-full blur-[140px] pointer-events-none"></div>
	<div class="absolute top-[40%] right-[-10%] w-[50%] h-[50%] bg-secondary/8 rounded-full blur-[140px] pointer-events-none"></div>

	<div class="max-w-6xl mx-auto space-y-10 relative z-10">
		
		<!-- Hero Section -->
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-outline-variant/15">
			<div class="space-y-2">
				<div class="flex items-center gap-2 text-primary font-bold text-label-lg">
					<span class="material-symbols-outlined text-[20px]">database</span>
					<span>题库中心</span>
				</div>
				<h2 class="font-headline-lg text-headline-lg font-extrabold text-on-surface">选择题库中心</h2>
				<p class="text-on-surface-variant/80 text-body-md max-w-xl leading-relaxed">
					在此处切换您当前答题练习所应用的客观选择题库。您可以应用官方发布的公共推荐题库，也可以在下方上传您自己的专属题库。
				</p>
			</div>
			
			{#if quizStore.currentUser}
				<div class="flex items-center gap-3 bg-surface border border-outline-variant/20 py-2.5 px-4 rounded-2xl shadow-sm self-start">
					<span class="material-symbols-outlined text-primary text-[24px]">account_circle</span>
					<div>
						<div class="text-[11px] text-on-surface-variant font-bold">当前登录账号</div>
						<div class="text-sm font-extrabold text-on-surface flex items-center gap-1.5">
							{quizStore.currentUser.nickname} 
							<span class="text-[10px] px-2 py-0.5 rounded-full font-bold {quizStore.currentUser.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-surface-variant text-on-surface-variant'}">
								{quizStore.currentUser.role === 'admin' ? '超级管理员' : '普通用户'}
							</span>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Main Layout Grid -->
		<div class="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
			
			<!-- Left Column: Visible Question Banks -->
			<div class="space-y-6">
				<!-- Tabs Header -->
				<div class="flex border-b border-outline-variant/10 gap-6">
					<button
						onclick={() => activeTab = 'public'}
						class="py-3 font-label-lg text-label-lg border-b-2 font-bold transition-all relative {activeTab === 'public' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}"
					>
						公共推荐题库 ({publicBanks.length})
					</button>
					<button
						onclick={() => activeTab = 'private'}
						class="py-3 font-label-lg text-label-lg border-b-2 font-bold transition-all relative {activeTab === 'private' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}"
					>
						我的个人题库 ({privateBanks.length})
					</button>
				</div>

				<!-- Question Banks Grid -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each targetBanks as bank (bank.id)}
						{@const isApplied = quizStore.activeBankId === bank.id}
						<div
							onclick={() => handleApply(bank.id)}
							class="group relative glass-card p-6 rounded-3xl border text-left cursor-pointer transition-all duration-300 flex flex-col justify-between min-h-[160px] hover:border-primary/50 hover:shadow-lg active:scale-[0.99] {isApplied ? 'border-primary bg-primary/5 shadow-[0_0_20px_rgba(99,102,241,0.15)]' : 'border-outline-variant/20 bg-surface/30'}"
						>
							<!-- Highlight applied tag -->
							{#if isApplied}
								<div class="absolute top-4 right-4 flex items-center gap-1 bg-primary text-on-primary text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm shadow-primary/20">
									<span class="material-symbols-outlined text-[12px] font-bold">check_circle</span>
									<span>应用中</span>
								</div>
							{/if}

							<div class="space-y-2.5">
								<div class="w-10 h-10 rounded-xl bg-surface-container/60 border border-outline-variant/25 flex items-center justify-center text-on-surface group-hover:bg-primary group-hover:text-on-primary group-hover:border-primary transition-all">
									<span class="material-symbols-outlined text-[22px]">auto_stories</span>
								</div>
								
								<div class="space-y-1 pr-14">
									<h4 class="font-title-md text-on-surface font-extrabold line-clamp-1 group-hover:text-primary transition-colors">{bank.name}</h4>
									<p class="text-xs text-on-surface-variant/80 font-medium">创建日期: {new Date(bank.created_at).toLocaleDateString()}</p>
								</div>
							</div>

							<!-- Footer actions -->
							<div class="flex items-center justify-between border-t border-outline-variant/10 pt-4 mt-4">
								<div class="flex items-center gap-1 text-[11px] font-bold text-on-surface-variant/70">
									<span class="material-symbols-outlined text-[14px]">person</span>
									<span>{bank.creator === 'admin' ? '官方发布' : `上传者: ${bank.creator}`}</span>
								</div>

								<div class="flex items-center gap-2">
									<!-- Custom/Private bank delete action -->
									{#if bank.creator !== 'admin' || (quizStore.currentUser && quizStore.currentUser.role === 'admin')}
										<button
											onclick={(e) => handleDelete(bank.id, e)}
											class="p-1.5 rounded-lg text-on-surface-variant/50 hover:text-error hover:bg-error-container/20 transition-all cursor-pointer"
											title="删除此题库"
										>
											<span class="material-symbols-outlined text-[18px]">delete</span>
										</button>
									{/if}
									
									<button
										class="px-3.5 py-1.5 rounded-xl font-label-sm text-xs font-bold transition-all {isApplied ? 'bg-primary text-on-primary' : 'bg-surface-container-high/70 hover:bg-primary hover:text-on-primary text-on-surface'}"
									>
										{isApplied ? '已装载' : '应用此题库'}
									</button>
								</div>
							</div>
						</div>
					{:else}
						<div class="col-span-2 text-center py-14 bg-surface/10 border border-dashed border-outline-variant/20 rounded-[28px] space-y-3">
							<span class="material-symbols-outlined text-4xl text-on-surface-variant/40 animate-pulse">folder_open</span>
							<p class="text-sm font-bold text-on-surface-variant">暂无可用题库列表</p>
							{#if activeTab === 'private'}
								<p class="text-xs text-on-surface-variant/60">您可以在右侧区域上传并解析您的专属 Markdown 选择题库文件。</p>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Right Column: Personal MD Upload Section -->
			<div class="glass-card p-6 rounded-[28px] border border-outline-variant/20 bg-surface/30 space-y-5">
				<div class="space-y-1">
					<h3 class="font-title-md text-on-surface font-extrabold flex items-center gap-1.5">
						<span class="material-symbols-outlined text-primary text-[20px]">upload_file</span>
						<span>上传私人客选题库</span>
					</h3>
					<p class="text-xs text-on-surface-variant">只支持上传客观选择题。上传文件需为标准的 Markdown 文本格式，题目内容仅自己账户可见，保证隐私。</p>
				</div>

				<form onsubmit={handleUploadSubmit} class="space-y-4">
					<!-- Bank Name -->
					<div class="space-y-1">
						<label for="bankName" class="text-xs text-on-surface-variant font-bold ml-0.5">题库命名</label>
						<input
							type="text"
							id="bankName"
							placeholder="例如: 我的单元测验"
							bind:value={bankNameInput}
							class="w-full px-4 py-2.5 bg-surface-container/30 border border-outline-variant/25 focus:border-primary focus:bg-surface-container/60 outline-none rounded-xl text-xs text-on-surface transition-all"
							disabled={isUploading}
							required
						/>
					</div>

					<!-- Drag and Drop Box -->
					<div
						onclick={() => fileInput?.click()}
						class="border-2 border-dashed border-outline-variant/35 rounded-2xl p-6 text-center hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 cursor-pointer select-none space-y-2 group"
					>
						<span class="material-symbols-outlined text-3xl text-on-surface-variant group-hover:text-primary group-hover:scale-110 transition-all duration-300">cloud_upload</span>
						<div class="space-y-1">
							<p class="text-xs font-extrabold text-on-surface">选择或拖拽 Markdown 文件</p>
							<p class="text-[10px] text-on-surface-variant/60">文件大小不超过 5MB</p>
						</div>
						
						<!-- Hidden input file -->
						<input
							type="file"
							accept=".md,.txt"
							bind:this={fileInput}
							onchange={handleFileSelected}
							class="hidden"
						/>
					</div>

					<!-- Parsed Preview notice -->
					{#if parsedQuestions.length > 0}
						<div transition:slide class="flex items-center gap-2 p-3 bg-secondary-container/10 border border-secondary/20 rounded-xl">
							<span class="material-symbols-outlined text-secondary text-[18px]">verified</span>
							<span class="text-[11px] text-on-secondary-container font-medium">
								成功解析选择题：<strong class="font-bold text-secondary">{parsedQuestions.length} 道</strong>
							</span>
						</div>
					{/if}

					<!-- Submit button -->
					<button
						type="submit"
						class="w-full py-2.5 bg-primary text-on-primary font-label-sm text-xs font-bold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 disabled:bg-primary/50"
						disabled={isUploading || parsedQuestions.length === 0}
					>
						{#if isUploading}
							<div class="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
							<span>正在导入题库...</span>
						{:else}
							<span class="material-symbols-outlined text-[16px]">publish</span>
							<span>确认解析并导入</span>
						{/if}
					</button>
				</form>
			</div>

		</div>
	</div>
</div>
