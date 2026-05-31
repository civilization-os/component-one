# 构建一个轻量级演示运行时

> `@civilization-os/ppt` 测试资产
> 目标：为 `markdown -> deck.json -> 演讲资产包` 提供一份内容丰富的中文输入

## 为什么这个方向重要

传统幻灯片工具通常会优先优化两类目标中的一类：

- 面向办公文件的撰写与编辑
- 面向现场讲解的呈现与播放

对于 `component-one` 来说，第二类更值得作为产品中心。

讲者备注：
摘要：先讲清楚“撰写态”和“演讲态”的区别，这是整个设计的起点。
提示：把这一页当成开场对照。
强调：presentation runtime

---

## 核心产品想法

我们希望对外只有一个 PPT 包，但它内部的真实能力更接近“演示运行时”。

这意味着它至少要具备：

1. 结构化内部模型
2. 可预测的渲染结果
3. 逐步推进的讲解能力
4. 轻量而稳定的导出形式

一句话总结：

`txt / markdown -> deck.json -> runtime -> html bundle / pptx`

---

## 生命周期拆分

这个能力至少有两种不同的产品状态：

::: two-column {#authoring-presenting-split}
left:
撰写态强调可编辑、可修改、可继续生产。
它更接近办公文件和内容整理过程。

right:
演讲态强调可播放、可讲解、可稳定展示。
它更接近运行时和现场呈现过程。
:::

| 状态 | 主要任务 | 典型产物 | {#state-artifact-table}
| --- | --- | --- |
| 撰写态 | 组织与修改内容 | 可编辑 `.pptx` |
| 演讲态 | 现场讲解与展示 | HTML 演讲资产包 |

这意味着系统不应该把 `.pptx` 当成唯一真相。

讲者备注：
摘要：要强调文件格式只是输出结果，不应该成为系统核心模型。
第3步 提示：[authoring-presenting-split] 先停在双列对照上，再转到表格。
第4步 节奏：[state-artifact-table] 这里停半拍，再切到导出层。

---

## 内部模型建议

建议从下面这几个概念出发：

- `deck`
- `slide`
- `step`
- `block`
- `action`

每一页可以有多个 step。每个 step 可以逐步展示或强调不同 block。

正是这层 step，决定了它不是静态文档，而是一个有时间线的演示过程。

---

## 一个最小 schema 草图

```ts
type Deck = {
  title: string;
  slides: Slide[];
};

type Slide = {
  id: string;
  title?: string;
  notes?: string;
  steps: Step[];
};

type Step = {
  id: string;
  blocks: Block[];
  actions?: Action[];
};
```

字段细节以后可以继续补，但层级关系最好尽早定住。

---

## 渲染策略建议

第一版比较稳的做法是：

- 用 HTML 和 CSS 渲染主要内容
- 用 SVG overlay 承载聚光灯、激光笔、高亮等效果
- 用一个小型播放状态机驱动 next / previous

除非布局需求很快复杂到不可控，否则不要第一版就上 canvas。

![运行时舞台概览](https://example.com/runtime-stage-overview.png)

---

## MVP 需求清单

第一版建议刻意收窄：

::: callout
第一版先把“能稳定演讲”做对，不要急着把它变成一个重编辑器。
:::

- 可以直接在浏览器中打开
- 支持键盘翻页
- 支持按 step 逐步推进
- 支持 speaker notes
- 支持独立的 speaker view
- 支持生成无需额外构建的静态演讲资产包

先不做这些：

- 自由白板编辑
- 协同编辑
- 音视频时间线
- 复杂媒体编排

---

## 一个演讲推进示例

假设有一页在讲运行时架构： {#sequence-setup}

::: timeline {#runtime-timeline}
规划：先定义 deck 模型与校验边界
运行时：再实现播放、备注和动作渲染
导出：最后把同一份 deck 投影到 HTML 与 PPTX
:::

1. 先显示标题
2. 再出现三层运行时结构
3. 再聚焦播放控制器
4. 最后强调导出器与核心模型的关系 {#runtime-sequence}

这已经不是单纯的内容排版，而是“内容 + 讲解推进”的组合。

讲者备注：
摘要：这一页的目的是逼着我们显式建模 `step` 和 `action`。
第2步 提示：[sequence-setup] 先讲时间线，再讲控制器。
第2步 聚光灯：[sequence-setup]
第3步 强调：[runtime-timeline] 播放控制器
第3步 高亮：[runtime-timeline]
第7步 强调：[runtime-sequence] 导出器与核心模型
第7步 出现：[runtime-sequence]
第7步 激光：0.15,0.72 -> 0.42,0.50 -> 0.74,0.33

---

## 技术栈建议

基础技术栈可以很轻：

::: metrics
Deck 模型覆盖：稳定
HTML 运行时：推进中
PPTX 导出：兼容
:::

- TypeScript
- zod 做 schema 校验
- 静态 HTML 模板
- CSS 主题变量
- SVG overlay 渲染层

可选导出层：

- `pptxgenjs` 用于生成可编辑 PowerPoint

最重要的一条原则是：所有导出器都消费 `deck.json`，而不是直接消费 markdown。

---

## 风险与待定问题

::: comparison
left: 撰写路径
right: 演讲路径
校验边界 | 内容编辑更宽松 | 运行时输入更严格
主要产物 | 可编辑 .pptx | 可直接打开的 HTML 资产包
关注重点 | 修改与交付 | 播放与讲解
:::

- markdown 到 deck 的转换应该有多严格？
- 哪些 markdown 结构值得升级成一等 block？
- speaker notes、演讲提示和正文内容该如何分离？
- 导出 `.pptx` 时，是保留最终静态状态，还是保留 step 的边界信息？

这些问题比单纯的渲染细节更影响产品最终形态。

---

## 最后的判断

这个产品不应该是：

- 一个办公幻灯片的薄封装
- 一个很重的课堂系统
- 一个通用 markdown 幻灯片克隆

它应该是：

> 一个有统一 PPT 门面的轻量演示运行时

这样同一套内容就更容易被生成、播放、讲解，并在之后投影到不同输出格式上。
