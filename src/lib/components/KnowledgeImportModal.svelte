<script lang="ts">
	import { quizStore } from '$lib/store.svelte';
	import { parseKnowledgeMarkdown, type ParsedKnowledgeQuestion } from '$lib/utils/knowledgeParser';

	let {
		onConfirm = () => {},
		onCancel = () => {},
		initialSemester = 'grade7_up',
		initialSubject = 'ethics',
		lockSelections = false
	}: {
		onConfirm: (questions: ParsedKnowledgeQuestion[], semester: string, subject: string) => void;
		onCancel: () => void;
		initialSemester?: string;
		initialSubject?: string;
		lockSelections?: boolean;
	} = $props();

	// Modal tabs: 'upload' | 'text'
	let activeTab = $state<'upload' | 'text'>('text');

	// Form values
	let semester = $state(initialSemester);
	let subject = $state(initialSubject);
	let difficulty = $state<'easy' | 'medium' | 'hard'>('medium');

	// Parse states
	let rawText = $state('');
	let parsedQuestions = $state<ParsedKnowledgeQuestion[]>([]);
	let fileName = $state('');

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

	// Sync textbox text parsing
	function handleTextChange() {
		if (rawText && rawText.trim()) {
			parsedQuestions = parseKnowledgeMarkdown(rawText);
		} else {
			parsedQuestions = [];
		}
	}

	// Handle local markdown file selection
	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		fileName = file.name;
		const reader = new FileReader();
		reader.onload = (e) => {
			const text = e.target?.result as string;
			if (text) {
				rawText = text;
				parsedQuestions = parseKnowledgeMarkdown(text);
				quizStore.showToast(`成功解析出 ${parsedQuestions.length} 道问答题！`, 'success');
			}
		};
		reader.onerror = () => {
			quizStore.showToast('读取文件出错', 'error');
		};
		reader.readAsText(file);
		target.value = '';
	}

	function handleImport() {
		if (parsedQuestions.length === 0) {
			quizStore.showToast('请先上传或录入符合格式的 Markdown 文件！', 'error');
			return;
		}

		// Inject selected difficulty if needed
		const updated = parsedQuestions.map(q => ({
			...q,
			difficulty
		}));

		onConfirm(updated, semester, subject);
	}
</script>

<div class="fixed inset-0 z-[999] flex items-center justify-center bg-[#0b1326]/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
	<!-- Modal Box Card -->
	<div class="relative w-full max-w-3xl max-h-[90vh] glass-card rounded-3xl p-6 md:p-8 border border-primary/30 cyber-glow-primary overflow-hidden flex flex-col justify-between animate-in zoom-in-95 duration-300">
		
		<!-- Decroative Lights -->
		<div class="absolute -top-32 -right-32 w-80 h-80 bg-primary/10 rounded-full blur-[80px] pointer-events-none"></div>
		<div class="absolute -bottom-32 -left-32 w-80 h-80 bg-secondary/10 rounded-full blur-[80px] pointer-events-none"></div>

		<!-- Header -->
		<header class="relative z-10 flex justify-between items-center pb-4 border-b border-outline-variant/10 flex-shrink-0">
			<div class="flex items-center gap-3">
				<span class="material-symbols-outlined text-primary text-3xl animate-bounce">book_4_spark</span>
				<div>
					<h2 class="font-headline-md text-headline-md text-on-surface font-extrabold">问答题库导入中心</h2>
					<p class="text-on-surface-variant text-body-sm mt-0.5">支持批量上传 Markdown 文件或手动粘帖文本进行格式转化</p>
				</div>
			</div>
			<button 
				onclick={onCancel}
				class="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-full transition-all cursor-pointer active:scale-90"
				title="关闭"
			>
				<span class="material-symbols-outlined">close</span>
			</button>
		</header>

		<!-- Level Content Area -->
		<div class="relative z-10 flex-grow overflow-y-auto py-5 space-y-5 max-h-[58vh] pr-2">
			
			<!-- Split selection inputs -->
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<!-- Semester -->
				<div class="space-y-1.5">
					<label for="import_sem" class="flex items-center gap-1 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-code">
						<span>目标学期</span>
						{#if lockSelections}
							<span class="material-symbols-outlined text-[14px] text-primary" style="font-variation-settings: 'FILL' 1, 'wght' 600;">lock</span>
						{/if}
					</label>
					<select
						id="import_sem"
						bind:value={semester}
						disabled={lockSelections}
						class="w-full bg-[#0b1326]/60 border border-outline-variant/20 focus:border-primary rounded-xl px-4 py-2.5 text-xs text-on-surface outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-container-low/20"
					>
						{#each semesters as s}
							<option value={s.id} class="bg-[#0b1326]">{s.name}</option>
						{/each}
					</select>
				</div>

				<!-- Subject -->
				<div class="space-y-1.5">
					<label for="import_sub" class="flex items-center gap-1 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-code">
						<span>导入科目</span>
						{#if lockSelections}
							<span class="material-symbols-outlined text-[14px] text-primary" style="font-variation-settings: 'FILL' 1, 'wght' 600;">lock</span>
						{/if}
					</label>
					<select
						id="import_sub"
						bind:value={subject}
						disabled={lockSelections}
						class="w-full bg-[#0b1326]/60 border border-outline-variant/20 focus:border-primary rounded-xl px-4 py-2.5 text-xs text-on-surface outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-container-low/20"
					>
						{#each subjects as sub}
							<option value={sub.id} class="bg-[#0b1326]">{sub.name}</option>
						{/each}
					</select>
				</div>

				<!-- Difficulty -->
				<div class="space-y-1.5">
					<label for="import_diff" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider font-code">默认难度</label>
					<select
						id="import_diff"
						bind:value={difficulty}
						class="w-full bg-[#0b1326]/60 border border-outline-variant/20 focus:border-primary rounded-xl px-4 py-2.5 text-xs text-on-surface outline-none transition-all"
					>
						<option value="easy" class="bg-[#0b1326]">简单 (Easy)</option>
						<option value="medium" class="bg-[#0b1326]">中等 (Medium)</option>
						<option value="hard" class="bg-[#0b1326]">困难 (Hard)</option>
					</select>
				</div>
			</div>

			<!-- Tabs selection -->
			<div class="flex border-b border-outline-variant/10">
				<button
					onclick={() => activeTab = 'text'}
					class="px-5 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer
						{activeTab === 'text' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-primary'}"
				>
					<span class="material-symbols-outlined text-[16px]">keyboard</span>
					手动文本录入
				</button>
				<button
					onclick={() => activeTab = 'upload'}
					class="px-5 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer
						{activeTab === 'upload' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-primary'}"
				>
					<span class="material-symbols-outlined text-[16px]">upload_file</span>
					文件上传
				</button>
			</div>

			<!-- Tab 1: Upload File Layout -->
			{#if activeTab === 'upload'}
				<div class="space-y-4 animate-in fade-in duration-200">
					<!-- Drag & Drop visual -->
					<div class="border-2 border-dashed border-outline-variant/25 rounded-2xl p-8 text-center bg-surface-container-low/20 hover:border-primary/40 hover:bg-surface-container-high/30 transition-all flex flex-col items-center justify-center relative group min-h-[160px]">
						<input
							type="file"
							accept=".md"
							onchange={handleFileSelect}
							class="absolute inset-0 opacity-0 cursor-pointer z-10"
						/>
						<span class="material-symbols-outlined text-[42px] text-on-surface-variant group-hover:text-primary transition-all duration-300">cloud_upload</span>
						<p class="text-xs text-on-surface-variant mt-3 font-semibold">
							{#if fileName}
								已选中：<span class="text-primary">{fileName}</span>
							{:else}
								拖拽 Markdown (.md) 文件至此，或 <span class="text-primary underline">点击浏览文件</span>
							{/if}
						</p>
						<p class="text-[10px] text-on-surface-variant/60 font-code uppercase tracking-widest mt-1">
							Supported formats: Markdown UTF-8
						</p>
					</div>
				</div>
			{:else}
				<!-- Tab 2: Manual text-area pasting -->
				<div class="space-y-3 animate-in fade-in duration-200">
					<label for="import_md_textarea" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider font-code">MD 文本粘帖区域</label>
					<textarea
						id="import_md_textarea"
						bind:value={rawText}
						oninput={handleTextChange}
						placeholder="在此粘帖您的 Markdown 问答题格式，例如：&#10;&#10;## 题目内容&#10;23.【增强权利观念】&#10;材料一 ...&#10;&#10;## 标准答案&#10;（1）...&#10;&#10;## 逻辑架构&#10;...&#10;&#10;## 记忆锚点&#10;..."
						class="w-full h-40 bg-[#0b1326]/60 border border-outline-variant/20 focus:border-primary rounded-2xl px-4 py-3 text-xs text-on-surface outline-none transition-all font-mono resize-none"
					></textarea>
				</div>
			{/if}

			<!-- Parsed preview summary -->
			{#if parsedQuestions.length > 0}
				<div class="space-y-3 p-4 bg-primary/5 rounded-2xl border border-primary/20 animate-in slide-in-from-top-4 duration-300">
					<div class="flex justify-between items-center">
						<div class="flex items-center gap-2 text-primary font-bold text-xs">
							<span class="material-symbols-outlined text-[16px] animate-pulse">check_circle</span>
							<span>解析成功！共识别出 {parsedQuestions.length} 道问答题：</span>
						</div>
					</div>
					
					<!-- Questions preview pills -->
					<div class="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
						{#each parsedQuestions as pq, pIdx}
							<span class="px-2.5 py-1 bg-surface-container-high/60 border border-outline-variant/15 text-[10px] text-on-surface rounded-lg font-semibold flex items-center gap-1.5 shadow-sm">
								<span class="w-4 h-4 rounded-full bg-primary/15 text-primary text-[8px] flex items-center justify-center font-bold font-code">{pIdx + 1}</span>
								{pq.tag.replace(/【|】/g, '')}
							</span>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer Buttons -->
		<footer class="relative z-10 flex justify-end gap-4 pt-4 border-t border-outline-variant/10 flex-shrink-0">
			<button
				onclick={onCancel}
				class="px-5 py-3 border border-outline-variant/30 text-on-surface hover:bg-surface-bright/10 text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95"
			>
				取消
			</button>
			<button
				onclick={handleImport}
				disabled={parsedQuestions.length === 0}
				class="px-6 py-3 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-primary/20 flex items-center gap-1.5 cursor-pointer"
			>
				<span class="material-symbols-outlined text-[16px]">task_alt</span>
				导入至题库
			</button>
		</footer>
	</div>
</div>
