import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUser, updateUserPassword } from '$lib/server/db';

async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password + 'cyberquiz_salt_2026'); // Standard salt prefix
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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
		if (!user || user.role !== 'admin') {
			return json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
		}

		const { newPassword } = (await request.json()) as any;
		if (!newPassword || newPassword.length < 6) {
			return json({ success: false, error: '新密码长度不能低于6位' }, { status: 400 });
		}

		const passwordHash = await hashPassword(newPassword);
		await updateUserPassword(db, username, passwordHash);

		return json({ success: true, message: '密码修改成功！' });
	} catch (e: any) {
		console.error('[Admin API Error] POST /api/admin/password:', e);
		return json({ success: false, error: e.message || 'Server error' }, { status: 500 });
	}
};
