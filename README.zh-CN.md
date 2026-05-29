# Component One

`component-one` 是 civilization-os 的 AI 原子组件库。每个包都尽量保持独立、隔离、可移植，供其他项目按需安装和自行组合。

这个仓库不做工作流编排，也不强制规定下游项目怎么组合组件。

## 目录结构

```txt
component-one/
  packages/
    example-pack/
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
- 优先提供明确的输入输出类型。
- 默认避免组件之间互相依赖。
- 每个包的 README 需要说明用途、输入、输出、依赖和用法。

`example-pack` 只是模板示例，已标记为私有包，不会发布到 npm。
