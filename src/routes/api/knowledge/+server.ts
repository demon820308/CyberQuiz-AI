import { json } from '@sveltejs/kit';
import { insertKnowledgeQuestionsBatch } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ error: 'Database connection unbound' }, { status: 500 });
	}

	try {
		const questions = await request.json();
		if (!Array.isArray(questions)) {
			return json({ error: 'Invalid payload: questions must be an array' }, { status: 400 });
		}

		await insertKnowledgeQuestionsBatch(db, questions);
		return json({ success: true });
	} catch (e: any) {
		console.error('[API Knowledge Error]:', e);
		return json({ error: e.message || String(e) }, { status: 500 });
	}
};
