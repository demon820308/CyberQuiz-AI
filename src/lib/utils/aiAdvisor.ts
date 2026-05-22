import type { Question, WrongRecord, QuizHistory } from '../types';

export interface CategoryStat {
	name: string;
	totalQuestions: number;
	attempts: number;
	correctRate: number; // 0 to 100
	activeWrongCount: number;
}

export interface DifficultyStat {
	level: 'easy' | 'medium' | 'hard';
	totalQuestions: number;
	attempts: number;
	correctRate: number; // 0 to 100
}

export interface AIAdviceReport {
	summary: string;
	cyberBadge: {
		name: string;
		description: string;
		colorClass: string; // Neon theme text color
	};
	weakestCategories: { name: string; correctRate: number; wrongCount: number }[];
	strongestCategories: string[];
	studyPlan: {
		step: number;
		title: string;
		description: string;
	}[];
	revisionStrategies: string[];
}

/**
 * Calculates in-depth analytics and generates personalized, dynamic AI suggestions
 */
export function generateAIDiagnosis(
	questions: Question[],
	history: QuizHistory[],
	wrongBook: WrongRecord[]
): AIAdviceReport {
	const totalQuestions = questions.length;
	const totalAttempts = history.length;
	
	// Group history by questionId
	const historyMap = new Map<number, QuizHistory[]>();
	history.forEach((h) => {
		const list = historyMap.get(h.questionId) || [];
		list.push(h);
		historyMap.set(h.questionId, list);
	});

	// Calculate overall accuracy
	const correctAttempts = history.filter((h) => h.correct).length;
	const overallAccuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

	// Calculate category stats
	const categoryMap = new Map<string, { total: number; attempts: number; correct: number }>();
	// Initialize categories from questions
	questions.forEach((q) => {
		const stats = categoryMap.get(q.category) || { total: 0, attempts: 0, correct: 0 };
		stats.total += 1;
		categoryMap.set(q.category, stats);

		// Accumulate history for this question into its category
		const qHistory = historyMap.get(q.id) || [];
		qHistory.forEach((h) => {
			stats.attempts += 1;
			if (h.correct) stats.correct += 1;
		});
	});

	// Map wrong book to active counts
	const wrongCountMap = new Map<number, number>();
	wrongBook.forEach((w) => wrongCountMap.set(w.questionId, w.count));

	const categoryStats: CategoryStat[] = [];
	categoryMap.forEach((val, key) => {
		// Calculate active wrongs in this category
		let activeWrongs = 0;
		questions.forEach((q) => {
			if (q.category === key) {
				activeWrongs += wrongCountMap.get(q.id) || 0;
			}
		});

		categoryStats.push({
			name: key,
			totalQuestions: val.total,
			attempts: val.attempts,
			correctRate: val.attempts > 0 ? Math.round((val.correct / val.attempts) * 100) : 100, // Default to 100 if no attempts yet
			activeWrongCount: activeWrongs
		});
	});

	// Calculate difficulty stats
	const difficultyMap = {
		easy: { total: 0, attempts: 0, correct: 0 },
		medium: { total: 0, attempts: 0, correct: 0 },
		hard: { total: 0, attempts: 0, correct: 0 }
	};

	questions.forEach((q) => {
		const stats = difficultyMap[q.difficulty];
		if (stats) {
			stats.total += 1;
			const qHistory = historyMap.get(q.id) || [];
			qHistory.forEach((h) => {
				stats.attempts += 1;
				if (h.correct) stats.correct += 1;
			});
		}
	});

	const easyAccuracy = difficultyMap.easy.attempts > 0 ? Math.round((difficultyMap.easy.correct / difficultyMap.easy.attempts) * 100) : 100;
	const mediumAccuracy = difficultyMap.medium.attempts > 0 ? Math.round((difficultyMap.medium.correct / difficultyMap.medium.attempts) * 100) : 100;
	const hardAccuracy = difficultyMap.hard.attempts > 0 ? Math.round((difficultyMap.hard.correct / difficultyMap.hard.attempts) * 100) : 100;

	// Deduce strengths and weaknesses
	// Weakest: sorting by active wrong count (primary) and low correctness rate (secondary)
	const sortedByWeakness = [...categoryStats]
		.filter((c) => c.attempts > 0 || c.activeWrongCount > 0)
		.sort((a, b) => {
			if (b.activeWrongCount !== a.activeWrongCount) {
				return b.activeWrongCount - a.activeWrongCount;
			}
			return a.correctRate - b.correctRate;
		});

	const weakestCategories = sortedByWeakness.slice(0, 3).map((w) => ({
		name: w.name,
		correctRate: w.correctRate,
		wrongCount: w.activeWrongCount
	}));

	// Strongest: sorting by attempts and high correctness rate
	const strongestCategories = [...categoryStats]
		.filter((c) => c.attempts >= 2 && c.correctRate >= 75)
		.sort((a, b) => b.correctRate - a.correctRate)
		.slice(0, 2)
		.map((c) => c.name);

	// Generate Cyberpunk Badge
	let badgeName = '赛博探险者';
	let badgeDesc = '踏入知识库的赛博荒野，开始构建您的认知地图。';
	let badgeColor = 'text-primary'; //淡紫色

	if (totalAttempts > 0) {
		if (overallAccuracy >= 85 && totalAttempts >= 15) {
			badgeName = '矩阵主宰者 (Master)';
			badgeDesc = '极高的答题正确率！您已经成功掌握了大部分知识链路，核心概念清晰。';
			badgeColor = 'text-tertiary'; // 荧光绿
		} else if (overallAccuracy >= 70 && totalAttempts >= 10) {
			badgeName = '赛博渗透客 (Hacker)';
			badgeDesc = '表现出众的逻辑分析与解题能力，擅长在中高难度下寻找突破口。';
			badgeColor = 'text-secondary'; // 电光紫
		} else if (wrongBook.length > 8) {
			badgeName = 'BUG 清道夫 (Bug Cleaner)';
			badgeDesc = '遭遇了多次逻辑报错，但正在通过错题本积极清理残留的代码认知缺陷。';
			badgeColor = 'text-error'; // 荧光红
		} else {
			badgeName = '数据流调试员 (Debugger)';
			badgeDesc = '正在稳健地对各类题目进行断点分析，逐步提升知识吸收率。';
			badgeColor = 'text-primary';
		}
	}

	// Generate dynamic textual summary
	let summary = '';
	if (totalQuestions === 0) {
		summary = '当前系统内没有题库数据。请先上传您的 Markdown (.md) 题库，AI 系统即可实时启动分析与诊断机制。';
	} else if (totalAttempts === 0) {
		summary = `已为您加载了具有 ${totalQuestions} 道题目的知识网络。您当前还没有任何作答记录，点击去答题，AI 引擎将自动收集您的学习数据并为您输出独属的诊断报告。`;
	} else {
		const weakNames = weakestCategories.map((w) => `『${w.name}』`).join('、');
		const strongNames = strongestCategories.map((s) => `『${s}』`).join('、');
		
		summary = `在累计作答的 ${totalAttempts} 次交互中，您的整体答题正确率为 **${overallAccuracy}%**。\n\n`;
		
		if (weakestCategories.length > 0) {
			summary += `诊断显示，您目前在 ${weakNames} 分类上存在一定的薄弱环节，特别是错题库中累计了较多的未消灭记录。\n\n`;
		}
		
		if (strongestCategories.length > 0) {
			summary += `与此同时，您在 ${strongNames} 方面展现了出色的理解力，正确率保持在 ${categoryMap.get(strongestCategories[0])?.correct ? Math.round(((categoryMap.get(strongestCategories[0])?.correct || 0) / (categoryMap.get(strongestCategories[0])?.attempts || 1)) * 100) : 100}% 以上。\n\n`;
		} else {
			summary += `目前还没有发现绝对的优势模块，建议先通过顺序练习扩展覆盖率。\n\n`;
		}

		if (hardAccuracy < 50 && difficultyMap.hard.attempts > 0) {
			summary += `在面对“困难”级别的题目时，您的通过率为较弱的 **${hardAccuracy}%**，存在盲目提交的现象，需要重点关注错题解析。`;
		} else if (hardAccuracy >= 80 && difficultyMap.hard.attempts >= 3) {
			summary += `极为优秀的是，在应对“困难”难度的高端题目时，您依然拿到了 **${hardAccuracy}%** 的高分，逻辑严密。`;
		}
	}

	// Dynamic Revision Strategies
	const revisionStrategies: string[] = [];
	if (wrongBook.length > 0) {
		revisionStrategies.push(`**建立错题熔断机制**：当前错题库积攒了 ${wrongBook.length} 道题。建议开启“错题练习模式”，通过渐进式答对消灭，在错题数清零前限制上传新题库。`);
	} else {
		revisionStrategies.push('**零错题完美达成**：目前您的错题本为空！这是一个非常优秀的指标，建议立刻启动“随机乱序练习”，打破惯性思维。');
	}

	if (weakestCategories.length > 0) {
		revisionStrategies.push(`**弱项深度反刍**：重点针对『${weakestCategories[0].name}』中的错题进行解析重读，将其中的代码片段手动在 IDE 中运行调试，寻找认知漏洞。`);
	}

	if (difficultyMap.medium.attempts > 0 && mediumAccuracy < 70) {
		revisionStrategies.push('**夯实中等难度**：中等题型的通过率偏低。做题时建议拉长读题时间，避免因粗心导致“简单/中等难度”题目丢分。');
	} else {
		revisionStrategies.push('**进军硬核挑战**：中等及以下难度已基本攻克，可以尝试在上传的题库中多加入 [难度：困难] 级别的题目，激活更高级别的思维状态。');
	}

	// Dynamic Study Plan
	const studyPlan = [
		{
			step: 1,
			title: '弱点突击精练',
			description: weakestCategories.length > 0 
				? `进入 Study 模块，筛选出『${weakestCategories[0].name}』模块进行专注练习，消灭该分类下的基本漏洞。`
				: '通过顺序模式遍历剩余未做题目，进一步补全您的学习基底数据。'
		},
		{
			step: 2,
			title: '错题渐进消灭',
			description: wrongBook.length > 0
				? '启动“错题重练”，对答错频次前 5 的核心错题重点攻关，将它们的错误计数通过正确解答归零。'
				: '保持零错题纪录，在当前题库下以每次 10 题的量进行随机乱序组卷。'
		},
		{
			step: 3,
			title: '全栈盲测抗压',
			description: '开启“随机打乱模式”进行全套题目的限时盲测，最终达到各类型综合正确率 85% 以上。'
		}
	];

	return {
		summary,
		cyberBadge: {
			name: badgeName,
			description: badgeDesc,
			colorClass: badgeColor
		},
		weakestCategories,
		strongestCategories,
		studyPlan,
		revisionStrategies
	};
}
