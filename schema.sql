-- 1. 题库主表 questions
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY,
    type TEXT CHECK(type IN ('single', 'multiple')) NOT NULL,
    title TEXT NOT NULL,
    options TEXT NOT NULL,       -- 以 JSON 字符串存储映射：{"A": "选项A", "B": "...", ...}
    answer TEXT NOT NULL,        -- 以 JSON 字符串存储正确选项：["A", "B"]
    explanation TEXT NOT NULL,
    difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')) NOT NULL,
    category TEXT NOT NULL,
    knowledgeTags TEXT           -- 以 JSON 字符串存储标签列表：["Python", "OOP"]
);

-- 2. 错题本 wrong_book
CREATE TABLE IF NOT EXISTS wrong_book (
    questionId INTEGER PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 1,       -- 活跃复习频次 (做对递减)
    wrongCount INTEGER NOT NULL DEFAULT 1,  -- 历史累计错误频次 (用于薄弱分析)
    lastWrongTime TEXT NOT NULL,            -- 最后错误时间戳 "yyyy-MM-dd HH:mm:ss"
    FOREIGN KEY(questionId) REFERENCES questions(id) ON DELETE CASCADE
);

-- 3. 答题历史历史记录 quiz_history
CREATE TABLE IF NOT EXISTS quiz_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    questionId INTEGER NOT NULL,
    selected TEXT NOT NULL,      -- 以 JSON 字符串存储用户已选选项 e.g. ["A"]
    correct INTEGER NOT NULL,    -- 0 为错误，1 为正确
    time TEXT NOT NULL,          -- 作答时间戳
    FOREIGN KEY(questionId) REFERENCES questions(id) ON DELETE CASCADE
);

-- 4. 会话进度暂存 session_progress
CREATE TABLE IF NOT EXISTS session_progress (
    id INTEGER PRIMARY KEY DEFAULT 1, -- 用单个固定记录来存储当前进度，只保存一行
    currentIndex INTEGER NOT NULL,
    exerciseMode TEXT NOT NULL,
    activeQuestionIds TEXT NOT NULL, -- 以 JSON 字符串存储当前题集 ID 列表
    submitted INTEGER NOT NULL,      -- 0 未提交，1 已提交
    selectedAnswers TEXT NOT NULL    -- 以 JSON 字符串存储当前作答
);
