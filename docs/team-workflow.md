# Team Workflow — 观澜多 Agent 开发流程

## 概述

观澜项目使用多 Agent 团队协作开发模式，按阶段顺序推进，每个阶段由特定角色主导。

## 角色与职责

| 角色 | 职责 | 产出物 |
|------|------|--------|
| **PM** (Product Manager) | 编写 PRD 和用户故事 | `work/prd.md`, `work/user-stories.md` |
| **Architect** | 系统设计、模块接口定义 | `work/architecture.md`, `work/module-interface-spec.md` |
| **Task Manager** | 任务分解与依赖图 | `work/task-topology.md`, `work/tasks/task-*.md` |
| **Developer** | 在特性分支上实现任务 | 功能代码，`dev-task-{task_id}` 分支 |
| **Reviewer** | 审查任务实现 | `work/reviews/review-task-*.md` |
| **Integration Manager** | 分支合并与集成验证 | `work/integration-report.md` |
| **Tester** | 集成测试与 E2E 测试 | `work/test-report.md`, `tests/` |

## 阶段序列

```
pm → architect → task-manager → developer → reviewer → integration-manager → tester
```

每个阶段完成后更新 `project.json` 中的 `phase` 字段。

## 分支规范

- 每个开发任务使用独立分支：`dev-task-{task_id}`
- 仅 Integration Manager 可将分支合并到 `main`
- 合并前必须通过 Review

## 工件规范

- 所有设计/管理工作工件放在 `work/` 下
- ADR 放在 `docs/adr/` 下
- 代码放在 `backend/` 和 `frontend/` 下
- 测试放在各模块的 `tests/` 目录下

## 阶段转换

1. 当前阶段完成后，由执行者更新 `project.json` 中的 `phase` 字段
2. 加载下一阶段对应的 skill
3. 执行下一阶段的工作

## 设计系统

项目使用 MiniMax 设计语言，详见 `DESIGN.md`。所有前端组件应使用设计系统定义的 token 和组件类。
