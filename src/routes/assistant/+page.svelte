<script lang="ts">
	import { quizStore } from '$lib/store.svelte';
	import { goto } from '$app/navigation';
	import { generateAIDiagnosis } from '$lib/utils/aiAdvisor';
	import type { Question } from '$lib/types';
	import type { AIAdviceReport } from '$lib/utils/aiAdvisor';
	import { onMount } from 'svelte';

	// Stats derivations in Svelte 5
	let questions = $derived(quizStore.questions);
	let wrongBook = $derived(quizStore.wrongBook);
	let history = $derived(quizStore.history);
	let totalQuestions = $derived(questions.length);

	let isAiLoading = $state(false);
	let cloudAiReport = $state<AIAdviceReport | null>(null);
	let isCloudAi = $state(false);
	let aiSource = $state<'offline' | 'cloud'>('offline');

	let inputApiKey = $state('');
	let inputApiEndpoint = $state('');
	let inputModel = $state('');
	let showSettings = $state(false);
	let isTestingConnection = $state(false);

	onMount(() => {
		if (typeof window !== 'undefined') {
			inputApiKey = localStorage.getItem('cyber_ai_api_key') || '';
			inputApiEndpoint = localStorage.getItem('cyber_ai_api_endpoint') || '';
			inputModel = localStorage.getItem('cyber_ai_model') || '';
		}
	});

	function saveSettings() {
		if (typeof window !== 'undefined') {
			localStorage.setItem('cyber_ai_api_key', inputApiKey);
			localStorage.setItem('cyber_ai_api_endpoint', inputApiEndpoint);
			localStorage.setItem('cyber_ai_model', inputModel);
		}
		showSettings = false;
		quizStore.showToast('🤖 AI 配置已成功更新并应用！', 'success');
	}

	async function testConnection() {
		if (isTestingConnection) return;
		isTestingConnection = true;
		try {
			const res = await fetch('/api/ai/diagnose', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					isTest: true,
					apiKey: inputApiKey || null,
					apiEndpoint: inputApiEndpoint || null,
					model: inputModel || null
				})
			});

			if (!res.ok) {
				throw new Error(`HTTP 错误 ${res.status}`);
			}

			const data = (await res.json()) as any;
			if (data.success) {
				quizStore.showToast(data.message || '🔌 连通性测试成功！', 'success');
			} else {
				throw new Error(data.error || '连通性测试失败');
			}
		} catch (err: any) {
			console.error('[Connection Test Error]', err);
			quizStore.showToast(`❌ ${err.message || err}`, 'error');
		} finally {
			isTestingConnection = false;
		}
	}

	// Calculate local report as baseline and fallback
	let offlineReport = $derived(generateAIDiagnosis(questions, history, wrongBook));
	let aiReport = $derived(isCloudAi && cloudAiReport ? cloudAiReport : offlineReport);

	async function triggerCloudAiDiagnosis() {
		if (isAiLoading) return;
		isAiLoading = true;
		try {
			const res = await fetch('/api/ai/diagnose', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					questions,
					history,
					wrongBook,
					apiKey: inputApiKey || null,
					apiEndpoint: inputApiEndpoint || null,
					model: inputModel || null
				})
			});

			if (!res.ok) {
				throw new Error(`HTTP Error ${res.status}`);
			}

			const data = (await res.json()) as any;
			if (data.success && data.report) {
				cloudAiReport = data.report;
				isCloudAi = true;
				aiSource = data.source === 'cloud' ? 'cloud' : 'offline';
				
				if (data.source === 'cloud') {
					quizStore.showToast(`🤖 AI 深度分析已生成！(模型: ${data.model || 'default'})`, 'success');
				} else if (data.source === 'offline_fallback') {
					quizStore.showToast(`⚠️ 云端接口异常，已自动切换到本地诊断引擎`, 'error');
				} else {
					quizStore.showToast('ℹ️ 未检测到密钥，运行本地规则诊断模式');
				}
			} else {
				throw new Error(data.error || '数据解析失败');
			}
		} catch (err: any) {
			console.error('[Cloud AI Error]', err);
			quizStore.showToast(`❌ 深度分析失败: ${err.message || err}`, 'error');
		} finally {
			isAiLoading = false;
		}
	}

	// Tab control for interactive console
	let activeTab = $state<'diagnosis' | 'plan' | 'strategies'>('diagnosis');

	// Trigger "地狱攻坚" (mistakes practice) for a category
	function triggerDirectMistakesPractice(categoryName: string) {
		const matchingWrongIds = new Set(
			wrongBook
				.filter(w => {
					const q = questions.find(item => item.id === w.questionId);
					return q && q.category === categoryName;
				})
				.map(w => w.questionId)
		);

		const filterQuestions = questions.filter(q => matchingWrongIds.has(q.id));
		if (filterQuestions.length === 0) {
			quizStore.showToast('该模块暂无错题可以练习！', 'error');
			return;
		}

		quizStore.activeQuestions = filterQuestions;
		quizStore.currentIndex = 0;
		quizStore.selectedAnswers = [];
		quizStore.submitted = false;
		quizStore.exerciseMode = 'wrong';
		
		quizStore.showToast(`已筛选出 ${filterQuestions.length} 道『${categoryName}』错题进行突破练习！`, 'success');
		goto('/quiz');
	}

	// Trigger study mode step shortcut
	function triggerStepAction(step: number) {
		if (step === 1) {
			// Find weakest category and practice it or start normal study
			if (aiReport.weakestCategories && aiReport.weakestCategories.length > 0) {
				const weakestName = aiReport.weakestCategories[0].name;
				const matchingWrongIds = new Set(
					wrongBook
						.filter(w => {
							const q = questions.find(item => item.id === w.questionId);
							return q && q.category === weakestName;
						})
						.map(w => w.questionId)
				);
				const filterQuestions = questions.filter(q => matchingWrongIds.has(q.id));
				if (filterQuestions.length > 0) {
					quizStore.activeQuestions = filterQuestions;
					quizStore.currentIndex = 0;
					quizStore.selectedAnswers = [];
					quizStore.submitted = false;
					quizStore.exerciseMode = 'wrong';
					quizStore.showToast(`直达第一步：开启『${weakestName}』薄弱点突击`, 'success');
					goto('/quiz');
					return;
				}
			}
			// Fallback to sequential study
			quizStore.initSession('sequential');
			quizStore.showToast('开启顺序练习，补全数据基底', 'success');
			goto('/quiz');
		} else if (step === 2) {
			// Practice all wrong questions
			if (wrongBook.length > 0) {
				const wrongIds = new Set(wrongBook.map(w => w.questionId));
				const wrongQuestions = questions.filter(q => wrongIds.has(q.id));
				if (wrongQuestions.length > 0) {
					quizStore.activeQuestions = wrongQuestions;
					quizStore.currentIndex = 0;
					quizStore.selectedAnswers = [];
					quizStore.submitted = false;
					quizStore.exerciseMode = 'wrong';
					quizStore.showToast('直达第二步：开启错题重练攻坚模式', 'success');
					goto('/quiz');
				} else {
					quizStore.showToast('没有可练习的错题！', 'error');
				}
			} else {
				// Random practice
				quizStore.initSession('random');
				quizStore.showToast('暂无积压错题，已启动随机组卷练习', 'success');
				goto('/quiz');
			}
		} else if (step === 3) {
			// Random practice
			quizStore.initSession('random');
			quizStore.showToast('直达第三步：开启全栈盲测抗压练习', 'success');
			goto('/quiz');
		}
	}

	interface DiagnosticBlock {
		type: 'paragraph' | 'list-item' | 'header';
		content: string;
		num?: string;
	}

	// Dynamic text parser to split diagnostic summaries into structured HTML blocks
	function parseDiagnosticSummary(text: string): DiagnosticBlock[] {
		if (!text) return [];

		// 1. Normalize list formats by inserting newlines
		let processed = text;
		
		// Insert newlines before circled numbers
		processed = processed.replace(/\s*([①②③④⑤⑥⑦⑧⑨⑩])\s*/g, '\n$1 ');
		// Insert newlines before markdown bullet points
		processed = processed.replace(/\s*([-*])\s+/g, '\n$1 ');
		// Insert newlines before standard numbered lists (e.g. 1. 2.)
		processed = processed.replace(/\s*(\d+\.)\s+/g, '\n$1 ');
		
		// Split paragraphs after periods/exclamations if followed by characters that are not list items or newlines
		processed = processed.replace(/([。！\?])([^①②③④⑤⑥⑦⑧⑨⑩\-\*\d\n\s])/g, '$1\n$2');

		// 2. Split by newlines, trim, and filter empty lines
		const lines = processed.split('\n').map(l => l.trim()).filter(Boolean);
		
		// Helper to format inline bold text
		const formatInline = (str: string) => {
			return str.replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary font-bold text-glow-primary">$1</strong>');
		};

		return lines.map(line => {
			// Check circled numbers: ①, ②, etc.
			const circledMatch = line.match(/^([①②③④⑤⑥⑦⑧⑨⑩])\s*(.*)$/);
			if (circledMatch) {
				return {
					type: 'list-item' as const,
					num: circledMatch[1],
					content: formatInline(circledMatch[2].replace(/^[：；，.]\s*/, '').replace(/[；。]$/, ''))
				};
			}
			
			// Check standard markdown bullet points: - or *
			const bulletMatch = line.match(/^([-*])\s*(.*)$/);
			if (bulletMatch) {
				return {
					type: 'list-item' as const,
					num: '•',
					content: formatInline(bulletMatch[2])
				};
			}

			// Check standard numbered lists: 1. 2.
			const numberMatch = line.match(/^(\d+)\.\s*(.*)$/);
			if (numberMatch) {
				return {
					type: 'list-item' as const,
					num: numberMatch[1],
					content: formatInline(numberMatch[2])
				};
			}

			// Check headers: # Header
			const headerMatch = line.match(/^(#{1,6})\s*(.*)$/);
			if (headerMatch) {
				return {
					type: 'header' as const,
					content: formatInline(headerMatch[2])
				};
			}

			// Regular paragraph
			return {
				type: 'paragraph' as const,
				content: formatInline(line)
			};
		});
	}
</script>

<svelte:head>
	<title>AI 智能学习助理 - CyberQuiz AI</title>
</svelte:head>

<div class="pt-24 pb-20 px-4 md:px-margin-desktop max-w-[1440px] mx-auto min-h-screen flex flex-col justify-start">
	<!-- Top App Bar / Title -->
	<div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative gap-6">
		<div class="z-10 flex-grow">
			<div class="flex items-center gap-3 mb-2 flex-wrap">
				<span class="material-symbols-outlined text-primary text-3xl animate-pulse">auto_awesome</span>
				<h2 class="font-headline-xl text-headline-xl text-on-surface">AI 智能学习助理</h2>
				<span class="px-3 py-0.5 bg-secondary/15 border border-secondary/20 rounded-full text-secondary font-label-md font-code">
					COACH v2.4
				</span>
			</div>
			<p class="text-on-surface-variant text-body-lg max-w-2xl leading-relaxed">
				由 AI 驱动的私人学习教练，根据您在 CyberQuiz 的每一次解题足迹，洞察您的认知网络并规划最佳复习路径。
			</p>
		</div>

		<!-- AI Connection Bar / Settings Entry -->
		<div class="flex flex-wrap items-center gap-3">
			<div class="glass-card rounded-2xl px-4 py-2 border border-outline-variant/10 flex items-center gap-4">
				<!-- Engine Indicator -->
				<div class="flex items-center gap-2">
					<div class="w-2.5 h-2.5 rounded-full animate-ping
						{isCloudAi && aiSource === 'cloud' ? 'bg-amber-400' : 'bg-primary'}"
					></div>
					<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-code">
						{isCloudAi && aiSource === 'cloud' ? 'Cloud-AI Online' : 'Local-Rules Engine'}
					</span>
				</div>
				<div class="h-4 w-px bg-outline-variant/20"></div>
				<!-- Model name -->
				<div class="text-xs font-code text-primary">
					{isCloudAi && aiSource === 'cloud' ? (inputModel || 'gpt-4o-mini') : 'Built-in Rules'}
				</div>
			</div>

			<!-- Quick settings button -->
			<button 
				onclick={() => showSettings = !showSettings} 
				class="flex items-center justify-center p-2.5 rounded-xl text-on-surface-variant hover:text-primary hover:bg-primary/10 border border-outline-variant/15 hover:border-primary/25 transition-all duration-300 active:scale-95 bg-surface-container-low/40"
				title="配置 AI 运行参数"
			>
				<span class="material-symbols-outlined text-[20px] transition-transform duration-500 {showSettings ? 'rotate-90' : ''}">settings</span>
			</button>
		</div>
	</div>

	<!-- AI Settings Expansion Card -->
	{#if showSettings}
		<div class="mb-8 glass-card rounded-3xl p-stack-md border border-primary/30 cyber-glow-primary overflow-hidden flex flex-col md:flex-row gap-6 justify-between animate-in slide-in-from-top-4 duration-300 relative">
			<div class="absolute top-4 right-4 z-10">
				<button 
					onclick={() => showSettings = false} 
					class="text-on-surface-variant hover:text-white transition-colors p-1 hover:bg-surface-bright/10 rounded-full"
				>
					<span class="material-symbols-outlined text-[20px]">close</span>
				</button>
			</div>
			
			<div class="flex-1 space-y-4">
				<div class="flex items-center gap-2 text-primary font-extrabold text-headline-sm">
					<span class="material-symbols-outlined">settings</span>
					<span>AI 运行参数控制室</span>
				</div>
				<p class="text-xs text-on-surface-variant leading-relaxed max-w-xl">
					在此配置您的云端 AI 密钥及接口端点，诊断功能将通过大模型深度分析您的具体错题内容、解题分类和知识库结构，生成千人千面的复习计划。所有配置仅保留在您当前浏览器的本地 `localStorage` 中。
				</p>
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<!-- API Key -->
					<div class="space-y-1.5">
						<label for="cyber_ai_api_key" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider font-code">API KEY (密钥)</label>
						<input 
							id="cyber_ai_api_key"
							type="password"
							bind:value={inputApiKey}
							placeholder="sk-..."
							class="w-full bg-[#0b1326] border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-xs text-on-surface font-code transition-all outline-none"
						/>
					</div>

					<!-- API Endpoint -->
					<div class="space-y-1.5">
						<label for="cyber_ai_api_endpoint" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider font-code">API Endpoint (端点)</label>
						<input 
							id="cyber_ai_api_endpoint"
							type="text"
							bind:value={inputApiEndpoint}
							placeholder="https://api.openai.com/v1"
							class="w-full bg-[#0b1326] border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-xs text-on-surface font-code transition-all outline-none"
						/>
					</div>

					<!-- Model Name -->
					<div class="space-y-1.5">
						<label for="cyber_ai_model" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider font-code">AI Model (模型)</label>
						<input 
							id="cyber_ai_model"
							type="text"
							bind:value={inputModel}
							placeholder="gpt-4o-mini"
							class="w-full bg-[#0b1326] border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-xs text-on-surface font-code transition-all outline-none"
						/>
					</div>
				</div>
			</div>

			<div class="flex flex-col justify-end gap-3 md:w-[220px] flex-shrink-0 border-t md:border-t-0 md:border-l border-outline-variant/10 pt-4 md:pt-0 md:pl-6">
				<!-- Test connection -->
				<button
					onclick={testConnection}
					disabled={isTestingConnection}
					class="w-full py-2.5 rounded-xl border border-primary/30 hover:bg-primary/10 text-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
				>
					{#if isTestingConnection}
						<span class="material-symbols-outlined text-[16px] animate-spin">sync</span>
						测试中...
					{:else}
						<span class="material-symbols-outlined text-[16px]">power</span>
						测试 API 连通性
					{/if}
				</button>

				<!-- Save settings -->
				<button 
					onclick={saveSettings}
					class="w-full py-2.5 rounded-xl primary-gradient hover:opacity-90 text-white text-xs font-bold shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all active:scale-95 cursor-pointer text-center"
				>
					保存配置并应用
				</button>
			</div>
		</div>
	{/if}

	<!-- Main Workspace Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-stretch">
		
		<!-- Left Panel: Capability Badge & Narrative Summary (Width: 5 Columns) -->
		<div class="lg:col-span-5 flex flex-col gap-gutter">
			
			<!-- Capability Badge Card -->
			<div class="glass-card rounded-3xl p-stack-md gradient-border border border-outline-variant/10 overflow-hidden relative group min-h-[220px] flex flex-col justify-between">
				<div class="absolute -right-16 -top-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/20 transition-all duration-700"></div>
				
				<div class="flex justify-between items-start">
					<div>
						<span class="text-xs font-bold text-on-surface-variant tracking-wider uppercase font-code">Cyber Rank Badge</span>
						<h3 class="font-headline-xl text-headline-xl text-on-surface mt-1">学习能力评级</h3>
					</div>
					<span class="material-symbols-outlined text-outline text-[22px] cursor-help" title="评级由您的整体正确率、答题量及错题堆积状况实时计算">info</span>
				</div>

				<div class="flex items-center gap-5 my-6">
					<!-- Animated Cyber Icon -->
					<div class="relative w-20 h-20 flex-shrink-0 flex items-center justify-center bg-surface-container-high rounded-2xl border border-outline-variant/15 shadow-inner">
						<span class="material-symbols-outlined text-[48px] {aiReport.cyberBadge.colorClass} animate-pulse">
							{#if aiReport.cyberBadge.colorClass === 'text-tertiary'}
								verified_user
							{:else if aiReport.cyberBadge.colorClass === 'text-secondary'}
								psychology
							{:else if aiReport.cyberBadge.colorClass === 'text-error'}
								dangerous
							{:else}
								build
							{/if}
						</span>
						<!-- Corner accents -->
						<div class="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-primary/40"></div>
						<div class="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-primary/40"></div>
					</div>

					<div>
						<div class="font-headline-xl text-headline-md font-extrabold tracking-wide uppercase {aiReport.cyberBadge.colorClass} text-glow-primary">
							{aiReport.cyberBadge.name}
						</div>
						<div class="text-on-surface-variant text-body-sm mt-1.5 leading-relaxed font-medium">
							{aiReport.cyberBadge.description}
						</div>
					</div>
				</div>

				<div class="text-xs text-on-surface-variant/60 font-code border-t border-outline-variant/10 pt-3">
					TELEMETRY FEED ACTIVE // SYNCED STATE
				</div>
			</div>

			<!-- Narrative Diagnosis Card -->
			<div class="glass-card rounded-3xl p-stack-md gradient-border border border-outline-variant/10 flex-grow flex flex-col justify-between min-h-[300px]">
				<div>
					<div class="flex justify-between items-center pb-2 border-b border-outline-variant/10">
						<h3 class="font-headline-md text-headline-md text-on-surface font-extrabold flex items-center gap-2">
							<span class="material-symbols-outlined text-primary text-[22px]">text_snippet</span>
							<span>诊断深度分析报告</span>
						</h3>
						<span class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider font-code
							{isCloudAi && aiSource === 'cloud' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-primary/10 text-primary border-primary/20'}"
						>
							{isCloudAi && aiSource === 'cloud' ? 'CLOUD GENERATED' : 'OFFLINE RULESET'}
						</span>
					</div>

					<div class="py-5 text-on-surface text-body-md leading-relaxed space-y-3">
						{#each parseDiagnosticSummary(aiReport.summary) as block}
							{#if block.type === 'paragraph'}
								<p class="font-medium text-on-surface-variant text-justify">
									{@html block.content}
								</p>
							{:else if block.type === 'header'}
								<h4 class="text-body-lg font-extrabold text-primary mt-4 mb-2 flex items-center gap-1.5">
									<span class="w-1.5 h-3 bg-primary rounded-full"></span>
									{@html block.content}
								</h4>
							{:else if block.type === 'list-item'}
								<div class="flex items-start gap-3 bg-surface-container-low/40 p-3.5 rounded-2xl border border-outline-variant/10 hover:border-primary/20 transition-all duration-300 shadow-sm my-2 group">
									<div class="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0 font-code shadow-[0_0_8px_rgba(99,102,241,0.2)] group-hover:bg-primary/20 transition-all duration-300">
										{block.num}
									</div>
									<div class="text-body-md text-on-surface leading-relaxed flex-grow">
										{@html block.content}
									</div>
								</div>
							{/if}
						{/each}
					</div>
				</div>

				<!-- Cloud Activation Panel inside Card -->
				<div class="mt-4 pt-4 border-t border-outline-variant/10">
					{#if isAiLoading}
						<div class="flex flex-col items-center justify-center py-4 space-y-3">
							<div class="relative w-12 h-12 flex items-center justify-center">
								<div class="absolute inset-0 rounded-full border-4 border-t-primary border-r-secondary border-b-transparent border-l-transparent animate-spin"></div>
								<span class="material-symbols-outlined text-primary text-[24px] animate-ping">terminal</span>
							</div>
							<div class="text-center font-code text-xs text-primary font-bold animate-pulse tracking-widest">
								⚡ DECRYPTING COGNITIVE DATA...
							</div>
						</div>
					{:else if !isCloudAi}
						<div class="bg-primary/10 border border-primary/20 rounded-2xl p-4 text-center space-y-3">
							<div class="text-xs text-on-surface-variant leading-relaxed">
								当前正在展示**系统离线规则引擎**生成的诊断结论。要基于您的真实错题和详细作答历史拉取更深度的 AI 剖析？
							</div>
							<button
								onclick={triggerCloudAiDiagnosis}
								disabled={isAiLoading}
								class="w-full primary-gradient hover:opacity-90 active:scale-95 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-primary/30 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
							>
								<span class="material-symbols-outlined text-[18px]">psychology</span>
								激活 AI 云端深度诊断
							</button>
						</div>
					{:else}
						<div class="flex gap-3">
							<button
								onclick={triggerCloudAiDiagnosis}
								disabled={isAiLoading}
								class="flex-grow bg-surface-container-high/60 hover:bg-surface-container-high border border-amber-500/20 text-xs text-amber-400 font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
							>
								<span class="material-symbols-outlined text-[16px]">sync</span>
								重新发起深度分析
							</button>
							<button
								onclick={() => {
									isCloudAi = false;
									quizStore.showToast('已无缝切换回离线规则诊断引擎');
								}}
								class="bg-surface-container-high/60 hover:bg-surface-container-high border border-outline-variant/30 text-xs text-on-surface-variant font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-all active:scale-95"
							>
								返回离线模式
							</button>
						</div>
					{/if}
				</div>
			</div>

		</div>

		<!-- Right Panel: Tabs Console for Details (Width: 7 Columns) -->
		<div class="lg:col-span-7 flex flex-col glass-card rounded-3xl p-stack-md gradient-border border border-outline-variant/10 min-h-[500px]">
			
			<!-- Floating Glass Tab Controls -->
			<div class="flex gap-2 p-1.5 bg-surface-container-lowest/80 rounded-2xl border border-outline-variant/10 w-full mb-6">
				<button
					onclick={() => activeTab = 'diagnosis'}
					class="flex-1 py-3 text-center rounded-xl font-label-md transition-all text-xs font-bold cursor-pointer flex items-center justify-center gap-2 {activeTab === 'diagnosis' ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_15px_rgba(192,193,255,0.1)]' : 'text-on-surface-variant hover:bg-surface-bright/5'}"
				>
					<span class="material-symbols-outlined text-[18px]">biotech</span>
					智能诊断
				</button>
				<button
					onclick={() => activeTab = 'plan'}
					class="flex-1 py-3 text-center rounded-xl font-label-md transition-all text-xs font-bold cursor-pointer flex items-center justify-center gap-2 {activeTab === 'plan' ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_15px_rgba(192,193,255,0.1)]' : 'text-on-surface-variant hover:bg-surface-bright/5'}"
				>
					<span class="material-symbols-outlined text-[18px]">timeline</span>
					复习路径
				</button>
				<button
					onclick={() => activeTab = 'strategies'}
					class="flex-1 py-3 text-center rounded-xl font-label-md transition-all text-xs font-bold cursor-pointer flex items-center justify-center gap-2 {activeTab === 'strategies' ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_15px_rgba(192,193,255,0.1)]' : 'text-on-surface-variant hover:bg-surface-bright/5'}"
				>
					<span class="material-symbols-outlined text-[18px]">military_tech</span>
					攻克策略
				</button>
			</div>

			<!-- Dynamic Tab Panel Body -->
			<div class="flex-grow">
				
				<!-- Tab 1: 智能诊断 Panel -->
				{#if activeTab === 'diagnosis'}
					<div class="space-y-6 animate-in fade-in slide-in-from-right-3 duration-300">
						<div>
							<h4 class="font-headline-md text-headline-sm text-on-surface font-extrabold mb-1">薄弱分类与突破</h4>
						</div>

						{#if !aiReport.weakestCategories || aiReport.weakestCategories.length === 0}
							<div class="bg-surface-container-low/40 p-8 rounded-2xl border border-outline-variant/5 text-center text-on-surface-variant animate-in fade-in duration-300">
								<span class="material-symbols-outlined text-4xl text-outline mb-2">task_alt</span>
								<p class="text-sm">太棒了！目前数据未检测到明显的薄弱节点。</p>
							</div>
						{:else}
							<p class="text-xs text-on-surface-variant mb-3 animate-in fade-in duration-300">系统检测到您在以下知识网络节点上的信息流通受阻，需进行重点脱困练习。</p>
							<div class="space-y-4 animate-in fade-in duration-300">
								{#each aiReport.weakestCategories as cat}
									<div class="bg-surface-container-low/40 p-4 rounded-2xl border border-outline-variant/5 hover:border-error/20 transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
										<div class="space-y-2 flex-grow">
											<div class="flex items-center gap-2">
												<span class="material-symbols-outlined text-error text-[18px]">report_problem</span>
												<span class="font-headline-md text-body-lg font-bold text-on-surface">{cat.name}</span>
											</div>
											
											<!-- Progress Bar -->
											<div class="space-y-1">
												<div class="flex justify-between text-xs text-on-surface-variant font-code">
													<span>答题正确率: {cat.correctRate}%</span>
													<span class="text-error font-bold">积压错题: {cat.wrongCount}道</span>
												</div>
												<div class="h-2 w-full bg-surface-variant rounded-full overflow-hidden">
													<div class="h-full bg-gradient-to-r from-error to-pink-500 rounded-full" style="width: {cat.correctRate}%"></div>
												</div>
											</div>
										</div>

										<button
											onclick={() => triggerDirectMistakesPractice(cat.name)}
											class="w-full md:w-auto px-4 py-2 border border-error/30 hover:bg-error/15 hover:border-error text-error text-xs font-bold rounded-xl transition-all duration-300 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
										>
											<span class="material-symbols-outlined text-[16px]">local_fire_department</span>
											地狱攻坚
										</button>
									</div>
								{/each}
							</div>
						{/if}

						<!-- Strongest Categories -->
						<div class="pt-4 border-t border-outline-variant/10">
							<h4 class="font-headline-md text-headline-sm text-on-surface font-extrabold mb-1">熟练掌握模块</h4>
							
							{#if !aiReport.strongestCategories || aiReport.strongestCategories.length === 0}
								<div class="bg-surface-container-low/40 p-4 rounded-2xl border border-outline-variant/5 text-center text-on-surface-variant mt-2 animate-in fade-in duration-300">
									<p class="text-xs">暂无充分答题数据判定熟练模块，建议多进行答题练习以积累数据。</p>
								</div>
							{:else}
								<p class="text-xs text-on-surface-variant mb-4 animate-in fade-in duration-300">核心链路保持高水准的正确率，已建立起极其稳健的认知基底。</p>
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
									{#each aiReport.strongestCategories as name}
										<div class="bg-surface-container-low/40 p-4 rounded-2xl border border-outline-variant/5 hover:border-tertiary/20 transition-all duration-300 flex items-center gap-3">
											<div class="w-8 h-8 rounded-full bg-tertiary/10 border border-tertiary/20 flex items-center justify-center text-tertiary">
												<span class="material-symbols-outlined text-[16px]">check_circle</span>
											</div>
											<div>
												<div class="font-bold text-body-md text-on-surface">{name}</div>
												<div class="text-[10px] text-tertiary font-bold tracking-wider mt-0.5">MASTERY LEVEL SYNCED</div>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>

				<!-- Tab 2: 复习路径 (Timeline Study Plan) Panel -->
				{:else if activeTab === 'plan'}
					<div class="space-y-6 animate-in fade-in slide-in-from-right-3 duration-300">
						<div>
							<h4 class="font-headline-md text-headline-sm text-on-surface font-extrabold mb-1">赛博定制化复习路径</h4>
							<p class="text-xs text-on-surface-variant">推荐您的 3 步突击方案。遵循数据流的优先级逐步攻破认知漏洞。</p>
						</div>

						<div class="relative pl-8 border-l border-outline-variant/30 space-y-6 py-2">
							{#each aiReport.studyPlan as step}
								<div class="relative group">
									<!-- Neon timeline dot -->
									<div class="absolute -left-[37px] top-1.5 w-4 h-4 rounded-full bg-surface-container-high border-2 border-primary shadow-[0_0_12px_rgba(99,102,241,0.6)] flex items-center justify-center transition-all group-hover:scale-125">
										<div class="w-1.5 h-1.5 bg-primary rounded-full"></div>
									</div>
									
									<div class="bg-surface-container-low/40 p-5 rounded-2xl border border-outline-variant/5 hover:border-primary/20 transition-all duration-300 space-y-2.5">
										<div class="flex justify-between items-center flex-wrap gap-2">
											<div class="font-headline-md text-body-lg font-extrabold text-on-surface flex items-center gap-2">
												<span class="text-primary font-code text-xs tracking-wider border border-primary/20 px-2 py-0.5 rounded bg-primary/5">STEP 0{step.step}</span>
												{step.title}
											</div>
											
											<!-- Shortcut button -->
											<button
												onclick={() => triggerStepAction(step.step)}
												class="px-3 py-1 bg-primary/10 hover:bg-primary/25 border border-primary/20 text-primary text-[10px] font-bold rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1"
											>
												立即执行
												<span class="material-symbols-outlined text-[12px]">arrow_forward</span>
											</button>
										</div>
										<p class="text-xs text-on-surface-variant leading-relaxed">
											{step.description}
										</p>
									</div>
								</div>
							{/each}
						</div>
					</div>

				<!-- Tab 3: 攻克策略 Panel -->
				{:else}
					<div class="space-y-6 animate-in fade-in slide-in-from-right-3 duration-300">
						<div>
							<h4 class="font-headline-md text-headline-sm text-on-surface font-extrabold mb-1">专项错题攻克方略</h4>
							<p class="text-xs text-on-surface-variant">基于您当前错题本的数据特征，设计的反思与消灭方法论。</p>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							{#each aiReport.revisionStrategies as strategy, idx}
								<div class="bg-surface-container-low/40 p-5 rounded-2xl border border-outline-variant/5 hover:border-secondary/20 transition-all duration-300 space-y-2 min-h-[140px] flex flex-col justify-start">
									<div class="flex items-center gap-2 text-secondary">
										<span class="material-symbols-outlined text-[20px]">
											{idx === 0 ? 'gavel' : idx === 1 ? 'autorenew' : idx === 2 ? 'lightbulb' : 'insights'}
										</span>
										<span class="font-bold text-xs uppercase tracking-wider font-code">STRATEGY 0{idx + 1}</span>
									</div>
									<p class="text-xs text-on-surface-variant leading-relaxed flex-grow">
										{@html strategy.replace(/\*\*(.*?)\*\*/g, '<strong class="text-secondary font-bold">$1</strong>')}
									</p>
								</div>
							{/each}
						</div>
					</div>
				{/if}

			</div>

			<!-- Footer telemetery details -->
			<div class="border-t border-outline-variant/10 pt-4 mt-6 flex justify-between items-center text-[10px] text-on-surface-variant/50 font-code">
				<span>PROCESSED: {totalQuestions} QUESTIONS IN WORKSPACE</span>
				<span>ACTIVE ERRORS: {wrongBook.length} RECORDS</span>
			</div>
		</div>

	</div>
</div>
