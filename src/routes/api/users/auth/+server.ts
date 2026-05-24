import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUser, createUser, initializeDatabase } from '$lib/server/db';
import type { User } from '$lib/types';

// Helper to hash password using Web Crypto API (Cloudflare Worker compatible)
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

	// Proactive self-healing: run initialization if 'users' table is missing
	try {
		const checkTable = await db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'").first();
		if (!checkTable) {
			console.log('[DB API Auth] "users" table is missing. Running auto-initialization...');
			await initializeDatabase(db);
		}
	} catch (err) {
		console.error('[DB API Auth Migration Check Error]:', err);
	}

	try {
		const { action, username, nickname, password } = (await request.json()) as any;

		if (!action || !username) {
			return json({ success: false, error: 'Missing action or username' }, { status: 400 });
		}

		const cleanUsername = username.trim().toLowerCase();
		if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/.test(cleanUsername)) {
			return json({ success: false, error: '用户名格式不合法，需为2-20位字符' }, { status: 400 });
		}

		// 1. CHECK
		if (action === 'check') {
			const existingUser = await getUser(db, cleanUsername);
			return json({ success: true, exists: !!existingUser });
		}

		// 2. REGISTER
		if (action === 'register') {
			if (!nickname || !password) {
				return json({ success: false, error: 'Missing nickname or password' }, { status: 400 });
			}

			const cleanNickname = nickname.trim();
			if (cleanNickname.length < 2 || cleanNickname.length > 20) {
				return json({ success: false, error: '昵称长度需在2-20字符之间' }, { status: 400 });
			}

			if (password.length < 6) {
				return json({ success: false, error: '密码长度不能低于6位' }, { status: 400 });
			}

			// Double check if username exists
			const existingUser = await getUser(db, cleanUsername);
			if (existingUser) {
				return json({ success: false, error: '该用户名已被注册，请换一个用户名！' }, { status: 400 });
			}

			const passwordHash = await hashPassword(password);
			const newUser: Required<User> = {
				username: cleanUsername,
				nickname: cleanNickname,
				passwordHash,
				createdAt: new Date().toISOString(),
				role: 'user'
			};

			await createUser(db, newUser);

			// Set Cookie
			cookies.set('cq_username', cleanUsername, {
				path: '/',
				maxAge: 60 * 60 * 24 * 30, // 30 days
				sameSite: 'lax',
				httpOnly: false // Allow client reading if needed
			});

			return json({
				success: true,
				user: {
					username: cleanUsername,
					nickname: cleanNickname
				}
			});
		}

		// 3. LOGIN
		if (action === 'login') {
			if (!password) {
				return json({ success: false, error: 'Missing password' }, { status: 400 });
			}

			const existingUser = await getUser(db, cleanUsername);
			if (!existingUser || !existingUser.passwordHash) {
				return json({ success: false, error: '该用户名不存在，请重新输入或注册新账号！' }, { status: 400 });
			}

			const incomingHash = await hashPassword(password);
			if (incomingHash !== existingUser.passwordHash) {
				return json({ success: false, error: '密码错误，请重新输入！' }, { status: 400 });
			}

			// Set Cookie
			cookies.set('cq_username', cleanUsername, {
				path: '/',
				maxAge: 60 * 60 * 24 * 30, // 30 days
				sameSite: 'lax',
				httpOnly: false
			});

			return json({
				success: true,
				user: {
					username: existingUser.username,
					nickname: existingUser.nickname
				}
			});
		}

		// 4. LOGOUT
		if (action === 'logout') {
			cookies.delete('cq_username', { path: '/' });
			return json({ success: true });
		}

		return json({ success: false, error: 'Invalid action' }, { status: 400 });
	} catch (e: any) {
		console.error('[API Error] /api/users/auth:', e);
		return json({ success: false, error: e.message || 'Server error' }, { status: 500 });
	}
};
