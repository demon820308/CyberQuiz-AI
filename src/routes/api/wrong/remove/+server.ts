import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteWrongRecord } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ success: false, error: 'Database binding not found' }, { status: 500 });
	}

	try {
		const username = request.headers.get('x-user-username');
		if (!username) {
			return json({ success: false, error: 'Unauthorized: Missing user credentials' }, { status: 401 });
		}

		const { questionId } = (await request.json()) as any;
		if (typeof questionId !== 'number') {
			return json({ success: false, error: 'Invalid question ID' }, { status: 400 });
		}

		const cleanUser = username.trim().toLowerCase();
		const success = await deleteWrongRecord(db, cleanUser, questionId);
		if (success) {
			// Retrieve the updated wrong book list to sync client perfectly
			const { results } = await db.prepare('SELECT * FROM wrong_book WHERE username = ?').bind(cleanUser).all();
			const wrongBook = (results || []).map((row: any) => ({
				questionId: row.questionId,
				count: row.count,
				wrongCount: row.wrongCount,
				lastWrongTime: row.lastWrongTime
			}));
			return json({ success: true, wrongBook });
		} else {
			return json({ success: false, error: 'Failed to remove wrong record' }, { status: 500 });
		}
	} catch (e: any) {
		console.error('[API Error] /api/wrong/remove:', e);
		return json({ success: false, error: e.message || 'Server error' }, { status: 500 });
	}
};
