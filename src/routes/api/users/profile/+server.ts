import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUser, updateUserPassword, updateUserNickname } from '$lib/server/db';

async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password + 'cyberquiz_salt_2026'); // Secure salt prefix
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ success: false, error: 'Database binding not found' }, { status: 500 });
	}

	const username = request.headers.get('x-user-username') || cookies.get('cq_username');
	if (!username) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { action, nickname, newPassword } = (await request.json()) as any;

		if (!action) {
			return json({ success: false, error: 'Missing action' }, { status: 400 });
		}

		const cleanUsername = username.trim().toLowerCase();
		const user = await getUser(db, cleanUsername);
		if (!user) {
			return json({ success: false, error: 'User not found' }, { status: 404 });
		}

		// 1. Update Nickname
		if (action === 'updateNickname') {
			if (!nickname) {
				return json({ success: false, error: 'Missing nickname' }, { status: 400 });
			}
			const cleanNickname = nickname.trim();
			if (cleanNickname.length < 2 || cleanNickname.length > 20) {
				return json({ success: false, error: '昵称长度需在2-20字符之间' }, { status: 400 });
			}

			await updateUserNickname(db, cleanUsername, cleanNickname);
			return json({ success: true, nickname: cleanNickname });
		}

		// 2. Update Password
		if (action === 'updatePassword') {
			if (!newPassword) {
				return json({ success: false, error: 'Missing newPassword' }, { status: 400 });
			}
			if (newPassword.length < 6) {
				return json({ success: false, error: '新密码长度不能低于6位' }, { status: 400 });
			}

			const passwordHash = await hashPassword(newPassword);
			await updateUserPassword(db, cleanUsername, passwordHash);
			return json({ success: true });
		}

		return json({ success: false, error: 'Invalid action' }, { status: 400 });
	} catch (e: any) {
		console.error('[API Error] /api/users/profile:', e);
		return json({ success: false, error: e.message || 'Server error' }, { status: 500 });
	}
};
