# Agent-Driven Development Workflow

This project uses a multi-agent team orchestration. Follow the phase-based workflow.

## Team Roles
See `docs/team-workflow.md` for the full workflow.

## Current Phase
The current phase is tracked in `project.json` (`phase` field).

### Phase Sequence
1. **pm** — Product Manager: write PRD and user stories → `work/prd.md`
2. **architect** — Architect: system design + module interface spec → `work/architecture.md`
3. **task-manager** — Task Manager: break down tasks → `work/tasks/task-*.md`
4. **developer** — Developer: implement tasks on feature branches
5. **reviewer** — Reviewer: review task implementations
6. **integration-manager** — Integration Manager: merge branches
7. **tester** — Tester: integration and E2E testing

### Phase Transition
To advance to the next phase, update `project.json` and load the corresponding skill.

## Artifact Convention
- All work artifacts go under `work/` (generated, not committed)
- ADRs go under `docs/adr/`
- Task cards go under `work/tasks/`
- Review reports go under `work/reviews/`
- All documentation uses Markdown

## Branch Convention
- Each developer task uses its own branch: `dev-task-{task_id}`
- Only the Integration Manager merges into `main`
