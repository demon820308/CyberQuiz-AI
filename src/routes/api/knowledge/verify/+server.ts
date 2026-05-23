import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
	const passwordVar = (platform?.env as any)?.PASSWORD || 'admin';
	try {
		const { password } = (await request.json()) as any;
		if (password === passwordVar) {
			return json({ success: true });
		} else {
			return json({ success: false, error: '管理员授权密码错误！' });
		}
	} catch (e: any) {
		console.error('[API Knowledge Verify Error]:', e);
		return json({ success: false, error: '解析密码参数失败！' }, { status: 400 });
	}
};
