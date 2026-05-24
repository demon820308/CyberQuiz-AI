import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { insertQuizHistory, updateWrongRecord, deleteWrongRecord } from '$lib/server/db';
import type { WrongRecord, QuizHistory } from '$lib/types';

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ success: false, error: 'Database binding not found' }, { status: 500 });
	}

	try {
		const username = request.headers.get('x-user-username');
		if (!username) {
			return json({ success: false, error: 'Unauthorized: Missing user credentials' }, { status: 401 });
		}

		const { questionId, selected, isCorrect } = (await request.json()) as any;
		if (typeof questionId !== 'number' || !Array.isArray(selected) || typeof isCorrect !== 'boolean') {
			return json({ success: false, error: 'Invalid payload format' }, { status: 400 });
		}

		const nowStr = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
		const cleanUser = username.trim().toLowerCase();

		// 1. Insert into general history
		const historyItem: QuizHistory = {
			questionId,
			selected,
			correct: isCorrect,
			time: nowStr
		};
		await insertQuizHistory(db, cleanUser, historyItem);

		// 2. Fetch existing wrong record from wrong_book (if any)
		let updatedWrongRecord: WrongRecord | null = null;
		let deleted = false;
		let message = '';
		let remainingCount = 0;

		const row: any = await db.prepare('SELECT * FROM wrong_book WHERE username = ? AND questionId = ?')
			.bind(cleanUser, questionId)
			.first();

		if (!isCorrect) {
			// Answered incorrectly
			if (row) {
				updatedWrongRecord = {
					questionId,
					count: row.count + 1,
					wrongCount: row.wrongCount + 1,
					lastWrongTime: nowStr
				};
			} else {
				updatedWrongRecord = {
					questionId,
					count: 1,
					wrongCount: 1,
					lastWrongTime: nowStr
				};
			}
			await updateWrongRecord(db, cleanUser, updatedWrongRecord);
		} else {
			// Answered correctly
			if (row) {
				const newCount = row.count - 1;
				if (newCount <= 0) {
					// Count reached zero! Fully cleared from active wrong list
					await deleteWrongRecord(db, cleanUser, questionId);
					deleted = true;
					message = '错题攻克成功！已从错题本移出';
				} else {
					updatedWrongRecord = {
						questionId,
						count: newCount,
						wrongCount: row.wrongCount,
						lastWrongTime: row.lastWrongTime // keep last wrong time
					};
					await updateWrongRecord(db, cleanUser, updatedWrongRecord);
					remainingCount = newCount;
					message = `错题频度降低，剩余复习次数: ${newCount}次`;
				}
			}
		}

		// Retrieve all history and wrong records to sync client perfectly
		const [wrongBook, history] = await Promise.all([
			db.prepare('SELECT * FROM wrong_book WHERE username = ?').bind(cleanUser).all().then(({ results }) => 
				(results || []).map((r: any) => ({
					questionId: r.questionId,
					count: r.count,
					wrongCount: r.wrongCount,
					lastWrongTime: r.lastWrongTime
				}))
			),
			db.prepare('SELECT * FROM quiz_history WHERE username = ? ORDER BY id ASC').bind(cleanUser).all().then(({ results }) => 
				(results || []).map((r: any) => ({
					questionId: r.questionId,
					selected: JSON.parse(r.selected),
					correct: r.correct === 1,
					time: r.time
				}))
			)
		]);

		return json({
			success: true,
			wrongBook,
			history,
			deleted,
			remainingCount,
			message
		});
	} catch (e: any) {
		console.error('[API Error] /api/quiz/submit:', e);
		return json({ success: false, error: e.message || 'Server error' }, { status: 500 });
	}
};
