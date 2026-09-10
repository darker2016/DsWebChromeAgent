# Deepseek Web Agent (DsBrowserHelper / DsWebChromeAgent)

<div align="center">

**English** | [简体中文](README.md)

[![Chrome Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?logo=googlechrome&logoColor=white)](manifest.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Built-in Skills](https://img.shields.io/badge/Skills-44_Groups_%2B_54_Singles-blueviolet)](skills/index.json)
[![Supported Sites](https://img.shields.io/badge/AI_Sites-DeepSeek_%7C_ChatGPT_%7C_Kimi_%7C_Doubao_%7C_Gemini-FF6B6B)](#-supported-platforms-matrix)

**Instantly inject 90+ multi-agent expert teams and specialized skills into DeepSeek, ChatGPT, Kimi, Doubao, Gemini, and other AI chat web apps — turning ordinary conversations into collaborative multi-agent workspaces with zero API cost!**

</div>

---

## 📖 Overview

**Deepseek Web Agent (DsBrowserHelper / DsWebChromeAgent)** is a Chrome Extension (Manifest V3) designed to superpower your AI web chat experience.

When chatting on AI platforms (such as DeepSeek, Kimi, Doubao, ChatGPT, Gemini, Tongyi Qianwen, etc.), a floating "**Skills**" widget appears in the bottom-right corner. In one click, you can browse and insert **44 collaborative multi-agent expert teams**, **54 standalone professional skills**, or **your own custom skills**. 

The extension automatically formats structured **guidance prompts + skill definitions + execution protocols** and injects them directly into the web chat's input box. Once sent, the AI immediately assumes the persona of a lead specialist or coordinates an entire team of virtual experts.

### 📸 Screenshots

#### 1. In-Chat Multi-Agent Team & Skill Picker (DeepSeek Example)
> Click the floating button to search and pick from 98+ skills, then automatically inject team leader orchestration instructions and member role definitions into the chat box with one click.

![DeepSeek Chat Skill Picker](docs/images/deepseek-chat-skill-picker.jpg)

#### 2. Extension Options · Custom Skills Management & Upload
> Upload single `.md` skill files or entire expert team directories with frontmatter metadata. Persisted locally via `chrome.storage` and instantly available in the floating panel.

![Extension Options Custom Skills](docs/images/options-custom-skills.jpg)

---

## ✨ Key Features

- 👥 **44 Collaborative Multi-Agent Expert Teams**
  - Includes *AI Investment Masters (21 roles)*, *A-Share Equity Research (7 roles)*, *MVP Full-Stack Dev Team (7 roles)*, *Deep Research Group*, *Enterprise Legal & Compliance*, *Video Production Studio*, etc.
  - Automatically binds Team Lead orchestration with multi-specialist definitions for structured SOP outputs (roundtable discussions, multi-angle reviews, and phased deliveries).
- 🎯 **54 Standalone Professional Skills**
  - Document intelligence (Word docx, PDF parsing, PPTX outline/slides, Excel modeling).
  - Official Anthropic skills (Frontend Design, UI/UX Review, Web Testing) + Doubao & Feishu productivity suites (Copywriting, Scriptwriting, Legal Review, Feishu Docs/Base/Sheets integration).
- 🚀 **Intelligent Prompt Wrapper & Web-Runtime Alignment**
  - Injected prompts are wrapped with battle-tested guidance templates, execution protocols, and web-runtime notices (instructing LLMs to simulate tool outputs purely within conversational chat).
- 📁 **Custom User Skills Ecosystem**
  - Easily import custom `.md` skills or multi-role directories in the options page.
  - Safe, local-only storage via `chrome.storage`, seamlessly combined with built-in skills.
- 🌐 **Seamless Multi-Platform Support & Manual Activation**
  - Native DOM adapters for major AI platforms (handling contenteditable rich-text and textareas).
  - Universal fallback adapter: click **"Enable extension on this page"** in the extension popup on any unsupported AI web app.
- ⚡ **Zero API Keys · Zero Proxy Servers · 100% Privacy & Free**
  - 100% client-side injection. No backend servers, no API tokens needed, zero telemetry on your conversations.
- 🔍 **Real-Time Search & Category Filtering**
  - Instant search by title or description, filtered across 15+ domains (Investment, Development, Content, Legal, Marketing, HR, Education, etc.).

---

## 🌐 Supported Platforms Matrix

Native automated detection and injection are provided for the following platforms:

| Platform | Domain / URL Pattern | Activation Mode |
| :--- | :--- | :--- |
| **DeepSeek** | `chat.deepseek.com` | Automatic |
| **Kimi** | `kimi.moonshot.cn`, `kimi.com` | Automatic |
| **Doubao** | `doubao.com` | Automatic |
| **ChatGPT** | `chatgpt.com`, `chat.openai.com` | Automatic |
| **Google Gemini** | `gemini.google.com` | Automatic |
| **Tongyi Qianwen (Qwen)** | `tongyi.aliyun.com`, `qianwen.aliyun.com` | Automatic |
| **Zhipu Qingyan (GLM)** | `chatglm.cn` | Automatic |
| **Tencent Yuanbao** | `yuanbao.tencent.com` | Automatic |
| **Baidu Wenxin (Ernie)** | `yiyan.baidu.com` | Automatic |
| **Any other AI Web App** | Any URL | Click Extension Icon → **"Enable extension on this page"** |

---

## 🚀 Installation & Getting Started

### Method 1: Load Unpacked in Chrome (Recommended)

1. **Clone or Download this Repository**:
   ```bash
   git clone https://github.com/darker2016/DsWebChromeAgent.git
   ```
2. **Load Extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable **"Developer mode"** in the top-right corner.
   - Click **"Load unpacked"** in the top-left corner.
   - Select the cloned `DsWebChromeAgent` directory.
3. **Usage**:
   - Open [chat.deepseek.com](https://chat.deepseek.com) or any supported AI chat page.
   - Click the **"技能" (Skills)** button in the bottom-right corner.
   - Select or search for an Expert Team or Single Skill, then click **"插入" (Insert)**.
   - The formatted prompt is injected into the input box — hit send to start!

---

### Method 2: Developer Build & Skill Sync (Optional)

If you wish to synchronize upstream open-source skill libraries or modify indexing:

```bash
# 1. Sync skills and rebuild the index registry
bash scripts/sync-skills.sh          # Sync local WorkBuddySkillGroups expert teams
bash scripts/fetch-single-skills.sh  # Fetch single skills from anthropics/skills & doubao-skill-and-info
node scripts/build-index.js          # Rebuild skills/index.json registry

# 2. Refresh the extension in chrome://extensions/
```

---

## 🗂 Skill Ecosystem Overview

### 1. Expert Teams (44 Groups, Multi-Role & SOP Orchestration)

| Domain | Example Team | Roles & Capabilities |
| :--- | :--- | :--- |
| **Investment** | AI Investment Masters (`investment-masters-skills`) | Team Lead with 21 legendary investor personas, analysts, and risk managers |
| **A-Share Equity** | A-Share Research Team (`a-share-skills`) | Macro strategist, market decoder, equity analyst, valuation & fund flow specialists |
| **Product Dev** | MVP Development Team (`mvp-dev-skills`) | 7 roles: PM, UI Designer, System Architect, Frontend, Backend, QA, and DevOps |
| **Software Eng** | Software Development Co. (`software-company-skills`) | Full software delivery SOP: PRD → Architecture → Implementation → Test |
| **Legal** | Chinese Legal Advisory (`chatlaw-skills`) / Enterprise Legal | Case intake, legal research, precedent analysis, formal advisory drafting |
| **Deep Research** | Deep Research Team (`gpt-researcher-skills`) | Multi-source investigation, chapter-by-chapter research, and synthesis report |
| **Content Creation** | AI Content Creator (`ai-content-creator-skills`) | Creative strategist, copywriter, prompt artist, video generator and editor |
| **Short Video** | Video Dissection Lead (`video-dissection-skills`) | Viral script breakdown, filming technique analysis, and storyboard reproduction |
| **Business Ops** | Super Partner (`super-partner-skills`) / SMB Management | Business model design, monthly review, cash flow diagnosis, HR operations |
| **More Domains** | Tax compliance, SEO marketing, Sales battle, HR ops, Health coach, Parenting | See full list in `scripts/skills-manifest.txt` |

### 2. Standalone Skills (54 Single Skills)

- **Document & Productivity**: `docx` (Word processing), `pdf` (PDF deep extraction), `pptx` (Presentation structure), `xlsx` (Excel modeling), `humanize-ppt-skills`.
- **Anthropic Official Skills**: `frontend-design`, `webapp-testing`, `canvas-design`, `brand-guidelines`, etc. (17 skills, MIT licensed).
- **Doubao & Feishu Workspace Skills**: Copywriting (social media, storytelling), short video scripts, contract audit, financial report analysis, Feishu document/sheets/base/wiki collaboration (37 skills, MIT licensed).

---

## 🛠 Custom Skills Format

You can upload your own skills via the extension options page:

### 1. Standalone Skill (`.md` file)
```markdown
---
name: Your Skill Name
description: Brief summary of what this skill does and when to trigger it
category: Content Creation
---

# Role and instructions...
```

### 2. Expert Team Directory
Upload a directory containing a team lead `SKILL.md` along with member role files. The extension automatically extracts frontmatter metadata and builds the collaborative team package.

---

## 📚 Documentation Index

| Document | Description |
| :--- | :--- |
| 🏗 [docs/architecture.md](docs/architecture.md) | System architecture, module responsibilities, data flow, and messaging protocols |
| 🧩 [docs/skill-system.md](docs/skill-system.md) | Skill registry format, synchronization scripts, and adding new skills |
| 🔌 [docs/site-adapters.md](docs/site-adapters.md) | Multi-site DOM adapter design, selector registry, and universal activation |
| 💻 [docs/development.md](docs/development.md) | Local debugging tips, CSS isolation, and verification test cases |
| 📜 [docs/release.md](docs/release.md) | Release workflows, open source licensing, and attribution registry |

---

## 🤝 Attribution & Acknowledgements

- **Expert Team Skills**: Originates from [WorkBuddySkillGroups](https://github.com/darker2016/workbuddy-skill-groups), copyright belongs to respective upstream authors.
- **Standalone Skills**:
  - [anthropics/skills](https://github.com/anthropics/skills) (MIT License)
  - [DeepJH/doubao-skill-and-info](https://github.com/DeepJH/doubao-skill-and-info) (MIT License, Doubao & Feishu open-source skills)
- **Extension Codebase**: Licensed under the [MIT License](LICENSE).
- **Trademarks**: DeepSeek, ChatGPT, Kimi, Doubao, Gemini, Claude, and other trademarks are the property of their respective owners. This is an independent open-source browser extension with no official affiliation.

---

## ⚠️ Disclaimer

This extension provides prompt injection assistance within the user's browser. AI responses are generated solely by third-party language models according to the injected prompts. Outputs are for educational, research, and productivity assistance only, and do not constitute professional investment, legal, financial, or medical advice.
