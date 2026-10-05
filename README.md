<div align="center">

# PRODUCTIVITY APP

### Focus. Plan. Track. Grow.

A local-first productivity platform that brings together focused work sessions, task management, calendar planning, analytics, gamification, and optional cloud synchronization.

[**Open the App**](https://berra-c.github.io/productivity-app/)

</div>

```text
+-------------------------------------------------------------+
|  FOCUS  ->  PLAN  ->  TRACK  ->  UNDERSTAND  ->  GROW      |
+-------------------------------------------------------------+
```

> [!NOTE]
> This README describes the product, user-facing behavior, and high-level architecture.  
---

## 01 / Overview

**Productivity App** is a personal productivity system designed for students, independent learners, and knowledge workers who want to plan work, enter a focused session quickly, and understand what actually happened afterward.

It is not intended to be only a timer or a to-do list. The application connects planning and execution in one place:

- tasks describe **what needs to be done**,
- the calendar provides **time context**,
- work sessions record **what actually happened**,
- analytics reveal **patterns over time**,
- gamification turns long-term effort into **visible progress**.

The product follows one simple principle:

> **Working should remain more important than managing the productivity tool.**

The interface is therefore designed to reduce friction before, during, and after a work session.

### Core idea

```text
WORK -> TRACK -> UNDERSTAND PATTERNS -> MAINTAIN PROGRESS
```

---

## 02 / Product Goals

The application is not designed to maximize the number of features visible at once. Its goal is to reduce the number of decisions a user has to make before beginning meaningful work.

It should help answer questions such as:

- Which subject received most of my time this week?
- At what hours do I usually work?
- Are my sessions becoming longer or more fragmented?
- Which days tend to break my routine?
- How much of my planned work becomes actual focused work?
- What kinds of distractions interrupt me most often?

### Main goals

- Start and record focused work with as little friction as possible.
- Track **when** and **how** work happens, not only total time.
- Make long-term progress visually understandable.
- Keep the core experience useful without requiring a cloud account.
- Treat mobile as a first-class experience rather than a scaled-down desktop layout.
- Support optional multi-device synchronization while preserving a local-first model.
- Keep analytics reflective and useful rather than competitive or surveillance-oriented.

---

## 03 / Work Sessions & Focus Tracking

The timer system is the foundation of the application.

Calendar history, statistics, daily goals, streaks, gamification, and long-term summaries become more meaningful when they are based on **real recorded work** rather than manually entered estimates.

### 3.1 Work Sessions

A user can create a session, assign a topic or name, optionally define a target duration, and begin working.

A session can be:

- started with or without a target duration,
- paused,
- resumed,
- completed.

Pausing and resuming does **not** create a new logical session.

The application stores actual work intervals separately so that breaks are not counted as focused work.

```text
Example

Session open time:     60 min
Pause time:            15 min
Actual focused work:   45 min
```

This interval-based model also supports hour-of-day analytics. If a session crosses several hours, its work can be attributed to the correct time windows instead of being assigned only to the session start time.

### 3.2 Session Targets

A target duration can be attached to a session.

```text
25 min   |   45 min   |   60 min   |   Custom
```

As the session progresses, the application shows progress toward the target using a percentage and progress bar.

### 3.3 Focus Mode

Focus Mode removes nonessential interface elements and turns the timer into the primary visual.

When Focus Mode is open, the screen is reduced to:

- the current session or topic name,
- a large flip-clock,
- the session target duration,
- the target progress bar.

The flip-clock is intentionally dominant.

On supported mobile browsers, Focus Mode attempts to use fullscreen and landscape orientation so the phone can act like a dedicated desk timer.

The interface stays minimal by default. Tapping the flip-clock can temporarily reveal essential controls such as pause/resume and finish; they automatically disappear again after a short delay.

---

## 04 / Daily Goals, Streaks & Progress

Daily goals create short-term direction, while streaks and long-term statistics create a broader sense of continuity.

### 4.1 Daily Work Goal

Users can define a daily work target.

```text
Example daily target: 120 minutes
```

The application compares completed focused work against that target and displays progress visually.

### 4.2 Work Streak

Consistently reaching daily goals contributes to a work streak.

```text
Example: 12-day streak
```

The purpose is to reward sustainable consistency rather than isolated high-output days.

### 4.3 Streak Protection

The application includes a streak-protection concept so that a larger pattern of consistency does not necessarily disappear because of one missed day.

### 4.4 Daily Score

A daily score provides a compact summary of the user's work behavior.

It is intended as a quick signal for the day, not as a replacement for detailed statistics.

---

## 05 / Gamification & Long-Term Motivation

Gamification is used as a **visual memory of effort**, not as the purpose of the application.

The underlying work records remain the source of truth.

### 5.1 Tree Growth System

Focused work contributes to the development of the user's current tree.

```text
SEED -> SPROUT -> PLANT -> MATURE PLANT -> TREE
```

As progress accumulates, the tree advances through visible stages.

### 5.2 Tree Collection

Completed trees remain in a personal collection instead of disappearing.

| Tree / Plant | Tree / Plant | Tree / Plant |
|---|---|---|
| Oak | Pine | Sakura |
| Olive | Bamboo | Palm |
| Cactus | Tulip | Rose |
| Daisy | Basil | Clover |
| Lotus | Additional species | |

### 5.3 Levels & XP

Work activity contributes to experience points.

As XP accumulates, the user reaches higher levels, creating a long-term progression layer beyond daily productivity.

### 5.4 Badges

Unlockable badges represent milestones and patterns such as:

- accumulated work time,
- consistency,
- task activity,
- streaks,
- other in-app achievements.

The system is deliberately personal rather than leaderboard-driven.

---

## 06 / Distraction Tracking

The application can record moments when the user's attention is disrupted.

The goal is **self-observation**, not punishment.

Common categories include:

- Phone
- Social media
- Environment
- Fatigue
- Other

Distraction logging is intentionally quick so that recording an interruption does not itself become another interruption.

Over time, the data can help reveal patterns such as:

- repeated phone distractions during evening sessions,
- fatigue during late-night work,
- certain hours with consistently weaker focus.

---

## 07 / Task Management

The task system complements the timer rather than replacing it.

A task describes **what needs to be done**.  
A work session records **the time actually spent doing it**.

### Core task features

- Quick task creation
- Optional dates
- Optional times
- Dated or undated tasks
- Repeating tasks
- Custom labels
- Search
- Status filters
- Timing filters

### 7.1 Recurring Tasks

Tasks can repeat:

- daily,
- weekly,
- monthly.

Weekly tasks can be attached to selected weekdays.

```text
Monday | Wednesday | Friday
```

### 7.2 Task Labels

Users can organize tasks with custom labels and colors.

```text
Mathematics | German | University | Project | Personal
```

### 7.3 Search & Filtering

As the task list grows, users can narrow it by:

- active tasks,
- completed tasks,
- overdue tasks,
- today's tasks,
- upcoming tasks,
- tasks without a date.

---

## 08 / Calendar

The calendar connects **planned time** with **recorded activity**.

It supports:

- Week view
- Month view
- Year view

### 8.1 Weekly View

The weekly view can display actual work intervals recorded by the timer.

This makes it possible to see not only:

> How much did I work today?

but also:

> At exactly what times did I work?

### 8.2 Monthly View

The monthly view provides a wider perspective on events, work history, and day-level activity.

Days can be visually distinguished according to recorded work intensity.

### 8.3 Yearly View

The yearly calendar summarizes all twelve months while adapting to screen size.

| Device | Layout |
|---|---|
| Desktop | Multiple months side by side |
| Medium screens | Reduced column count |
| Phone | One month per row |

On mobile, the one-month-per-row layout keeps day cells readable and tappable instead of compressing the desktop layout.

When Year View is opened on a phone for the current year, the interface can automatically scroll to the current month.

---

## 09 / Statistics & Analytics

Analytics are intended to support reflection rather than surveillance.

The user should be able to understand patterns without reading raw logs or database records.

### Time ranges

- Day
- Week
- Month
- Year

### 9.1 Core Statistics

Typical metrics include:

- total work time,
- number of sessions,
- average session duration,
- distraction-related metrics.

### 9.2 Charts

Different chart types are used according to the question being answered.

For example:

- bars for discrete categories such as weekdays or hours,
- line-style views for longer time trends.

The goal is not decorative chart density. Each graph should answer a clear question.

### 9.3 Subject Distribution

Because sessions can be associated with a subject or topic, the application can calculate how time is distributed.

```text
Mathematics   8 h 20 m
German        5 h 40 m
Physics       3 h 10 m
Project       2 h 25 m
```

### 9.4 Session Analysis

The application can analyze the structure of work sessions instead of relying only on total time.

This helps compare:

- shorter vs longer sessions,
- pauses,
- focused intervals,
- work fragmentation.

### 9.5 Activity Heatmap

A yearly activity heatmap gives a compact long-term view of consistency.

Higher activity is represented with stronger intensity; low-activity or inactive days remain visually lighter.

### 9.6 Personal Summary

The summary area connects the main systems:

```text
TASKS -> intent
CALENDAR -> context
TIMER -> execution
ANALYTICS -> patterns
GAMIFICATION -> visible progress
```

---

## 10 / Accounts & Cloud Synchronization

Cloud accounts are optional.

The application remains usable as a local productivity tool, while account-based synchronization adds continuity across devices.

### 10.1 Local-First Model

The application is designed around a **local-first** approach.

Core usage remains tied to local application state so the user can continue working without requiring a cloud account for every interaction.

### 10.2 Account Creation

Users can create an account directly from the application.

During registration:

1. The user chooses a six-digit access code.
2. The system assigns a unique username.
3. The system generates a magic word.
4. The resulting credentials are shown to the user.
5. The user can continue directly into the application.

Future sign-in requires:

```text
Username
Magic word
6-digit access code
```

Users are explicitly reminded to save these credentials.

### 10.3 Multi-Device Use

A cloud account allows the same productivity data to be used across multiple devices.

Device sessions can be managed independently.

Synchronization is revision-aware so the application can detect when local and remote state are not identical.

When data from multiple devices is merged, session history is treated as the source of truth for work-related daily aggregates. This helps prevent one device's same-day activity from blindly overwriting another device's work totals.

Active timers remain device-local.

### 10.4 Import & Export

Users can manually export application data as JSON and later import it again.

This provides:

- manual backup,
- portability,
- recovery,
- device-to-device transfer without relying exclusively on cloud sync.

---

## 11 / Mobile & PWA Experience

Mobile is treated as a primary scenario.

The app may be used to:

- quickly check a task,
- complete an entire study session,
- act as a desk timer,
- review a calendar,
- inspect progress.

### 11.1 Responsive Mobile Design

Important views are rearranged specifically for smaller screens:

- task list,
- calendar,
- statistics,
- yearly view,
- Focus Mode.

### 11.2 Progressive Web App

The project includes:

- a Web App Manifest,
- application icons,
- a Service Worker,
- asset caching.

Supported browsers can install the application to the home screen for a more app-like experience.

Installation is optional; the application remains usable in a normal browser.

### 11.3 Offline Resilience

The local-first architecture reduces dependence on constant network access.

Local state remains central to the experience while cloud synchronization provides multi-device continuity when available.

---

## 12 / Administration

The project includes a separate administration interface.

Its purpose is to manage the service and understand **aggregate product usage**, not to rank individual users by productivity.

### Administrative capabilities

- Account creation and status management
- Credential reset workflows
- Device-session administration
- Aggregate usage indicators
- General usage analytics

Displayed aggregate metrics can include:

- total accounts,
- total work time,
- average session duration,
- daily work trends,
- weekday usage,
- hour-of-day usage.

The admin experience is intentionally separated from the normal user interface.

---

## 13 / Security & Privacy Principles

The public repository can explain how the product is structured without exposing privileged implementation details.

The project separates:

```text
PUBLIC FRONTEND CONFIGURATION
            |
            v
SERVER-SIDE VERIFICATION
            |
            v
PRIVILEGED BACKEND OPERATIONS
```

Key principles:

- Private administrative secrets are not documented in the public repository.
- Privileged backend keys are not exposed in frontend code.
- Sensitive user credential verification is handled server-side.
- User-facing and administrative capabilities are intentionally separated.
- Public documentation avoids publishing operational security details that would be inappropriate to expose.

> [!IMPORTANT]
> Never commit private server credentials, privileged database keys, or administrator secrets to the public repository.

---

## 14 / Technical Architecture

The application uses a lightweight web stack.

### Stack

| Layer | Technology |
|---|---|
| Interface | HTML |
| Styling | CSS |
| Client logic | Vanilla JavaScript |
| Backend platform | Supabase |
| Database | PostgreSQL |
| Server logic | Supabase Edge Functions |
| PWA | Service Worker + Web App Manifest |
| Frontend hosting | GitHub Pages |

The project intentionally avoids requiring a large frontend framework.

Most complexity lives in interaction, state, synchronization, and productivity logic rather than framework-specific rendering.

### 14.1 Frontend Hosting

The frontend is statically hosted through GitHub Pages.

The backend remains separate, so frontend hosting and server-side data infrastructure can evolve independently.

### 14.2 High-Level Project Structure

```text
/
├── index.html
├── admin.html
├── manifest.webmanifest
├── sw.js
│
├── assets/
│   ├── css/
│   │   └── app.css
│   │
│   └── js/
│       ├── app.js
│       ├── cloud-config.js
│       ├── cloud-sync.js
│       ├── admin.js
│       ├── pwa-register.js
│       │
│       └── modules/
│           ├── state-merge.js
│           └── ui-helpers.js
│
├── icons/
│   ├── icon.svg
│   ├── icon-192.png
│   └── icon-512.png
│
└── supabase/
    ├── functions/
    │   └── app-api/
    │       └── index.ts
    │
    └── migrations/
```

### 14.3 Main File Responsibilities

#### `index.html`

Defines the primary user interface, major views, panels, and modal structures.

#### `assets/css/app.css`

Contains the main visual system:

- timer,
- tasks,
- calendar,
- statistics,
- responsive layouts,
- Focus Mode,
- account UI.

#### `assets/js/app.js`

Contains the primary application logic for:

- work sessions,
- timer behavior,
- tasks,
- calendar,
- analytics,
- gamification,
- streaks,
- Focus Mode,
- persistence,
- import/export.

#### `assets/js/cloud-sync.js`

Handles the frontend cloud account experience:

- sign-in,
- sign-up,
- device interactions,
- sync transport,
- cloud account state.

#### `assets/js/modules/state-merge.js`

Contains synchronization conflict-resolution and state merge behavior.

It keeps merge logic separate from network transport and rebuilds work-related daily aggregates from merged session history.

#### `assets/js/modules/ui-helpers.js`

Contains reusable interface behavior, including mobile calendar navigation helpers and transient Focus Mode controls.

#### `admin.html` + `assets/js/admin.js`

Provide the separate administration interface and aggregate usage dashboard.

#### `sw.js`

Implements Service Worker behavior, application-shell caching, runtime caching, and cache versioning.

---

## 15 / Visual Design

The visual identity combines a calm productivity interface with playful, game-like details.

### Design language

```text
DARK SURFACES
+
GREEN PRIMARY ACCENT
+
WARM YELLOW HIGHLIGHTS
+
LARGE FOCUS TIMER
+
COMPACT CARDS
+
GAME-LIKE PROGRESSION
```

Green connects naturally to the tree-growth system.

Warm yellow accents provide contrast and make important milestones and interface states feel more energetic.

The interface is intended to remain comfortable during long work periods while keeping timers, progress, and analytics easy to read.

### Typography

The application currently uses a hierarchy built around:

- **IBM Plex Sans** for general interface text,
- **IBM Plex Mono** for data-oriented and timer-oriented elements,
- **Fraunces** for selected expressive headings.

> GitHub README files do not reliably support custom webfonts.  
> This README therefore uses GitHub-native Markdown typography, code blocks, tables, spacing, and visual hierarchy rather than embedding a custom font.

---

## 16 / Design Principles

### 01 — Work before interface

Starting a session and recording progress should remain quick and low-friction.

### 02 — Raw numbers are not enough

The product should help explain:

- timing,
- subjects,
- session structure,
- distractions,
- long-term patterns.

### 03 — Progress should be visible

Trees, levels, badges, streaks, calendars, and charts make long-term effort easier to recognize.

### 04 — Users should retain control of their data

Local-first storage and manual JSON import/export support ownership and portability.

### 05 — Mobile is not a smaller desktop

Calendar layouts, Focus Mode, tasks, and analytics are adapted specifically for smaller screens.

### 06 — Progressive detail

A user should be able to begin with a simple session or task and add more metadata only when it becomes useful.

---

## 17 / Development Status

Productivity App is actively developed.

Recent work has focused on:

- mobile yearly-calendar readability,
- current-month auto-scroll on mobile Year View,
- self-service account creation,
- safer multi-device state merging,
- admin analytics cleanup,
- more immersive Focus Mode,
- cleaner Service Worker caching,
- modularizing reliability and UI helper logic.

The product is already usable for real daily work, but reliability and maintainability remain higher priorities than adding large new feature areas.

### Areas for future development

- More advanced long-term productivity analytics
- Additional PWA capabilities
- Further offline synchronization improvements
- More personalization options
- Additional gamification mechanics
- Expanded Focus Mode interactions
- More advanced calendar interactions
- Additional data visualizations
- Continued code modularization

---

## 18 / Summary

Productivity App combines:

| | |
|---|---|
| **FOCUS** | Large flip-clock and target-based work sessions |
| **PLAN** | Tasks plus weekly, monthly, and yearly calendar views |
| **TRACK** | Work intervals, subjects, distractions, and analytics |
| **GROW** | Trees, XP, badges, daily goals, and streaks |
| **SYNC** | Optional local-first multi-device synchronization |
| **OWN** | JSON import/export for backup and portability |

The purpose is not simply to collect more productivity features.

The goal is to create an environment in which users can:

> **understand their own behavior, maintain motivation, and build sustainable long-term work habits.**

---

<div align="center">

### PRODUCTIVITY APP

`FOCUS` · `PLAN` · `TRACK` · `GROW`

[Open the application](https://berra-c.github.io/productivity-app/)

</div>
