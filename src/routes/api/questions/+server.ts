import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { insertQuestionsBatch } from '$lib/server/db';
import type { Question } from '$lib/types';

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ success: false, error: 'Database binding not found' }, { status: 500 });
	}

	try {
		const questions: Question[] = await request.json();
		if (!Array.isArray(questions)) {
			return json({ success: false, error: 'Invalid payload format' }, { status: 400 });
		}

		const success = await insertQuestionsBatch(db, questions);
		if (success) {
			return json({ success: true, count: questions.length });
		} else {
			return json({ success: false, error: 'Failed to insert questions into database' }, { status: 500 });
		}
	} catch (e: any) {
		console.error('[API Error] /api/questions:', e);
		return json({ success: false, error: e.message || 'Server error' }, { status: 500 });
	}
};
