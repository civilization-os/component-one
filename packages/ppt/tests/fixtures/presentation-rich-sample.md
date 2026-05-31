# Building a Lightweight Presentation Runtime

> Test fixture for `@civilization-os/ppt`
> Goal: provide a rich markdown source for `markdown -> deck.json -> presentation bundle`

## Why this direction matters

Traditional slide tooling usually optimizes for one of two goals:

- authoring and editing office files
- showing polished visuals during a live talk

For `component-one`, the more interesting target is the second one.

Speaker note:
Summary: Focus on the distinction between authoring state and presenting state. This is the framing slide.
Cue: Frame this as the opening contrast.
Emphasis: Presentation runtime

---

## The core product idea

We want one public package for PPT, but internally it should behave like a presentation runtime.

That implies:

1. a structured internal model
2. deterministic rendering
3. step-by-step progression
4. lightweight export formats

Short summary:

`txt / markdown -> deck.json -> runtime -> html bundle / pptx`

---

## Lifecycle split

There are two different product states:

::: two-column {#authoring-presenting-split}
left:
Authoring stays editable and revision-friendly.
It needs compatibility with office workflows.

right:
Presenting stays stable and stage-oriented.
It needs playback, notes, and deterministic rendering.
:::

| State | Primary job | Typical artifact | {#state-artifact-table}
| --- | --- | --- |
| Authoring | structure and revise content | editable `.pptx` |
| Presenting | deliver a talk or demo | HTML presentation bundle |

This means the system should not treat `.pptx` as the source of truth.

Speaker note:
Summary: Stress that file formats are outputs, not the model itself.
Step 3 Cue: [authoring-presenting-split] Pause on the two-column contrast before moving to the table.
Step 4 Timing: [state-artifact-table] Slow down before saying the model owns the truth.

---

## The internal model

Suggested hierarchy:

- `deck`
- `slide`
- `step`
- `block`
- `action`

Each slide can have multiple steps. Each step can reveal or emphasize different blocks.

This is what gives the presentation a timeline instead of making it a static document.

---

## A small schema sketch

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

The exact field list can evolve, but the hierarchy is the important part.

---

## Rendering strategy

Recommended split for the first implementation:

- HTML and CSS for the main slide layout
- SVG overlay for spotlight, laser, and highlight effects
- a small playback state machine for next and previous navigation

Avoid starting with a full canvas renderer unless layout requirements truly force it.

![Runtime stage overview](https://example.com/runtime-stage-overview.png)

---

## MVP requirements

The MVP should be intentionally narrow:

::: callout
Keep the first version focused on the live presentation experience instead of turning it into a general-purpose slide editor.
:::

- open directly in a browser
- support keyboard navigation
- support step-by-step reveal
- show speaker notes in a separate presenter view
- export a static bundle without a build step

Things to skip at first:

- freeform whiteboard editing
- collaborative editing
- audio timeline orchestration
- advanced media choreography

---

## Delivery process

The runtime still needs a predictable delivery sequence:

::: process
Draft: define the deck schema and prompt contract first.
Validate: normalize generated source and reject invalid action references.
Render: project the same deck into HTML playback and PPTX export surfaces.
Review: verify audience view, speaker view, and stage actions before shipping.
:::

This keeps the component focused on one execution path instead of letting generation and playback drift apart.

---

## Priority matrix

The runtime also needs a clear tradeoff view when roadmap decisions compete:

::: quadrant {#priority-quadrant}
x-axis: Delivery confidence
y-axis: Narrative complexity
top-left: Stable core | Keep deterministic rendering and verification loops strong.
top-right: Rich motion | Add more stage expressiveness when the playback model stays predictable.
bottom-left: Low leverage polish | Avoid overinvesting in editor chrome before runtime fundamentals land.
bottom-right: Heavy choreography | Delay complex media sequencing until the deck model is settled.
:::

This gives planning decks a first-class analysis block instead of forcing the content into a plain table.

---

## Example sequence

Imagine a slide about runtime architecture: {#sequence-setup}

::: timeline {#runtime-timeline}
Planning: define the deck model and validation boundary
Runtime: build playback, notes, and action rendering
Export: project the same deck into HTML and PPTX artifacts
:::

1. show the deck title
2. reveal the three runtime layers
3. spotlight the playback controller
4. highlight the exporter relationship {#runtime-sequence}

This is not just content. It is content plus progression.

Speaker note:
Summary: This slide is meant to push the planner toward explicit step objects and action objects.
Step 2 Cue: [sequence-setup] Set up the runtime walkthrough before mentioning controls.
Step 2 Spotlight: [sequence-setup]
Step 2 Spotlight Shape: pill
Step 2 Spotlight Timing: 120, 420, ease-out
Step 2 Spotlight Exit Timing: 20, 180, ease-in
Step 3 Emphasis: [runtime-timeline] playback controller
Step 3 Highlight: [runtime-timeline]
Step 3 Highlight Timing: 80, 280, ease-in-out
Step 3 Highlight Exit Timing: 40, 220, ease-in
Step 7 Emphasis: [runtime-sequence] exporter relationship
Step 7 Appear: [runtime-sequence]
Step 7 Appear Timing: 140, 320, ease-out
Step 7 Appear Exit Timing: 30, 200, ease-in
Step 7 Laser: 0.15,0.72 -> 0.42,0.50 -> 0.74,0.33
Step 7 Laser Anchor: target
Step 7 Laser Timing: 260, 680, cubic-bezier(0.22,1,0.36,1)
Step 7 Laser Exit Timing: 10, 240, ease-in

---

## Technical stack proposal

Base stack:

::: metrics
Deck model coverage: stable
HTML runtime: active
PPTX export: compatible
:::

- TypeScript
- zod for schema validation
- static HTML templates
- CSS theme tokens
- SVG overlay renderer

Optional export stack:

- `pptxgenjs` for editable PowerPoint output

The important rule is that all exporters consume `deck.json`, not raw markdown.

---

## Risks and open questions

::: comparison
left: Authoring path
right: Presenting path
Validation boundary | looser content editing | strict runtime input
Primary artifact | editable .pptx | direct HTML bundle
Operational focus | revise and handoff | playback and delivery
:::

- How strict should the markdown-to-deck conversion be?
- Which markdown constructs deserve first-class structured blocks?
- How should notes, cues, and speaker-only hints be represented?
- When exporting to `.pptx`, should we preserve only the final visual state or also step boundaries?

These questions affect product shape more than low-level rendering details.

---

## Final takeaway

The product should not be:

- a thin wrapper around office slides
- a heavy classroom platform
- a generic markdown slideshow clone

It should be:

> a lightweight presentation runtime with one clear PPT-facing facade

That makes it easier to generate, present, and later export the same talk across different formats.
