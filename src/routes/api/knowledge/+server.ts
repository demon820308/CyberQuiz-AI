import { json } from '@sveltejs/kit';
import { insertKnowledgeQuestionsBatch, getUser } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ error: 'Database connection unbound' }, { status: 500 });
	}

	const username = request.headers.get('x-user-username');
	if (!username) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const user = await getUser(db, username);
		if (!user || user.role !== 'admin') {
			return json({ error: 'Forbidden: Admin access required' }, { status: 403 });
		}

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
