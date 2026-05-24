import { json } from '@sveltejs/kit';
import { deleteKnowledgeQuestion, getUser } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ error: '云端数据库连接未绑定！' }, { status: 500 });
	}

	const username = request.headers.get('x-user-username');
	if (!username) {
		return json({ error: 'Unauthorized: Missing session' }, { status: 401 });
	}

	try {
		const user = await getUser(db, username);
		if (!user || user.role !== 'admin') {
			return json({ error: 'Forbidden: Admin access required' }, { status: 403 });
		}

		const { id } = (await request.json()) as any;
		if (!id) {
			return json({ error: '无效请求：缺少删除题目 ID！' }, { status: 400 });
		}

		await deleteKnowledgeQuestion(db, Number(id));
		return json({ success: true });
	} catch (e: any) {
		console.error('[API Knowledge Delete Error]:', e);
		return json({ error: e.message || String(e) }, { status: 500 });
	}
};
