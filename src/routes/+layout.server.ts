import { getAllQuestions, getWrongRecords, getQuizHistory, getSessionProgress, initializeDatabase, getAllKnowledgeQuestions } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

async function loadData(db: D1Database) {
	const [questions, wrongBook, history, progress, knowledgeQuestions] = await Promise.all([
		getAllQuestions(db),
		getWrongRecords(db),
		getQuizHistory(db),
		getSessionProgress(db),
		getAllKnowledgeQuestions(db)
	]);
	return { questions, wrongBook, history, progress, knowledgeQuestions };
}

export const load: LayoutServerLoad = async ({ platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return { questions: [], wrongBook: [], history: [], progress: null, knowledgeQuestions: [], isD1: false, dbError: null };
	}

	try {
		const data = await loadData(db);
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
				const data = await loadData(db);
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
			isD1: true,
			dbError: e.message || String(e)
		};
	}
};

