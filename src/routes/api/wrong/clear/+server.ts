import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clearWrongBook } from '$lib/server/db';

export const POST: RequestHandler = async ({ platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ success: false, error: 'Database binding not found' }, { status: 500 });
	}

	try {
		const success = await clearWrongBook(db);
		if (success) {
			return json({ success: true, wrongBook: [] });
		} else {
			return json({ success: false, error: 'Failed to clear wrong book' }, { status: 500 });
		}
	} catch (e: any) {
		console.error('[API Error] /api/wrong/clear:', e);
		return json({ success: false, error: e.message || 'Server error' }, { status: 500 });
	}
};
