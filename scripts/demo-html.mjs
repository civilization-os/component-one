import { createPresentation, createDeckFromSource, validateDeck } from "../packages/ppt/dist/index.js";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Slide 1-8: markdown with speaker-note-bound actions
// ---------------------------------------------------------------------------
const markdown = `
# Presentation Runtime Design

A lightweight, action-oriented presentation runtime with dual-view sync.

Speaker note:
Summary: Opening slide — set the stage for the runtime architecture discussion.
Cue: Frame this as the contrast between static decks and live presentation runtimes.
Timing: Pause briefly on the title before advancing.
Emphasis: Presentation runtime

---

## Core Architecture {#core-arch}

The runtime operates on a three-layer model:

- Deck Layer: the static data model — slides, steps, blocks
- State Layer: a mutable snapshot — current slide, step, timer, blackout
- View Layer: audience card + speaker card, synced via BroadcastChannel

::: callout
**Key insight**: The deck is immutable JSON. All mutability lives in the state layer.
:::

Speaker note:
Summary: Walk through the three-layer model. Highlight the deck immutability insight.
Cue: Emphasize that the deck never changes during a talk.
Step 2 Cue: [core-arch] Pause on the deck immutability point.
Step 3 Highlight: [core-arch]
Step 3 Highlight Timing: 80, 280, ease-in-out

---

## Step Flow & Action Overlays {#action-overlays}

Each slide contains one or more steps. Each step can carry **actions**:

| Action | Target | Effect |
| --- | --- | --- |
| Highlight | A visible block | Focus ring + emphasis glow |
| Appear | A visible block | Entry animation |
| Spotlight | A block or coordinate | Focus mask + radial glow |
| Laser | A point chain | Animated draw path |

::: two-column
Left: Authoring Mode
Prefer editability, structure clarity, and office handoff.
Speaker guidance only when it improves revision.

Right: Presenting Mode
Prefer live flow, step progression, and speaker pacing.
Explicit anchors, step guidance, action-rich blocks.
:::

Speaker note:
Summary: Table overview of the four action types. Emphasis on the dual-mode support.
Step 2 Cue: [action-overlays] Read through the action table.
Step 3 Spotlight: [action-overlays]
Step 3 Spotlight Timing: 120, 420, ease-out
Step 3 Spotlight Exit Timing: 20, 180, ease-in

---

## Highlight Action Demo {#highlight-demo}

This slide demonstrates the **highlight** action.

When you reach Step 2, the block below will be highlighted with the accent color.

A highlighted block gets a subtle focus ring and a tinted background. It draws the audience's attention without removing context from the rest of the slide.

Speaker note:
Summary: Demonstrate the highlight action — a block gets a focus ring.
Cue: Call attention to the subtle glow around the highlighted block.
Step 2 Highlight: [highlight-demo]
Step 2 Highlight Timing: 100, 300, ease-out
Step 2 Highlight Exit Timing: 30, 200, ease-in

---

## Spotlight Action Demo {#spotlight-demo}

This slide demonstrates the **spotlight** action.

When you reach Step 2, a spotlight will focus on the content area below, dimming everything else.

A spotlight creates a focus zone — the area outside the target dims, helping the audience concentrate on one thing at a time.

::: callout
Spotlight is ideal for focusing attention on a specific diagram, metric, or code block during a walkthrough.
:::

Speaker note:
Summary: Spotlight focuses attention on one area while dimming the rest.
Cue: [spotlight-demo] Step forward to see the spotlight effect.
Step 2 Spotlight: [spotlight-demo]
Step 2 Spotlight Timing: 140, 500, ease-out
Step 2 Spotlight Exit Timing: 20, 200, ease-in

---

## Laser Pointer + Highlight Demo {#laser-demo}

This slide demonstrates the **laser pointer** working together with **highlight**.

When you reach Step 2, the content block below will be highlighted with a focus ring, and a **red laser dot** will appear near it — just like a real presenter pointing at the board.

The laser dot pulses gently to draw the audience's eye to the exact spot you're explaining.

Laser dots are ideal for:
- Pointing at specific words or numbers
- Indicating which part of a diagram to look at
- Tracing along with your verbal explanation

Speaker note:
Summary: Laser dot paired with highlight — point at what you're explaining.
Cue: The laser dot appears beside the highlighted block automatically.
Step 2 Highlight: [laser-demo]
Step 2 Laser: 0.48,0.50 -> 0.52,0.50
Step 2 Laser Timing: 220, 400, ease-out
Step 2 Laser Exit Timing: 10, 200, ease-in

---

## Implementation Timeline {#timeline}

::: timeline
Label: Phase 1
Detail: Core deck model + markdown ingest

Label: Phase 2
Detail: Dual-view runtime with state sync

Label: Phase 3
Detail: Action overlay system + motion profiles

Label: Phase 4
Detail: PPTX export + asset pipeline
:::

Speaker note:
Summary: Four-phase implementation plan.
Cue: Read through the phases at a steady pace.

---

## Runtime Controls

| Shortcut | Action |
| --- | --- |
| ArrowRight / Space | Next step |
| ArrowLeft | Previous step |
| F | Fullscreen |
| S | Open speaker view |
| B | Toggle blackout |
| T | Pause / resume timer |
| Escape | Exit fullscreen or blackout |

{.shortcuts-table}

Speaker note:
Summary: List of keyboard shortcuts for the runtime.
`;

const deck = createDeckFromSource({
  language: "en-US",
  sourceKind: "markdown",
  content: markdown,
  presetId: "technical-brief",
});

// Generate HTML bundle in memory
const result = await createPresentation()
  .preset("technical-brief")
  .target("html-bundle")
  .input(deck)
  .build();

if (result.artifactKind === "file-map") {
  const outDir = path.join(__dirname, "..", "artifacts", "demo-runtime");
  await mkdir(outDir, { recursive: true });

  for (const file of Object.values(result.artifact)) {
    const fp = path.join(outDir, file.path);
    await mkdir(path.dirname(fp), { recursive: true });
    await writeFile(fp, file.content);
  }

  // Log which slides have actions
  const d = JSON.parse(result.artifact["deck.json"].content);
  console.log(`\n  ✅ HTML bundle generated at: artifacts/demo-runtime/\n`);
  console.log(`  Slides: ${d.slides.length}`);
  d.slides.forEach((s, i) => {
    const hasActions = s.steps.some(st => st.actions?.length > 0);
    const actionKinds = s.steps.flatMap(st => (st.actions || []).map(a => a.kind));
    const kinds = [...new Set(actionKinds)].join(", ");
    console.log(`  ${i + 1}. ${s.title}${hasActions ? `  [actions: ${kinds}]` : ""}`);
  });
  console.log(`\n  Open: ${path.join(outDir, "index.html")}`);
  console.log(`  Speaker view: ${path.join(outDir, "speaker.html")}\n`);
  console.log(`  Try: ArrowRight to advance steps and see actions in action!\n`);
}
