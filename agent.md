# English Learning App

## 1. Concept

A local desktop-oriented web application for personal English learning.

The application generates personalized lessons based on:

* the user's vocabulary;
* grammar topics;
* current knowledge level;
* previous mistakes;
* learning roadmap;
* previous lesson results.

The application is intended for a single user and runs locally on the user's computer.

There is no authentication, cloud database, or external hosting.

The application is opened through `localhost` and can be started using a simple `.bat` file.

---

# 2. Technology

### Application

* Next.js
* React
* JavaScript
* SQLite

### Data

SQLite stores:

* vocabulary progress;
* grammar progress;
* completed lessons;
* exercise results;
* mistakes;
* checkpoints;
* learning history.

The learning roadmap is stored separately as JSON.

AI is accessed through an external API.

### Architecture

Next.js is used as a full-stack local application.

```text
Browser
   ↓
Next.js / React
   ↓
Server-side code
   ↓
SQLite
```

The application does not require a separate Python or Node.js backend.

Next.js server-side functionality is used for:

* SQLite access;
* saving progress;
* reading progress;
* generating lesson plans;
* communicating with the AI API.

SSR should not be introduced where it is unnecessary. The application is primarily a local interactive application, not a public SEO-oriented website.

---

# 3. Local Database

SQLite is the main persistent storage.

The database should be stored as a local file:

```text
english.db
```

The database must survive application restarts and updates.

The user should be able to keep and back up the database file independently.

The initial database can contain tables for:

```text
words
grammar_topics
lessons
exercises
answers
progress
mistakes
```

The exact schema should be designed incrementally as features are implemented.

Do not create unnecessary database abstractions or ORM layers unless they solve an actual problem.

---

# 4. Progress Tracking

The application should track progress separately for different learning elements.

## Vocabulary

Track:

* number of successful answers;
* number of mistakes;
* familiarity/knowledge score;
* last practice date;
* number of repetitions.

## Lessons

Track:

* date;
* exercises;
* answers;
* results;
* mistakes;
* topics practiced.

The exact scoring algorithm can be implemented incrementally.

The important requirement is that progress persists between application launches.

We store lessons. User can watch lessons history and attempt it again.

---

# 5. Lesson Structure

A lesson consists of several stages.

The initial version should contain three main exercise types.

## Stage 1 — Vocabulary

Fill in missing words.

Example:

> Alex: I'm really ______ after working all day.
> Emma: You should take a break.

The user enters the missing word.

This stage primarily tests active vocabulary recall.

---

## Stage 2 — Translation

Translate sentences from Russian into English.

Example:

> Я работаю здесь уже три года.

The user writes the English sentence.

AI evaluates the answer and can accept multiple natural variants.

---

## Stage 3 — Reading + Questions

The application displays a short English text.

After reading it, the user answers several questions in English.

Example:

> Why did Alex decide to leave his job?

The answer is evaluated by AI.

The text and questions should preferably use vocabulary and grammar currently being studied.

---

# 9. AI

AI should generate lesson content based on structured information provided by the application. AI also check lesson result

The application should provide AI with:

* vocabulary that needs practice;
* weak vocabulary;
* weak grammar areas;
* recent mistakes;
* user's current progress;
* approximate difficulty.

AI should return structured data rather than UI code or HTML.

Example:


AI should also evaluate free-form answers and return structured evaluation data.

The application is responsible for storing the evaluation and updating progress.

---

# 10. Lesson Generation

The application should eventually determine what the user needs to practice.

Example:

```text

Weak vocabulary:
overwhelmed
deadline
avoid

Required lesson:
5 vocabulary exercises
3 grammar exercises
1 reading
3 reading questions
```

Application decide what words we need to learn and choose Current learninng words based on level and next repetion date. Bigger level bigger priority.
Each lesson should'nt contain more than five words to learn. 

Word get new level only if it was repeated after next repeated date. We can't pass two or more levels in one day. 

AI then generates the actual content.

The exact lesson-selection algorithm should be implemented incrementally.

The AI should not independently control the user's entire learning roadmap.

The application determines the learning state and requests appropriate content from AI.

---

# 11. Mascots

The application has two or more recurring mascots:

* male mascot;
* female mascot.
* a girl Aiko (playful anime girl, teasing)
* a guy Ren (depressed anime guy, relatable, sarcastic)
* more later


They should appear throughout the learning experience.

Their main initial purpose is to represent dialogues.

Example:

```text
[Male mascot]

Alex:
I can't believe how ______ I am today.

[Female mascot]

Emma:
You should probably take a break.
```

The mascots can also appear in:

* dialogues;
* contextual vocabulary exercises;
* reading exercises;
* lesson introductions;
* short comments after completing an exercise.

They should make exercises feel like interactions rather than isolated tests.

---

# 12. UI

The interface should be simple and focused on quickly starting a lesson.
UI is look like chat app and all dialogs like a chatting between two person choosed randomly from predescribed strcuture

## Dashboard

Shows:

* today's lesson;
* current roadmap progress;
* weak areas;
* recent results;
* button to start today's lesson.

## Lesson

Displays one exercise at a time.

The user should not see unnecessary information while solving an exercise.

After end user should see mistakes and small feedback.

## Roadmap

Displays learning topics and their current state.

Example:

```text
Grammar

✓ Present Simple
✓ Past Simple
→ Present Perfect
○ Future forms
○ Conditionals
```

## Progress

Shows:

* learning statistics;
* vocabulary progress;
* grammar progress;
* weak areas;
* recent mistakes.

---

# 13. Local-first

The application is designed primarily for local use.

There should be:

* no login;
* no user accounts;
* no cloud database;
* no mandatory hosting;
* no external backend service.

All personal learning progress is stored locally in SQLite.

AI requests are the main external dependency.

The application should preserve all local progress even if the AI API is temporarily unavailable.


---

# 14. Application Startup

The application should be easy to launch.

A simple Windows batch file should start the Next.js application and open the local application in the browser.

Target workflow:

```text
start.bat
   ↓
Start Next.js
   ↓
Open browser
   ↓
localhost
   ↓
English Learning App
```

The user should not need to manually start multiple services.

---

# 15. Development Principles

Keep the project small and understandable.

The project is primarily intended for personal use.

Do not introduce unnecessary libraries, frameworks, abstractions, authentication, cloud services, or infrastructure.

Use Next.js server-side functionality when server-side access is required, especially for SQLite and AI API requests.

Do not expose SQLite or AI API credentials directly to the browser.

AI-generated code should remain understandable and easy to modify.

The AI should generate and evaluate learning content.

The application should control:

* progress;
* roadmap;
* lesson state;
* database;
* exercise flow;
* user interface.

Development should happen incrementally.

Each feature should work before moving to the next one.
