export interface Question {
	id: number;
	type: 'single' | 'multiple';
	title: string;
	options: { [key: string]: string };
	answer: string[]; // e.g. ['A'] or ['A', 'C']
	explanation: string;
	difficulty: 'easy' | 'medium' | 'hard';
	category: string;
	knowledgeTags?: string[];
}

export type ExerciseMode = 'sequential' | 'random' | 'wrong';

export interface WrongRecord {
	questionId: number;
	count: number;         // Current count (decremented when answered correctly)
	wrongCount: number;    // Cumulative total errors for analysis
	lastWrongTime: string;
}

export interface QuizHistory {
	questionId: number;
	selected: string[];
	correct: boolean;
	time: string;
}

export interface SessionProgress {
	currentIndex: number;
	exerciseMode: ExerciseMode;
	activeQuestionIds: number[];
	submitted: boolean;
	selectedAnswers: string[];
	active_bank_id?: number | null;
}

export interface User {
	username: string;
	nickname: string;
	passwordHash?: string;
	createdAt?: string;
	role?: string;
}
