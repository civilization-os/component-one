# @civilization-os/pptx-presets

Reusable PPTX template presets for presentation generators.

This package does not generate simple decks by itself. It only provides structured presentation presets: themes, slide sizes, layout names, placeholder positions, and intended layout purposes. Downstream projects, AI agents, or presentation skills can use these presets with their own PPTX generation pipeline.

## Install

```bash
npm install @civilization-os/pptx-presets
```

## Usage

```ts
import { requirePptxPreset } from "@civilization-os/pptx-presets";

const preset = requirePptxPreset("executive-report");
const layout = preset.layouts.find((item) => item.id === "metric-grid");
```

## Presets

| Preset | Purpose |
| --- | --- |
| `executive-report` | Strategy reviews, board updates, and operating summaries. |
| `technical-brief` | Architecture, system design, and implementation reviews. |
| `product-showcase` | Product narratives, feature walkthroughs, and demo-heavy decks. |

## API

### `listPptxPresets()`

Returns all available presets.

### `getPptxPreset(id)`

Returns a preset by id, or `undefined`.

### `requirePptxPreset(id)`

Returns a preset by id, or throws when the id is unknown.
