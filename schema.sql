-- 1.5. 用户账户表 users (增加 role 字段)
CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    nickname TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('user', 'admin')) DEFAULT 'user',
    created_at TEXT NOT NULL
);

-- 1. 题库分类表 (选择题库)
CREATE TABLE IF NOT EXISTS question_banks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                     -- 题库名称
    creator TEXT NOT NULL,                  -- 创建者用户名
    is_global INTEGER DEFAULT 0,            -- 是否为公共题库 (1 为是，0 为否)
    created_at TEXT NOT NULL,
    FOREIGN KEY(creator) REFERENCES users(username) ON DELETE CASCADE
);

-- 1.2. 题库主表 questions (增加 bank_id 字段关联题库)
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_id INTEGER,                        -- 关联 of 题库ID
    type TEXT CHECK(type IN ('single', 'multiple')) NOT NULL,
    title TEXT NOT NULL,
    options TEXT NOT NULL,       -- 以 JSON 字符串存储映射：{"A": "选项A", "B": "...", ...}
    answer TEXT NOT NULL,        -- 以 JSON 字符串存储正确选项：["A", "B"]
    explanation TEXT NOT NULL,
    difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')) NOT NULL,
    category TEXT NOT NULL,
    knowledgeTags TEXT           -- 以 JSON 字符串存储标签列表：["Python", "OOP"]
);

-- 2. 错题本 wrong_book (联合主键支持多用户相同题目错题记录)
CREATE TABLE IF NOT EXISTS wrong_book (
    username TEXT NOT NULL,
    questionId INTEGER NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,       -- 活跃复习频次 (做对递减)
    wrongCount INTEGER NOT NULL DEFAULT 1,  -- 历史累计错误频次 (用于薄弱分析)
    lastWrongTime TEXT NOT NULL,            -- 最后错误时间戳 "yyyy-MM-dd HH:mm:ss"
    PRIMARY KEY(username, questionId),
    FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE,
    FOREIGN KEY(questionId) REFERENCES questions(id) ON DELETE CASCADE
);

-- 3. 答题历史历史记录 quiz_history
CREATE TABLE IF NOT EXISTS quiz_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    questionId INTEGER NOT NULL,
    selected TEXT NOT NULL,      -- 以 JSON 字符串存储用户已选选项 e.g. ["A"]
    correct INTEGER NOT NULL,    -- 0 为错误，1 为正确
    time TEXT NOT NULL,          -- 作答时间戳
    FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE,
    FOREIGN KEY(questionId) REFERENCES questions(id) ON DELETE CASCADE
);

-- 4. 会话进度暂存 session_progress
CREATE TABLE IF NOT EXISTS session_progress (
    username TEXT PRIMARY KEY,     -- 以用户名为主键进行单条进度留存
    currentIndex INTEGER NOT NULL,
    exerciseMode TEXT NOT NULL,
    activeQuestionIds TEXT NOT NULL, -- 以 JSON 字符串存储当前题集 ID 列表
    submitted INTEGER NOT NULL,      -- 0 未提交，1 已提交
    selectedAnswers TEXT NOT NULL,    -- 以 JSON 字符串存储当前作答
    active_bank_id INTEGER,          -- 当前活跃的题库ID
    FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE
);

-- 5. 知识问答题库 knowledge_questions
CREATE TABLE IF NOT EXISTS knowledge_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    semester TEXT NOT NULL,
    subject TEXT NOT NULL,
    tag TEXT NOT NULL,
    difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')) NOT NULL,
    content TEXT NOT NULL,
    standardAnswer TEXT NOT NULL,
    logicalStructure TEXT NOT NULL,
    keywords TEXT NOT NULL,       -- 以 JSON 字符串存储关键词列表：["keyword1", "keyword2"]
    mnemonic TEXT NOT NULL        -- 以 JSON 字符串存储记忆锚点映射：{"formula": "...", "scene": "...", "avoid": "..."}
);

-- 6. 插入默认超级管理员账号 (用户名: admin, 密码: admin888)
-- 密码 hash 是 admin888 的 SHA-256 值: b409db24147c4fad753c13335eb705f4844b1c40cd5048363af32dcb48e58469
INSERT OR IGNORE INTO users (username, nickname, password, role, created_at)
VALUES ('admin', '超级管理员', 'b409db24147c4fad753c13335eb705f4844b1c40cd5048363af32dcb48e58469', 'admin', CURRENT_TIMESTAMP);

-- 7. 插入默认公开编程题库
INSERT OR IGNORE INTO question_banks (id, name, creator, is_global, created_at)
VALUES (1, '默认编程题库', 'admin', 1, CURRENT_TIMESTAMP);
