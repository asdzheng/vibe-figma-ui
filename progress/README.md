# Progress Docs

This folder is the execution memory for the repository.

Use it to understand where implementation stands before starting the next task,
and update it when project status changes.

## Read Order

Before starting new work, read these files in order:

1. `progress/00-current-status.md`
2. `progress/01-implementation-plan.md`
3. `progress/02-in-progress.md`
4. `progress/03-backlog.md`
5. `progress/05-issues.md`

Use `progress/04-done.md` when you need completion history.
Use `progress/06-manual-verification.md` when you need the current live Figma verification checklist.

## File Purpose

- `00-current-status.md`: current snapshot, next recommended focus, latest verification
- `01-implementation-plan.md`: phased implementation plan with status markers
- `02-in-progress.md`: work currently active or immediately next
- `03-backlog.md`: not started yet
- `04-done.md`: completed milestones and shipped items
- `05-issues.md`: blockers, risks, and known gaps
- `06-manual-verification.md`: live runtime verification checklist for plugin and CLI companion integration

## Update Rules

- Update `00-current-status.md` whenever the recommended next step changes.
- Move items from `03-backlog.md` to `02-in-progress.md` when work starts.
- Move finished items to `04-done.md` after verification is complete.
- Record blockers or important risks in `05-issues.md`.
- Keep this folder focused on execution status, not product spec duplication.
