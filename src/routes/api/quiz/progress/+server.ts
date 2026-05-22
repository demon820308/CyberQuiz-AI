import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { saveSessionProgress, clearSessionProgress } from '$lib/server/db';
import type { SessionProgress } from '$lib/types';

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ success: false, error: 'Database binding not found' }, { status: 500 });
	}

	try {
		const progress: SessionProgress = await request.json();
		if (
			progress === null ||
			typeof progress.currentIndex !== 'number' ||
			!progress.exerciseMode ||
			!Array.isArray(progress.activeQuestionIds) ||
			typeof progress.submitted !== 'boolean' ||
			!Array.isArray(progress.selectedAnswers)
		) {
			return json({ success: false, error: 'Invalid progress data' }, { status: 400 });
		}

		const success = await saveSessionProgress(db, progress);
		if (success) {
			return json({ success: true });
		} else {
			return json({ success: false, error: 'Failed to save progress to database' }, { status: 500 });
		}
	} catch (e: any) {
		console.error('[API Error] /api/quiz/progress POST:', e);
		return json({ success: false, error: e.message || 'Server error' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ success: false, error: 'Database binding not found' }, { status: 500 });
	}

	try {
		const success = await clearSessionProgress(db);
		if (success) {
			return json({ success: true });
		} else {
			return json({ success: false, error: 'Failed to clear progress from database' }, { status: 500 });
		}
	} catch (e: any) {
		console.error('[API Error] /api/quiz/progress DELETE:', e);
		return json({ success: false, error: e.message || 'Server error' }, { status: 500 });
	}
};
