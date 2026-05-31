# Component One

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178c6.svg)](https://www.typescriptlang.org/)
[![npm workspaces](https://img.shields.io/badge/npm-workspaces-cb3837.svg)](https://docs.npmjs.com/cli/using-npm/workspaces)

> Chinese documentation: [README.zh-CN.md](./README.zh-CN.md)

`component-one` is the civilization-os AI component library. Each package is designed as an isolated, portable capability that other projects can install and compose on their own.

This repository is intentionally not a workflow engine. Components do not depend on each other by default, and this repo does not prescribe how downstream projects combine them.

## Project Characteristic

`component-one` prefers one public facade per capability category.

If a repository consumer needs "PPT", they should find one obvious PPT component instead of choosing between multiple overlapping packages. Different generation strategies, runtimes, or output formats can exist behind that facade, but the public entry point should stay simple.

This is a deliberate repository rule:

- expose one obvious package for one capability category
- hide format-specific or implementation-specific complexity behind the facade
- optimize for discoverability, not internal taxonomy
- avoid making downstream teams decide between several near-duplicate packages

## Structure

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

## Packages

| Package | Status | Description |
| --- | --- | --- |
| `@civilization-os/example-pack` | Private example | A minimal package template that is not published. |
| `@civilization-os/ppt` | MVP | Unified PPT facade package with `text/markdown -> deck -> html bundle / editable .pptx` support. |

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

Run tests:

```bash
npm test
```

## Package Principles

- Keep every package independently understandable, buildable, and publishable.
- Prefer one public facade per capability category instead of multiple overlapping packages.
- Prefer explicit input and output types.
- Avoid cross-package dependencies unless a shared utility is truly stable.
- Document purpose, input, output, dependencies, and usage in each package README.

## Publishing

Each real component under `packages/*` owns its own `package.json`, so it can be published independently when it is ready. The `example-pack` package is private and only exists as a template.

```bash
npm publish --workspace @civilization-os/<package-name> --access public
```
