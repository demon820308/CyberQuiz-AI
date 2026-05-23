import { browser } from '$app/environment';
import type { Question, ExerciseMode, WrongRecord, QuizHistory, SessionProgress } from './types';
import type { KnowledgeQuestion } from './data/knowledgeQuestions';
import { parseMarkdown } from './utils/mdParser';

// Default Python questions with enhanced tags
const defaultQuestions: Question[] = [
	{
		id: 1,
		type: 'multiple',
		title: '以下哪些是 Python 的核心特性？',
		options: {
			A: '简单易读的语法',
			B: '动态类型',
			C: '面向对象编程',
			D: '编译型语言'
		},
		answer: ['A', 'B', 'C'],
		explanation: 'Python 是一种高级编程语言，核心特性包括：\n\n1. **简单易读的语法**：Python 强调代码的可读性，采用缩进块结构。\n2. **动态类型**：变量不需要显式声明类型，在运行时自动确定。\n3. **面向对象**：全面支持 OOP（类与对象）。\n4. **解释型**：Python 是解释型语言，而不是编译型语言。虽然它是动态类型的，但“编译型”绝对不属于其特性。',
		difficulty: 'medium',
		category: 'Python基础',
		knowledgeTags: ['Python基础', '语言特性', 'OOP']
	},
	{
		id: 2,
		type: 'single',
		title: '以下哪个不是 Python 的内置数据类型？',
		options: {
			A: 'list',
			B: 'dict',
			C: 'set',
			D: 'array'
		},
		answer: ['D'],
		explanation: 'Python 的内置数据类型包括 `list` (列表)、`dict` (字典)、`set` (集合)、`tuple` (元组)、`str` (字符串) 等。\n\n`array` (数组) 在 standard library 中作为一个模块存在 (需要 `import array`)，而不是内置的基本数据类型。',
		difficulty: 'easy',
		category: '数据结构',
		knowledgeTags: ['数据结构', '内置类型', '基础概念']
	},
	{
		id: 3,
		type: 'multiple',
		title: '关于面向对象编程，以下哪些说法正确？',
		options: {
			A: '类是对象的模板，对象是类的实例',
			B: 'Python 支持类的单继承和多继承',
			C: 'Python 中所有类默认继承自 BaseClass',
			D: '构造函数是 __init__，析构函数是 __del__'
		},
		answer: ['A', 'B', 'D'],
		explanation: '面向对象编程中：\n\n- **A 正确**：类定义了模板，对象是根据模板实例化的具体实体。\n- **B 正确**：Python 支持多重继承 (Multiple Inheritance)。\n- **C 错误**：在 Python 3 中，所有类默认继承自基类 `object`，而不是 `BaseClass`。\n- **D 正确**：`__init__` 为构造函数，`__del__` 为析构方法。',
		difficulty: 'medium',
		category: '面向对象',
		knowledgeTags: ['面向对象', 'OOP', '类与对象']
	},
	{
		id: 4,
		type: 'single',
		title: '执行以下 Python 代码后，最后一行 f(2) 的返回值是什么？\n```python\ndef f(x, l=[]):\n    l.append(x)\n    return l\nf(1)\nprint(f(2))\n```',
		options: {
			A: '[1, 2]',
			B: '[2]',
			C: 'TypeError',
			D: 'None'
		},
		answer: ['A'],
		explanation: '这是一个经典的 Python 陷阱（默认参数的求值时机）。\n\n在 Python 中，函数的默认参数是在函数定义时（定义期）求值的，而不是在调用时求值的。这意味着 `l=[]` 作为默认参数，是在编译函数时创建的一个列表对象。所有没有提供 `l` 参数的函数调用，都会共享同一个列表对象。\n\n1. 首次调用 `f(1)` 时，将 `1` 追加到共享列表，列表变为 `[1]`。\n2. 第二次调用 `f(2)` 时，将 `2` 追加到同一个共享列表，列表变为 `[1, 2]`。\n\n因此，f(2) 返回 `[1, 2]`。',
		difficulty: 'hard',
		category: '进阶特性',
		knowledgeTags: ['进阶特性', '默认参数', '易错陷阱']
	},
	{
		id: 5,
		type: 'multiple',
		title: '以下哪些是列表 (list) 的内置方法？',
		options: {
			A: 'append()',
			B: 'extend()',
			C: 'add()',
			D: 'pop()'
		},
		answer: ['A', 'B', 'D'],
		explanation: 'Python 列表中：\n\n- `append(x)`：在列表末尾添加一个元素。\n- `extend(iterable)`：将可迭代对象的元素追加到列表末尾。\n- `pop([i])`：删除并返回指定位置 of 元素。\n- `add(x)` 不是列表的方法，它是**集合 (set)** 用来添加元素的方法。',
		difficulty: 'easy',
		category: '数据结构',
		knowledgeTags: ['数据结构', '列表操作', '内置方法']
	},
	{
		id: 6,
		type: 'single',
		title: '在 Python 中，以下哪个关键字用于定义函数？',
		options: {
			A: 'func',
			B: 'function',
			C: 'def',
			D: 'define'
		},
		answer: ['C'],
		explanation: '在 Python 中，使用 `def` 关键字来声明和定义函数。\n\n例如：\n```python\ndef my_function():\n    return "hello"\n```\n`function` 用于 JavaScript，`func` 常用于 Go/Swift。',
		difficulty: 'easy',
		category: 'Python基础',
		knowledgeTags: ['Python基础', '语法基础', '函数声明']
	},
	{
		id: 7,
		type: 'multiple',
		title: '关于异常处理，以下哪些说法正确？',
		options: {
			A: '可以使用 try-except-else-finally 结构',
			B: '一个 try 块后可以有多个 except 块进行捕获',
			C: 'raise 关键字用于手动抛出异常',
			D: 'except 块如果不指定任何异常类型，则默认捕获所有异常'
		},
		answer: ['A', 'B', 'C', 'D'],
		explanation: 'Python 的异常处理机制非常灵活：\n\n- **A 正确**：`else` 块在没有发生异常时执行，`finally` 块无论是否发生异常都会执行。\n- **B 正确**：可以使用多个 `except` 捕获不同类型的异常。\n- **C 正确**：`raise Exception("msg")` 手动抛出。\n- **D 正确**：空 `except:` 相当于 `except BaseException:`，会捕获所有异常（不推荐在生产中这样做，因为它会捕获 SystemExit 等 system 信号）。',
		difficulty: 'medium',
		category: '异常处理',
		knowledgeTags: ['异常处理', '异常捕获', '程序控制']
	}
];

class QuizStore {
	// Svelte 5 States
	questions = $state<Question[]>([]);
	wrongBook = $state<WrongRecord[]>([]);
	history = $state<QuizHistory[]>([]);
	knowledgeQuestions = $state<KnowledgeQuestion[]>([]);

	// Current quiz session state
	currentIndex = $state(0);
	selectedAnswers = $state<string[]>([]);
	submitted = $state(false);
	exerciseMode = $state<ExerciseMode>('sequential');
	activeQuestions = $state<Question[]>([]);

	// Progress state
	hasSavedProgress = $state(false);
	savedSessionDetails = $state<{
		currentIndex: number;
		questionNumber: number;
		totalQuestions: number;
		mode: ExerciseMode;
	} | null>(null);
	isD1 = $state(false);
	dbError = $state<string | null>(null);
	hydrated = $state(false);

	// Global Toast State
	toastMessage = $state<string | null>(null);
	toastType = $state<'success' | 'error'>('success');
	toastTimer: any = null;

	constructor() {
		this.loadFromStorage();
	}

	showToast(message: string, type: 'success' | 'error' = 'success') {
		if (this.toastTimer) clearTimeout(this.toastTimer);
		this.toastMessage = message;
		this.toastType = type;
		this.toastTimer = setTimeout(() => {
			this.toastMessage = null;
		}, 3000);
	}

	async hydrate(data: any) {
		this.isD1 = !!data.isD1;
		this.dbError = data.dbError || null;
		
		if (this.isD1 && !this.dbError) {
			if (data.questions && data.questions.length > 0) {
				this.questions = data.questions;
			} else {
				// Seed default questions to D1 so user is wowed at first glance!
				this.questions = [...defaultQuestions];
				try {
					const res = await fetch('/api/questions', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(defaultQuestions)
					});
					if (!res.ok) {
						const errData: any = await res.json().catch(() => ({}));
						console.error('Failed to seed default questions to D1:', errData.error || res.statusText);
					}
				} catch (e) {
					console.error('Failed to seed default questions to D1:', e);
				}
			}

			this.wrongBook = data.wrongBook || [];
			this.history = data.history || [];

			// Hydrate session progress if exists
			if (data.progress) {
				const progress = data.progress;
				const idSet = new Set(progress.activeQuestionIds);
				const matchingQuestions = this.questions.filter(q => idSet.has(q.id));
				const orderedQuestions: Question[] = [];
				progress.activeQuestionIds.forEach((id: number) => {
					const found = matchingQuestions.find(q => q.id === id);
					if (found) orderedQuestions.push(found);
				});

				if (orderedQuestions.length > 0) {
					this.activeQuestions = orderedQuestions;
					this.currentIndex = progress.currentIndex;
					this.exerciseMode = progress.exerciseMode;
					this.submitted = progress.submitted;
					this.selectedAnswers = progress.selectedAnswers;
					this.hasSavedProgress = true;
					this.savedSessionDetails = {
						currentIndex: progress.currentIndex,
						questionNumber: progress.currentIndex + 1,
						totalQuestions: progress.activeQuestionIds.length,
						mode: progress.exerciseMode
					};
				} else {
					this.hasSavedProgress = false;
					this.savedSessionDetails = null;
				}
			} else {
				this.hasSavedProgress = false;
				this.savedSessionDetails = null;
			}
		} else {
			this.loadFromStorage();
		}
		this.hydrated = true;
	}

	loadFromStorage() {
		if (!browser) return;

		// Load questions
		const savedQuestions = localStorage.getItem('cq_questions');
		if (savedQuestions) {
			try {
				this.questions = JSON.parse(savedQuestions);
			} catch (e) {
				console.error('Failed to parse saved questions, resetting default', e);
				this.questions = [...defaultQuestions];
			}
		} else {
			this.questions = [...defaultQuestions];
			localStorage.setItem('cq_questions', JSON.stringify(defaultQuestions));
		}

		// Load wrong book
		const savedWrong = localStorage.getItem('cq_wrong_book');
		if (savedWrong) {
			try {
				this.wrongBook = JSON.parse(savedWrong);
			} catch (e) {
				console.error('Failed to parse wrong book', e);
				this.wrongBook = [];
			}
		}

		// Load history
		const savedHistory = localStorage.getItem('cq_history');
		if (savedHistory) {
			try {
				this.history = JSON.parse(savedHistory);
			} catch (e) {
				console.error('Failed to parse history', e);
				this.history = [];
			}
		}

		// Load knowledge questions
		const savedKQ = localStorage.getItem('cq_knowledge_questions');
		if (savedKQ) {
			try {
				this.knowledgeQuestions = JSON.parse(savedKQ);
			} catch (e) {
				console.error('Failed to parse saved knowledge questions', e);
				this.knowledgeQuestions = [];
			}
		} else {
			this.knowledgeQuestions = [];
		}

		// Check saved session progress
		const savedProgress = localStorage.getItem('cq_session_progress');
		if (savedProgress) {
			this.hasSavedProgress = true;
			try {
				const progress: SessionProgress = JSON.parse(savedProgress);
				this.savedSessionDetails = {
					currentIndex: progress.currentIndex,
					questionNumber: progress.currentIndex + 1,
					totalQuestions: progress.activeQuestionIds.length,
					mode: progress.exerciseMode
				};
			} catch (e) {
				this.savedSessionDetails = null;
			}
		} else {
			this.hasSavedProgress = false;
			this.savedSessionDetails = null;
		}
	}

	async saveQuestions() {
		if (!browser) return;
		localStorage.setItem('cq_questions', JSON.stringify(this.questions));
		if (this.isD1 && !this.dbError) {
			try {
				const res = await fetch('/api/questions', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(this.questions)
				});
				if (!res.ok) {
					const errData: any = await res.json().catch(() => ({}));
					throw new Error(errData.error || 'Database upload failed');
				}
			} catch (e: any) {
				console.error('[Sync Error] saveQuestions:', e);
				this.showToast(`同步题库到云端数据库失败: ${e.message || '网络错误'}，将使用本地缓存`, 'error');
			}
		}
	}

	saveWrongBook() {
		if (!browser) return;
		localStorage.setItem('cq_wrong_book', JSON.stringify(this.wrongBook));
	}

	saveHistory() {
		if (!browser) return;
		localStorage.setItem('cq_history', JSON.stringify(this.history));
	}

	// Session Progress Saving
	saveSessionProgress() {
		if (!browser) return;

		const progress: SessionProgress = {
			currentIndex: this.currentIndex,
			exerciseMode: this.exerciseMode,
			activeQuestionIds: this.activeQuestions.map(q => q.id),
			submitted: this.submitted,
			selectedAnswers: this.selectedAnswers
		};
		localStorage.setItem('cq_session_progress', JSON.stringify(progress));
		this.hasSavedProgress = true;
		this.savedSessionDetails = {
			currentIndex: this.currentIndex,
			questionNumber: this.currentIndex + 1,
			totalQuestions: this.activeQuestions.length,
			mode: this.exerciseMode
		};

		if (this.isD1 && !this.dbError) {
			fetch('/api/quiz/progress', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(progress)
			}).catch(e => console.error('[Sync Error] saveSessionProgress:', e));
		}
	}

	clearSessionProgress() {
		if (!browser) return;
		localStorage.removeItem('cq_session_progress');
		this.hasSavedProgress = false;
		this.savedSessionDetails = null;

		if (this.isD1 && !this.dbError) {
			fetch('/api/quiz/progress', {
				method: 'DELETE'
			}).catch(e => console.error('[Sync Error] clearSessionProgress:', e));
		}
	}

	resumeSessionProgress(): boolean {
		if (!browser) return false;

		const progressStr = localStorage.getItem('cq_session_progress');
		if (!progressStr) return false;

		try {
			const progress: SessionProgress = JSON.parse(progressStr);

			// Reconstruct active questions list using saved IDs
			const idSet = new Set(progress.activeQuestionIds);

			// If questions are not loaded yet, wait. Do NOT clear progress.
			if (this.questions.length === 0) {
				return false;
			}

			const matchingQuestions = this.questions.filter(q => idSet.has(q.id));

			// Keep the exact same order as saved IDs
			const orderedQuestions: Question[] = [];
			progress.activeQuestionIds.forEach(id => {
				const found = matchingQuestions.find(q => q.id === id);
				if (found) orderedQuestions.push(found);
			});

			if (orderedQuestions.length === 0) {
				// Only clear progress if we are fully hydrated and have actual questions,
				// meaning we know for sure that these saved question IDs are invalid/deleted.
				if (!this.isD1 || this.hydrated) {
					this.clearSessionProgress();
				}
				return false;
			}

			this.activeQuestions = orderedQuestions;
			this.currentIndex = progress.currentIndex;
			this.exerciseMode = progress.exerciseMode;
			this.submitted = progress.submitted;
			this.selectedAnswers = progress.selectedAnswers;

			this.showToast('成功恢复上次练习进度', 'success');
			return true;
		} catch (e) {
			console.error('Failed to parse saved session progress', e);
			this.clearSessionProgress();
			return false;
		}
	}

	// Actions
	uploadMarkdown(mdContent: string): boolean {
		try {
			const parsed = parseMarkdown(mdContent);
			if (parsed.length > 0) {
				this.questions = parsed;
				this.saveQuestions();
				this.initSession(this.exerciseMode);
				this.clearSessionProgress(); // Clear old progress
				this.showToast(`成功解析并导入 ${parsed.length} 道题目！`, 'success');
				return true;
			}
		} catch (e) {
			console.error('Failed to parse uploaded Markdown', e);
		}
		this.showToast('解析失败，请检查 Markdown 格式', 'error');
		return false;
	}

	async importPepQuestions(pepQuestions: Question[]) {
		const existingIds = new Set(this.questions.map(q => q.id));
		const toAdd = pepQuestions.filter(q => !existingIds.has(q.id));
		
		if (toAdd.length === 0) {
			this.showToast('道德与法治题库已在当前题库中！', 'success');
			return;
		}
		
		this.questions = [...this.questions, ...toAdd];
		await this.saveQuestions();
		this.initSession(this.exerciseMode);
		this.clearSessionProgress();
		this.showToast(`成功合并导入 ${toAdd.length} 道道德与法治题目！`, 'success');
	}

	addKnowledgeQuestions(newQuestions: Omit<KnowledgeQuestion, 'id'>[]) {
		if (!browser) return;
		const maxId = this.knowledgeQuestions.reduce((max, q) => Math.max(max, q.id), 0);
		const mapped = newQuestions.map((q, idx) => ({
			...q,
			id: maxId + idx + 1
		})) as KnowledgeQuestion[];
		this.knowledgeQuestions = [...this.knowledgeQuestions, ...mapped];
		localStorage.setItem('cq_knowledge_questions', JSON.stringify(this.knowledgeQuestions));
	}

	initSession(mode: ExerciseMode = 'sequential') {
		this.exerciseMode = mode;
		this.currentIndex = 0;
		this.selectedAnswers = [];
		this.submitted = false;

		if (mode === 'sequential') {
			this.activeQuestions = [...this.questions];
		} else if (mode === 'random') {
			// Shuffle questions
			const shuffled = [...this.questions];
			for (let i = shuffled.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
			}
			this.activeQuestions = shuffled;
		} else if (mode === 'wrong') {
			// Filter questions in the wrong book
			const wrongIds = new Set(this.wrongBook.map(r => r.questionId));
			this.activeQuestions = this.questions.filter(q => wrongIds.has(q.id));

			// Sort wrong questions by count descending
			const wrongMap = new Map(this.wrongBook.map(r => [r.questionId, r]));
			this.activeQuestions.sort((a, b) => {
				const countA = wrongMap.get(a.id)?.count || 0;
				const countB = wrongMap.get(b.id)?.count || 0;
				return countB - countA;
			});
		}

		this.saveSessionProgress();
	}

	toggleOption(optionKey: string) {
		if (this.submitted || !this.currentQuestion) return;

		if (this.currentQuestion.type === 'single') {
			this.selectedAnswers = [optionKey];
		} else {
			// Multiple choice selection toggling
			if (this.selectedAnswers.includes(optionKey)) {
				this.selectedAnswers = this.selectedAnswers.filter(o => o !== optionKey);
			} else {
				this.selectedAnswers = [...this.selectedAnswers, optionKey].sort();
			}
		}
		this.saveSessionProgress();
	}

	async submitAnswer(): Promise<boolean> {
		if (this.submitted || !this.currentQuestion || this.selectedAnswers.length === 0) return false;

		this.submitted = true;
		const question = this.currentQuestion;
		const correctAnswers = [...question.answer].sort();
		const userSelected = [...this.selectedAnswers].sort();

		const isCorrect = correctAnswers.length === userSelected.length &&
			correctAnswers.every((val, index) => val === userSelected[index]);

		const nowStr = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');

		// 1. Add to general history
		this.history.push({
			questionId: question.id,
			selected: userSelected,
			correct: isCorrect,
			time: nowStr
		});
		this.saveHistory();

		// 2. Manage Wrong Book with Spaced Repetition / Incremental Elimination
		const existingRecordIndex = this.wrongBook.findIndex(r => r.questionId === question.id);

		if (!isCorrect) {
			// Answered incorrectly
			if (existingRecordIndex > -1) {
				// Increment active count AND cumulative wrongCount
				this.wrongBook[existingRecordIndex].count += 1;
				this.wrongBook[existingRecordIndex].wrongCount += 1;
				this.wrongBook[existingRecordIndex].lastWrongTime = nowStr;
			} else {
				// Create new record
				this.wrongBook.push({
					questionId: question.id,
					count: 1,
					wrongCount: 1,
					lastWrongTime: nowStr
				});
			}
		} else {
			// Answered correctly
			if (existingRecordIndex > -1) {
				// Decrement count by 1 (Incremental Elimination)
				this.wrongBook[existingRecordIndex].count -= 1;

				if (this.wrongBook[existingRecordIndex].count <= 0) {
					// Count reached zero! Fully cleared from active wrong list
					this.wrongBook.splice(existingRecordIndex, 1);
					this.showToast(`错题攻克成功！已从错题本移出`, 'success');
				} else {
					this.showToast(`错题频度降低，剩余复习次数: ${this.wrongBook[existingRecordIndex].count}次`, 'success');
				}
			}
		}

		this.saveWrongBook();
		this.saveSessionProgress();

		// Cloud D1 synchronization (asynchronous & non-blocking)
		if (this.isD1 && !this.dbError) {
			try {
				const res = await fetch('/api/quiz/submit', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						questionId: question.id,
						selected: userSelected,
						isCorrect
					})
				});
				if (res.ok) {
					const data: any = await res.json();
					if (data.success) {
						this.wrongBook = data.wrongBook;
						this.history = data.history;
						this.saveWrongBook();
						this.saveHistory();
					}
				}
			} catch (e) {
				console.error('[Sync Error] submitAnswer:', e);
			}
		}

		return isCorrect;
	}

	nextQuestion() {
		if (this.exerciseMode === 'wrong') {
			const currentQId = this.currentQuestion?.id;
			const isStillWrong = this.wrongBook.some(r => r.questionId === currentQId);
			
			if (!isStillWrong && currentQId !== undefined) {
				// Remove the cleared question from the active list
				this.activeQuestions = this.activeQuestions.filter(q => q.id !== currentQId);
				
				if (this.activeQuestions.length === 0) {
					this.currentIndex = 0;
					this.selectedAnswers = [];
					this.submitted = false;
					this.clearSessionProgress();
					return;
				}
				
				// Adjust index if out of bounds
				if (this.currentIndex >= this.activeQuestions.length) {
					this.currentIndex = 0;
				}
				
				this.selectedAnswers = [];
				this.submitted = false;
				this.saveSessionProgress();
				return;
			}
		}

		if (this.currentIndex < this.activeQuestions.length - 1) {
			this.currentIndex += 1;
			this.selectedAnswers = [];
			this.submitted = false;
			this.saveSessionProgress();
		} else {
			// Finished all questions in session
			this.clearSessionProgress();
			this.showToast('恭喜！已完成当前练习全部题目', 'success');
		}
	}

	prevQuestion() {
		if (this.currentIndex > 0) {
			this.currentIndex -= 1;
			this.selectedAnswers = [];
			this.submitted = false;
			this.saveSessionProgress();
		}
	}

	removeFromWrongBook(questionId: number) {
		this.wrongBook = this.wrongBook.filter(r => r.questionId !== questionId);
		this.saveWrongBook();

		// If in active wrong book practice session, remove it in next step or now
		if (this.exerciseMode === 'wrong') {
			this.activeQuestions = this.activeQuestions.filter(q => q.id !== questionId);
			if (this.currentIndex >= this.activeQuestions.length && this.currentIndex > 0) {
				this.currentIndex = this.activeQuestions.length - 1;
			}
			this.selectedAnswers = [];
			this.submitted = false;
		}
		this.saveSessionProgress();

		if (this.isD1 && !this.dbError) {
			fetch('/api/wrong/remove', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ questionId })
			})
			.then(res => res.json())
			.then((data: any) => {
				if (data.success) {
					this.wrongBook = data.wrongBook;
					this.saveWrongBook();
				}
			})
			.catch(e => console.error('[Sync Error] removeFromWrongBook:', e));
		}
	}

	clearWrongBook() {
		this.wrongBook = [];
		this.saveWrongBook();
		if (this.exerciseMode === 'wrong') {
			this.activeQuestions = [];
			this.currentIndex = 0;
			this.selectedAnswers = [];
			this.submitted = false;
		}
		this.clearSessionProgress();

		if (this.isD1 && !this.dbError) {
			fetch('/api/wrong/clear', {
				method: 'POST'
			})
			.then(res => res.json())
			.then((data: any) => {
				if (data.success) {
					this.wrongBook = data.wrongBook;
					this.saveWrongBook();
				}
			})
			.catch(e => console.error('[Sync Error] clearWrongBook:', e));
		}
	}

	get currentQuestion(): Question | null {
		if (this.activeQuestions.length > 0 && this.currentIndex < this.activeQuestions.length) {
			return this.activeQuestions[this.currentIndex];
		}
		return null;
	}

	// Stats helpers
	get stats() {
		const totalQuestions = this.questions.length;
		const singleCount = this.questions.filter(q => q.type === 'single').length;
		const multipleCount = this.questions.filter(q => q.type === 'multiple').length;

		// Group questions by category
		const categories: { [key: string]: number } = {};
		this.questions.forEach(q => {
			categories[q.category] = (categories[q.category] || 0) + 1;
		});

		// Group questions by difficulty
		const easyCount = this.questions.filter(q => q.difficulty === 'easy').length;
		const mediumCount = this.questions.filter(q => q.difficulty === 'medium').length;
		const hardCount = this.questions.filter(q => q.difficulty === 'hard').length;

		// Calculate correct rates from history
		const correctMap: { [key: number]: { correct: number, total: number } } = {};
		this.history.forEach(h => {
			if (!correctMap[h.questionId]) {
				correctMap[h.questionId] = { correct: 0, total: 0 };
			}
			correctMap[h.questionId].total += 1;
			if (h.correct) {
				correctMap[h.questionId].correct += 1;
			}
		});

		return {
			totalQuestions,
			singleCount,
			multipleCount,
			categories,
			difficulty: {
				easy: easyCount,
				medium: mediumCount,
				hard: hardCount
			},
			correctMap
		};
	}
}

export const quizStore = new QuizStore();
