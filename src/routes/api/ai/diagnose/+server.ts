import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateAIDiagnosis } from '$lib/utils/aiAdvisor';
import { getAllQuestions, getWrongRecords, getQuizHistory } from '$lib/server/db';
import type { AIAdviceReport } from '$lib/utils/aiAdvisor';
import type { Question, QuizHistory, WrongRecord } from '$lib/types';

export const POST: RequestHandler = async ({ request, platform }) => {
	let questions: Question[] = [];
	let history: QuizHistory[] = [];
	let wrongBook: WrongRecord[] = [];
	let customApiKey = null;
	let customApiEndpoint = null;
	let customModel = null;
	let isTest = false;

	// 1. Try parsing request payload
	try {
		const body = (await request.json()) as any;
		questions = body.questions || [];
		history = body.history || [];
		wrongBook = body.wrongBook || [];
		customApiKey = body.apiKey;
		customApiEndpoint = body.apiEndpoint;
		customModel = body.model;
		isTest = !!body.isTest;
	} catch (e) {
		// Payload might be empty, we will try fetching from D1 next
	}

	// 2. Fetch from D1 if empty and database binding is active
	const db = platform?.env.DB;
	if (questions.length === 0 && db) {
		try {
			const [dbQuestions, dbWrong, dbHistory] = await Promise.all([
				getAllQuestions(db),
				getWrongRecords(db),
				getQuizHistory(db)
			]);
			questions = (dbQuestions as Question[]) || [];
			wrongBook = (dbWrong as WrongRecord[]) || [];
			history = (dbHistory as QuizHistory[]) || [];
		} catch (err) {
			console.error('[API Info] Failed to load data from D1 in AI API:', err);
		}
	}

	// 3. Generate offline rule-based report as baseline/fallback
	const localReport = generateAIDiagnosis(questions, history, wrongBook);

	// 4. Read Cloudflare Environment Variables & UI overrides
	const env = (platform?.env || {}) as any;
	const apiKey = customApiKey || env.AI_API_KEY;
	const apiEndpoint = customApiEndpoint || env.AI_API_ENDPOINT || 'https://api.openai.com/v1';
	const model = customModel || env.AI_MODEL || 'gpt-4o-mini';

	// If no API Key is set, silently and instantly fall back to offline rules engine
	if (!apiKey) {
		if (isTest) {
			return json({
				success: false,
				error: '未检测到 API Key，请先输入密钥或在环境变量中配置'
			});
		}
		return json({
			success: true,
			report: localReport,
			source: 'offline'
		});
	}

	// 5. Structure OpenAI compatible chat request
	let endpointUrl = apiEndpoint;
	if (!endpointUrl.endsWith('/chat/completions')) {
		if (endpointUrl.endsWith('/')) {
			endpointUrl = endpointUrl.slice(0, -1);
		}
		endpointUrl = `${endpointUrl}/chat/completions`;
	}

	// 5.5 If this is a connectivity test, execute immediately
	if (isTest) {
		try {
			const response = await fetch(endpointUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiKey}`
				},
				body: JSON.stringify({
					model: model,
					messages: [
						{ role: 'system', content: 'You are a connection tester. Respond with "pong" only.' },
						{ role: 'user', content: 'ping' }
					],
					temperature: 0.1,
					max_tokens: 10
				}),
				signal: AbortSignal.timeout(30000) // 增加到 30 秒超时时间，保障在慢速或冷启动节点下握手稳定
			});

			if (!response.ok) {
				const errText = await response.text();
				throw new Error(`HTTP ${response.status}: ${errText.substring(0, 150)}`);
			}

			const data: any = await response.json();
			const content = data.choices?.[0]?.message?.content?.trim();
			if (!content) {
				throw new Error('节点响应成功，但返回内容为空');
			}

			return json({
				success: true,
				message: `🔌 连通成功！模型 [${model}] 响应: "${content}"`
			});
		} catch (err: any) {
			return json({
				success: false,
				error: `连接失败: ${err.message || err}`
			});
		}
	}

	// Extract text descriptions of wrong questions for LLM context
	const wrongQuestionDetails = wrongBook.map((w: WrongRecord, idx: number) => {
		const q = questions.find((item: Question) => item.id === w.questionId);
		return q 
			? `[错题 ${idx + 1}] ID: ${q.id} | 分类: ${q.category} | 题干: "${q.title.substring(0, 100)}" | 累计答错频次: ${w.wrongCount}次`
			: `[错题 ${idx + 1}] ID: ${w.questionId} | 累计答错频次: ${w.wrongCount}次`;
	}).join('\n');

	// Group category statistics
	const categoryStatsSummary = questions.reduce((acc: any, q: Question) => {
		const cat = q.category || '未分类';
		if (!acc[cat]) acc[cat] = { total: 0, wrong: 0, attempts: 0 };
		acc[cat].total += 1;
		return acc;
	}, {});

	wrongBook.forEach((w: WrongRecord) => {
		const q = questions.find((item: Question) => item.id === w.questionId);
		if (q) {
			const cat = q.category || '未分类';
			if (categoryStatsSummary[cat]) {
				categoryStatsSummary[cat].wrong += w.count;
			}
		}
	});

	const categoryStatsText = Object.entries(categoryStatsSummary)
		.map(([name, stats]: [string, any]) => `- 分类『${name}』: 共 ${stats.total} 题, 当前积压错题 ${stats.wrong} 道`)
		.join('\n');

	const systemPrompt = `You are an advanced Cyberpunk AI Learning Assistant ("Cyber-Advisor") for a quiz learning platform.
Your task is to analyze the user's learning statistics and diagnostic baseline, and output a highly insightful, encouraging, and detailed deep analysis and revision strategy.

You MUST respond strictly with a single JSON object matching the following TypeScript interface (do not output any markdown formatting, backticks, or explanation outside the JSON):

interface AIAdviceReport {
    summary: string;              // A detailed cyberpunk-themed pedagogical analysis. Format the text with clear paragraphs (separated by double newlines \\n\\n) and bullet points/numbered lists (such as circled numbers ①, ②... or markdown lists) for cognitive gap breakdowns. Use markdown highlighting like **concept** (which will be rendered in glowing neon colors). Focus on specific category performance, accuracy rate, difficulty analysis, and concrete improvement tips. Keep it encouraging, professional, and full of sci-fi/hacker flavor.
    cyberBadge: {
        name: string;             // A gorgeous sci-fi title (e.g. "矩阵主宰者 (Master)", "赛博渗透客 (Hacker)", "BUG 清道夫 (Bug Cleaner)")
        description: string;      // A short, premium description of their performance state.
        colorClass: string;       // Styling color class. Must be one of: 'text-primary' (pale purple), 'text-secondary' (electric pink/purple), 'text-tertiary' (neon green), or 'text-error' (neon red).
    };
    weakestCategories: {          // Up to 3 weakest categories. Must be selected from the actual categories provided.
        name: string;
        correctRate: number;
        wrongCount: number;
    }[];
    strongestCategories: string[]; // Up to 2 strongest categories. Must be selected from the actual categories.
    studyPlan: {                  // A 3-step action plan.
        step: number;             // 1, 2, or 3
        title: string;            // Short, punchy action title.
        description: string;      // Detailed concrete steps on what to do.
    }[];
    revisionStrategies: string[]; // A list of 3-4 specific strategies. Use markdown **highlighting** for key terms.
}`;

	const userPrompt = `Here is the user's learning and question bank telemetry:
- Total Questions in DB: ${questions.length}
- Total Attempts in History: ${history.length}
- Active Wrong Questions count: ${wrongBook.length}

Category Distribution:
${categoryStatsText}

Active Wrong Questions Details:
${wrongQuestionDetails || '暂无积压错题记录'}

Rule-Engine Baseline Diagnosis (calculated offline):
${JSON.stringify(localReport)}

Please perform a deeper, more refined pedagogical analysis. Make the 'summary', 'studyPlan' and 'revisionStrategies' much more custom, specific, and actionable based on the specific wrong questions and stats. Remember to return ONLY valid JSON matching the AIAdviceReport interface.`;

	try {
		const response = await fetch(endpointUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: model,
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: userPrompt }
				],
				temperature: 0.7
			}),
			// 增加到 120 秒超时时间，保障深度生成任务在网络拥堵、冷启动或长推理时 100% 获得完整诊断建议
			signal: AbortSignal.timeout(120000)
		});

		if (!response.ok) {
			const errText = await response.text();
			throw new Error(`API response error (${response.status}): ${errText}`);
		}

		const data: any = await response.json();
		const responseText = data.choices?.[0]?.message?.content?.trim();
		if (!responseText) {
			throw new Error('Received empty content from AI API');
		}

		// Clean up thinking process tags (e.g. DeepSeek R1 outputs <think>...</think>)
		let sanitizedText = responseText;
		
		// 1. Remove <think>...</think> thinking blocks
		sanitizedText = sanitizedText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

		// 2. Strip potential markdown block wraps (```json ... ``` or ``` ... ```)
		if (sanitizedText.includes('```')) {
			// Find the first JSON-like bracket and strip markdown surrounding it
			const jsonStart = sanitizedText.indexOf('{');
			const jsonEnd = sanitizedText.lastIndexOf('}');
			if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
				sanitizedText = sanitizedText.substring(jsonStart, jsonEnd + 1);
			} else {
				sanitizedText = sanitizedText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
			}
		}

		let report: AIAdviceReport;
		
		// A helper to attempt parsing a string as JSON, with smart repairs if it fails
		const parseWithRepairs = (str: string): any => {
			const cleanStr = str.trim();
			try {
				return JSON.parse(cleanStr);
			} catch (err: any) {
				// Repair step 1: Remove trailing commas in objects and arrays (e.g. `..., }` or `..., ]`)
				try {
					const repaired1 = cleanStr.replace(/,\s*([}\]])/g, '$1');
					return JSON.parse(repaired1);
				} catch (err2) {
					// Repair step 2: Strip inline comments if any (e.g. `// comment` or `/* comment */`)
					try {
						const repaired2 = cleanStr
							.replace(/,\s*([}\]])/g, '$1')
							.replace(/\/\*[\s\S]*?\*\//g, '') // remove /* */ comments
							.replace(/(?:^|\s)\/\/.*$/gm, ''); // remove // comments
						return JSON.parse(repaired2);
					} catch (err3) {
						throw err; // throw original parsing error to show the exact location
					}
				}
			}
		};

		try {
			report = parseWithRepairs(sanitizedText);
		} catch (parseErr: any) {
			// Second attempt fallback: extract the outer-most curly brace JSON if raw string has leading/trailing garbage
			const match = sanitizedText.match(/\{[\s\S]*\}/);
			if (match) {
				try {
					report = parseWithRepairs(match[0]);
				} catch (subErr: any) {
					console.error('[JSON Repair failed] Content was:', match[0]);
					throw new Error(`JSON 语法结构修复失败 (${subErr.message})`);
				}
			} else {
				throw new Error(`无法从返回文本中定位 JSON 块。异常: ${parseErr.message}`);
			}
		}
		
		// Post-validate JSON shape to prevent frontend errors
		if (
			report.summary &&
			report.cyberBadge &&
			report.cyberBadge.name &&
			report.cyberBadge.colorClass &&
			Array.isArray(report.studyPlan) &&
			Array.isArray(report.revisionStrategies)
		) {
			// Sanitize strongestCategories and weakestCategories against actual categories
			const validCategories = new Set(questions.map(q => q.category));
			
			if (Array.isArray(report.strongestCategories)) {
				report.strongestCategories = report.strongestCategories.filter(
					(catName) => typeof catName === 'string' && catName.trim() !== '' && validCategories.has(catName)
				);
			} else {
				report.strongestCategories = [];
			}

			if (Array.isArray(report.weakestCategories)) {
				report.weakestCategories = report.weakestCategories.filter(
					(cat) => cat && typeof cat === 'object' && typeof cat.name === 'string' && validCategories.has(cat.name)
				).map(cat => ({
					name: cat.name,
					correctRate: typeof cat.correctRate === 'number' ? cat.correctRate : 50,
					wrongCount: typeof cat.wrongCount === 'number' ? cat.wrongCount : 1
				}));
			} else {
				report.weakestCategories = [];
			}

			return json({
				success: true,
				report: report,
				source: 'cloud',
				model: model
			});
		} else {
			throw new Error('AI response JSON does not match the AIAdviceReport interface');
		}
	} catch (e: any) {
		console.error('[API Error] /api/ai/diagnose failed, falling back to offline rules:', e);
		return json({
			success: true,
			report: localReport,
			source: 'offline_fallback',
			error: e.message || 'API call failed'
		});
	}
};
