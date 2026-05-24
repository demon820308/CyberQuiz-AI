\-- 1. 重新创建所有数据表

CREATE TABLE users (

&#x20;   username TEXT PRIMARY KEY,

&#x20;   nickname TEXT NOT NULL,

&#x20;   password TEXT NOT NULL,

&#x20;   role TEXT CHECK(role IN ('user', 'admin')) DEFAULT 'user',

&#x20;   created\_at TEXT NOT NULL

);



CREATE TABLE question\_banks (

&#x20;   id INTEGER PRIMARY KEY AUTOINCREMENT,

&#x20;   name TEXT NOT NULL,

&#x20;   creator TEXT NOT NULL,

&#x20;   is\_global INTEGER DEFAULT 0,

&#x20;   created\_at TEXT NOT NULL,

&#x20;   FOREIGN KEY(creator) REFERENCES users(username) ON DELETE CASCADE

);



CREATE TABLE questions (

&#x20;   id INTEGER PRIMARY KEY AUTOINCREMENT,

&#x20;   bank\_id INTEGER,

&#x20;   type TEXT CHECK(type IN ('single', 'multiple')) NOT NULL,

&#x20;   title TEXT NOT NULL,

&#x20;   options TEXT NOT NULL,

&#x20;   answer TEXT NOT NULL,

&#x20;   explanation TEXT NOT NULL,

&#x20;   difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')) NOT NULL,

&#x20;   category TEXT NOT NULL,

&#x20;   knowledgeTags TEXT

);



CREATE TABLE wrong\_book (

&#x20;   username TEXT NOT NULL,

&#x20;   questionId INTEGER NOT NULL,

&#x20;   count INTEGER NOT NULL DEFAULT 1,

&#x20;   wrongCount INTEGER NOT NULL DEFAULT 1,

&#x20;   lastWrongTime TEXT NOT NULL,

&#x20;   PRIMARY KEY(username, questionId),

&#x20;   FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE,

&#x20;   FOREIGN KEY(questionId) REFERENCES questions(id) ON DELETE CASCADE

);



CREATE TABLE quiz\_history (

&#x20;   id INTEGER PRIMARY KEY AUTOINCREMENT,

&#x20;   username TEXT NOT NULL,

&#x20;   questionId INTEGER NOT NULL,

&#x20;   selected TEXT NOT NULL,

&#x20;   correct INTEGER NOT NULL,

&#x20;   time TEXT NOT NULL,

&#x20;   FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE,

&#x20;   FOREIGN KEY(questionId) REFERENCES questions(id) ON DELETE CASCADE

);



CREATE TABLE session\_progress (

&#x20;   username TEXT PRIMARY KEY,

&#x20;   currentIndex INTEGER NOT NULL,

&#x20;   exerciseMode TEXT NOT NULL,

&#x20;   activeQuestionIds TEXT NOT NULL,

&#x20;   submitted INTEGER NOT NULL,

&#x20;   selectedAnswers TEXT NOT NULL,

&#x20;   active\_bank\_id INTEGER,

&#x20;   FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE

);



CREATE TABLE knowledge\_questions (

&#x20;   id INTEGER PRIMARY KEY AUTOINCREMENT,

&#x20;   semester TEXT NOT NULL,

&#x20;   subject TEXT NOT NULL,

&#x20;   tag TEXT NOT NULL,

&#x20;   difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')) NOT NULL,

&#x20;   content TEXT NOT NULL,

&#x20;   standardAnswer TEXT NOT NULL,

&#x20;   logicalStructure TEXT NOT NULL,

&#x20;   keywords TEXT NOT NULL,

&#x20;   mnemonic TEXT NOT NULL

);



\-- 3. 预设超级管理员和默认编程题库

INSERT INTO users (username, nickname, password, role, created\_at)

VALUES ('admin', '超级管理员', 'b409db24147c4fad753c13335eb705f4844b1c40cd5048363af32dcb48e58469', 'admin', CURRENT\_TIMESTAMP);



INSERT INTO question\_banks (id, name, creator, is\_global, created\_at)

VALUES (1, '默认编程题库', 'admin', 1, CURRENT\_TIMESTAMP);

