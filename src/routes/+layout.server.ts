import { getAllQuestions, getWrongRecords, getQuizHistory, getSessionProgress, initializeDatabase, getAllKnowledgeQuestions, getUser } from '$lib/server/db';
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

	try {
		const data = await loadData(db, username);
		return {
			...data,
			isD1: true,
			dbError: null
		};
	} catch (e: any) {
		const errorStr = String(e.message || e);
		if (errorStr.includes('no such table')) {
			try {
				await initializeDatabase(db);
				const data = await loadData(db, username);
				return {
					...data,
					isD1: true,
					dbError: null
				};
			} catch (initErr: any) {
				console.error('[DB Auto-Init Failed]:', initErr);
				return {
					questions: [],
					wrongBook: [],
					history: [],
					progress: null,
					knowledgeQuestions: [],
					user: null,
					isD1: true,
					dbError: initErr.message || String(initErr)
				};
			}
		}

		console.error('[Layout Server Load Error]:', e);
		return {
			questions: [],
			wrongBook: [],
			history: [],
			progress: null,
			knowledgeQuestions: [],
			user: null,
			isD1: true,
			dbError: e.message || String(e)
		};
	}
};

