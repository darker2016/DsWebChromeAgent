# 开源发布与归因（release.md）

> 本文档描述发布到 GitHub、同步技能包的规范与第三方版权归因。涉及发布/工作流变更时同步更新本文档。

## 1. 目标仓库

- 仓库：https://github.com/darker2016/DeepseekWebAgent
- 本地目录：`/Users/darker/Documents/cursor_projects/DsBrowserHelper`
- 主分支：`main`

## 2. 发布流程（每轮迭代）

1. `git status` — 检查所有增删改。
2. 技能变更先跑同步 + 构建：`bash scripts/sync-skills.sh && bash scripts/fetch-single-skills.sh && node scripts/build-index.js`。
3. 确认文档同步：凡改代码/技能，检查 CLAUDE.md 规则 1 映射表中的对应文档是否已更新。
4. `git add <具体文件>`（避免误提交无关文件 / 敏感文件）。
5. `git commit -m "<类型>: <简述>"`，只 commit，**不 push**。
6. 询问用户是否推送；仅在用户明确确认后 `git push origin main`。

> ⚠️ 推送是对外可见操作，每次都要用户明确确认。首次初始化后必须单独确认一次。

## 3. 首次初始化（已完成或按需重做）

```bash
git init -b main
git remote add origin git@github.com:darker2016/DeepseekWebAgent.git
git add .
git commit -m "chore: 初始化 DsBrowserHelper（文档体系 + 最小可运行骨架）"
# 推送需用户确认
```

## 4. 技能同步规范

### 从 WorkBuddySkillGroups 同步（专家团）

- 只复制 manifest 清单中的目录；脚本已排除 `.DS_Store` / `.gitignore` / `__pycache__`。
- 不修改同步来的 SKILL.md / README 内容（保持与来源一致，便于追溯）。
- 专家团版权归 WorkBuddySkillGroups 第三方作者所有，见其仓库 LICENSE 顶部 attribution 列表。

### 从 anthropics/skills 同步（单体技能）

- 每个技能目录自带的 `LICENSE` 文件原样保留，**不得删除**。
- 遵守上游仓库的 LICENSE 条款（MIT，见各技能目录 LICENSE）。
- 若替换 / 增删单体技能来源，更新 docs/skill-system.md §3 来源表与 README。

## 5. 版权与归因清单

| 内容 | 版权说明 |
|------|---------|
| 本扩展代码（src/、docs/、CLAUDE.md 等） | MIT，Copyright (c) 2026 darker2016 |
| 专家团技能（skills/groups/） | 来自 WorkBuddySkillGroups，第三方作者版权（见其仓库 LICENSE） |
| 单体技能（skills/singles/） | 来自 anthropics/skills，MIT（各目录 LICENSE.txt） |
| 图标 / 商标 | 无内置图标；Deepseek 为 DeepSeek 公司商标，本扩展与官方无关联 |

## 6. 版本记录

- `0.2.0` — 技能引导包装（group/single 两套引导模板）；用户上传技能（单个 .md / 文件夹）；多站点适配（Kimi/豆包/ChatGPT/通义/智谱/元宝/文心）+ 任意页面手动唤醒。
- `0.1.0` — 文档体系 + 最小可运行骨架：专家团 12 组 + 单体技能 17 个；Deepseek 注入链路。
