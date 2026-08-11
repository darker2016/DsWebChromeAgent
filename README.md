# Deepseek Web Agent（DsBrowserHelper）

> 在 AI 对话页面中选择并注入「专家团 / 单体技能」，让对话 AI 扮演专家主理人。

一个 Chrome 扩展（Manifest V3）：在 [Deepseek](https://chat.deepseek.com) 等纯 AI 对话页中，点击右下角「技能」按钮，选择一个技能——**专家团**（多角色协作 skill 组）或**单体技能**（单个 SKILL.md）——扩展把对应技能引导提示词**注入聊天输入框**，你发送后，对话 AI 就以专家 / 团队主理人的身份回答问题。

## 特性

- 🧩 **两种技能**：专家团（如「AI 投资大师专家团」21 位成员）与单体技能（如 docx / pdf / xlsx 等文档技能）
- ⚡ **零 API 风险**：提示词直接注入聊天输入框，不依赖任何站点私有接口
- 🔍 **搜索 + 分类过滤**：按名称/描述搜索，按分类筛选
- 🎛 **专家团 / 单体技能 双 Tab** 切换
- 📦 **离线可用**：技能打包进扩展本体，无网络依赖

## 快速开始

```bash
# 1) 准备技能包（一次性）
bash scripts/sync-skills.sh                 # 从本地 WorkBuddySkillGroups 同步专家团
bash scripts/fetch-single-skills.sh         # 从 GitHub 收集单体技能（anthropics/skills）
node scripts/build-index.js                 # 生成技能注册表

# 2) 加载扩展
#    Chrome → chrome://extensions → 开发者模式 → 加载已解压的扩展程序 → 本项目根目录

# 3) 使用
#    打开 chat.deepseek.com → 右下角「技能」→ 选技能 → 插入 → 发送
```

> 网络受限时，`fetch-single-skills.sh` 支持 `--source-dir <本地克隆路径>` 走本地复制。

## 内置技能

- **专家团（12 组）**：投资大师、AI 内容创作、MVP 开发、法律咨询、财税合规、视频生成、SEO 内容、HR 运营、销售战役、研究助理、设计工程、发票核验。
- **单体技能（17 个）**：docx / pdf / pptx / xlsx、frontend-design、webapp-testing、canvas-design、brand-guidelines、doc-coauthoring、internal-comms、skill-creator、claude-api、mcp-builder、slack-gif-creator、theme-factory、web-artifacts-builder、algorithmic-art（来自官方 [anthropics/skills](https://github.com/anthropics/skills)）。

完整技能清单见 `scripts/skills-manifest.txt` 与 `scripts/singles-manifest.txt`。

## 文档

| 文档 | 说明 |
|------|------|
| [docs/architecture.md](docs/architecture.md) | 整体架构与数据流 |
| [docs/skill-system.md](docs/skill-system.md) | 技能注册表、来源、同步/构建 |
| [docs/site-adapters.md](docs/site-adapters.md) | 站点适配与注入机制 |
| [docs/development.md](docs/development.md) | 开发 / 调试 / 测试 |
| [docs/release.md](docs/release.md) | 发布与版权归因 |

## 致谢与版权

- 专家团技能内容来自 [WorkBuddySkillGroups](https://github.com/darker2016/workbuddy-skill-groups)，版权归第三方作者所有。
- 单体技能来自 [anthropics/skills](https://github.com/anthropics/skills)（MIT，各技能目录自带 LICENSE）。
- 本扩展代码为 MIT 协议，详见 [LICENSE](LICENSE)。
- 本扩展与 DeepSeek 官方无任何关联，Deepseek 为其公司商标。

## 免责声明

本扩展仅提供技能提示词注入能力，AI 输出内容由其对话模型生成，仅供学习与参考，不构成任何专业建议。
