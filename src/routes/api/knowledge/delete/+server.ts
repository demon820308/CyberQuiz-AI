import { json } from '@sveltejs/kit';
import { deleteKnowledgeQuestion } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	const passwordVar = (platform?.env as any)?.PASSWORD || 'admin';

	if (!db) {
		return json({ error: '云端数据库连接未绑定！' }, { status: 500 });
	}

	try {
		const { id, password } = (await request.json()) as any;

		if (!password || password !== passwordVar) {
			return json({ error: '权限校验失败，密码错误或已失效！' }, { status: 401 });
		}

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
