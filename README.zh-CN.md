# Component One

`component-one` 是 civilization-os 的 AI 原子组件库。每个包都尽量保持独立、隔离、可移植，供其他项目按需安装和自行组合。

这个仓库不做工作流编排，也不强制规定下游项目怎么组合组件。

## 项目特点

`component-one` 对同一类能力只暴露一个对外门面。

如果使用方要找的是 “PPT”，那就应该直接看到一个清晰的 PPT 组件，而不是在多个相近包之间做选择。不同的生成策略、运行时或者输出格式可以存在于内部实现里，但对外入口要尽量简单。

这是这个仓库的明确规则：

- 一类能力只提供一个清晰的公开包
- 格式差异和实现细节尽量收敛在门面后面
- 优先考虑可发现性，而不是内部分类做得多细
- 避免让下游项目在多个近似组件之间自己判断该选哪个

## 目录结构

```txt
component-one/
  packages/
    example-pack/
      src/
      package.json
      README.md
    ppt/
      src/
      package.json
      README.md
  package.json
  tsconfig.base.json
```

## 当前包

| 包名 | 状态 | 说明 |
| --- | --- | --- |
| `@civilization-os/example-pack` | 私有示例 | 一个不会发布的最小包模板。 |
| `@civilization-os/ppt` | MVP | 统一的 PPT 门面包，当前支持 `text/markdown -> deck -> html bundle / editable .pptx`。 |

## 开发

安装依赖：

```bash
npm install
```

构建所有包：

```bash
npm run build
```

类型检查：

```bash
npm run typecheck
```

## 组件原则

- 每个包都应该能独立理解、独立构建、独立发布。
- 同一类能力优先只暴露一个公开门面，而不是多个相近包。
- 优先提供明确的输入输出类型。
- 默认避免组件之间互相依赖。
- 每个包的 README 需要说明用途、输入、输出、依赖和用法。

`example-pack` 只是模板示例，已标记为私有包，不会发布到 npm。
