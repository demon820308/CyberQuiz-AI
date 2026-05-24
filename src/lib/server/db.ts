import type { Question, WrongRecord, QuizHistory, SessionProgress, User } from '../types';
import type { KnowledgeQuestion } from '../data/knowledgeQuestions';

/**
 * Cloudflare D1 Database Access Layer for CyberQuiz AI
 */

// 0. USER AUTHENTICATION AND REGISTRATION
export async function getUser(db: D1Database, username: string): Promise<User | null> {
	try {
		const row: any = await db.prepare('SELECT * FROM users WHERE username = ?').bind(username.trim().toLowerCase()).first();
		if (!row) return null;
		return {
			username: row.username,
			nickname: row.nickname,
			passwordHash: row.password,
			createdAt: row.created_at,
			role: row.role
		};
	} catch (e) {
		console.error('[DB Error] getUser:', e);
		throw e;
	}
}

export async function createUser(db: D1Database, user: Required<User>): Promise<boolean> {
	try {
		await db.prepare(
			`INSERT INTO users (username, nickname, password, role, created_at) 
			 VALUES (?, ?, ?, ?, ?)`
		).bind(
			user.username.trim().toLowerCase(),
			user.nickname.trim(),
			user.passwordHash,
			user.role || 'user',
			user.createdAt || new Date().toISOString()
		).run();
		return true;
	} catch (e) {
		console.error('[DB Error] createUser:', e);
		throw e;
	}
}

// 1. QUESTIONS
export async function getAllQuestions(db: D1Database, bankId?: number): Promise<Question[]> {
	try {
		let query = 'SELECT * FROM questions';
		let bindParams: any[] = [];
		if (bankId !== undefined) {
			query += ' WHERE bank_id = ?';
			bindParams.push(bankId);
		}
		query += ' ORDER BY id ASC';
		
		const stmt = db.prepare(query);
		const { results } = await (bindParams.length > 0 ? stmt.bind(...bindParams) : stmt).all();
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
		// Find default bank ID
		const defaultBank: any = await db.prepare("SELECT id FROM question_banks WHERE name = '默认编程题库'").first();
		const bankId = defaultBank ? defaultBank.id : null;

		// D1 transaction/batch replacement of questions in this bank
		const statements = [
			db.prepare('DELETE FROM questions WHERE bank_id = ? OR bank_id IS NULL').bind(bankId)
		];

		for (const q of questions) {
			statements.push(
				db.prepare(
					`INSERT INTO questions (id, bank_id, type, title, options, answer, explanation, difficulty, category, knowledgeTags) 
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
				).bind(
					q.id,
					bankId,
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
export async function getWrongRecords(db: D1Database, username: string): Promise<WrongRecord[]> {
	try {
		const { results } = await db.prepare('SELECT * FROM wrong_book WHERE username = ?').bind(username.trim().toLowerCase()).all();
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

export async function updateWrongRecord(db: D1Database, username: string, record: WrongRecord): Promise<boolean> {
	try {
		await db.prepare(
			`INSERT INTO wrong_book (username, questionId, count, wrongCount, lastWrongTime) 
			 VALUES (?, ?, ?, ?, ?) 
			 ON CONFLICT(username, questionId) 
			 DO UPDATE SET 
			 	count = excluded.count, 
				wrongCount = excluded.wrongCount, 
				lastWrongTime = excluded.lastWrongTime`
		).bind(
			username.trim().toLowerCase(),
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

export async function deleteWrongRecord(db: D1Database, username: string, questionId: number): Promise<boolean> {
	try {
		await db.prepare('DELETE FROM wrong_book WHERE username = ? AND questionId = ?')
			.bind(username.trim().toLowerCase(), questionId)
			.run();
		return true;
	} catch (e) {
		console.error('[DB Error] deleteWrongRecord:', e);
		throw e;
	}
}

export async function clearWrongBook(db: D1Database, username: string): Promise<boolean> {
	try {
		await db.prepare('DELETE FROM wrong_book WHERE username = ?').bind(username.trim().toLowerCase()).run();
		return true;
	} catch (e) {
		console.error('[DB Error] clearWrongBook:', e);
		throw e;
	}
}

// 3. QUIZ HISTORY
export async function getQuizHistory(db: D1Database, username: string): Promise<QuizHistory[]> {
	try {
		const { results } = await db.prepare('SELECT * FROM quiz_history WHERE username = ? ORDER BY id ASC')
			.bind(username.trim().toLowerCase())
			.all();
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

export async function insertQuizHistory(db: D1Database, username: string, history: QuizHistory): Promise<boolean> {
	try {
		await db.prepare(
			`INSERT INTO quiz_history (username, questionId, selected, correct, time) 
			 VALUES (?, ?, ?, ?, ?)`
		).bind(
			username.trim().toLowerCase(),
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
export async function getSessionProgress(db: D1Database, username: string): Promise<SessionProgress | null> {
	try {
		const row: any = await db.prepare('SELECT * FROM session_progress WHERE username = ?').bind(username.trim().toLowerCase()).first();
		if (!row) return null;

		return {
			currentIndex: row.currentIndex,
			exerciseMode: row.exerciseMode as any,
			activeQuestionIds: JSON.parse(row.activeQuestionIds),
			submitted: row.submitted === 1,
			selectedAnswers: JSON.parse(row.selectedAnswers),
			active_bank_id: row.active_bank_id
		};
	} catch (e) {
		console.error('[DB Error] getSessionProgress:', e);
		throw e;
	}
}

export async function saveSessionProgress(db: D1Database, username: string, progress: SessionProgress): Promise<boolean> {
	try {
		await db.prepare(
			`INSERT INTO session_progress (username, currentIndex, exerciseMode, activeQuestionIds, submitted, selectedAnswers, active_bank_id) 
			 VALUES (?, ?, ?, ?, ?, ?, ?) 
			 ON CONFLICT(username) 
			 DO UPDATE SET 
			 	currentIndex = excluded.currentIndex, 
				exerciseMode = excluded.exerciseMode, 
				activeQuestionIds = excluded.activeQuestionIds, 
				submitted = excluded.submitted, 
				selectedAnswers = excluded.selectedAnswers,
				active_bank_id = COALESCE(excluded.active_bank_id, session_progress.active_bank_id)`
		).bind(
			username.trim().toLowerCase(),
			progress.currentIndex,
			progress.exerciseMode,
			JSON.stringify(progress.activeQuestionIds),
			progress.submitted ? 1 : 0,
			JSON.stringify(progress.selectedAnswers),
			progress.active_bank_id !== undefined ? progress.active_bank_id : null
		).run();
		return true;
	} catch (e) {
		console.error('[DB Error] saveSessionProgress:', e);
		throw e;
	}
}

export async function clearSessionProgress(db: D1Database, username: string): Promise<boolean> {
	try {
		await db.prepare('DELETE FROM session_progress WHERE username = ?').bind(username.trim().toLowerCase()).run();
		return true;
	} catch (e) {
		console.error('[DB Error] clearSessionProgress:', e);
		throw e;
	}
}

export async function initializeDatabase(db: D1Database): Promise<void> {
	console.log('[DB] Running auto-initialization schema and migrations...');
	
	// 1. Create base tables
	const baseSchema = `
		CREATE TABLE IF NOT EXISTS users (
			username TEXT PRIMARY KEY,
			nickname TEXT NOT NULL,
			password TEXT NOT NULL,
			role TEXT CHECK(role IN ('user', 'admin')) DEFAULT 'user',
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS question_banks (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			creator TEXT NOT NULL,
			is_global INTEGER DEFAULT 0,
			created_at TEXT NOT NULL,
			FOREIGN KEY(creator) REFERENCES users(username) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS questions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			bank_id INTEGER,
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
			username TEXT NOT NULL,
			questionId INTEGER NOT NULL,
			count INTEGER NOT NULL DEFAULT 1,
			wrongCount INTEGER NOT NULL DEFAULT 1,
			lastWrongTime TEXT NOT NULL,
			PRIMARY KEY(username, questionId),
			FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE,
			FOREIGN KEY(questionId) REFERENCES questions(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS quiz_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL,
			questionId INTEGER NOT NULL,
			selected TEXT NOT NULL,
			correct INTEGER NOT NULL,
			time TEXT NOT NULL,
			FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE,
			FOREIGN KEY(questionId) REFERENCES questions(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS session_progress (
			username TEXT PRIMARY KEY,
			currentIndex INTEGER NOT NULL,
			exerciseMode TEXT NOT NULL,
			activeQuestionIds TEXT NOT NULL,
			submitted INTEGER NOT NULL,
			selectedAnswers TEXT NOT NULL,
			active_bank_id INTEGER,
			FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS knowledge_questions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			semester TEXT NOT NULL,
			subject TEXT NOT NULL,
			tag TEXT NOT NULL,
			difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')) NOT NULL,
			content TEXT NOT NULL,
			standardAnswer TEXT NOT NULL,
			logicalStructure TEXT NOT NULL,
			keywords TEXT NOT NULL,
			mnemonic TEXT NOT NULL
		);
	`;

	// Cloudflare D1 exec() executes the entire SQL script directly, preserving formatting and semicolons.
	await db.exec(baseSchema);

	// 2. Perform safe alterations for existing database migrations
	try {
		await db.exec("ALTER TABLE users ADD COLUMN role TEXT CHECK(role IN ('user', 'admin')) DEFAULT 'user';");
	} catch (e) {
		// Ignore if column already exists
	}
	try {
		await db.exec("ALTER TABLE questions ADD COLUMN bank_id INTEGER;");
	} catch (e) {
		// Ignore if column already exists
	}
	try {
		await db.exec("ALTER TABLE session_progress ADD COLUMN active_bank_id INTEGER;");
	} catch (e) {
		// Ignore if column already exists
	}
	try {
		await db.exec("ALTER TABLE wrong_book ADD COLUMN username TEXT NOT NULL DEFAULT 'local_default';");
	} catch (e) {
		// Ignore if column already exists
	}
	try {
		await db.exec("ALTER TABLE quiz_history ADD COLUMN username TEXT NOT NULL DEFAULT 'local_default';");
	} catch (e) {
		// Ignore if column already exists
	}

	// 3. Seed default admin account if it does not exist
	// Password is 'admin888' (hash: b409db24147c4fad753c13335eb705f4844b1c40cd5048363af32dcb48e58469)
	try {
		const adminUser = await db.prepare('SELECT 1 FROM users WHERE username = ?').bind('admin').first();
		if (!adminUser) {
			await db.prepare(
				`INSERT INTO users (username, nickname, password, role, created_at) 
				 VALUES ('admin', '超级管理员', 'b409db24147c4fad753c13335eb705f4844b1c40cd5048363af32dcb48e58469', 'admin', ?)`
			).bind(new Date().toISOString()).run();
			console.log('[DB] Default admin account successfully created.');
		}
	} catch (err) {
		console.error('[DB] Failed to seed default admin:', err);
	}

	// 4. Create default public question bank if none exists
	try {
		const countBanks: any = await db.prepare('SELECT COUNT(*) as cnt FROM question_banks').first();
		if (!countBanks || countBanks.cnt === 0) {
			await db.prepare(
				`INSERT INTO question_banks (name, creator, is_global, created_at) 
				 VALUES ('默认编程题库', 'admin', 1, ?)`
			).bind(new Date().toISOString()).run();
			
			// Migrate all orphaned questions into this new default question bank
			const defaultBank: any = await db.prepare('SELECT id FROM question_banks WHERE name = ?').bind('默认编程题库').first();
			if (defaultBank && defaultBank.id) {
				await db.prepare('UPDATE questions SET bank_id = ? WHERE bank_id IS NULL').bind(defaultBank.id).run();
				console.log(`[DB] Created default question bank and migrated questions into bank ID: ${defaultBank.id}`);
			}
		}
	} catch (err) {
		console.error('[DB] Failed to seed default question bank:', err);
	}

	console.log('[DB] Auto-initialization schema completed successfully.');
}

// 5. KNOWLEDGE QUESTIONS
export async function getAllKnowledgeQuestions(db: D1Database): Promise<KnowledgeQuestion[]> {
	try {
		const { results } = await db.prepare('SELECT * FROM knowledge_questions ORDER BY id ASC').all();
		return (results || []).map((row: any) => ({
			id: row.id,
			semester: row.semester,
			subject: row.subject,
			tag: row.tag,
			difficulty: row.difficulty as 'easy' | 'medium' | 'hard',
			content: row.content,
			standardAnswer: row.standardAnswer,
			logicalStructure: row.logicalStructure,
			keywords: JSON.parse(row.keywords),
			mnemonic: JSON.parse(row.mnemonic)
		}));
	} catch (e) {
		console.error('[DB Error] getAllKnowledgeQuestions:', e);
		throw e;
	}
}

export async function insertKnowledgeQuestionsBatch(
	db: D1Database,
	questions: Omit<KnowledgeQuestion, 'id'>[]
): Promise<boolean> {
	try {
		const statements = [];
		for (const q of questions) {
			statements.push(
				db.prepare(
					`INSERT INTO knowledge_questions (semester, subject, tag, difficulty, content, standardAnswer, logicalStructure, keywords, mnemonic)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
				).bind(
					q.semester,
					q.subject,
					q.tag,
					q.difficulty,
					q.content,
					q.standardAnswer,
					q.logicalStructure,
					JSON.stringify(q.keywords || []),
					JSON.stringify(q.mnemonic || {})
				)
			);
		}

		if (statements.length > 0) {
			await db.batch(statements);
		}
		return true;
	} catch (e) {
		console.error('[DB Error] insertKnowledgeQuestionsBatch:', e);
		throw e;
	}
}

export async function deleteKnowledgeQuestion(db: D1Database, id: number): Promise<boolean> {
	try {
		await db.prepare('DELETE FROM knowledge_questions WHERE id = ?').bind(id).run();
		return true;
	} catch (e) {
		console.error('[DB Error] deleteKnowledgeQuestion:', e);
		throw e;
	}
}

// 6. QUESTION BANKS & ADMIN USER MANAGEMENT
export async function getQuestionBanks(db: D1Database, username: string): Promise<any[]> {
	try {
		const cleanUser = username.trim().toLowerCase();
		const { results } = await db.prepare(
			'SELECT * FROM question_banks WHERE is_global = 1 OR creator = ? ORDER BY id ASC'
		).bind(cleanUser).all();
		return results || [];
	} catch (e) {
		console.error('[DB Error] getQuestionBanks:', e);
		throw e;
	}
}

export async function createQuestionBank(db: D1Database, name: string, username: string, isGlobal: number): Promise<number> {
	try {
		const cleanUser = username.trim().toLowerCase();
		await db.prepare(
			`INSERT INTO question_banks (name, creator, is_global, created_at) 
			 VALUES (?, ?, ?, ?)`
		).bind(
			name.trim(),
			cleanUser,
			isGlobal ? 1 : 0,
			new Date().toISOString()
		).run();
		
		// In D1, we can query last_insert_rowid()
		const row: any = await db.prepare('SELECT last_insert_rowid() as id').first();
		return row ? row.id : 0;
	} catch (e) {
		console.error('[DB Error] createQuestionBank:', e);
		throw e;
	}
}

export async function deleteQuestionBank(db: D1Database, id: number, username: string): Promise<boolean> {
	try {
		const cleanUser = username.trim().toLowerCase();
		// If admin, they can delete any bank. If user, they can only delete their own.
		const userRow = await getUser(db, cleanUser);
		if (userRow && userRow.role === 'admin') {
			await db.prepare('DELETE FROM question_banks WHERE id = ?').bind(id).run();
		} else {
			await db.prepare('DELETE FROM question_banks WHERE id = ? AND creator = ?').bind(id, cleanUser).run();
		}
		return true;
	} catch (e) {
		console.error('[DB Error] deleteQuestionBank:', e);
		throw e;
	}
}

export async function getAllQuestionsInBank(db: D1Database, bankId: number): Promise<Question[]> {
	try {
		const { results } = await db.prepare('SELECT * FROM questions WHERE bank_id = ? ORDER BY id ASC').bind(bankId).all();
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
		console.error('[DB Error] getAllQuestionsInBank:', e);
		throw e;
	}
}

export async function insertQuestionsToBankBatch(db: D1Database, bankId: number, questions: Question[]): Promise<boolean> {
	try {
		const statements = [];
		for (const q of questions) {
			statements.push(
				db.prepare(
					`INSERT INTO questions (bank_id, type, title, options, answer, explanation, difficulty, category, knowledgeTags) 
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
				).bind(
					bankId,
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

		if (statements.length > 0) {
			await db.batch(statements);
		}
		return true;
	} catch (e) {
		console.error('[DB Error] insertQuestionsToBankBatch:', e);
		throw e;
	}
}

export async function getAllUsers(db: D1Database): Promise<User[]> {
	try {
		const { results } = await db.prepare('SELECT username, nickname, role, created_at FROM users ORDER BY created_at DESC').all();
		return (results || []).map((row: any) => ({
			username: row.username,
			nickname: row.nickname,
			role: row.role,
			createdAt: row.created_at
		}));
	} catch (e) {
		console.error('[DB Error] getAllUsers:', e);
		throw e;
	}
}

export async function deleteUser(db: D1Database, username: string): Promise<boolean> {
	try {
		const cleanUser = username.trim().toLowerCase();
		if (cleanUser === 'admin') {
			throw new Error('Cannot delete admin account');
		}
		await db.prepare('DELETE FROM users WHERE username = ?').bind(cleanUser).run();
		return true;
	} catch (e) {
		console.error('[DB Error] deleteUser:', e);
		throw e;
	}
}

export async function updateUserPassword(db: D1Database, username: string, passwordHash: string): Promise<boolean> {
	try {
		const cleanUser = username.trim().toLowerCase();
		await db.prepare('UPDATE users SET password = ? WHERE username = ?').bind(passwordHash, cleanUser).run();
		return true;
	} catch (e) {
		console.error('[DB Error] updateUserPassword:', e);
		throw e;
	}
}

