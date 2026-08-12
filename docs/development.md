# 开发工作流（development.md）

> 本文档描述本地开发、加载、调试、测试流程。流程有变化时同步更新本文档。

## 1. 环境要求

- Chrome / Chromium（≥ 110，MV3 支持）
- Node.js ≥ 16（仅构建索引脚本需要，无第三方依赖）
- 专家团来源：本地 `WorkBuddySkillGroups` 仓库（`bash scripts/sync-skills.sh` 用）
- 单体技能来源：可访问 GitHub（`bash scripts/fetch-single-skills.sh` 用；网络受限时用 `--source-dir` 走本地克隆）

## 2. 首次准备

```bash
cd /Users/darker/Documents/cursor_projects/DsBrowserHelper

# 1) 同步专家团（从本地 WorkBuddySkillGroups）
bash scripts/sync-skills.sh

# 2) 收集单体技能（从 GitHub 或本地克隆）
bash scripts/fetch-single-skills.sh
# 或：bash scripts/fetch-single-skills.sh --source-dir /path/to/anthropics-skills-clone

# 3) 生成技能注册表
node scripts/build-index.js
```

## 3. 加载未打包扩展

1. 打开 `chrome://extensions`。
2. 打开右上角「开发者模式」。
3. 点「加载已解压的扩展程序」，选择**本项目根目录**（含 manifest.json）。
4. 确认扩展出现在列表、无红色报错。

## 4. 调试

| 对象 | 调试入口 |
|------|---------|
| content script | 在 chat.deepseek.com 页面按 F12 → 控制台勾选「扩展 / Extension」过滤；浮动按钮 DOM 在 `#dswa-root` |
| popup | 右键扩展图标 → 「审查弹出内容」 |
| options | 右键扩展 → 选项 → F12 |
| background | `chrome://extensions` → 扩展详情 → 「检查视图 Service Worker」 |

修改 content script 后：在 `chrome://extensions` 点扩展卡片上的**刷新按钮**，再刷新目标页面。

## 5. 技能改动流程

改技能包（新增/删除/换源）后必须：

```bash
bash scripts/sync-skills.sh        # 或 fetch-single-skills.sh
node scripts/build-index.js
```

并同步更新：README 技能清单、docs/skill-system.md。参见 docs/skill-system.md §5。

## 6. 测试

当前无自动化测试。手工验证清单：

**基础链路**
- [ ] `chrome://extensions` 加载无报错
- [ ] 打开 chat.deepseek.com，右下角出现「技能」浮动按钮
- [ ] 点按钮弹出面板，默认「专家团」Tab 显示技能列表（数量 = index.json counts.group + 用户技能）
- [ ] 切换到「单体技能」Tab 显示单体技能
- [ ] 分类筛选、搜索过滤生效
- [ ] 点某个技能 → toast「已插入…」→ 输入框出现提示词 → 可正常发送
- [ ] 工具栏 popup 显示正确版本与技能数量

**引导包装（v0.2.0）**
- [ ] 注入一个专家团：输入框以「你正在启用…专家团技能…主理人」开头
- [ ] 注入一个单体技能：输入框以「你正在启用…技能…严格按定义执行」开头

**用户技能上传（v0.2.0）**
- [ ] 面板底部「＋ 上传技能」入口 → 打开设置页
- [ ] 设置页上传单个 .md → 面板「单体技能」Tab 出现（分类「用户自定义」）→ 可注入
- [ ] 上传含多个 SKILL.md 的文件夹 → 「专家团」Tab 出现 → 可注入（lead 正确）
- [ ] 删除用户技能后从面板消失

**多站点 + 手动唤醒（v0.2.0）**
- [ ] 登录 Kimi / 豆包 → FAB 自动出现 → 注入成功（选择器结果登记到 docs/site-adapters.md）
- [ ] ChatGPT（contenteditable）→ execCommand 注入是否触发输入框（真机验证）
- [ ] 打开任意含 textarea 的页面 → popup「在此页面启用插件」→ FAB 出现 → 注入成功
- [ ] 重启浏览器后再访该页，FAB 仍在（registerContentScripts 持久化生效）

> 选择器失效等站点问题：按 docs/site-adapters.md「真机验证记录」处理。

## 7. 代码规范

- content scripts 为非模块脚本，按 manifest `js` 数组顺序加载；共享符号一律挂 `globalThis.DSWA`，**不要**在不同文件重复 `const` 同名顶层变量。
- `skill-picker.js` 有幂等守卫（`DSWA._pickerLoaded`）：手动唤醒重复注入时只初始化一次，避免双按钮/双事件。
- UI 类名统一 `dswa-` 前缀，避免污染页面。
- 注入 HTML 一律用 `textContent`（防注入）；`innerHTML` 只用于静态模板。
- 修改代码必须同步修改对应文档（见 CLAUDE.md 规则 1 的映射表）。
