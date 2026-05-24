import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUser, getQuestionBanks, createQuestionBank, deleteQuestionBank, insertQuestionsToBankBatch } from '$lib/server/db';
import type { Question } from '$lib/types';

export const GET: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ success: false, error: 'Database binding not found' }, { status: 500 });
	}

	const username = request.headers.get('x-user-username');
	if (!username) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const banks = await getQuestionBanks(db, username);
		return json({ success: true, banks });
	} catch (e: any) {
		console.error('[API Error] GET /api/banks:', e);
		return json({ success: false, error: e.message || 'Server error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ success: false, error: 'Database binding not found' }, { status: 500 });
	}

	const username = request.headers.get('x-user-username');
	if (!username) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const user = await getUser(db, username);
		if (!user) {
			return json({ success: false, error: 'User session not found' }, { status: 404 });
		}

		const { name, isGlobal, questions } = (await request.json()) as any;
		if (!name || !Array.isArray(questions) || questions.length === 0) {
			return json({ success: false, error: '无效的题库名称或题目列表为空' }, { status: 400 });
		}

		// Only super admin can create global banks
		const forceGlobal = isGlobal && user.role === 'admin' ? 1 : 0;

		// Create the bank entry
		const bankId = await createQuestionBank(db, name, username, forceGlobal);
		
		// Insert questions batch
		await insertQuestionsToBankBatch(db, bankId, questions);

		return json({ success: true, bankId, message: `成功导入题库「${name}」！` });
	} catch (e: any) {
		console.error('[API Error] POST /api/banks:', e);
		return json({ success: false, error: e.message || 'Server error' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ success: false, error: 'Database binding not found' }, { status: 500 });
	}

	const username = request.headers.get('x-user-username');
	if (!username) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { bankId } = (await request.json()) as any;
		if (typeof bankId !== 'number') {
			return json({ success: false, error: 'Invalid bank ID' }, { status: 400 });
		}

		await deleteQuestionBank(db, bankId, username);
		
		// Load updated bank list to return to client
		const banks = await getQuestionBanks(db, username);
		return json({ success: true, banks });
	} catch (e: any) {
		console.error('[API Error] DELETE /api/banks:', e);
		return json({ success: false, error: e.message || 'Server error' }, { status: 500 });
	}
};
