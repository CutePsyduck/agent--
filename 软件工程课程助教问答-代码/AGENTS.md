# 软件工程课程知识问答智能体 - 需求拆解文档

## 产品概述

- **产品类型**: 知识问答智能体网站（RAG 架构）
- **场景类型**: <scene_type>prototype-app</scene_type>
- **目标用户**: 学习《实用软件工程（第3版）》的学生、课程教师、软件工程自学者
- **核心价值**: 基于教材知识库的精准问答 + 严格拒答机制 + 可评测的 RAG 智能体，辅助软件工程课程学习与教学
- **界面语言**: 中文
- **主题偏好**: 浅色
- **导航模式**: 路径导航
- **导航布局**: Topbar（教育工具类，用户面向学习者，顶部导航简洁清晰）

---

## 页面结构总览

| 页面名称 | 文件名 | 路由 | 页面类型 | 入口来源 |
|---------|-------|------|---------|---------|
| 知识问答 | `ChatPage.tsx` | `/` | 一级 | 导航 |
| 系统 Prompt | `PromptPage.tsx` | `/prompt` | 一级 | 导航 |
| 智能评测 | `EvalPage.tsx` | `/eval` | 一级 | 导航 |

> **页面精简原则校验**：用户明确建议了 3 个页面，分别对应 3 个独立用户目标（提问学习 / 查看 Prompt 设计 / 评测智能体），互不重叠，故保留 3 页。

---

## 页面布局建议

### 知识问答页（首页）
- **布局模式**: 主从布局（左侧对话列表 + 右侧主聊天区）—— 桌面端左右分栏，移动端上下堆叠
- **视觉重心**: 聊天对话区（核心交互区域）
- **结果承载区**: 聊天气泡流，支持 Markdown 渲染、章节引用标注；初始态为欢迎语 + 示例问题推荐
- **左侧辅助区**: 对话历史列表（新建对话 / 历史会话切换）

### 系统 Prompt 页
- **布局模式**: 单栏居中
- **视觉重心**: Prompt 文本展示区
- **结果承载区**: 代码块形式展示完整 System Prompt，附带分段说明（角色设定 / 知识库范围 / 回答规则 / 拒答规则 / 引用要求）

### 智能评测页
- **布局模式**: 上下分区（上方题库概览 + 操作区，下方评测结果区）
- **视觉重心**: 评测结果统计 + 详细答题表格
- **结果承载区**: 评测结果面板（统计卡片 + 图表 + 逐题详情表格）；初始态为题库列表 + "开始评测"按钮

---

## 插件规划

> **说明**：本智能体核心依赖 AI 文本生成（RAG 问答）和语义检索能力，需使用 AI 插件。知识库文件在 design-agent 阶段通过插件配置加载。

| 插件实例名称 | 基于官方插件 | 业务用途 | 输出模式 | 所属页面 |
|------------|-----------|---------|---------|---------|
| 软件工程课程问答 | ai-text-generate | 基于教材知识库的 RAG 问答，包含拒答判定、章节引用标注 | stream | 知识问答页、智能评测页 |

---

## 导航配置

- **导航布局**: Topbar（顶部固定）
- **导航项**（一级页面）:

| 导航文字 | 路由 | 图标(可选) |
|---------|------|-----------|
| 知识问答 | `/` | MessageSquare |
| 系统 Prompt | `/prompt` | Code |
| 智能评测 | `/eval` | BarChart3 |

> **路由一致性校验**：导航配置的 3 个路由与页面结构总览完全一致。

---

## 数据来源声明

| 数据/操作 | 来源类型 | 实现要求 | mock 兜底 |
|---|---|---|---|
| 教材知识库 | real-file | 加载《实用软件工程（第3版）》TXT 文件作为 RAG 唯一知识源，文件链接为 https://aka.doubaocdn.com/s/fopU2J7odj | 无（知识库为必备数据源） |
| RAG 问答生成 | real-plugin | 调用 ai-text-generate 插件实例，传入用户问题 + 检索到的教材片段 + System Prompt，流式输出回答 | 失败提示（toast "智能体服务暂不可用"） |
| 对话历史 | local-persist | localStorage key=`__rag_se_chat_history`，保存多轮会话记录 | 初始为空状态，首访展示欢迎语 |
| 系统 Prompt 文本 | demo-mock | `src/data/systemPrompt.ts` 中定义完整 System Prompt 常量 | ✅ 本身就是设计态静态内容 |
| 评测题库 | demo-mock | `src/data/evalQuestions.ts` 中预置 10-15 道知识库内题 + 10-15 道超范围干扰题，每题含 id/question/expectedType/category | ✅ 本身就是 mock 评测集 |
| 评测结果 | local-persist | localStorage key=`__rag_se_eval_results`，保存历史评测记录 | 无（首次运行评测时生成） |
| 评测运行 | real-plugin | 逐题调用 ai-text-generate 插件实例，收集每道题的实际回答并判定正误 | 失败提示（toast "评测执行失败，请重试"） |

> **插件规划一致性校验**：「软件工程课程问答」插件实例 ↔ 「RAG 问答生成」「评测运行」两行均为 `real-plugin` 类型，mock 兜底均为失败提示/无，符合插件铁律。

---

## 功能列表

### 知识问答页（`/`）
- **页面目标**: 用户通过聊天式交互，向智能体提问软件工程课程问题，获得基于教材的准确回答
- **功能点**:
  - **多轮对话聊天**: 聊天框输入问题 → 流式输出回答 → 支持多轮上下文追问；回答中包含教材章节引用标注
  - **拒答机制展示**: 当问题超出教材范围时，智能体输出标准拒答话术，且在回答气泡上标注「超出范围」标签
  - **对话历史管理**: 左侧会话列表，支持新建对话、切换历史对话、删除对话；对话数据持久化到 localStorage
  - **示例问题推荐**: 初始态展示 3-5 个推荐问题（如"什么是软件过程模型？""黑盒测试和白盒测试有什么区别？"），点击快速提问
  - **引用来源展示**: 回答展开后可查看引用的教材章节和原文片段（来自知识库检索结果）

### 系统 Prompt 页（`/prompt`）
- **页面目标**: 展示智能体的完整 System Prompt 设计，让用户了解 Prompt 工程的实现逻辑
- **功能点**:
  - **完整 Prompt 展示**: 代码块形式展示完整 System Prompt 文本，支持一键复制
  - **分段解析说明**: 将 Prompt 按模块（角色设定 / 知识库范围 / 回答规则 / 拒答规则 / 引用格式要求 / 输出格式）拆分并附带说明文字
  - **Prompt 版本信息**: 展示版本号和更新说明

### 智能评测页（`/eval`）
- **页面目标**: 运行预置题库评测智能体的问答准确率和拒答准确率，展示评测结果
- **功能点**:
  - **题库概览展示**: 以卡片/标签形式展示题库组成（知识库内 N 道 / 超范围 N 道，覆盖章节分布）
  - **一键运行评测**: 点击「开始评测」按钮 → 逐题调用智能体回答 → 显示进度条 → 完成后展示结果
  - **评测统计结果**: 顶部 KPI 卡片展示：知识库内准确率、超范围拒答率、综合评分；配合环形图/柱状图可视化
  - **逐题详情表格**: 表格列：题号、题目、类型（知识库内/超范围）、预期行为、智能体实际回答、是否正确；支持按类型筛选
  - **历史评测记录**: 保存最近 N 次评测结果，可切换查看历史评测详情

---

## 数据共享配置

| 存储键名 | 数据说明 | 使用页面 |
|---------|---------|---------|
| `__rag_se_chat_history` | 多轮对话历史，类型 `IChatSession[]` | 知识问答页 |
| `__rag_se_eval_results` | 历史评测记录，类型 `IEvalResult[]` | 智能评测页 |

```ts
// 对话消息
interface IChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: string[]; // 引用的教材章节
  isRefused?: boolean; // 是否为拒答
  timestamp: number;
}

// 对话会话
interface IChatSession {
  id: string;
  title: string;
  messages: IChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// 评测题目
interface IEvalQuestion {
  id: string;
  question: string;
  category: 'in-scope' | 'out-of-scope'; // 知识库内 / 超范围
  expectedBehavior: string; // 预期行为描述
  chapter?: string; // 对应章节（知识库内题目填写）
}

// 单题评测结果
interface IEvalItemResult {
  questionId: string;
  actualAnswer: string;
  isCorrect: boolean;
  isRefused: boolean;
}

// 评测结果
interface IEvalResult {
  id: string;
  totalQuestions: number;
  inScopeCount: number;
  outOfScopeCount: number;
  inScopeAccuracy: number; // 知识库内准确率 0-100
  outOfScopeRefuseRate: number; // 拒答率 0-100
  overallScore: number; // 综合评分 0-100
  details: IEvalItemResult[];
  createdAt: number;
}

-------

<scene_type>prototype-app</scene_type>

# UI 设计指南

## 1. 设计推导依据

- **参考意图**: Free Direction —— 无参考材料，从软件工程课程与 RAG 智能体的产品语义出发自主设计
- **核心情绪 / 应用类型**: 教学工具的严谨、可信、清晰 —— 课程知识问答 + 评测工具型应用
- **独特记忆点**: 教材页码引用徽章 + 拒答状态的柔和警示色，用「助教级精确感」替代通用 AI 聊天的科技感

## 2. Art Direction

- **方向名**: 学术终端 Academic Terminal
- **Design Style**: Swiss Minimalist + 轻度 Terminal 感 —— 瑞士极简保证课程知识的严谨可读性，终端感暗示 RAG 检索与评测的技术内核
- **DNA 参数**: 圆角 subtle (rounded-md) / 阴影 subtle (shadow-sm) / 间距 standard (gap-4, p-6) / 字体方向：无衬线正文 + 等宽代码辅助 / 装饰手法：细边框、引用徽章、等宽标签
- **应用类型**: Tool —— 三栏 / 顶部导航 + 主工作区，问答为主，评测和 Prompt 页为辅

## 3. Color System

**色彩关系**: 墨青主色 + 同色系浅灰辅助底 + 象牙白阅读背景 + 琥珀色拒答警示
**配色设计理由**: 墨青传达教材与学术的严谨可信，象牙白底降低长文阅读疲劳，琥珀色专用于拒答/越界提示而不与成功绿混淆，整体克制不抢内容
**主色推导**: 从软件工程教材的技术属性与课程助教角色出发，选用偏冷的墨青色（非标准蓝），既保留工具信任度又有教学内容的沉静感
**使用比例**: 65% 中性 / 25% 辅助 / 10% primary；primary 仅用于主按钮、发送动作、当前页签，引用徽章用 accent，拒答用语义色

| 角色 | CSS 变量 | Tailwind Class | HSL 值 | 设计说明 |
|---|---|---|---|---|
| bg | `--background` | `bg-background` | hsl(40 20% 98%) | 象牙白页面背景，接近教材纸张感 |
| card | `--card` | `bg-card` | hsl(0 0% 100%) | 聊天气泡、卡片、评测结果面板 |
| text | `--foreground` | `text-foreground` | hsl(210 25% 14%) | 正文与标题，深墨灰 |
| textMuted | `--muted-foreground` | `text-muted-foreground` | hsl(210 12% 45%) | 时间戳、辅助说明、placeholder |
| primary | `--primary` | `bg-primary` / `text-primary` | hsl(200 85% 32%) | 墨青主色，主交互与品牌锚点 |
| primaryForeground | `--primary-foreground` | `text-primary-foreground` | hsl(0 0% 100%) | 主按钮文字 |
| accent | `--accent` | `bg-accent` | hsl(200 25% 94%) | hover/focus 浅底、菜单项选中、引用徽章底 |
| accentForeground | `--accent-foreground` | `text-accent-foreground` | hsl(200 85% 28%) | accent 上的文字与图标 |
| border | `--border` | `border-border` | hsl(210 12% 88%) | 输入框、卡片、分隔线 |

**语义色提示**:
- 拒答/越界（amber）：bg `hsl(38 90% 94%)` / border `hsl(38 80% 70%)` / text `hsl(32 95% 30%)` —— 饱和度与 primary 对齐，仅用于拒答气泡边框与提示标签
- 成功（green）：bg `hsl(140 50% 94%)` / border `hsl(140 40% 70%)` / text `hsl(145 70% 22%)` —— 用于评测正确项，饱和度低于 primary 5%
- 错误（red）：bg `hsl(0 60% 95%)` / border `hsl(0 50% 75%)` / text `hsl(0 70% 30%)` —— 用于评测错误项，饱和度与 primary 对齐 ±10%

## 4. 字体与节奏

- **font-display**: Noto Sans SC —— 标题与问答正文，清晰中性的中文无衬线，符合教材阅读习惯
- **font-body**: Noto Sans SC + IBM Plex Mono 辅助 —— 正文中英文混排；代码、Prompt 内容、章节引用徽章使用等宽体
- **字号**: H1 text-4xl；H2 text-2xl；body text-base；muted text-sm；等宽引用标签 text-xs
- **圆角**: 小 (rounded-md) —— 卡片与气泡统一 6-8px，保持教材与工具的克制感

## 5. 全局布局契约

- **Reference Layout Use**: 按需求结构推导，三页架构（问答 / Prompt / 评测）
- **Page / Section Order**: 问答首页 → 系统 Prompt 页 → 评测页，与需求文档 1:1 对齐
- **Standard Content Zone**: 问答页 `max-w-4xl` + `mx-auto`（聊天阅读舒适宽度）；Prompt 页与评测页 `max-w-5xl` + `mx-auto`
- **Shell / Frame Alignment**: 顶部导航栏与内容区同宽对齐，内容区独立滚动
- **Padding & Rhythm**: `px-4 md:px-6 lg:px-8 py-6 md:py-10`，垂直间距 8px 倍数
- **Full-bleed Zones**: 无全宽 Hero；聊天输入栏底部固定全宽但内容受 max-w 约束
- **Local Narrowing**: 问答正文气泡内边距适中；Prompt 展示页代码块可收窄至 `max-w-3xl` 居中
- **Overflow Strategy**: 评测结果大表格使用 `overflow-x-auto`；代码块水平滚动
- **Flexibility Boundary**: 允许移动端气泡宽度、卡片内边距微调；不允许切换主色、圆角或阴影语言

## 6. 视觉与动效

- **装饰**: 细边框引用徽章、等宽章节标签、左侧 2px 引用竖线
- **阴影/边界**: 轻 —— 卡片与气泡用 `shadow-sm`，输入框与分隔依赖 border
- **动效**: 克制 —— hover 背景色过渡 150ms；消息入场轻微淡入；打字指示器用三点脉冲

## 7. 组件原则

- 聊天气泡：用户问靠右浅色底，智能体答靠左白底 + 左侧墨青竖线 + 底部章节引用徽章
- 拒答气泡：左侧琥珀色竖线 + 顶部「超出范围」等宽小标签，文字用标准正文色
- 引用徽章：等宽字体，accent 底 + accentForeground 字，圆角 pill，形如「第 5 章 · p.128」
- 按钮、输入框、菜单必须有 Default / Hover / Active / Focus-visible / Disabled 状态
- 加载与空状态延续纸张底 + 细边框风格，不使用默认渐变或占位图

## 8. Image Direction

- **Image Role**: 无强制图片需求，优先通过排版、引用徽章和等宽标签建立视觉记忆点
- **Image Art Direction**: 无
- **Image Prompt Keywords**: 无
- **Image Avoidance**: 避免通用 AI 机器人头像、科技感渐变背景、商务人物素材图

## 9. Anti-patterns

- **Split personality**: 三页各自使用不同色板或圆角；全站共享同一套视觉系统
- **Phantom tokens**: 编造 shadcn/ui 不存在的 CSS 变量；只用已定义 token 或在主题里补齐
- **Default chatbot drift**: 回到紫色渐变、圆润机器人头像、发光输入框；用教材语义重塑界面
- **Invisible interaction**: hover/active 做了，focus-visible 丢了；每个可交互元素都要有键盘可见状态
- **Mono-hue tyranny**: 主色同时用于按钮、tab、icon、边框、链接、徽章；按 65-25-10 分配，引用徽章用 accent
- **Status color drift**: 拒答琥珀色饱和度过高喧宾夺主；语义色饱和度与 primary 对齐 ±10%
- **Citation neglect**: 回答不展示教材章节来源；RAG 产品的可信度核心是可溯源引用