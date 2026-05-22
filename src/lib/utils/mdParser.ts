import type { Question } from '../types';

/**
 * Parses markdown question pool with extreme robustness and validation.
 *
 * Supports TWO major layout styles:
 *   1. INLINE style  — answer/explanation immediately follows each question's options
 *   2. SEPARATED style — answer key is gathered in a dedicated section at the end
 *                        (e.g. "# 答案卡及教学解析" or "## 第一部分：单项选择题")
 *
 * Option formats supported:
 *   - Plain:         "A. text", "A、text", "A - text", "A) text"
 *   - Bold label:    "**A.** text", "**A** text"
 *   - List prefix:   "* A. text", "- A. text", "+ A. text"
 *   - Combined:      "* **A.** text", "- **A** text", "* **A、** text"
 */
export function parseMarkdown(mdContent: string): Question[] {
	const lines = mdContent.split(/\r?\n/);

	// ── Phase 1: First-pass scan ──────────────────────────────────────────────
	// Collect all question "blocks" and a separate answerKey map.
	// Questions are kept even without answers; answers are merged in Phase 2.

	interface RawQuestion {
		id?: number;
		title: string;
		options: Record<string, string>;
		answer: string[];
		explanation: string;
		difficulty: 'easy' | 'medium' | 'hard';
		category: string;
		knowledgeTags: string[];
		type?: 'single' | 'multiple';
		// 1-based sequential index within the file (for answer-sheet back-fill)
		seqIndex: number;
	}

	// Map from seqIndex (1-based) OR numeric ID → { answers, explanation }
	const answerKey: Map<number, { answers: string[]; explanation: string }> = new Map();

	const rawQuestions: RawQuestion[] = [];

	let cur: RawQuestion | null = null;
	let curOptionKey: string | null = null;
	let isParsingExplanation = false;
	let isInCodeBlock = false;

	// Tracks whether we have entered a dedicated answer-sheet section
	let inAnswerSheet = false;
	// When in answer sheet, which seqIndex are we currently writing explanation for
	let ansKeySeq: number | null = null;

	const finalizeCur = () => {
		if (cur) {
			rawQuestions.push(cur);
		}
		cur = null;
		curOptionKey = null;
		isParsingExplanation = false;
		isInCodeBlock = false;
	};

	// Regex helpers
	// Matches answer-sheet section headings, e.g. "# 答案卡及教学解析"
	const RE_ANSWER_SECTION = /(?:答案|解析|answer\s*key)/i;

	// Matches a question's title header in ANY section:
	//   "### 1. Some title (ID: 1001)"  "## 第 1 题"  "### Q1."  "# 1."
	const RE_Q_HEADER = /^(?:#{1,6}\s+)?(?:第?\s*(\d+)\s*[.、题：:]\s*)(.*)/i;
	const RE_Q_HEADER_Q = /^(?:#{1,6}\s+)?(?:Q(\d+)\s*[.、：:]\s*)(.*)/i;

	// Matches an answer-sheet answer line:
	//   "### 1. 【答案】C"  "### 8. 【答案】A, B, D"
	const RE_ANS_SHEET_LINE = /^(?:#{1,6}\s+)?(?:第?\s*(\d+)\s*[.、题：:]\s*)【答案】\s*([A-G, ，]+)/i;

	// Matches a simple in-body answer line (used in BOTH inline and answer-sheet modes):
	//   "【答案】C"  "正确答案：A,B"  "Answer: D"
	const RE_ANSWER_INLINE =
		/^(?:正确)?答案\s*[:：\s]*\s*(.*)$/i;
	const RE_ANSWER_BRACKET =
		/^【答案】\s*[:：\s]*\s*(.*)$/;
	const RE_ANSWER_EN =
		/^Answer\s*[:：\s]*\s*(.*)$/i;

	// Matches options in all supported formats:
	//   "A. text"  "* **A.** text"  "- **B** text"  "* A、text" etc.
	const RE_OPTION =
		/^(?:[-*+]\s+)?(?:\*{1,2})?([A-G])(?:\*{1,2})?\s*[-.、\)\s：:]\s*(?:\*{1,2})?\s*(.*)$/i;

	// Matches explanation headers
	const RE_EXP =
		/^(?:详细)?解析\s*[:：\s]*(.*)$/i;
	const RE_EXP_BRACKET =
		/^【(?:教学)?解析】\s*[:：\s]*(.*)$/;
	const RE_EXP_EN =
		/^Explanation\s*[:：\s]*(.*)$/i;

	// Matches section headers that are NOT question headers and NOT answer-sheet entries
	// e.g. "## 第一部分：单项选择题" — these should not create new question objects
	const RE_SECTION_ONLY = /^#{1,6}\s+第[一二三四五六七八九十百]+部分/;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmedLine = line.trim();

		// ── Code block tracking ────────────────────────────────────────────────
		if (trimmedLine.startsWith('```')) {
			isInCodeBlock = !isInCodeBlock;
			if (cur) {
				if (isParsingExplanation) {
					cur.explanation += line + '\n';
				} else if (curOptionKey) {
					cur.options[curOptionKey] += '\n' + line;
				} else {
					cur.title += '\n' + line;
				}
			}
			continue;
		}
		if (isInCodeBlock) {
			if (cur) {
				if (isParsingExplanation) {
					cur.explanation += line + '\n';
				} else if (curOptionKey) {
					cur.options[curOptionKey] += '\n' + line;
				} else {
					cur.title += '\n' + line;
				}
			}
			continue;
		}

		// ── Empty lines ────────────────────────────────────────────────────────
		if (!trimmedLine) {
			if (cur && isParsingExplanation) {
				cur.explanation += '\n';
			}
			// Horizontal rules (---) — just separators, ignore
			continue;
		}

		// ── Horizontal rules ───────────────────────────────────────────────────
		if (/^-{3,}$/.test(trimmedLine) || /^\*{3,}$/.test(trimmedLine)) {
			continue;
		}

		// ── Blockquote lines (> ...) — skip metadata/instructions ─────────────
		if (trimmedLine.startsWith('>')) {
			continue;
		}

		// ── Detect dedicated answer-sheet section heading ──────────────────────
		// e.g. "# 答案卡及教学解析"
		if (
			trimmedLine.startsWith('#') &&
			RE_ANSWER_SECTION.test(trimmedLine) &&
			!RE_ANS_SHEET_LINE.test(trimmedLine)
		) {
			finalizeCur();
			inAnswerSheet = true;
			ansKeySeq = null;
			continue;
		}

		// ── Inside answer sheet ────────────────────────────────────────────────
		if (inAnswerSheet) {
			// Sub-section separators like "## 第一部分：单项选择题" — skip
			if (RE_SECTION_ONLY.test(trimmedLine)) {
				continue;
			}

			// Check for "### N. 【答案】X" combined header
			const ansSheetMatch = trimmedLine.match(RE_ANS_SHEET_LINE);
			if (ansSheetMatch) {
				const seq = parseInt(ansSheetMatch[1], 10);
				const lettersRaw = ansSheetMatch[2].toUpperCase();
				const letters = lettersRaw.match(/[A-G]/g) || [];
				const uniqueLetters = Array.from(new Set(letters)).sort();
				ansKeySeq = seq;
				if (!answerKey.has(seq)) {
					answerKey.set(seq, { answers: uniqueLetters, explanation: '' });
				} else {
					answerKey.get(seq)!.answers = uniqueLetters;
				}
				continue;
			}

			// Standalone "【答案】" inside answer sheet (after a "### N." header)
			const bracketAns = trimmedLine.match(RE_ANSWER_BRACKET);
			if (bracketAns && ansKeySeq !== null) {
				const lettersRaw = bracketAns[1].toUpperCase();
				const letters = lettersRaw.match(/[A-G]/g) || [];
				const uniqueLetters = Array.from(new Set(letters)).sort();
				if (!answerKey.has(ansKeySeq)) {
					answerKey.set(ansKeySeq, { answers: uniqueLetters, explanation: '' });
				} else {
					answerKey.get(ansKeySeq)!.answers = uniqueLetters;
				}
				continue;
			}

			// Check if this looks like a new question heading in answer sheet
			// e.g. "### 1. 【答案】C" already handled above; plain "### 1." headings are new
			const qHeaderAns =
				trimmedLine.match(RE_Q_HEADER) || trimmedLine.match(RE_Q_HEADER_Q);
			if (qHeaderAns && trimmedLine.startsWith('#')) {
				const seq = qHeaderAns[1] ? parseInt(qHeaderAns[1], 10) : null;
				if (seq !== null) {
					ansKeySeq = seq;
					if (!answerKey.has(seq)) {
						answerKey.set(seq, { answers: [], explanation: '' });
					}
				}
				continue;
			}

			// Accumulate explanation text for the current answer-sheet entry
			if (ansKeySeq !== null) {
				if (!answerKey.has(ansKeySeq)) {
					answerKey.set(ansKeySeq, { answers: [], explanation: '' });
				}
				// Strip markdown list markers and bold markup for cleaner explanation
				const cleanLine = trimmedLine
					.replace(/^\*{1,2}|\*{1,2}$/g, '')
					.replace(/^[-*+]\s+/, '')
					.replace(/\*\*/g, '');
				answerKey.get(ansKeySeq)!.explanation += cleanLine + '\n';
			}
			continue;
		}

		// ── Section headers (non-answer-sheet) ────────────────────────────────
		// e.g. "## 第一部分：单项选择题（...）" — section dividers, not questions
		if (RE_SECTION_ONLY.test(trimmedLine)) {
			finalizeCur();
			continue;
		}

		// ── Detect Question Header ─────────────────────────────────────────────
		// Matches: "### 1. Title", "### Q1. Title", top-level "# Title" (if not answer-section)
		const qHeaderMatch =
			trimmedLine.match(RE_Q_HEADER) || trimmedLine.match(RE_Q_HEADER_Q);

		const isTopLevelHeader =
			trimmedLine.startsWith('#') &&
			!RE_ANSWER_SECTION.test(trimmedLine) &&
			!RE_SECTION_ONLY.test(trimmedLine) &&
			!qHeaderMatch;

		if (qHeaderMatch || isTopLevelHeader) {
			finalizeCur();

			const idStr = qHeaderMatch ? qHeaderMatch[1] : undefined;
			let rawTitle = qHeaderMatch ? qHeaderMatch[2].trim() : trimmedLine.replace(/^#{1,6}\s*/, '').trim();

			// Extract inline type hint
			let type: 'single' | 'multiple' | undefined;
			if (rawTitle.includes('多选')) type = 'multiple';
			else if (rawTitle.includes('单选')) type = 'single';

			// Extract difficulty
			let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
			const diffMatch = rawTitle.match(/\[难度[：:]\s*(简单|中等|困难|easy|medium|hard)\]/i);
			if (diffMatch) {
				const d = diffMatch[1].trim().toLowerCase();
				if (d === '简单' || d === 'easy') difficulty = 'easy';
				else if (d === '困难' || d === 'hard') difficulty = 'hard';
				rawTitle = rawTitle.replace(diffMatch[0], '');
			}

			// Extract category
			let category = '通用';
			const catMatch = rawTitle.match(/\[(?:知识点|分类|考点|科目)[：:]\s*([^\]]+)\]/i);
			if (catMatch) {
				category = catMatch[1].trim();
				rawTitle = rawTitle.replace(catMatch[0], '');
			}

			// Extract tags
			const knowledgeTags: string[] = [];
			const tagsMatch = rawTitle.match(/\[(?:标签|Tags)[：:]\s*([^\]]+)\]/i);
			if (tagsMatch) {
				knowledgeTags.push(...tagsMatch[1].split(/[,，]/).map((t) => t.trim()));
				rawTitle = rawTitle.replace(tagsMatch[0], '');
			}

			// Strip "(ID: XXXX)" from title
			rawTitle = rawTitle.replace(/\(ID:\s*\d+\)/gi, '').trim();

			// Clean type brackets
			rawTitle = rawTitle
				.replace(/\[(?:单选|多选)题?\]/g, '')
				.replace(/\((?:单选|多选)题?\)/g, '')
				.replace(/\s+/g, ' ')
				.trim();

			cur = {
				id: idStr ? parseInt(idStr, 10) : undefined,
				seqIndex: rawQuestions.length + 1, // 1-based
				title: rawTitle,
				options: {},
				answer: [],
				explanation: '',
				difficulty,
				category,
				knowledgeTags,
				type
			};
			continue;
		}

		// ── No active question yet, skip ───────────────────────────────────────
		if (!cur) continue;

		// ── Metadata lines ─────────────────────────────────────────────────────
		const metaMatch = trimmedLine.match(
			/^(?:[-*+]\s+)?(?:难度|difficulty)\s*[:：\s]\s*(简单|中等|困难|easy|medium|hard)/i
		);
		if (metaMatch) {
			isParsingExplanation = false;
			const d = metaMatch[1].trim().toLowerCase();
			if (d === '简单' || d === 'easy') cur.difficulty = 'easy';
			else if (d === '困难' || d === 'hard') cur.difficulty = 'hard';
			else cur.difficulty = 'medium';
			continue;
		}

		const catLineMatch = trimmedLine.match(
			/^(?:[-*+]\s+)?(?:知识点|分类|考点|category)\s*[:：\s]\s*(.*)$/i
		);
		if (catLineMatch) {
			isParsingExplanation = false;
			cur.category = catLineMatch[1].trim();
			continue;
		}

		const tagsLineMatch = trimmedLine.match(
			/^(?:[-*+]\s+)?(?:标签|tags)\s*[:：\s]\s*(.*)$/i
		);
		if (tagsLineMatch) {
			isParsingExplanation = false;
			cur.knowledgeTags = Array.from(
				new Set([...cur.knowledgeTags, ...tagsLineMatch[1].split(/[,，]/).map((t) => t.trim())])
			);
			continue;
		}

		// ── Options ────────────────────────────────────────────────────────────
		const optionMatch = trimmedLine.match(RE_OPTION);
		if (optionMatch) {
			isParsingExplanation = false;
			const key = optionMatch[1].toUpperCase();
			// Strip trailing bold markers from the value
			let val = optionMatch[2].replace(/\*+$/, '').trim();
			cur.options[key] = val;
			curOptionKey = key;
			continue;
		}

		// ── Inline Answer ──────────────────────────────────────────────────────
		const answerMatch =
			trimmedLine.match(RE_ANSWER_INLINE) ||
			trimmedLine.match(RE_ANSWER_BRACKET) ||
			trimmedLine.match(RE_ANSWER_EN);
		if (answerMatch) {
			isParsingExplanation = false;
			const lettersRaw = answerMatch[1].toUpperCase();
			const letters = lettersRaw.match(/[A-G]/g);
			if (letters) {
				cur.answer = Array.from(new Set(letters)).sort();
				if (!cur.type) {
					cur.type = letters.length > 1 ? 'multiple' : 'single';
				}
			}
			curOptionKey = null;
			continue;
		}

		// ── Explanation header ─────────────────────────────────────────────────
		const expMatch =
			trimmedLine.match(RE_EXP) ||
			trimmedLine.match(RE_EXP_BRACKET) ||
			trimmedLine.match(RE_EXP_EN);
		if (expMatch) {
			isParsingExplanation = true;
			cur.explanation = expMatch[1].trim();
			curOptionKey = null;
			continue;
		}

		// ── Accumulate ─────────────────────────────────────────────────────────
		if (isParsingExplanation) {
			cur.explanation += line + '\n';
		} else if (curOptionKey) {
			cur.options[curOptionKey] += '\n' + trimmedLine;
		} else {
			// Multi-line question body / stem
			cur.title += '\n' + trimmedLine;
		}
	}

	finalizeCur();

	// ── Phase 2: Back-fill answers from answer key ────────────────────────────
	rawQuestions.forEach((q, idx) => {
		// Prefer matching by parsed ID (e.g. 1 from "### 1."), otherwise fallback to seqIndex
		const keyId = q.id !== undefined ? q.id : (idx + 1);
		const keyEntry = answerKey.get(keyId);
		if (keyEntry) {
			// Prefer answer-sheet data over inline (answer-sheet is authoritative)
			if (keyEntry.answers.length > 0) {
				q.answer = keyEntry.answers;
				if (!q.type) {
					q.type = keyEntry.answers.length > 1 ? 'multiple' : 'single';
				}
			}
			if (keyEntry.explanation.trim()) {
				q.explanation = keyEntry.explanation.trim();
			}
		}
	});

	// ── Phase 3: Validate and build final Question[] ──────────────────────────
	const questions: Question[] = [];

	rawQuestions.forEach((q) => {
		const title = q.title.trim();
		const optionKeys = Object.keys(q.options);
		const hasTitle = title.length > 0;
		const hasOptions = optionKeys.length >= 2;

		// Filter answers to only keys that exist in options
		const validatedAnswer = q.answer
			.map((a) => a.toUpperCase().trim())
			.filter((a) => optionKeys.includes(a));

		const hasAnswer = validatedAnswer.length > 0;

		// Deduce type
		let type: 'single' | 'multiple' = 'single';
		if (q.type) {
			type = q.type;
		} else {
			type = validatedAnswer.length > 1 ? 'multiple' : 'single';
		}

		// Category / tags
		const category = (q.category || '通用').trim();
		const knowledgeTags = Array.from(
			new Set([
				...(q.knowledgeTags || []).map((t) => t.trim()).filter((t) => t.length > 0),
				...(category !== '通用' ? [category] : [])
			])
		);

		// Difficulty
		const difficulty: 'easy' | 'medium' | 'hard' = q.difficulty || 'medium';

		if (hasTitle && hasOptions && hasAnswer) {
			const id = q.id || (questions.length + 1);
			questions.push({
				id,
				type,
				title,
				options: q.options,
				answer: validatedAnswer,
				explanation: (q.explanation || '').trim(),
				difficulty,
				category,
				knowledgeTags
			});
		} else {
			console.warn(
				`[Parser Warning] Question skipped due to validation failure. Title: "${title.slice(0, 30)}...", ` +
					`Options count: ${optionKeys.length}, Validated Answers: [${validatedAnswer.join(', ')}]. ` +
					`Please check Markdown formatting.`
			);
		}
	});

	return questions;
}
