import type { Question, WrongRecord, QuizHistory, SessionProgress } from '../types';

/**
 * Cloudflare D1 Database Access Layer for CyberQuiz AI
 */

// 1. QUESTIONS
export async function getAllQuestions(db: D1Database): Promise<Question[]> {
	try {
		const { results } = await db.prepare('SELECT * FROM questions ORDER BY id ASC').all();
		return (results || []).map((row: any) => ({
			id: row.id,
			type: row.type as 'single' | 'multiple',
			title: row.title,
			options: JSON.parse(row.options),
			answer: JSON.parse(row.answer),
			explanation: row.explanation,
			difficulty: row.difficulty as 'easy' | 'medium' | 'hard',
			category: row.category,
			knowledgeTags: row.knowledgeTags ? JSON.parse(row.knowledgeTags) : []
		}));
	} catch (e) {
		console.error('[DB Error] getAllQuestions:', e);
		throw e;
	}
}

export async function insertQuestionsBatch(db: D1Database, questions: Question[]): Promise<boolean> {
	try {
		// D1 transaction/batch replacement of all questions
		const statements = [db.prepare('DELETE FROM questions')];

		for (const q of questions) {
			statements.push(
				db.prepare(
					`INSERT INTO questions (id, type, title, options, answer, explanation, difficulty, category, knowledgeTags) 
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
				).bind(
					q.id,
					q.type,
					q.title,
					JSON.stringify(q.options),
					JSON.stringify(q.answer),
					q.explanation,
					q.difficulty,
					q.category,
					JSON.stringify(q.knowledgeTags || [])
				)
			);
		}

		await db.batch(statements);
		return true;
	} catch (e) {
		console.error('[DB Error] insertQuestionsBatch:', e);
		throw e;
	}
}

// 2. WRONG BOOK
export async function getWrongRecords(db: D1Database): Promise<WrongRecord[]> {
	try {
		const { results } = await db.prepare('SELECT * FROM wrong_book').all();
		return (results || []).map((row: any) => ({
			questionId: row.questionId,
			count: row.count,
			wrongCount: row.wrongCount,
			lastWrongTime: row.lastWrongTime
		}));
	} catch (e) {
		console.error('[DB Error] getWrongRecords:', e);
		throw e;
	}
}

export async function updateWrongRecord(db: D1Database, record: WrongRecord): Promise<boolean> {
	try {
		await db.prepare(
			`INSERT INTO wrong_book (questionId, count, wrongCount, lastWrongTime) 
			 VALUES (?, ?, ?, ?) 
			 ON CONFLICT(questionId) 
			 DO UPDATE SET 
			 	count = excluded.count, 
				wrongCount = excluded.wrongCount, 
				lastWrongTime = excluded.lastWrongTime`
		).bind(
			record.questionId,
			record.count,
			record.wrongCount,
			record.lastWrongTime
		).run();
		return true;
	} catch (e) {
		console.error('[DB Error] updateWrongRecord:', e);
		throw e;
	}
}

export async function deleteWrongRecord(db: D1Database, questionId: number): Promise<boolean> {
	try {
		await db.prepare('DELETE FROM wrong_book WHERE questionId = ?').bind(questionId).run();
		return true;
	} catch (e) {
		console.error('[DB Error] deleteWrongRecord:', e);
		throw e;
	}
}

export async function clearWrongBook(db: D1Database): Promise<boolean> {
	try {
		await db.prepare('DELETE FROM wrong_book').run();
		return true;
	} catch (e) {
		console.error('[DB Error] clearWrongBook:', e);
		throw e;
	}
}

// 3. QUIZ HISTORY
export async function getQuizHistory(db: D1Database): Promise<QuizHistory[]> {
	try {
		const { results } = await db.prepare('SELECT * FROM quiz_history ORDER BY id ASC').all();
		return (results || []).map((row: any) => ({
			questionId: row.questionId,
			selected: JSON.parse(row.selected),
			correct: row.correct === 1,
			time: row.time
		}));
	} catch (e) {
		console.error('[DB Error] getQuizHistory:', e);
		throw e;
	}
}

export async function insertQuizHistory(db: D1Database, history: QuizHistory): Promise<boolean> {
	try {
		await db.prepare(
			`INSERT INTO quiz_history (questionId, selected, correct, time) 
			 VALUES (?, ?, ?, ?)`
		).bind(
			history.questionId,
			JSON.stringify(history.selected),
			history.correct ? 1 : 0,
			history.time
		).run();
		return true;
	} catch (e) {
		console.error('[DB Error] insertQuizHistory:', e);
		throw e;
	}
}

// 4. SESSION PROGRESS
export async function getSessionProgress(db: D1Database): Promise<SessionProgress | null> {
	try {
		const row: any = await db.prepare('SELECT * FROM session_progress WHERE id = 1').first();
		if (!row) return null;

		return {
			currentIndex: row.currentIndex,
			exerciseMode: row.exerciseMode as any,
			activeQuestionIds: JSON.parse(row.activeQuestionIds),
			submitted: row.submitted === 1,
			selectedAnswers: JSON.parse(row.selectedAnswers)
		};
	} catch (e) {
		console.error('[DB Error] getSessionProgress:', e);
		throw e;
	}
}

export async function saveSessionProgress(db: D1Database, progress: SessionProgress): Promise<boolean> {
	try {
		await db.prepare(
			`INSERT INTO session_progress (id, currentIndex, exerciseMode, activeQuestionIds, submitted, selectedAnswers) 
			 VALUES (1, ?, ?, ?, ?, ?) 
			 ON CONFLICT(id) 
			 DO UPDATE SET 
			 	currentIndex = excluded.currentIndex, 
				exerciseMode = excluded.exerciseMode, 
				activeQuestionIds = excluded.activeQuestionIds, 
				submitted = excluded.submitted, 
				selectedAnswers = excluded.selectedAnswers`
		).bind(
			progress.currentIndex,
			progress.exerciseMode,
			JSON.stringify(progress.activeQuestionIds),
			progress.submitted ? 1 : 0,
			JSON.stringify(progress.selectedAnswers)
		).run();
		return true;
	} catch (e) {
		console.error('[DB Error] saveSessionProgress:', e);
		throw e;
	}
}

export async function clearSessionProgress(db: D1Database): Promise<boolean> {
	try {
		await db.prepare('DELETE FROM session_progress WHERE id = 1').run();
		return true;
	} catch (e) {
		console.error('[DB Error] clearSessionProgress:', e);
		throw e;
	}
}

export async function initializeDatabase(db: D1Database): Promise<void> {
	const schema = `
		CREATE TABLE IF NOT EXISTS questions (
			id INTEGER PRIMARY KEY,
			type TEXT CHECK(type IN ('single', 'multiple')) NOT NULL,
			title TEXT NOT NULL,
			options TEXT NOT NULL,
			answer TEXT NOT NULL,
			explanation TEXT NOT NULL,
			difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')) NOT NULL,
			category TEXT NOT NULL,
			knowledgeTags TEXT
		);

		CREATE TABLE IF NOT EXISTS wrong_book (
			questionId INTEGER PRIMARY KEY,
			count INTEGER NOT NULL DEFAULT 1,
			wrongCount INTEGER NOT NULL DEFAULT 1,
			lastWrongTime TEXT NOT NULL,
			FOREIGN KEY(questionId) REFERENCES questions(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS quiz_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			questionId INTEGER NOT NULL,
			selected TEXT NOT NULL,
			correct INTEGER NOT NULL,
			time TEXT NOT NULL,
			FOREIGN KEY(questionId) REFERENCES questions(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS session_progress (
			id INTEGER PRIMARY KEY DEFAULT 1,
			currentIndex INTEGER NOT NULL,
			exerciseMode TEXT NOT NULL,
			activeQuestionIds TEXT NOT NULL,
			submitted INTEGER NOT NULL,
			selectedAnswers TEXT NOT NULL
		);
	`;
	console.log('[DB] Running auto-initialization schema...');
	await db.exec(schema);
	console.log('[DB] Auto-initialization schema completed successfully.');
}

