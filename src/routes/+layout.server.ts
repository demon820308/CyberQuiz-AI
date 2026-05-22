import { getAllQuestions, getWrongRecords, getQuizHistory, getSessionProgress } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return { questions: [], wrongBook: [], history: [], progress: null, isD1: false, dbError: null };
	}

	try {
		const [questions, wrongBook, history, progress] = await Promise.all([
			getAllQuestions(db),
			getWrongRecords(db),
			getQuizHistory(db),
			getSessionProgress(db)
		]);

		return {
			questions,
			wrongBook,
			history,
			progress,
			isD1: true,
			dbError: null
		};
	} catch (e: any) {
		console.error('[Layout Server Load Error]:', e);
		return {
			questions: [],
			wrongBook: [],
			history: [],
			progress: null,
			isD1: true,
			dbError: e.message || String(e)
		};
	}
};
