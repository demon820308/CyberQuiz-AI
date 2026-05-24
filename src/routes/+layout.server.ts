import { getAllQuestions, getWrongRecords, getQuizHistory, getSessionProgress, getAllKnowledgeQuestions, getUser } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

async function loadData(db: D1Database, username?: string) {
	if (username) {
		const progress = await getSessionProgress(db, username);
		const bankId = progress?.active_bank_id || undefined;

		const [questions, wrongBook, history, knowledgeQuestions, user] = await Promise.all([
			getAllQuestions(db, bankId),
			getWrongRecords(db, username),
			getQuizHistory(db, username),
			getAllKnowledgeQuestions(db),
			getUser(db, username)
		]);
		return {
			questions,
			wrongBook,
			history,
			progress,
			knowledgeQuestions,
			user: user ? { username: user.username, nickname: user.nickname, role: user.role } : null
		};
	} else {
		const [questions, knowledgeQuestions] = await Promise.all([
			getAllQuestions(db),
			getAllKnowledgeQuestions(db)
		]);
		return {
			questions,
			wrongBook: [],
			history: [],
			progress: null,
			knowledgeQuestions,
			user: null
		};
	}
}

export const load: LayoutServerLoad = async ({ platform, cookies }) => {
	const db = platform?.env.DB;
	const username = cookies.get('cq_username');

	if (!db) {
		return { questions: [], wrongBook: [], history: [], progress: null, knowledgeQuestions: [], user: null, isD1: false, dbError: null };
	}

	// Check if the database has been manually initialized (check 'users' table)
	try {
		const checkTable = await db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'").first();
		if (!checkTable) {
			return {
				questions: [],
				wrongBook: [],
				history: [],
				progress: null,
				knowledgeQuestions: [],
				user: null,
				isD1: true,
				dbError: '数据库初始化失败: 未检测到数据库表结构（如 users 表不存在）。请确保已按照 README.md 指南在 Cloudflare 控制台或使用 wrangler 命令行手动创建并初始化表结构。'
			};
		}
	} catch (err: any) {
		console.error('[DB Check Error]:', err);
		return {
			questions: [],
			wrongBook: [],
			history: [],
			progress: null,
			knowledgeQuestions: [],
			user: null,
			isD1: true,
			dbError: `数据库访问失败: ${err.message || String(err)}`
		};
	}

	try {
		const data = await loadData(db, username);
		return {
			...data,
			isD1: true,
			dbError: null
		};
	} catch (e: any) {
		console.error('[Layout Server Load Error]:', e);
		const errorStr = String(e.message || e);
		let userFriendlyError = errorStr;
		if (errorStr.includes('no such table')) {
			userFriendlyError = '未检测到完整的数据库表结构，请确保已按照 README.md 手动执行了完整的初始化 SQL 语句。';
		}
		return {
			questions: [],
			wrongBook: [],
			history: [],
			progress: null,
			knowledgeQuestions: [],
			user: null,
			isD1: true,
			dbError: `数据库加载失败: ${userFriendlyError}`
		};
	}
};

