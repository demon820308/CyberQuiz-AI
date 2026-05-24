import { browser } from '$app/environment';
import type { Question, ExerciseMode, WrongRecord, QuizHistory, SessionProgress } from './types';
import { type KnowledgeQuestion, knowledgeQuestions as defaultKnowledgeQuestions } from './data/knowledgeQuestions';
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

	// User & Bank state
	currentUser = $state<{ username: string; nickname: string; role?: string } | null>(null);
	questionBanks = $state<any[]>([]);
	activeBankId = $state<number | null>(null);

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
	isAuthorizedToDelete = $state(false);
	adminPassword = $state('');

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
			this.currentUser = data.user || null;
			if (this.currentUser) {
				localStorage.setItem('cq_current_user', JSON.stringify(this.currentUser));
				
				// Pull visible banks
				this.fetchBanks();
				
				// Resolve activeBankId
				if (data.progress) {
					this.activeBankId = data.progress.active_bank_id || null;
				}
			} else {
				localStorage.removeItem('cq_current_user');
				this.activeBankId = null;
				this.questionBanks = [];
			}

			if (data.questions && data.questions.length > 0) {
				this.questions = data.questions;
			} else {
				// Seed default questions to D1
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
			
			if (data.knowledgeQuestions && data.knowledgeQuestions.length > 0) {
				this.knowledgeQuestions = data.knowledgeQuestions;
			} else {
				// Seed default knowledge questions to D1
				this.knowledgeQuestions = [...defaultKnowledgeQuestions];
				try {
					const res = await fetch('/api/knowledge', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(defaultKnowledgeQuestions.map(({ id, ...q }) => q))
					});
					if (!res.ok) {
						const errData: any = await res.json().catch(() => ({}));
						console.error('Failed to seed default knowledge questions to D1:', errData.error || res.statusText);
					}
				} catch (e) {
					console.error('Failed to seed default knowledge questions to D1:', e);
				}
			}

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
			// Offline/local only: Read current user from storage and load data
			const savedUser = localStorage.getItem('cq_current_user');
			if (savedUser) {
				try {
					this.currentUser = JSON.parse(savedUser);
				} catch {
					this.currentUser = null;
				}
			} else {
				this.currentUser = null;
			}
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

		// Load knowledge questions
		const savedKQ = localStorage.getItem('cq_knowledge_questions');
		if (savedKQ) {
			try {
				this.knowledgeQuestions = JSON.parse(savedKQ);
			} catch (e) {
				console.error('Failed to parse saved knowledge questions', e);
				this.knowledgeQuestions = [...defaultKnowledgeQuestions];
				localStorage.setItem('cq_knowledge_questions', JSON.stringify(this.knowledgeQuestions));
			}
		} else {
			this.knowledgeQuestions = [...defaultKnowledgeQuestions];
			localStorage.setItem('cq_knowledge_questions', JSON.stringify(this.knowledgeQuestions));
		}

		// Restore admin authorization state
		const savedAuth = localStorage.getItem('cq_admin_auth');
		if (savedAuth) {
			try {
				const authData = JSON.parse(savedAuth);
				if (authData.exp && Date.now() < authData.exp) {
					this.isAuthorizedToDelete = true;
					if (authData.pw) this.adminPassword = authData.pw;
				} else {
					localStorage.removeItem('cq_admin_auth');
					this.isAuthorizedToDelete = false;
					this.adminPassword = '';
				}
			} catch {
				localStorage.removeItem('cq_admin_auth');
				this.isAuthorizedToDelete = false;
				this.adminPassword = '';
			}
		}

		// User specific data scope
		const username = this.currentUser?.username || 'local_default';

		// Load wrong book
		const savedWrong = localStorage.getItem(`cq_wrong_book_${username}`);
		if (savedWrong) {
			try {
				this.wrongBook = JSON.parse(savedWrong);
			} catch (e) {
				console.error('Failed to parse wrong book', e);
				this.wrongBook = [];
			}
		} else {
			this.wrongBook = [];
		}

		// Load history
		const savedHistory = localStorage.getItem(`cq_history_${username}`);
		if (savedHistory) {
			try {
				this.history = JSON.parse(savedHistory);
			} catch (e) {
				console.error('Failed to parse history', e);
				this.history = [];
			}
		} else {
			this.history = [];
		}

		// Check saved session progress
		const savedProgress = localStorage.getItem(`cq_session_progress_${username}`);
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
		const username = this.currentUser?.username || 'local_default';
		localStorage.setItem(`cq_wrong_book_${username}`, JSON.stringify(this.wrongBook));
	}

	saveHistory() {
		if (!browser) return;
		const username = this.currentUser?.username || 'local_default';
		localStorage.setItem(`cq_history_${username}`, JSON.stringify(this.history));
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

		const username = this.currentUser?.username || 'local_default';
		localStorage.setItem(`cq_session_progress_${username}`, JSON.stringify(progress));
		this.hasSavedProgress = true;
		this.savedSessionDetails = {
			currentIndex: this.currentIndex,
			questionNumber: this.currentIndex + 1,
			totalQuestions: this.activeQuestions.length,
			mode: this.exerciseMode
		};

		if (this.isD1 && !this.dbError && this.currentUser) {
			fetch('/api/quiz/progress', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-User-Username': this.currentUser.username
				},
				body: JSON.stringify(progress)
			}).catch(e => console.error('[Sync Error] saveSessionProgress:', e));
		}
	}

	clearSessionProgress() {
		if (!browser) return;
		const username = this.currentUser?.username || 'local_default';
		localStorage.removeItem(`cq_session_progress_${username}`);
		this.hasSavedProgress = false;
		this.savedSessionDetails = null;

		if (this.isD1 && !this.dbError && this.currentUser) {
			fetch('/api/quiz/progress', {
				method: 'DELETE',
				headers: {
					'X-User-Username': this.currentUser.username
				}
			}).catch(e => console.error('[Sync Error] clearSessionProgress:', e));
		}
	}

	resumeSessionProgress(): boolean {
		if (!browser) return false;

		const username = this.currentUser?.username || 'local_default';
		const progressStr = localStorage.getItem(`cq_session_progress_${username}`);
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

	// User authentication actions
	async register(username: string, nickname: string, password: string): Promise<{ success: boolean; error?: string }> {
		try {
			const res = await fetch('/api/users/auth', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'register', username, nickname, password })
			});
			const result = (await res.json()) as any;
			if (result.success) {
				this.currentUser = result.user;
				if (browser) {
					localStorage.setItem('cq_current_user', JSON.stringify(result.user));
					window.location.reload();
				}
				return { success: true };
			} else {
				return { success: false, error: result.error };
			}
		} catch (e: any) {
			return { success: false, error: e.message || '网络连接失败，请重试' };
		}
	}

	async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
		try {
			const res = await fetch('/api/users/auth', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'login', username, password })
			});
			const result = (await res.json()) as any;
			if (result.success) {
				this.currentUser = result.user;
				if (browser) {
					localStorage.setItem('cq_current_user', JSON.stringify(result.user));
					window.location.reload();
				}
				return { success: true };
			} else {
				return { success: false, error: result.error };
			}
		} catch (e: any) {
			return { success: false, error: e.message || '网络连接失败，请重试' };
		}
	}

	async logout() {
		try {
			await fetch('/api/users/auth', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'logout', username: this.currentUser?.username || '' })
			});
		} catch (e) {
			console.error('Logout API failed:', e);
		}
		this.currentUser = null;
		if (browser) {
			localStorage.removeItem('cq_current_user');
			window.location.reload();
		}
	}

	async updateProfileNickname(nickname: string): Promise<{ success: boolean; error?: string }> {
		if (!this.currentUser) return { success: false, error: '请先登录' };
		try {
			const res = await fetch('/api/users/profile', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-User-Username': this.currentUser.username
				},
				body: JSON.stringify({ action: 'updateNickname', nickname })
			});
			const result = (await res.json()) as any;
			if (result.success) {
				this.currentUser = { ...this.currentUser, nickname: result.nickname };
				if (browser) {
					localStorage.setItem('cq_current_user', JSON.stringify(this.currentUser));
				}
				this.showToast('昵称更新成功！', 'success');
				return { success: true };
			} else {
				return { success: false, error: result.error };
			}
		} catch (e: any) {
			return { success: false, error: e.message || '网络连接失败，请重试' };
		}
	}

	async updateProfilePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
		if (!this.currentUser) return { success: false, error: '请先登录' };
		try {
			const res = await fetch('/api/users/profile', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-User-Username': this.currentUser.username
				},
				body: JSON.stringify({ action: 'updatePassword', newPassword })
			});
			const result = (await res.json()) as any;
			if (result.success) {
				this.showToast('密码更新成功！', 'success');
				return { success: true };
			} else {
				return { success: false, error: result.error };
			}
		} catch (e: any) {
			return { success: false, error: e.message || '网络连接失败，请重试' };
		}
	}

	// Bank and admin management actions
	async fetchBanks() {
		if (!this.currentUser) return;
		try {
			const res = await fetch('/api/banks', {
				headers: { 'X-User-Username': this.currentUser.username }
			});
			const result = (await res.json()) as any;
			if (result.success) {
				this.questionBanks = result.banks;
			}
		} catch (e) {
			console.error('Failed to fetch banks:', e);
		}
	}

	async uploadBank(name: string, questions: Question[], isGlobal = false): Promise<boolean> {
		if (!this.currentUser) return false;
		try {
			const res = await fetch('/api/banks', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-User-Username': this.currentUser.username
				},
				body: JSON.stringify({ name, isGlobal, questions })
			});
			const result = (await res.json()) as any;
			if (result.success) {
				this.showToast(result.message || '题库上传成功！', 'success');
				this.fetchBanks();
				return true;
			} else {
				this.showToast(result.error || '题库上传失败！', 'error');
				return false;
			}
		} catch (e) {
			console.error('Failed to upload bank:', e);
			this.showToast('网络请求失败', 'error');
			return false;
		}
	}

	async applyBank(bankId: number) {
		if (!this.currentUser) return;
		try {
			const progress: SessionProgress = {
				currentIndex: 0,
				exerciseMode: 'sequential',
				activeQuestionIds: [],
				submitted: false,
				selectedAnswers: [],
				active_bank_id: bankId
			};

			this.activeBankId = bankId;

			const res = await fetch('/api/quiz/progress', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-User-Username': this.currentUser.username
				},
				body: JSON.stringify(progress)
			});
			const result = (await res.json()) as any;
			if (result.success) {
				this.showToast('应用题库成功，正在重新加载...', 'success');
				if (browser) {
					window.location.reload();
				}
			}
		} catch (e) {
			console.error('Failed to apply bank:', e);
			this.showToast('应用题库失败', 'error');
		}
	}

	async deleteBank(bankId: number): Promise<boolean> {
		if (!this.currentUser) return false;
		try {
			const res = await fetch('/api/banks', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					'X-User-Username': this.currentUser.username
				},
				body: JSON.stringify({ bankId })
			});
			const result = (await res.json()) as any;
			if (result.success) {
				this.questionBanks = result.banks;
				this.showToast('成功删除题库！', 'success');
				
				// If currently applied bank was deleted, reset to default
				if (this.activeBankId === bankId) {
					const defaultB = this.questionBanks.find(b => b.name === '默认编程题库' || b.is_global === 1);
					if (defaultB) {
						this.applyBank(defaultB.id);
					} else {
						window.location.reload();
					}
				}
				return true;
			} else {
				this.showToast(result.error || '删除题库失败！', 'error');
				return false;
			}
		} catch (e) {
			console.error('Failed to delete bank:', e);
			this.showToast('网络请求失败', 'error');
			return false;
		}
	}

	async changeAdminPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
		if (!this.currentUser || this.currentUser.role !== 'admin') {
			return { success: false, error: '权限不足' };
		}
		try {
			const res = await fetch('/api/admin/password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-User-Username': this.currentUser.username
				},
				body: JSON.stringify({ newPassword })
			});
			const result = (await res.json()) as any;
			if (result.success) {
				this.showToast('修改密码成功！', 'success');
				return { success: true };
			} else {
				return { success: false, error: result.error };
			}
		} catch (e: any) {
			return { success: false, error: e.message || '网络连接失败，请重试' };
		}
	}

	async fetchUsers(): Promise<any[]> {
		if (!this.currentUser || this.currentUser.role !== 'admin') return [];
		try {
			const res = await fetch('/api/admin/users', {
				headers: { 'X-User-Username': this.currentUser.username }
			});
			const result = (await res.json()) as any;
			if (result.success) {
				return result.users;
			}
		} catch (e) {
			console.error('Failed to fetch users:', e);
		}
		return [];
	}

	async deleteUser(username: string): Promise<boolean> {
		if (!this.currentUser || this.currentUser.role !== 'admin') return false;
		try {
			const res = await fetch('/api/admin/users', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					'X-User-Username': this.currentUser.username
				},
				body: JSON.stringify({ username })
			});
			const result = (await res.json()) as any;
			if (result.success) {
				this.showToast(`成功清退用户 ${username}！`, 'success');
				return true;
			} else {
				this.showToast(result.error || '清退用户失败', 'error');
			}
		} catch (e) {
			console.error('Failed to delete user:', e);
			this.showToast('网络请求失败', 'error');
		}
		return false;
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

	async addKnowledgeQuestions(newQuestions: Omit<KnowledgeQuestion, 'id'>[]) {
		if (!browser) return;
		const maxId = this.knowledgeQuestions.reduce((max, q) => Math.max(max, q.id), 0);
		const mapped = newQuestions.map((q, idx) => ({
			...q,
			id: maxId + idx + 1
		})) as KnowledgeQuestion[];
		this.knowledgeQuestions = [...this.knowledgeQuestions, ...mapped];

		if (this.isD1 && !this.dbError) {
			try {
				const headers: Record<string, string> = { 'Content-Type': 'application/json' };
				if (this.currentUser) {
					headers['X-User-Username'] = this.currentUser.username;
				}
				const res = await fetch('/api/knowledge', {
					method: 'POST',
					headers,
					body: JSON.stringify(newQuestions)
				});
				if (!res.ok) {
					const errData: any = await res.json().catch(() => ({}));
					console.error('Failed to sync knowledge questions to D1:', errData.error || res.statusText);
					this.showToast('云端同步失败，已暂存于本地浏览器', 'error');
				} else {
					this.showToast('成功同步至云端 D1 数据库！', 'success');
				}
			} catch (e) {
				console.error('Failed to sync knowledge questions to D1:', e);
				this.showToast('云端连接失败，已暂存于本地浏览器', 'error');
			}
		}

		localStorage.setItem('cq_knowledge_questions', JSON.stringify(this.knowledgeQuestions));
	}

	async removeKnowledgeQuestion(id: number) {
		if (!browser) return;

		if (this.isD1 && !this.dbError) {
			try {
				const headers: Record<string, string> = { 'Content-Type': 'application/json' };
				if (this.currentUser) {
					headers['X-User-Username'] = this.currentUser.username;
				}
				const res = await fetch('/api/knowledge/delete', {
					method: 'POST',
					headers,
					body: JSON.stringify({ id })
				});
				if (!res.ok) {
					const errData: any = await res.json().catch(() => ({}));
					this.showToast(`云端删除失败: ${errData.error || '未知错误'}`, 'error');
					return;
				}
			} catch (e) {
				console.error('Failed to delete from D1:', e);
				this.showToast('云端删除失败，网络请求异常！', 'error');
				return;
			}
		}

		this.knowledgeQuestions = this.knowledgeQuestions.filter(q => q.id !== id);
		localStorage.setItem('cq_knowledge_questions', JSON.stringify(this.knowledgeQuestions));
		this.showToast('已成功删除该问答题！', 'success');
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
		if (this.isD1 && !this.dbError && this.currentUser) {
			try {
				const res = await fetch('/api/quiz/submit', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-User-Username': this.currentUser.username
					},
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

		if (this.isD1 && !this.dbError && this.currentUser) {
			fetch('/api/wrong/remove', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-User-Username': this.currentUser.username
				},
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

		if (this.isD1 && !this.dbError && this.currentUser) {
			fetch('/api/wrong/clear', {
				method: 'POST',
				headers: {
					'X-User-Username': this.currentUser.username
				}
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
