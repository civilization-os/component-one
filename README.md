# Component One

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178c6.svg)](https://www.typescriptlang.org/)
[![npm workspaces](https://img.shields.io/badge/npm-workspaces-cb3837.svg)](https://docs.npmjs.com/cli/using-npm/workspaces)

> Chinese documentation: [README.zh-CN.md](./README.zh-CN.md)

`component-one` is the civilization-os AI component library. Each package is designed as an isolated, portable capability that other projects can install and compose on their own.

This repository is intentionally not a workflow engine. Components do not depend on each other by default, and this repo does not prescribe how downstream projects combine them.

## Structure

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

## Packages

| Package | Status | Description |
| --- | --- | --- |
| `@civilization-os/example-pack` | Private example | A minimal package template that is not published. |
| `@civilization-os/pptx-presets` | Initial | Reusable PPTX template presets for presentation generators. |

## Development

Install dependencies:

```bash
npm install
```

Build all packages:

```bash
npm run build
```

Type-check all packages:

```bash
npm run typecheck
```

## Package Principles

- Keep every package independently understandable, buildable, and publishable.
- Prefer explicit input and output types.
- Avoid cross-package dependencies unless a shared utility is truly stable.
- Document purpose, input, output, dependencies, and usage in each package README.

## Publishing

Each real component under `packages/*` owns its own `package.json`, so it can be published independently when it is ready. The `example-pack` package is private and only exists as a template.

```bash
npm publish --workspace @civilization-os/<package-name> --access public
```
