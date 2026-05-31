# @civilization-os/ppt

Unified PPT facade package for source ingestion, deck modeling, and presentation output generation.

`@civilization-os/ppt` is the public PPT entry point for `component-one`.

Current MVP loop:

```txt
source -> deck -> html bundle / pptx
```

Current status:

- source input: `text`, `markdown`
- required source parameter: `language`
- stable intermediate model: `deck`
- export targets:
  - `editable-pptx`
  - `html-bundle`
- engines:
  - `pptx`
  - `html`

## Install

```bash
npm install @civilization-os/ppt
```

## Usage

```ts
import { createDeckFromSource, createPresentation } from "@civilization-os/ppt";

const deck = createDeckFromSource({
  language: "en-US",
  sourceKind: "markdown",
  presetId: "technical-brief",
  content: "# Runtime Design\n\nA lightweight presentation runtime."
});

const result = await createPresentation()
  .preset("technical-brief")
  .target("html-bundle")
  .input(deck)
  .output({ mode: "file", path: "./artifacts/runtime-design-bundle" })
  .build();
```

## Presets

| Preset | Purpose |
| --- | --- |
| `executive-report` | Strategy reviews, board updates, and operating summaries |
| `technical-brief` | Architecture, system design, and implementation reviews |
| `product-showcase` | Product narratives, feature walkthroughs, and demo-heavy decks |

## API

### `createPresentation()`

```ts
createPresentation()
  .preset("executive-report")
  .target("editable-pptx" | "html-bundle")
  .engine("pptx" | "html") // optional
  .input(deckOrPptxInput)
  .output({ mode: "memory" } | { mode: "file", path: "..." })
  .build();
```

### `createDeckFromSource(input)`

```ts
createDeckFromSource({
  language: "zh-CN" | "en-US",
  sourceKind: "text" | "markdown",
  content: "...",
  title?: "...",
  presetId?: "executive-report" | "technical-brief" | "product-showcase"
});
```

### `validateDeck(input)`

Validates external deck JSON before generation.

### `deckToPptxInput(deck)` / `pptxInputToDeck(input)`

Bridges between the deck model and the current `.pptx` input shape.

## Markdown ingest

Current markdown ingest support includes:

- headings
- paragraphs
- bullet and numbered lists
- blockquotes
- fenced code blocks
- tables
- markdown image syntax: `![caption](url-or-path)`
- directive blocks:
  - `::: callout ... :::`
  - `::: metrics ... :::`
  - `::: two-column ... :::`
  - `::: timeline ... :::`
  - `::: process ... :::`
  - `::: quadrant ... :::`
  - `::: comparison ... :::`

### Block anchors

Any block can declare a stable id with a trailing anchor:

```md
## Lifecycle Split {#lifecycle-title}

Plain paragraph text. {#plain-copy}

| State | Output | {#state-table}
| --- | --- |
| Presenting | HTML bundle |

::: timeline {#runtime-timeline}
Planning: define the deck model
Runtime: render and play
Export: project to artifacts
:::
```

Anchors matter because speaker guidance and step actions can target these ids directly instead of guessing generated ids.

## Speaker notes

Speaker note markers:

- `Speaker note:`
- `讲者备注：`
- `演讲备注：`

Speaker notes normalize into:

```ts
{
  summary?: string;
  cues?: string[];
  timing?: string[];
  emphasis?: string[];
  stepGuidance?: Array<{
    step: number;
    cue?: string;
    timing?: string;
    emphasis?: string;
    targetBlockId?: string;
    highlightTargetId?: string;
    highlightTiming?: { delayMs?: number; durationMs?: number; easing?: string };
    highlightExitTiming?: { delayMs?: number; durationMs?: number; easing?: string };
    appearTargetId?: string;
    appearTiming?: { delayMs?: number; durationMs?: number; easing?: string };
    appearExitTiming?: { delayMs?: number; durationMs?: number; easing?: string };
    spotlight?: { x: number; y: number; radius: number };
    spotlightTiming?: { delayMs?: number; durationMs?: number; easing?: string };
    spotlightExitTiming?: { delayMs?: number; durationMs?: number; easing?: string };
    laserPoints?: Array<{ x: number; y: number }>;
    laserTiming?: { delayMs?: number; durationMs?: number; easing?: string };
    laserExitTiming?: { delayMs?: number; durationMs?: number; easing?: string };
  }>;
  raw?: string;
}
```

### Generic note lines

English:

- `Summary: ...`
- `Cue: ...`
- `Timing: ...`
- `Emphasis: ...`

Chinese:

- `摘要：...`
- `提示：...`
- `节奏：...`
- `强调：...`

### Step-bound note lines

English:

- `Step 2 Cue: ...`
- `Step 3 Timing: ...`
- `Step 4 Emphasis: ...`

Chinese:

- `第2步 提示：...`
- `第3步 节奏：...`
- `第4步 强调：...`

### Step-bound block targeting

```md
Step 2 Cue: [runtime-timeline] Walk through the timeline first
Step 3 Emphasis: [decision] Final decision boundary

第2步 提示：[runtime-timeline] 先讲时间线
第3步 强调：[decision] 最终决策边界
```

### Step-bound action syntax

Highlight and appear target a visible block id:

```md
Step 3 Highlight: [runtime-timeline]
Step 4 Appear: [decision]

第3步 高亮：[runtime-timeline]
第4步 出现：[decision]
```

Spotlight supports both anchored and free modes:

```md
Step 2 Spotlight: [runtime-timeline]
Step 2 Spotlight Shape: pill
Step 2 Spotlight: 0.55, 0.42, 0.18
第2步 聚光灯：0.55, 0.42, 0.18
```

Laser takes a point chain:

```md
Step 4 Laser: 0.15,0.72 -> 0.42,0.50 -> 0.74,0.33
Step 4 Laser Anchor: target
第4步 激光：0.15,0.72 -> 0.42,0.50 -> 0.74,0.33
```

Spotlight shape options:

```md
Step 2 Spotlight Shape: auto
Step 2 Spotlight Shape: circle
Step 2 Spotlight Shape: pill
```

Laser anchor options:

```md
Step 4 Laser Anchor: target
Step 4 Laser Anchor: custom
```

These step-bound actions are projected into `step.actions` during ingest.

### Step-bound timing syntax

Enter timing:

```md
Step 3 Highlight Timing: 80, 280, ease-in-out
Step 4 Appear Timing: 140, 320, ease-out
Step 2 Spotlight Timing: 120, 420, ease-out
Step 4 Laser Timing: 260, 680, cubic-bezier(0.22,1,0.36,1)
```

Exit timing:

```md
Step 3 Highlight Exit Timing: 40, 220, ease-in
Step 4 Appear Exit Timing: 30, 200, ease-in
Step 2 Spotlight Exit Timing: 20, 180, ease-in
Step 4 Laser Exit Timing: 10, 240, ease-in
```

## Prompt contracts

The package now exposes reusable contract text for model-facing generation flows:

```ts
import {
  buildDeckJsonGenerationPrompt,
  buildMarkdownGenerationPrompt,
  getDeckJsonContract,
  getMarkdownSourceContract
} from "@civilization-os/ppt";

const markdownContract = getMarkdownSourceContract("zh-CN");
const deckJsonContract = getDeckJsonContract();
const markdownPrompt = buildMarkdownGenerationPrompt({
  language: "zh-CN",
  presetId: "technical-brief",
  mode: "presenting",
  source: "这里放原始资料",
  extraInstructions: "控制在 8 页以内。"
});
```

Recommended split:

- use `getMarkdownSourceContract(language)` when the model should produce markdown source
- use `getDeckJsonContract()` when the model should produce deck JSON directly
- use `buildMarkdownGenerationPrompt(...)` when you want a full markdown-generation prompt
- use `buildDeckJsonGenerationPrompt(...)` when you want a full deck-JSON-generation prompt
- use `normalizeGeneratedMarkdown(...)` before sending model markdown into `createDeckFromSource(...)`
- use `normalizeGeneratedDeck(...)` before validating or consuming raw model JSON output

If `presetId` is provided, the prompt builder injects a preset section with:

- preset id and name
- preset description
- capability list
- preset-specific style rules

If `mode` is provided, the prompt builder injects a mode section:

- `authoring`: bias toward editability, structure clarity, and office handoff
- `presenting`: bias toward step flow, notes, anchors, and runtime-friendly actions

These helpers keep prompt-side syntax aligned with the package parser and validator.

## Output normalization

The package also exposes two lightweight normalization helpers for common model-output cleanup:

```ts
import { normalizeGeneratedDeck, normalizeGeneratedMarkdown } from "@civilization-os/ppt";
```

`normalizeGeneratedMarkdown(...)` currently handles:

- UTF-8 BOM removal
- fenced markdown unwrap
- CRLF to LF normalization
- trailing whitespace cleanup
- oversized blank-line collapse
- stable `---` slide separator spacing

`normalizeGeneratedDeck(...)` currently handles:

- UTF-8 BOM removal
- fenced JSON unwrap
- extraction of the outer JSON object from surrounding prose
- trailing-comma cleanup before `}` and `]`
- final `validateDeck(...)` pass

## Output behavior

- `editable-pptx` resolves to the `pptx` engine
- `html-bundle` resolves to the `html` engine
- `html-bundle` produces:
  - `index.html`
  - `speaker.html`
  - `deck.json`
  - `deck.js`
  - `runtime.js`
  - `theme.css`
  - copied assets

## Presentation runtime behavior

The HTML bundle is now presentation-oriented, not just a static page dump.

- `index.html` and `speaker.html` share slide / step state
- advancing either view updates the other view
- current position is mirrored into the URL hash for refresh / resume
- runtime tries `postMessage`, `BroadcastChannel`, and `localStorage` in that order of usefulness, with graceful fallback in restricted browser contexts
- speaker view can request the latest state from the audience view when opened mid-talk
- speaker view now includes runtime controls for previous / next, direct slide-step jump, blackout, and timer pause / resume
- action overlays support optional per-action timing in deck JSON:
  - `delayMs`
  - `durationMs`
  - `easing`
- presets now carry different default motion profiles for `highlight`, `appear`, `spotlight`, and `laser`
- motion defaults can also vary by target block kind, with `timeline` and `comparison` currently carrying their own timing bias
- per-action `exitTiming` can override the preset default exit phase
- overlay transitions now include a short exit phase, so focus masks, guidance lines, and laser strokes do not disappear abruptly between steps
- laser paths now prefer to originate from the current focused target when one exists, instead of floating independently
- spotlight now supports `auto | circle | pill` shape selection for anchored focus regions
- laser now supports explicit `anchorFrom: "target" | "custom"` semantics
- shortcuts:
  - `ArrowLeft` / `ArrowRight` / `Space`: navigation
  - `F`: fullscreen
  - `S`: open speaker view
  - `B`: toggle blackout
  - `T`: pause or resume the speaker timer

## Notes

- `language` is a first-class source parameter
- `deck` is the stable internal model
- `validateDeck(...)` is the schema boundary for generated or external deck JSON
- HTML runtime renders `highlight`, `appear`, `spotlight`, and `laser`
- speaker view shows both full notes and step-aligned current guidance
- explicit `stepGuidance` overrides index-based fallback behavior
- assets support local paths, remote URLs, and binary buffers
