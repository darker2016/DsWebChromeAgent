# 贡献指南（CONTRIBUTING.md）

欢迎为 Deepseek Web Agent 贡献代码、文档或新技能。提交前请先阅读 [CLAUDE.md](CLAUDE.md) 的协作规则与 [docs/](docs/) 相关文档。

## 如何贡献

1. **提 Issue**：bug、功能建议、新技能请求 → 使用 [.github/ISSUE_TEMPLATE.md](.github/ISSUE_TEMPLATE.md)。
2. **提 PR**：
   - 分支从 `main` 拉出，PR 标题简洁描述改动。
   - 改动代码必须同步更新对应文档（见 CLAUDE.md 规则 1 映射表）。
   - 技能变更必须同时更新 `scripts/*-manifest.txt`、`scripts/categories.json`、README 技能清单，并重新运行 `node scripts/build-index.js` 提交新的 `skills/index.json`。
   - 通过真机验证（见 `docs/development.md` §6 测试清单）。

## 新增技能

- 专家团：在 `scripts/skills-manifest.txt` 添加来源目录名 → 跑 `bash scripts/sync-skills.sh`。
- 单体技能：在 `scripts/singles-manifest.txt` 添加名字 → 跑 `bash scripts/fetch-single-skills.sh`。
- 之后补分类（`scripts/categories.json`）→ `node scripts/build-index.js` → 更新文档与 README。

详见 `docs/skill-system.md` §5。

## 版权

- 贡献者将其代码按本项目 [LICENSE](LICENSE)（MIT）授权。
- 来自第三方来源的技能内容版权归原作者，不得删除其 LICENSE / attribution。
