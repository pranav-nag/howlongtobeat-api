# API Core Data Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the HLTB API with machine-readable minutes and promoted metrics (Retirement Rate, Backlog, Rating).

**Architecture:** Update TypeScript interfaces to include `timesInMinutes` and `metrics`. Modify the `detail.ts` parser to extract these values from HLTB's `__NEXT_DATA__` JSON payload.

**Tech Stack:** TypeScript, Cheerio, Node.js

---

### Task 1: Update TypeScript Interfaces

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add new interfaces and update GameDetails**

```typescript
// Add these to src/types.ts

export interface GameTimesInMinutes {
  mainStory: number;
  mainExtras: number;
  completionist: number;
  allPlayStyles: number;
}

export interface GameMetrics {
  retirementRate: string;
  backlogCount: number;
  rating: number;
}

// Update GameDetails interface
export interface GameDetails {
  // ... existing fields ...
  timesInMinutes: GameTimesInMinutes;
  metrics: GameMetrics;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add GameTimesInMinutes and GameMetrics types"
```

---

### Task 2: Update Detail Parser

**Files:**
- Modify: `src/scraper/parsers/detail.ts`

- [ ] **Step 1: Implement secondsToMinutes helper and update parser**

```typescript
// Add this helper function
function secondsToMinutes(seconds: number | undefined): number {
  if (!seconds) return 0;
  return Math.round(seconds / 60);
}

// Update parseGameDetails to populate timesInMinutes and metrics
// In the if (gameData) block:
const timesInMinutes: GameTimesInMinutes = {
  mainStory: secondsToMinutes(gameData.comp_main),
  mainExtras: secondsToMinutes(gameData.comp_plus),
  completionist: secondsToMinutes(gameData.comp_100),
  allPlayStyles: secondsToMinutes(gameData.comp_all)
};

const metrics: GameMetrics = {
  retirementRate: gameData.count_retired && gameData.count_total 
    ? `${((gameData.count_retired / gameData.count_total) * 100).toFixed(1)}%` 
    : 'Unknown',
  backlogCount: gameData.count_backlog || 0,
  rating: gameData.review_score || 0
};

// Update the return object to include these
```

- [ ] **Step 2: Update fallback DOM parsing (if possible)**
Provide default values for the new fields in the fallback return.

- [ ] **Step 3: Commit**

```bash
git add src/scraper/parsers/detail.ts
git commit -m "feat: implement minute normalization and metric extraction"
```

---

### Task 3: Verify with Tests

**Files:**
- Modify: `src/scraper/parsers/detail.test.ts`

- [ ] **Step 1: Update tests to check for new fields**
Add assertions for `timesInMinutes` and `metrics` in existing or new test cases.

- [ ] **Step 2: Run tests**

Run: `npm test src/scraper/parsers/detail.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/scraper/parsers/detail.test.ts
git commit -m "test: verify new data fields in detail parser"
```

---

### Task 4: Final Verification

- [ ] **Step 1: Build the project**

Run: `npm run build`
Expected: Successful build with no type errors.

- [ ] **Step 2: Start server and manual check (Optional but recommended)**
Start the server and hit `http://localhost:3000/api/game/68151` (Elden Ring) to see the live output.
