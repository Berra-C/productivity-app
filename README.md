<div align="center">

# PRODUCTIVITY APP

### `FOCUS` · `PLAN` · `TRACK` · `GROW`

A local-first productivity app for focused work, planning, analytics, and long-term progress.

[**OPEN THE APP**](https://berra-c.github.io/productivity-app/)

</div>

```text
┌───────────────────────────────────────────────────────────────┐
│  FOCUS  →  PLAN  →  TRACK  →  UNDERSTAND  →  GROW           │
└───────────────────────────────────────────────────────────────┘
```

> [!NOTE]
> **Productivity App is designed to help you work, not make productivity more complicated.**  
> You can start using it locally without creating an account and enable cloud sync later if you want to continue across devices.

---

# 01 / OVERVIEW

Productivity App brings together the main parts of a personal productivity system in one place:

| System | Purpose |
|---|---|
| **Tasks** | Decide what needs to be done |
| **Calendar** | Place work in time |
| **Focus Sessions** | Record what you actually worked on |
| **Analytics** | Understand your work patterns |
| **Goals & Streaks** | Build consistency |
| **Trees, XP & Badges** | Make long-term progress visible |
| **Cloud Sync** | Continue across devices |

The key idea is that these systems are connected rather than isolated.

```text
TASK
  ↓
CALENDAR
  ↓
FOCUS SESSION
  ↓
REAL WORK DATA
  ↓
ANALYTICS
  ↓
LONG-TERM PROGRESS
```

> [!TIP]
> A task represents **intention**.  
> A focus session represents **actual work**.  
> Keeping those two separate makes the data more useful.

---

# 02 / WHY IT EXISTS

Most productivity tools are good at one thing:

- timers,
- task lists,
- calendars,
- habit tracking,
- statistics.

Productivity App is designed to connect those pieces without forcing the user to manage a complicated system.

### The app should help answer questions like:

```text
Which subject received most of my time this week?

At what hours do I usually work?

Are my sessions getting longer or more fragmented?

Which days tend to break my routine?

What distracts me most often?

How consistent have I been over the last month?
```

> [!IMPORTANT]
> The app is primarily about **self-understanding**, not competition.  
> There is no productivity leaderboard built around comparing users with each other.

---

# 03 / FOCUS SESSIONS

The timer is the core of the application.

A session can include:

- a name,
- a subject or topic,
- an optional target duration.

You can:

```text
START
  ↓
PAUSE
  ↓
RESUME
  ↓
FINISH
```

Pausing and resuming does **not** create a new logical session.

## REAL FOCUSED TIME

The app distinguishes between:

- how long a session remained open,
- how long you were actually working.

```text
SESSION OPEN TIME      60 min
PAUSE TIME             15 min
────────────────────────────
FOCUSED WORK           45 min
```

> [!NOTE]
> Real work intervals are stored separately.  
> This makes later calendar and analytics views much more accurate.

Because work intervals are preserved, the app can understand **when during the day** the work actually happened.

---

# 04 / SESSION TARGETS

A focus session can optionally have a time goal.

```text
25 MIN   |   45 MIN   |   60 MIN   |   CUSTOM
```

During the session, the app shows:

- target duration,
- progress percentage,
- progress bar.

This gives the user a clear finish line without forcing every session into the same format.

---

# 05 / FOCUS MODE

Focus Mode turns the application into a minimal desk timer.

When enabled, the screen is intentionally reduced to only:

```text
SESSION NAME

        LARGE FLIP CLOCK

TARGET DURATION
██████████████░░░░
```

The flip-clock becomes the visual focus.

> [!TIP]
> On supported phones, Focus Mode can use fullscreen and landscape orientation so the phone can sit beside a notebook or keyboard like a dedicated timer.

### Temporary controls

The Focus screen stays clean by default.

Tapping the flip-clock can temporarily reveal controls such as:

- Pause / Resume
- Finish Session

They disappear again automatically after a short delay.

---

# 06 / DAILY GOALS

Users can define how much focused work they want to complete in a day.

```text
DAILY GOAL
120 MINUTES

PROGRESS
████████████░░░░░░
```

The app updates progress as focus sessions are completed.

> [!NOTE]
> Daily goals are meant to provide direction, not pressure.  
> Detailed work history remains available separately from goal completion.

---

# 07 / STREAKS & DAILY PROGRESS

Consistently completing daily goals can build a streak.

```text
12-DAY STREAK
```

The purpose is to make consistency visible over time.

## Streak protection

The app includes a streak-protection concept so that one missed day does not necessarily erase a longer pattern of consistency.

## Daily score

A daily score gives a compact snapshot of the day.

It works as a quick indicator while the full statistics remain available elsewhere.

---

# 08 / TASK MANAGEMENT

Tasks help answer:

> **What should I do?**

Focus sessions later answer:

> **What did I actually spend time doing?**

### Task features

- Quick task creation
- Optional date
- Optional time
- Dated or undated tasks
- Recurring tasks
- Custom labels
- Search
- Filters

## Recurring tasks

Tasks can repeat:

```text
DAILY
WEEKLY
MONTHLY
```

Weekly tasks can be assigned to selected days:

```text
MONDAY | WEDNESDAY | FRIDAY
```

## Labels

Users can create custom task categories.

```text
MATHEMATICS
GERMAN
UNIVERSITY
PROJECT
PERSONAL
```

## Filters

Large task lists can be narrowed by:

- Active
- Completed
- Overdue
- Today
- Upcoming
- No date

> [!TIP]
> The task system is intentionally flexible: a task can stay extremely simple or gain more detail only when needed.

---

# 09 / CALENDAR

The calendar connects **planning** with **recorded activity**.

It includes:

```text
WEEK
MONTH
YEAR
```

## Weekly View

The weekly view can display actual work intervals.

So instead of only seeing:

```text
Today: 2 h 30 m
```

you can also understand:

```text
09:10 → 09:55
12:30 → 13:20
18:00 → 18:55
```

## Monthly View

The monthly view gives a broader overview of:

- events,
- activity,
- work history,
- daily intensity.

## Yearly View

The yearly calendar adapts to the device.

| Screen | Layout |
|---|---|
| Desktop | Multiple months side by side |
| Medium screens | Reduced column count |
| Phone | One month per row |

> [!TIP]
> On phones, Year View can automatically move to the current month so the user does not need to scroll through the entire year manually.

---

# 10 / ANALYTICS

The analytics system turns recorded sessions into understandable patterns.

Available time ranges include:

```text
DAY
WEEK
MONTH
YEAR
```

### Core metrics

- Total focused work
- Session count
- Average session duration
- Distraction-related data

### Visual analysis

Charts can show patterns such as:

```text
WORK BY DAY
WORK BY WEEKDAY
WORK BY HOUR
SUBJECT DISTRIBUTION
LONG-TERM TRENDS
```

> [!NOTE]
> Charts are used to answer specific questions, not simply to fill the screen with data.

---

# 11 / SUBJECT DISTRIBUTION

Sessions can be associated with subjects or topics.

This allows the app to calculate where the user's time is going.

```text
MATHEMATICS   8 h 20 m
GERMAN        5 h 40 m
PHYSICS       3 h 10 m
PROJECT       2 h 25 m
```

This is useful when balancing:

- different subjects,
- personal projects,
- university work,
- exam preparation.

---

# 12 / DISTRACTION TRACKING

A user can quickly record when attention is interrupted.

Common categories include:

```text
PHONE
SOCIAL MEDIA
ENVIRONMENT
FATIGUE
OTHER
```

The goal is not to punish distraction.

The goal is to understand it.

> [!TIP]
> Over time, the user may notice patterns such as:
>
> - phone interruptions mostly happening in the evening,
> - lower concentration late at night,
> - specific environments producing more distractions.

---

# 13 / ACTIVITY HEATMAP

A yearly activity heatmap provides a compact overview of long-term consistency.

```text
LOW ACTIVITY   ░
               ▒
               ▓
HIGH ACTIVITY  █
```

It makes it easier to see:

- productive periods,
- inactive periods,
- changes in consistency,
- longer-term routines.

---

# 14 / TREES & COLLECTION

Focused work contributes to the growth of the user's current tree.

```text
SEED
  ↓
SPROUT
  ↓
PLANT
  ↓
MATURE PLANT
  ↓
TREE
```

Completed trees remain in a collection.

| | | |
|---|---|---|
| Oak | Pine | Sakura |
| Olive | Bamboo | Palm |
| Cactus | Tulip | Rose |
| Daisy | Basil | Clover |
| Lotus | More species | |

> [!NOTE]
> The collection is intended to become a visual history of accumulated effort.

---

# 15 / XP, LEVELS & BADGES

Work activity can contribute to XP.

As XP accumulates, the user can reach higher levels.

Badges can represent milestones related to:

- total focused work,
- consistency,
- task activity,
- streaks,
- other achievements.

```text
WORK
  ↓
XP
  ↓
LEVELS
  ↓
BADGES
  ↓
LONG-TERM PROGRESS
```

Gamification supports the work system rather than replacing it.

---

# 16 / LOCAL-FIRST

Productivity App is built around a **local-first** approach.

That means the app can be useful without requiring an account first.

```text
OPEN APP
   ↓
USE LOCALLY
   ↓
CREATE ACCOUNT LATER — OPTIONAL
```

> [!IMPORTANT]
> Cloud synchronization is optional.  
> Creating an account should extend the experience, not unlock basic functionality.

---

# 17 / BACKUP & PORTABILITY

Application data can be exported as JSON and imported again later.

This provides a simple manual backup system.

Useful for:

- keeping personal backups,
- restoring data,
- moving to another browser or device,
- keeping an archive.

```text
APP DATA
   ↓
EXPORT JSON
   ↓
SAVE
   ↓
IMPORT WHEN NEEDED
```

---

# 18 / CLOUD ACCOUNTS

Users who want multi-device synchronization can create a cloud account directly inside the app.

### Registration flow

```text
1. Choose a 6-digit access code
2. Receive a generated username
3. Receive a generated magic word
4. Save the credentials
5. Continue into the app
```

Future login uses:

```text
USERNAME
MAGIC WORD
6-DIGIT ACCESS CODE
```

> [!IMPORTANT]
> The account information shown after registration is needed for future sign-ins on another browser or device.

---

# 19 / MULTI-DEVICE SYNC

A cloud account lets the same work history continue across devices.

```text
PHONE
   ↘
    CLOUD STATE
   ↗
LAPTOP
```

The sync system is designed to preserve meaningful work from multiple devices.

### Same-day work

If two devices contain work from the same day, the app merges session history instead of simply letting one device overwrite the other.

### Active timers

Active timers remain tied to the device where they were started.

> [!NOTE]
> Completed history can synchronize across devices while a currently running timer stays local to its original device.

### Device sessions

Signed-in devices can be managed separately.

---

# 20 / MOBILE EXPERIENCE

Mobile is treated as a primary use case.

A phone can be used to:

- check tasks,
- start a session,
- use Focus Mode,
- review the calendar,
- check progress.

The mobile layout specifically adapts:

```text
TASKS
CALENDAR
YEAR VIEW
STATISTICS
FOCUS MODE
```

> [!TIP]
> Focus Mode is particularly useful in landscape orientation because the flip-clock can use most of the screen.

---

# 21 / PWA EXPERIENCE

Productivity App can behave like an installable web app on supported browsers.

It includes:

- Web App Manifest
- App icons
- Service Worker
- Asset caching

Users can still use the normal browser version if they prefer.

```text
BROWSER
   ↓
ADD TO HOME SCREEN
   ↓
APP-LIKE EXPERIENCE
```

---

# 22 / ADMINISTRATION

The project includes a separate administration interface.

Its focus is:

```text
ACCOUNT MANAGEMENT
+
DEVICE SESSION MANAGEMENT
+
AGGREGATE USAGE
```

Administrative functions can include:

- account status,
- account creation,
- credential reset,
- device sessions,
- overall usage statistics.

### Aggregate analytics

Examples include:

- total accounts,
- total work time,
- average session duration,
- daily trends,
- weekday usage,
- hour-of-day usage.

> [!NOTE]
> The admin dashboard is designed to understand the application as a whole, not to create a user productivity leaderboard.

---

# 23 / HOW EVERYTHING CONNECTS

```text
┌──────────────┐
│    TASKS     │
└──────┬───────┘
       │ What should I do?
       ▼
┌──────────────┐
│   CALENDAR   │
└──────┬───────┘
       │ When?
       ▼
┌──────────────┐
│ FOCUS SESSION│
└──────┬───────┘
       │ What did I actually do?
       ▼
┌──────────────┐
│  ANALYTICS   │
└──────┬───────┘
       │ What patterns exist?
       ▼
┌──────────────┐
│ GOALS / XP   │
│ TREES / BADGES│
└──────────────┘
```

The application is intended to create a loop between:

```text
PLANNING
   ↓
ACTION
   ↓
REFLECTION
   ↓
MOTIVATION
   ↓
PLANNING
```

---

# 24 / TECHNOLOGY

Productivity App uses a lightweight web stack.

| Layer | Technology |
|---|---|
| Interface | HTML |
| Styling | CSS |
| Application Logic | Vanilla JavaScript |
| Backend | Supabase |
| Database | PostgreSQL |
| Server Functions | Supabase Edge Functions |
| PWA | Service Worker + Web App Manifest |
| Hosting | GitHub Pages |

The project does not depend on a large frontend framework.

Most of the complexity is in:

- application state,
- interaction,
- focus tracking,
- synchronization,
- analytics,
- gamification.

---

# 25 / PROJECT STRUCTURE

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
│       └── modules/
│           ├── state-merge.js
│           └── ui-helpers.js
│
├── icons/
│
└── supabase/
    ├── functions/
    └── migrations/
```

<details>
<summary><strong>FILE RESPONSIBILITIES</strong></summary>

### `index.html`

Main user interface.

### `assets/css/app.css`

Main visual system and responsive behavior.

### `assets/js/app.js`

Core application logic, including:

- work sessions,
- timer behavior,
- tasks,
- calendar,
- statistics,
- gamification,
- streaks,
- Focus Mode,
- persistence,
- import/export.

### `assets/js/cloud-sync.js`

Frontend account and synchronization workflow.

### `assets/js/modules/state-merge.js`

Conflict-resolution and multi-device state merging.

### `assets/js/modules/ui-helpers.js`

Reusable UI behavior such as Focus Mode controls and mobile calendar helpers.

### `admin.html` / `assets/js/admin.js`

Administration interface.

### `sw.js`

PWA caching and Service Worker behavior.

</details>

---

# 26 / VISUAL DIRECTION

The interface combines calm productivity design with playful game-like details.

```text
DARK SURFACES
      +
GREEN ACCENTS
      +
WARM YELLOW DETAILS
      +
LARGE FLIP CLOCK
      +
COMPACT CARDS
      +
VISIBLE PROGRESS
```

The design should feel:

- calm,
- readable,
- focused,
- slightly playful,
- comfortable during long sessions.

### Typography

The app uses:

| Role | Typeface |
|---|---|
| General interface | IBM Plex Sans |
| Timer / data | IBM Plex Mono |
| Expressive headings | Fraunces |

---

# 27 / DESIGN PRINCIPLES

> [!TIP]
> These principles guide both feature decisions and interface decisions.

### `01` WORK BEFORE INTERFACE

Starting a session should remain fast.

### `02` SHOW PATTERNS, NOT ONLY TOTALS

The app should explain when, how, and on what the user works.

### `03` MAKE PROGRESS VISIBLE

Goals, streaks, trees, levels, badges, and charts make long-term effort easier to recognize.

### `04` KEEP DATA PORTABLE

Local-first storage and JSON backup keep personal history transferable.

### `05` DESIGN MOBILE INTENTIONALLY

Mobile layouts should not simply compress the desktop interface.

### `06` ADD DETAIL PROGRESSIVELY

Simple tasks and sessions should remain simple until more detail becomes useful.

---

# 28 / CURRENT DIRECTION

Productivity App is actively developed.

Recent improvements include:

```text
MOBILE YEAR VIEW
CURRENT-MONTH AUTO SCROLL
FOCUS MODE
SELF-SERVICE ACCOUNT CREATION
MULTI-DEVICE MERGE RELIABILITY
ADMIN ANALYTICS CLEANUP
PWA CACHE CLEANUP
MODULAR UI / SYNC HELPERS
```

> [!IMPORTANT]
> The current priority is reliability, clarity, responsive behavior, and maintainability before adding large new feature areas.

---

# 29 / AT A GLANCE

| | |
|---|---|
| **FOCUS** | Focus sessions, targets, and flip-clock Focus Mode |
| **PLAN** | Tasks and calendar planning |
| **TRACK** | Work intervals, subjects, distractions, and analytics |
| **GROW** | Goals, streaks, trees, XP, levels, and badges |
| **SYNC** | Optional multi-device cloud synchronization |
| **OWN** | Local-first data and JSON backup |

```text
┌─────────┬─────────────────────────────────────────────────────┐
│ FOCUS   │ Work deeply                                        │
│ PLAN    │ Know what comes next                                │
│ TRACK   │ Understand what actually happened                   │
│ GROW    │ Make consistency visible                            │
│ SYNC    │ Continue across devices                             │
│ OWN     │ Keep control of your data                           │
└─────────┴─────────────────────────────────────────────────────┘
```

> [!NOTE]
> Productivity App is not trying to add more complexity to productivity.  
> Its goal is to bring **planning, focused work, reflection, and visible progress** into one coherent system.

---

<div align="center">

# PRODUCTIVITY APP

### `FOCUS` · `PLAN` · `TRACK` · `GROW`

[**OPEN THE APP**](https://berra-c.github.io/productivity-app/)

</div>
