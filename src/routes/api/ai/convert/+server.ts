import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Question } from '$lib/types';

export const POST: RequestHandler = async ({ request, platform }) => {
	let mdContent = '';
	let customApiKey = null;
	let customApiEndpoint = null;
	let customModel = null;

	try {
		const body = (await request.json()) as any;
		mdContent = body.mdContent || '';
		customApiKey = body.apiKey;
		customApiEndpoint = body.apiEndpoint;
		customModel = body.model;
	} catch (e) {
		return json({ success: false, error: '请求体解析失败' }, { status: 400 });
	}

	if (!mdContent.trim()) {
		return json({ success: false, error: 'Markdown 内容为空' }, { status: 400 });
	}

	// Read Cloudflare Environment Variables & UI overrides
	const env = (platform?.env || {}) as any;
	const apiKey = customApiKey || env.AI_API_KEY;
	const apiEndpoint = customApiEndpoint || env.AI_API_ENDPOINT || 'https://api.openai.com/v1';
	const model = customModel || env.AI_MODEL || 'gpt-4o-mini';

	if (!apiKey) {
		return json({
			success: false,
			error: '未检测到 AI API Key。请先在「AI 智能学习助理」页面配置 API Key，或在 Cloudflare 环境变量中设置 AI_API_KEY。'
		});
	}

	// Build endpoint URL
	let endpointUrl = apiEndpoint;
	if (!endpointUrl.endsWith('/chat/completions')) {
		if (endpointUrl.endsWith('/')) {
			endpointUrl = endpointUrl.slice(0, -1);
		}
		endpointUrl = `${endpointUrl}/chat/completions`;
	}

	const systemPrompt = `You are an expert educational content converter. Your task is to read ANY Markdown document containing exam/quiz questions (in any format, language, or layout) and convert ALL questions found into a strict JSON array.

You MUST output ONLY a valid JSON array (no markdown, no explanation, no backticks). Each element must match this TypeScript interface:

interface Question {
  id: number;           // Sequential starting from 1
  type: "single" | "multiple";  // "single" if one answer, "multiple" if 2+
  title: string;        // The question stem/text, clean and concise
  options: { [key: string]: string };  // e.g. {"A": "option text", "B": "option text", ...}
  answer: string[];     // e.g. ["A"] or ["A","C","D"]
  explanation: string;  // Explanation text, "" if not available
  difficulty: "easy" | "medium" | "hard";  // Infer from context, default "medium"
  category: string;     // Infer subject/topic from content, e.g. "道德与法治", "Python基础"
  knowledgeTags: string[];  // 1-3 relevant knowledge tags
}

Rules:
1. Extract EVERY question from the document. Do not skip any.
2. If answers are in a separate answer key section at the end, match them to questions by number.
3. If explanations are provided, include them. If not provided in the original document, you MUST auto-generate a detailed, pedagogically valuable explanation for each question in Chinese. Explain why the correct answer is right and why each wrong option is incorrect.
4. Clean up formatting: remove markdown bold markers (**), list bullets (* -), heading markers (#) from the extracted text.
5. For option text, strip any leading "A." "B." etc. — just provide the content.
6. Infer type from the number of correct answers.
7. Output ONLY the JSON array. No other text.`;

	const userPrompt = `Please convert the following Markdown document into a JSON array of Question objects:\n\n${mdContent}`;

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
				temperature: 0.3
			}),
			// Increase timeout to 300 seconds (5 minutes) to support conversion of large documents with many questions
			signal: AbortSignal.timeout(300000)
		});

		if (!response.ok) {
			const errText = await response.text();
			throw new Error(`API 响应错误 (${response.status}): ${errText.substring(0, 200)}`);
		}

		const data: any = await response.json();
		const responseText = data.choices?.[0]?.message?.content?.trim();
		if (!responseText) {
			throw new Error('AI 返回内容为空');
		}

		// Sanitize response
		let sanitizedText = responseText;

		// 1. Remove <think>...</think> blocks
		sanitizedText = sanitizedText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

		// 2. Strip markdown code block wraps
		if (sanitizedText.includes('```')) {
			const jsonStart = sanitizedText.indexOf('[');
			const jsonEnd = sanitizedText.lastIndexOf(']');
			if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
				sanitizedText = sanitizedText.substring(jsonStart, jsonEnd + 1);
			} else {
				sanitizedText = sanitizedText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
			}
		}

		// Parse JSON with repair attempts
		const parseWithRepairs = (str: string): any => {
			const cleanStr = str.trim();
			try {
				return JSON.parse(cleanStr);
			} catch (err: any) {
				// Repair: remove trailing commas
				try {
					const repaired = cleanStr.replace(/,\s*([}\]])/g, '$1');
					return JSON.parse(repaired);
				} catch {
					// Repair: also strip comments
					try {
						const repaired2 = cleanStr
							.replace(/,\s*([}\]])/g, '$1')
							.replace(/\/\*[\s\S]*?\*\//g, '')
							.replace(/(?:^|\s)\/\/.*$/gm, '');
						return JSON.parse(repaired2);
					} catch {
						throw err;
					}
				}
			}
		};

		let questions: Question[];

		try {
			questions = parseWithRepairs(sanitizedText);
		} catch (parseErr: any) {
			// Fallback: extract outermost array brackets
			const match = sanitizedText.match(/\[[\s\S]*\]/);
			if (match) {
				try {
					questions = parseWithRepairs(match[0]);
				} catch (subErr: any) {
					throw new Error(`JSON 解析修复失败: ${subErr.message}`);
				}
			} else {
				throw new Error(`无法从 AI 返回中定位 JSON 数组: ${parseErr.message}`);
			}
		}

		// Validate array
		if (!Array.isArray(questions)) {
			throw new Error('AI 返回的数据不是有效的 JSON 数组');
		}

		if (questions.length === 0) {
			return json({
				success: true,
				questions: [],
				totalExtracted: 0,
				totalValidated: 0,
				model: model
			});
		}

		// Post-validate each question and assign sequential IDs
		const validated: Question[] = [];
		questions.forEach((q: any, idx: number) => {
			if (
				q.title &&
				q.options &&
				Object.keys(q.options).length >= 2 &&
				Array.isArray(q.answer) &&
				q.answer.length > 0
			) {
				validated.push({
					id: idx + 1,
					type: q.type === 'multiple' ? 'multiple' : 'single',
					title: String(q.title).trim(),
					options: q.options,
					answer: q.answer.map((a: string) => String(a).toUpperCase().trim()),
					explanation: String(q.explanation || '').trim(),
					difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
					category: String(q.category || '通用').trim(),
					knowledgeTags: Array.isArray(q.knowledgeTags) ? q.knowledgeTags.map((t: any) => String(t).trim()) : []
				});
			}
		});

		if (validated.length === 0) {
			throw new Error('AI 返回的题目全部未通过验证，请检查原始 Markdown 内容');
		}

		return json({
			success: true,
			questions: validated,
			totalExtracted: questions.length,
			totalValidated: validated.length,
			model: model
		});
	} catch (e: any) {
		console.error('[API Error] /api/ai/convert failed:', e);
		return json({
			success: false,
			error: e.message || 'AI 转化失败'
		});
	}
};
