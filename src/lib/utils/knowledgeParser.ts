import type { KnowledgeQuestion } from '$lib/data/knowledgeQuestions';

export type ParsedKnowledgeQuestion = Omit<KnowledgeQuestion, 'id' | 'semester' | 'subject'>;

// High-fidelity Markdown parser for Q&A questions matching the user's exact specifications
export function parseKnowledgeMarkdown(mdText: string): ParsedKnowledgeQuestion[] {
	if (!mdText || !mdText.trim()) return [];

	// Split by "## 题目内容" (case-insensitive and whitespace flexible)
	const rawParts = mdText.split(/##\s*题目内容/i);
	const questions: ParsedKnowledgeQuestion[] = [];

	for (const part of rawParts) {
		const trimmedPart = part.trim();
		if (!trimmedPart) continue;

		try {
			// Find positions of headers
			const ansIdx = trimmedPart.search(/##\s*标准答案/i);
			const logicIdx = trimmedPart.search(/##\s*逻辑架构/i);
			const anchorIdx = trimmedPart.search(/##\s*记忆锚点/i);

			// Extract raw sections based on headers index positions
			let rawContent = '';
			let rawAnswer = '';
			let rawLogic = '';
			let rawAnchor = '';

			if (ansIdx !== -1) {
				rawContent = trimmedPart.substring(0, ansIdx).trim();
				if (logicIdx !== -1) {
					rawAnswer = trimmedPart.substring(ansIdx, logicIdx).replace(/##\s*标准答案/i, '').trim();
					if (anchorIdx !== -1) {
						rawLogic = trimmedPart.substring(logicIdx, anchorIdx).replace(/##\s*逻辑架构/i, '').trim();
						rawAnchor = trimmedPart.substring(anchorIdx).replace(/##\s*记忆锚点/i, '').trim();
					} else {
						rawLogic = trimmedPart.substring(logicIdx).replace(/##\s*逻辑架构/i, '').trim();
					}
				} else {
					rawAnswer = trimmedPart.substring(ansIdx).replace(/##\s*标准答案/i, '').trim();
				}
			} else {
				// No standard answer header, treat everything as content
				rawContent = trimmedPart;
			}

			if (!rawContent) continue;

			// Parse first line for tag and extract content
			const contentLines = rawContent.split('\n');
			const firstLine = contentLines[0].trim();
			
			// Extract tag e.g. 【增强权利观念】
			const tagMatch = firstLine.match(/(【[^】]+】)/);
			let tag = tagMatch ? tagMatch[1] : '';
			let content = '';

			if (tag) {
				// Content is everything from the second line onwards
				content = contentLines.slice(1).join('\n').trim();
			} else {
				tag = '【知识问答题】';
				content = rawContent;
			}

			// Clean up index prefix if it exists in tag (e.g. 23.【增强权利观念】 -> 【增强权利观念】)
			tag = tag.trim();

			// Parse logical structure and extract keywords list
			let logicalStructure = '';
			let keywords: string[] = [];

			if (rawLogic) {
				// Extract Keywords: **关键词：** A, B, C
				const keywordsMatch = rawLogic.match(/\*\*关键词[：:]\*\*\s*(.*)/i);
				if (keywordsMatch) {
					keywords = keywordsMatch[1]
						.split(/[、，,]\s*/)
						.map(k => k.trim())
						.filter(Boolean);
					// Remove the keywords line from the logical structure text
					logicalStructure = rawLogic.replace(/\*\*关键词[：:]\*\*\s*.*/i, '').trim();
				} else {
					logicalStructure = rawLogic;
				}
			}

			// Parse Memory Anchors (口诀, 场景, 避坑)
			let formula = '根据本题的核心概念，结合生活常识加以联想记忆。';
			let scene = '脑海中代入相关的现实生活情景。';
			let avoid = '做题时，看清限制词，分清核心概念差异。';

			if (rawAnchor) {
				const formulaMatch = rawAnchor.match(/-\s*\*\*口诀[：:]\*\*\s*(.*)/i);
				const sceneMatch = rawAnchor.match(/-\s*\*\*场景[：:]\*\*\s*(.*)/i);
				const avoidMatch = rawAnchor.match(/-\s*\*\*避坑[：:]\*\*\s*(.*)/i);

				if (formulaMatch) formula = formulaMatch[1].trim();
				if (sceneMatch) scene = sceneMatch[1].trim();
				if (avoidMatch) avoid = avoidMatch[1].trim();
			}

			questions.push({
				tag,
				difficulty: 'medium', // Default to medium, user can refine
				content,
				standardAnswer: rawAnswer || '暂无标准答案',
				logicalStructure: logicalStructure || '* 暂无逻辑架构剖析',
				keywords: keywords.length > 0 ? keywords : ['概念要点'],
				mnemonic: {
					formula,
					scene,
					avoid
				}
			});
		} catch (err) {
			console.error('[Parser Error] Failed to parse question chunk:', err);
		}
	}

	return questions;
}
