# CLAUDE.md — Agent Workflow & Behavior Specification

This file defines how Claude (or any AI coding agent) should think, plan, and act within this codebase.
Review this file at the start of every session.

---

## Workflow Orchestration

### 1. Plan Mode Default

- Enter **plan mode** for ANY non-trivial task (3+ steps or architectural decisions).
- Write a detailed spec upfront in `tasks/todo.md` before touching any code.
- If something goes sideways mid-execution: **STOP** and re-plan immediately.
- Use plan mode for **verification steps**, not just building.
- Ambiguity is a blocker — resolve it in the spec, not during implementation.

### 2. Subagent Strategy

- Use subagents **liberally** to keep the main context window clean.
- Offload research, exploration, and parallel analysis to subagents.
- For complex problems: **throw more compute at it via subagents**.
- One task per subagent — focused, isolated execution only.

### 3. Self-Improvement Loop

- After **any correction** from the user: update `tasks/lessons.md` with the pattern.
- Write rules that **prevent the same mistake from recurring**.
- Ruthlessly iterate on lessons until the mistake rate drops to zero.
- **Review `tasks/lessons.md` at the start of every session** for relevant project context.

### 4. Verification Before Done

- **Never mark a task complete without proving it works.**
- Diff behavior between `main` and your changes when relevant.
- Ask yourself: *"Would a staff engineer approve this?"*
- Run tests, check logs, demonstrate correctness — then and only then mark done.

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask *"Is there a more elegant solution?"*
- If a fix feels hacky: *"Knowing everything I know now, implement the elegant solution."*
- **Skip this for simple, obvious fixes** — do not over-engineer.
- Challenge your own work before presenting it to the user.

### 6. Autonomous Bug Fixing

- When given a bug report: **just fix it**. Do not ask for hand-holding.
- Point at logs, errors, and failing tests — then resolve them.
- Zero context-switching required from the user.
- Go fix failing CI tests without being told how.

---

## Task Management

| Step | Action |
|------|--------|
| **1. Plan First** | Write plan to `tasks/todo.md` with checkable items (`- [ ]`) |
| **2. Verify Plan** | Check in with user before starting implementation |
| **3. Track Progress** | Mark items complete (`- [x]`) as you go |
| **4. Explain Changes** | Provide a high-level summary at each step |
| **5. Document Results** | Add a `## Review` section to `tasks/todo.md` when done |
| **6. Capture Lessons** | Update `tasks/lessons.md` after any correction |

### tasks/todo.md Format

```markdown
# Task: <short title>

## Plan
- [ ] Step one
- [ ] Step two
- [ ] Step three

## Verification
- [ ] Tests pass
- [ ] Behavior confirmed
- [ ] No regressions

## Review
_Populated after completion._
```

### tasks/lessons.md Format

```markdown
# Lessons

## <Date> — <Short Description>
**Mistake:** What went wrong.
**Root Cause:** Why it happened.
**Rule:** The rule to follow going forward.
```

---

## Core Principles

### Simplicity First
Make every change **as simple as possible**. Minimal code impact. Prefer the boring, obvious solution over the clever one.

### No Laziness
Find root causes. No temporary fixes. No TODO comments left behind. Senior developer standards — always.

### Minimal Impact
Only touch what is **strictly necessary**. New changes must not introduce side effects or new bugs. If you are unsure whether a change is in scope, **ask**.

---

## Decision Checklist

Before submitting any non-trivial change, run through this mentally:

- [ ] Did I write a plan first?
- [ ] Is my solution the simplest one that works?
- [ ] Did I check for unintended side effects?
- [ ] Would a staff engineer approve this?
- [ ] Did I update `tasks/todo.md` and mark steps complete?
- [ ] Did I capture any new lessons in `tasks/lessons.md`?

---

## File Structure Convention

```
tasks/
  todo.md       # Active task plan and progress tracking
  lessons.md    # Accumulated rules from past corrections
CLAUDE.md       # This file — agent behavior specification
```

---

*Keep this file up to date. It is a living document.*
