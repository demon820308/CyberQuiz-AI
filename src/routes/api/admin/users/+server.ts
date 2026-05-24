import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUser, getAllUsers, deleteUser } from '$lib/server/db';

async function checkAdminAuth(db: D1Database, request: Request): Promise<boolean> {
	const username = request.headers.get('x-user-username');
	if (!username) return false;
	try {
		const user = await getUser(db, username);
		return !!(user && user.role === 'admin');
	} catch {
		return false;
	}
}

export const GET: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ success: false, error: 'Database binding not found' }, { status: 500 });
	}

	const isAdmin = await checkAdminAuth(db, request);
	if (!isAdmin) {
		return json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
	}

	try {
		const users = await getAllUsers(db);
		// Strip passwordHash before sending
		const safeUsers = users.map(u => ({
			username: u.username,
			nickname: u.nickname,
			role: u.role,
			createdAt: u.createdAt
		}));
		return json({ success: true, users: safeUsers });
	} catch (e: any) {
		console.error('[Admin API Error] GET /api/admin/users:', e);
		return json({ success: false, error: e.message || 'Server error' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ success: false, error: 'Database binding not found' }, { status: 500 });
	}

	const isAdmin = await checkAdminAuth(db, request);
	if (!isAdmin) {
		return json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
	}

	try {
		const { username } = (await request.json()) as any;
		if (!username) {
			return json({ success: false, error: 'Missing username parameter' }, { status: 400 });
		}

		if (username.trim().toLowerCase() === 'admin') {
			return json({ success: false, error: 'Cannot delete super administrator' }, { status: 400 });
		}

		await deleteUser(db, username);
		return json({ success: true });
	} catch (e: any) {
		console.error('[Admin API Error] DELETE /api/admin/users:', e);
		return json({ success: false, error: e.message || 'Server error' }, { status: 500 });
	}
};
