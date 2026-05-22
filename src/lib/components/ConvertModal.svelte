<script lang="ts">
	import type { Question } from '../types';

	let {
		mdContent = '',
		onConfirmReplace = (_q: Question[]) => {},
		onConfirmMerge = (_q: Question[]) => {},
		onCancel = () => {}
	}: {
		mdContent: string;
		onConfirmReplace: (questions: Question[]) => void;
		onConfirmMerge: (questions: Question[]) => void;
		onCancel: () => void;
	} = $props();

	// State machine
	let phase = $state<'idle' | 'converting' | 'preview' | 'error'>('idle');
	let convertedQuestions = $state<Question[]>([]);
	let errorMessage = $state('');
	let elapsedSeconds = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let abortController: AbortController | null = null;

	// Batching progress states
	let totalBatches = $state(0);
	let currentBatchIndex = $state(0);
	let successfullyExtractedCount = $state(0);

	// Helper interface for document split
	interface DocSplit {
		questionsPart: string;
		answersPart: string;
	}

	// Extracts reference answers from the end of the markdown document, avoiding inline answers false-positives
	function extractAnswerKey(md: string): DocSplit {
		const lines = md.split('\n');
		const answerKeyRegex = /^\s*(?:#+\s*|【|[*_-]+\s*)?(?:参考|附|各题)?(?:答案|键|key|answers)(?:[卡表与及和]?)(?:及|与|和)?(?:解析|解答|分析|评分标准|汇总|集)?(?:】)?\s*$/i;
		
		let firstMatchIndex = -1;
		for (let i = 0; i < lines.length; i++) {
			if (answerKeyRegex.test(lines[i])) {
				firstMatchIndex = i;
				break;
			}
		}

		// If a match is found and it is in the last 60% of the document,
		// we treat it as the start of the separate answer key section.
		if (firstMatchIndex !== -1 && firstMatchIndex > lines.length * 0.4) {
			return {
				questionsPart: lines.slice(0, firstMatchIndex).join('\n'),
				answersPart: lines.slice(firstMatchIndex).join('\n')
			};
		}

		return {
			questionsPart: md,
			answersPart: ''
		};
	}

	// Split markdown into individual question blocks based on question number patterns, prepending title/headers to the first block
	function splitIntoQuestionBlocks(questionsPart: string): string[] {
		const lines = questionsPart.split('\n');
		const blocks: string[][] = [];
		let currentBlock: string[] = [];
		let headerLines: string[] = [];
		let foundFirstQuestion = false;

		const questionStartRegex = /^\s*(?:#+\s+|\*\*)?(?:(?:Q|q)?\d+[\s.、:-]+|[(（]\d+[)）]|【\d+】|\[\d+\])/;

		for (const line of lines) {
			if (questionStartRegex.test(line)) {
				foundFirstQuestion = true;
				if (currentBlock.length > 0) {
					blocks.push(currentBlock);
				}
				currentBlock = [line];
			} else {
				if (!foundFirstQuestion) {
					headerLines.push(line);
				} else {
					currentBlock.push(line);
				}
			}
		}
		if (currentBlock.length > 0) {
			blocks.push(currentBlock);
		}

		let parsedBlocks = blocks.map(b => b.join('\n').trim()).filter(Boolean);

		// Fallback if no numbered questions found
		if (parsedBlocks.length <= 1) {
			const paragraphBlocks = questionsPart.split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean);
			if (paragraphBlocks.length > 1) {
				return paragraphBlocks;
			}
			// Final fallback: split by character chunking
			const finalBlocks: string[] = [];
			const chunkSize = 3000;
			for (let i = 0; i < questionsPart.length; i += chunkSize) {
				finalBlocks.push(questionsPart.substring(i, i + chunkSize));
			}
			return finalBlocks;
		}

		// Prepend title/header lines to the first question block
		if (headerLines.length > 0) {
			parsedBlocks[0] = headerLines.join('\n').trim() + '\n\n' + parsedBlocks[0];
		}

		return parsedBlocks;
	}

	// Group question blocks into batches of max questions or max characters
	function createBatches(blocks: string[], maxBatchSize = 6, maxChars = 4000): string[] {
		const batches: string[] = [];
		let currentBatch: string[] = [];
		let currentBatchChars = 0;

		for (const block of blocks) {
			if (
				(currentBatch.length >= maxBatchSize || currentBatchChars + block.length > maxChars) &&
				currentBatch.length > 0
			) {
				batches.push(currentBatch.join('\n\n'));
				currentBatch = [];
				currentBatchChars = 0;
			}
			currentBatch.push(block);
			currentBatchChars += block.length;
		}

		if (currentBatch.length > 0) {
			batches.push(currentBatch.join('\n\n'));
		}

		return batches;
	}

	// Stats
	let totalCount = $derived(convertedQuestions.length);
	let singleCount = $derived(convertedQuestions.filter(q => q.type === 'single').length);
	let multipleCount = $derived(convertedQuestions.filter(q => q.type === 'multiple').length);
	let previewList = $derived(convertedQuestions.slice(0, 5));

	// Load AI config from localStorage
	function getAIConfig() {
		if (typeof window === 'undefined') return {};
		return {
			apiKey: localStorage.getItem('cyber_ai_api_key') || '',
			apiEndpoint: localStorage.getItem('cyber_ai_api_endpoint') || '',
			model: localStorage.getItem('cyber_ai_model') || ''
		};
	}

	function startTimer() {
		elapsedSeconds = 0;
		timerInterval = setInterval(() => {
			elapsedSeconds += 1;
		}, 1000);
	}

	function stopTimer() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	}

	async function startConvert() {
		phase = 'converting';
		errorMessage = '';
		startTimer();

		abortController = new AbortController();
		const config = getAIConfig();

		try {
			const { questionsPart, answersPart } = extractAnswerKey(mdContent);
			const blocks = splitIntoQuestionBlocks(questionsPart);
			const batches = createBatches(blocks);
			totalBatches = Math.max(1, batches.length);
			
			let allQuestions: Question[] = [];
			successfullyExtractedCount = 0;

			for (let i = 0; i < batches.length; i++) {
				currentBatchIndex = i;
				
				if (abortController.signal.aborted) {
					throw new Error('AbortError');
				}

				let batchContent = batches[i];
				if (answersPart) {
					batchContent += '\n\n' + answersPart;
				}

				const res = await fetch('/api/ai/convert', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						mdContent: batchContent,
						apiKey: config.apiKey,
						apiEndpoint: config.apiEndpoint,
						model: config.model
					}),
					signal: abortController.signal
				});

				const data: any = await res.json();

				if (data.success) {
					// Re-index questions to be sequential (only mapping if array has items)
					const batchQuestions = (data.questions || []).map((q: Question, idx: number) => ({
						...q,
						id: allQuestions.length + idx + 1
					}));
					allQuestions = [...allQuestions, ...batchQuestions];
					successfullyExtractedCount = allQuestions.length;
				} else {
					throw new Error(data.error || 'AI 转化部分失败，请确认 API Key 或网络连通性');
				}
			}

			if (allQuestions.length > 0) {
				convertedQuestions = allQuestions;
				phase = 'preview';
			} else {
				errorMessage = 'AI 转化未能提取到任何有效题目，请确保 Markdown 文档包含符合格式的题目。';
				phase = 'error';
			}
		} catch (err: any) {
			if (err.name === 'AbortError' || err.message === 'AbortError') {
				errorMessage = '转化已被用户取消';
			} else {
				errorMessage = err.message || 'AI 转化请求失败';
			}
			phase = 'error';
		} finally {
			stopTimer();
			abortController = null;
		}
	}

	function cancelConvert() {
		if (abortController) {
			abortController.abort();
		}
		stopTimer();
		phase = 'idle';
	}

	function retry() {
		startConvert();
	}

	function handleClose() {
		cancelConvert();
		onCancel();
	}
</script>

<div class="fixed inset-0 z-[999] flex items-center justify-center bg-[#0b1326]/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
	<div class="relative w-full max-w-4xl max-h-[90vh] glass-card rounded-3xl border border-secondary/30 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
		<!-- Glowing Background -->
		<div class="absolute -top-32 -right-32 w-96 h-96 bg-secondary/10 rounded-full blur-[100px] pointer-events-none"></div>
		<div class="absolute -bottom-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>

		<!-- Header -->
		<header class="relative z-10 flex justify-between items-center px-6 md:px-8 py-5 border-b border-outline-variant/10 flex-shrink-0">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-gradient-to-br from-[#A855F7] to-[#EC4899] rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
					<span class="material-symbols-outlined text-white text-xl">auto_awesome</span>
				</div>
				<div>
					<h2 class="font-headline-md text-headline-md text-on-surface">AI 智能转化器</h2>
					<p class="text-on-surface-variant text-body-sm mt-0.5">将任意 Markdown 文件智能转化为可用题库</p>
				</div>
			</div>
			<button
				onclick={handleClose}
				class="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-full transition-all cursor-pointer"
				title="关闭"
			>
				<span class="material-symbols-outlined">close</span>
			</button>
		</header>

		<!-- Content Area -->
		<div class="relative z-10 flex-grow overflow-y-auto p-6 md:p-8">

			{#if phase === 'idle'}
				<!-- Idle: Show MD preview + start button -->
				<div class="space-y-6">
					<div class="flex items-center gap-2 text-on-surface-variant text-body-sm">
						<span class="material-symbols-outlined text-[16px]">description</span>
						已加载文件内容（{mdContent.length} 字符，约 {mdContent.split('\n').length} 行）
					</div>

					<!-- MD Content Preview -->
					<div class="bg-surface-container-low/40 rounded-2xl border border-outline-variant/10 p-5 max-h-[40vh] overflow-y-auto">
						<pre class="text-body-sm text-on-surface-variant font-code whitespace-pre-wrap break-words leading-relaxed">{mdContent.length > 3000 ? mdContent.slice(0, 3000) + '\n\n... (内容过长，仅预览前 3000 字符)' : mdContent}</pre>
					</div>

					<!-- Start Button -->
					<div class="flex justify-center pt-4">
						<button
							onclick={startConvert}
							class="px-10 py-4 bg-gradient-to-r from-[#A855F7] to-[#EC4899] text-white font-bold rounded-2xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-3 text-body-lg"
						>
							<span class="material-symbols-outlined text-2xl">auto_awesome</span>
							开始 AI 智能转化
						</button>
					</div>
				</div>

			{:else if phase === 'converting'}
				<!-- Converting: Loading animation -->
				<div class="flex flex-col items-center justify-center py-20 space-y-8">
					<!-- Animated spinner -->
					<div class="relative">
						<div class="w-24 h-24 rounded-full border-4 border-outline-variant/20 border-t-secondary animate-spin"></div>
						<div class="absolute inset-0 flex items-center justify-center">
							<span class="material-symbols-outlined text-secondary text-3xl animate-pulse">auto_awesome</span>
						</div>
					</div>

					<div class="text-center space-y-3">
						<h3 class="font-headline-md text-headline-md text-on-surface">
							AI 正在智能解析中… ({currentBatchIndex + 1} / {totalBatches} 组)
						</h3>
						<p class="text-on-surface-variant text-body-md">
							大模型正在分批阅读并解析文档，已提取 {successfullyExtractedCount} 道题
						</p>
						<div class="font-code text-secondary text-body-lg font-bold">
							{Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
						</div>
						<p class="text-on-surface-variant text-body-sm bg-surface-container-low/20 px-4 py-2 rounded-xl inline-block border border-outline-variant/5">
							若文档题目较多，分批转换可能需要较长时间，请勿关闭窗口
						</p>
					</div>

					<button
						onclick={cancelConvert}
						class="px-6 py-3 border border-outline-variant/30 text-on-surface-variant rounded-xl hover:bg-surface-bright/10 transition-all active:scale-95 cursor-pointer font-bold"
					>
						取消转化
					</button>
				</div>

			{:else if phase === 'error'}
				<!-- Error: Show message + retry -->
				<div class="flex flex-col items-center justify-center py-16 space-y-6">
					<div class="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center border border-error/20">
						<span class="material-symbols-outlined text-error text-4xl">error_outline</span>
					</div>

					<div class="text-center space-y-3 max-w-lg">
						<h3 class="font-headline-md text-headline-md text-error">转化失败</h3>
						<p class="text-on-surface-variant text-body-md bg-surface-container-low/40 rounded-xl p-4 border border-error/10">
							{errorMessage}
						</p>
					</div>

					<div class="flex gap-4">
						<button
							onclick={retry}
							class="px-6 py-3 bg-gradient-to-r from-[#A855F7] to-[#EC4899] text-white font-bold rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
						>
							<span class="material-symbols-outlined text-[18px]">refresh</span>
							重试
						</button>
						<button
							onclick={handleClose}
							class="px-6 py-3 border border-outline-variant/30 text-on-surface rounded-xl hover:bg-surface-bright/10 transition-all active:scale-95 cursor-pointer font-bold"
						>
							关闭
						</button>
					</div>
				</div>

			{:else if phase === 'preview'}
				<!-- Preview: Show converted questions -->
				<div class="space-y-6">
					<!-- Stats Row -->
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div class="bg-surface-container-low/40 p-4 rounded-2xl border border-outline-variant/5">
							<div class="text-[12px] text-on-surface-variant font-bold">AI 转化题数</div>
							<div class="font-headline-xl text-headline-xl font-extrabold text-secondary mt-1 font-code">
								{totalCount} <span class="text-body-md font-normal text-on-surface-variant">道</span>
							</div>
						</div>
						<div class="bg-surface-container-low/40 p-4 rounded-2xl border border-outline-variant/5 space-y-1">
							<div class="text-[12px] text-on-surface-variant font-bold">题型结构</div>
							<div class="flex justify-between text-body-sm pt-1">
								<span class="text-on-surface-variant">单选题:</span>
								<span class="text-on-surface font-bold font-code">{singleCount} 道</span>
							</div>
							<div class="flex justify-between text-body-sm">
								<span class="text-on-surface-variant">多选题:</span>
								<span class="text-on-surface font-bold font-code">{multipleCount} 道</span>
							</div>
						</div>
						<div class="bg-surface-container-low/40 p-4 rounded-2xl border border-outline-variant/5 flex flex-col justify-center">
							<div class="text-[12px] text-on-surface-variant font-bold">转化耗时</div>
							<div class="font-headline-lg text-headline-lg font-extrabold text-tertiary mt-1 font-code">
								{Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
							</div>
						</div>
					</div>

					<!-- Question Preview List -->
					<div class="space-y-4">
						<h3 class="text-body-md font-extrabold text-on-surface flex items-center gap-1.5">
							<span class="material-symbols-outlined text-[18px] text-secondary">preview</span>
							题目预览（前 {previewList.length} 道）
						</h3>

						<div class="space-y-4 max-h-[35vh] overflow-y-auto pr-2">
							{#each previewList as q}
								<div class="bg-surface-container-low/20 p-5 rounded-2xl border border-outline-variant/10 space-y-3">
									<div class="flex justify-between items-center flex-wrap gap-2">
										<div class="flex items-center gap-2">
											<span class="font-code text-secondary font-bold">Q{q.id}</span>
											<span class="px-2 py-0.5 rounded text-[10px] font-semibold border {q.type === 'single' ? 'bg-tertiary/10 text-tertiary border-tertiary/20' : 'bg-secondary/10 text-secondary border-secondary/20'}">
												{q.type === 'single' ? '单选题' : '多选题'}
											</span>
										</div>
										<div class="flex gap-2">
											<span class="px-2 py-0.5 bg-surface-container-high/60 rounded text-[11px] font-medium text-on-surface-variant font-code">
												{q.category}
											</span>
											<span class="px-2 py-0.5 rounded text-[11px] font-bold {q.difficulty === 'easy' ? 'text-tertiary bg-tertiary/5' : q.difficulty === 'hard' ? 'text-error bg-error/5' : 'text-primary bg-primary/5'}">
												{q.difficulty === 'easy' ? '简单' : q.difficulty === 'hard' ? '困难' : '中等'}
											</span>
										</div>
									</div>

									<h4 class="font-semibold text-on-surface text-body-md leading-relaxed">
										{q.title}
									</h4>

									<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-body-sm pl-2">
										{#each Object.entries(q.options) as [key, val]}
											<div class="text-on-surface-variant flex items-center gap-2">
												<span class="font-bold text-secondary font-code">{key}:</span>
												<span class="truncate">{val}</span>
											</div>
										{/each}
									</div>

									<div class="text-body-sm flex items-center gap-2 pt-1 border-t border-outline-variant/5">
										<span class="text-tertiary font-bold">正确答案:</span>
										<span class="font-code text-on-surface bg-tertiary/10 px-2 py-0.5 rounded border border-tertiary/20 font-bold">
											{q.answer.join(', ')}
										</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer (only in preview phase) -->
		{#if phase === 'preview'}
			<footer class="relative z-10 flex flex-col sm:flex-row gap-3 px-6 md:px-8 py-5 border-t border-outline-variant/10 flex-shrink-0">
				<button
					onclick={handleClose}
					class="flex-1 px-6 py-3 border border-outline-variant/30 text-on-surface rounded-2xl hover:bg-surface-bright/10 transition-all active:scale-[0.98] font-bold cursor-pointer"
				>
					取消
				</button>
				<button
					onclick={() => onConfirmMerge(convertedQuestions)}
					class="flex-1 px-6 py-3 border-2 border-secondary/40 text-secondary rounded-2xl hover:bg-secondary/10 transition-all active:scale-[0.98] font-bold cursor-pointer flex items-center justify-center gap-2"
				>
					<span class="material-symbols-outlined text-[18px]">merge_type</span>
					合并导入
				</button>
				<button
					onclick={() => onConfirmReplace(convertedQuestions)}
					class="flex-1 px-6 py-3 bg-gradient-to-r from-[#A855F7] to-[#EC4899] text-white rounded-2xl hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all active:scale-[0.98] font-bold cursor-pointer flex items-center justify-center gap-2"
				>
					<span class="material-symbols-outlined text-[18px]">swap_horiz</span>
					替换整个题库
				</button>
			</footer>
		{/if}
	</div>
</div>
