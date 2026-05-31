import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  buildDeckJsonGenerationPrompt,
  buildMarkdownGenerationPrompt,
  createDeckFromSource,
  createPresentation,
  deckToPptxInput,
  getDeckJsonContract,
  getMarkdownSourceContract,
  getPptPreset,
  isDeckInput,
  listPptPresets,
  normalizeGeneratedDeck,
  normalizeGeneratedMarkdown,
  parseSpeakerNotesText,
  pptxInputToDeck,
  requirePptPreset,
  validateDeck
} from "../dist/index.js";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnK0O0AAAAASUVORK5CYII=",
  "base64"
);

test("preset registry exposes shared PPT presets", () => {
  const presets = listPptPresets();

  assert.equal(presets.length, 3);
  assert.equal(getPptPreset("technical-brief")?.name, "Technical Brief");
  assert.equal(getPptPreset("technical-brief")?.motionProfile.highlight.enter.durationMs, 260);
  assert.equal(getPptPreset("technical-brief")?.motionProfile.byBlockKind?.timeline?.laser?.enter.durationMs, 440);
  assert.equal(getPptPreset("executive-report")?.motionProfile.byBlockKind?.comparison?.highlight?.enter.durationMs, 340);
  assert.throws(() => requirePptPreset("missing-preset"), /Unknown PPT preset/);
});

test("prompt contract helpers expose stable generation rules", () => {
  const markdownContract = getMarkdownSourceContract("zh-CN");
  const deckJsonContract = getDeckJsonContract();
  const markdownPrompt = buildMarkdownGenerationPrompt({
    language: "zh-CN",
    presetId: "technical-brief",
    mode: "presenting",
    source: "\u539f\u59cb\u8d44\u6599",
    extraInstructions: "\u63a7\u5236\u5728 8 \u9875\u4ee5\u5185\u3002"
  });
  const deckJsonPrompt = buildDeckJsonGenerationPrompt({
    language: "en-US",
    presetId: "executive-report",
    mode: "authoring",
    source: "Raw source",
    extraInstructions: "Keep the result under 6 slides."
  });

  assert.ok(markdownContract.includes("\u7b2c2\u6b65 \u805a\u5149\u706f"));
  assert.ok(markdownContract.includes("\u9000\u51fa\u8282\u594f"));
  assert.ok(markdownContract.includes("{#runtime-timeline}"));
  assert.ok(markdownContract.includes("\u7eaf markdown"));
  assert.ok(deckJsonContract.includes('"highlightTargetId"?: visible by that step'));
  assert.ok(deckJsonContract.includes('"exitTiming"?:'));
  assert.ok(deckJsonContract.includes("Output JSON only."));
  assert.ok(markdownPrompt.includes("## Preset"));
  assert.ok(markdownPrompt.includes("## Mode"));
  assert.ok(markdownPrompt.includes("- presenting"));
  assert.ok(markdownPrompt.includes("technical-brief"));
  assert.ok(markdownPrompt.includes("code/schema blocks"));
  assert.ok(markdownPrompt.includes("two-column architecture explanations"));
  assert.ok(markdownPrompt.includes("step progression"));
  assert.ok(markdownPrompt.includes("## Contract"));
  assert.ok(markdownPrompt.includes("\u63a7\u5236\u5728 8 \u9875\u4ee5\u5185\u3002"));
  assert.ok(markdownPrompt.includes("\u539f\u59cb\u8d44\u6599"));
  assert.ok(deckJsonPrompt.includes("Generate deck JSON compatible with @civilization-os/ppt"));
  assert.ok(deckJsonPrompt.includes("- authoring"));
  assert.ok(deckJsonPrompt.includes("executive-report"));
  assert.ok(deckJsonPrompt.includes("metrics, tables, and comparison-oriented slides"));
  assert.ok(deckJsonPrompt.includes("Prefer editability, structure clarity, and smoother office handoff."));
  assert.ok(deckJsonPrompt.includes("Keep the result under 6 slides."));
  assert.ok(deckJsonPrompt.includes("Raw source"));
});

test("normalizers clean generated markdown and deck JSON", () => {
  const normalizedMarkdown = normalizeGeneratedMarkdown(
    "\uFEFF```markdown\r\n# Title  \r\n\r\n\r\nBody line\r\n---\r\n\r\n## Next\r\n```"
  );
  const normalizedDeck = normalizeGeneratedDeck(`\nHere is the deck:\n\`\`\`json
{
  "title": "Normalized Deck",
  "language": "en-US",
  "slides": [
    {
      "id": "slide-1",
      "steps": [
        {
          "id": "step-1",
          "blocks": [
            { "id": "block-1", "kind": "text", "text": "Hello" },
          ],
        },
      ],
    },
  ],
}
\`\`\`\n`);

  assert.equal(normalizedMarkdown, "# Title\n\nBody line\n\n---\n\n## Next");
  assert.equal(normalizedDeck.title, "Normalized Deck");
  assert.equal(normalizedDeck.slides[0].steps[0].blocks[0].id, "block-1");
});
test("markdown ingest builds a deck from the english fixture", async () => {
  const content = await readFixture("presentation-rich-sample.md");
  const deck = createDeckFromSource({
    language: "en-US",
    sourceKind: "markdown",
    content,
    presetId: "technical-brief"
  });

  assert.equal(deck.language, "en-US");
  assert.equal(deck.presetId, "technical-brief");
  assert.equal(deck.slides.length >= 8, true);
  assert.equal(deck.slides[0].steps.length > 1, true);
  assert.equal(deck.slides.some((slide) => Boolean(slide.notes?.summary)), true);
  assert.deepEqual(deck.slides[0].notes?.cues, ["Frame this as the opening contrast."]);
  assert.deepEqual(deck.slides[0].notes?.emphasis, ["Presentation runtime"]);
  const lifecycleSlide = deck.slides.find((slide) =>
    slide.steps.some((step) => step.blocks.some((block) => block.id === "authoring-presenting-split"))
  );
  const runtimeSequenceSlide = deck.slides.find((slide) =>
    slide.steps.some((step) => step.blocks.some((block) => block.id === "sequence-setup"))
  );

  assert.ok(lifecycleSlide);
  assert.ok(runtimeSequenceSlide);

  assert.deepEqual(lifecycleSlide.notes?.stepGuidance, [
    {
      step: 3,
      cue: "Pause on the two-column contrast before moving to the table.",
      targetBlockId: "authoring-presenting-split"
    },
    {
      step: 4,
      timing: "Slow down before saying the model owns the truth.",
      targetBlockId: "state-artifact-table"
    }
  ]);
  assert.deepEqual(runtimeSequenceSlide.notes?.stepGuidance, [
      {
        step: 2,
        cue: "Set up the runtime walkthrough before mentioning controls.",
        targetBlockId: "sequence-setup",
        spotlightTargetId: "sequence-setup",
        spotlightShape: "pill",
        spotlightTiming: { delayMs: 120, durationMs: 420, easing: "ease-out" },
        spotlightExitTiming: { delayMs: 20, durationMs: 180, easing: "ease-in" }
      },
      {
        step: 3,
        emphasis: "playback controller",
        targetBlockId: "runtime-timeline",
        highlightTargetId: "runtime-timeline",
        highlightTiming: { delayMs: 80, durationMs: 280, easing: "ease-in-out" },
        highlightExitTiming: { delayMs: 40, durationMs: 220, easing: "ease-in" }
      },
      {
        step: 7,
        emphasis: "exporter relationship",
        targetBlockId: "runtime-sequence",
        appearTargetId: "runtime-sequence",
        appearTiming: { delayMs: 140, durationMs: 320, easing: "ease-out" },
        appearExitTiming: { delayMs: 30, durationMs: 200, easing: "ease-in" },
        laserPoints: [
          { x: 0.15, y: 0.72 },
          { x: 0.42, y: 0.5 },
          { x: 0.74, y: 0.33 }
        ],
        laserAnchorFrom: "target",
        laserTiming: { delayMs: 260, durationMs: 680, easing: "cubic-bezier(0.22,1,0.36,1)" },
        laserExitTiming: { delayMs: 10, durationMs: 240, easing: "ease-in" }
      }
    ]);
  assert.equal(lifecycleSlide.steps[2].blocks[0].id, "authoring-presenting-split");
  assert.equal(lifecycleSlide.steps[3].blocks[0].id, "state-artifact-table");
  assert.equal(runtimeSequenceSlide.steps[1].blocks[0].id, "sequence-setup");
  assert.equal(runtimeSequenceSlide.steps[2].blocks[0].id, "runtime-timeline");
  assert.equal(runtimeSequenceSlide.steps[6].blocks[0].id, "runtime-sequence");
  assert.deepEqual(runtimeSequenceSlide.steps[1].actions, [{ kind: "spotlight", targetId: "sequence-setup", shape: "pill", timing: { delayMs: 120, durationMs: 420, easing: "ease-out" }, exitTiming: { delayMs: 20, durationMs: 180, easing: "ease-in" } }]);
  assert.deepEqual(runtimeSequenceSlide.steps[2].actions, [{ kind: "highlight", targetId: "runtime-timeline", timing: { delayMs: 80, durationMs: 280, easing: "ease-in-out" }, exitTiming: { delayMs: 40, durationMs: 220, easing: "ease-in" } }]);
  assert.deepEqual(runtimeSequenceSlide.steps[6].actions, [
    { kind: "appear", targetId: "runtime-sequence", timing: { delayMs: 140, durationMs: 320, easing: "ease-out" }, exitTiming: { delayMs: 30, durationMs: 200, easing: "ease-in" } },
    {
      kind: "laser",
      points: [
        { x: 0.15, y: 0.72 },
        { x: 0.42, y: 0.5 },
        { x: 0.74, y: 0.33 }
      ],
      anchorFrom: "target",
      timing: { delayMs: 260, durationMs: 680, easing: "cubic-bezier(0.22,1,0.36,1)" },
      exitTiming: { delayMs: 10, durationMs: 240, easing: "ease-in" }
    }
  ]);
  assert.equal(
    deck.slides.some((slide) =>
      slide.steps.some((step) =>
        step.blocks.some((block) => block.kind === "image" && block.asset.kind === "url" && block.asset.url.includes("runtime-stage-overview"))
      )
    ),
    true
  );
  assert.equal(deck.slides.some((slide) => slide.steps.some((step) => step.blocks.some((block) => block.kind === "callout"))), true);
  assert.equal(deck.slides.some((slide) => slide.steps.some((step) => step.blocks.some((block) => block.kind === "metrics"))), true);
  assert.equal(deck.slides.some((slide) => slide.steps.some((step) => step.blocks.some((block) => block.kind === "two-column"))), true);
  assert.equal(deck.slides.some((slide) => slide.steps.some((step) => step.blocks.some((block) => block.kind === "timeline"))), true);
  assert.equal(deck.slides.some((slide) => slide.steps.some((step) => step.blocks.some((block) => block.kind === "process"))), true);
  assert.equal(deck.slides.some((slide) => slide.steps.some((step) => step.blocks.some((block) => block.kind === "quadrant"))), true);
  assert.equal(deck.slides.some((slide) => slide.steps.some((step) => step.blocks.some((block) => block.kind === "comparison"))), true);
  assert.equal(deck.slides.some((slide) => slide.steps.some((step) => step.blocks.some((block) => block.kind === "table"))), true);
  assert.equal(isDeckInput(deck), true);
});

test("markdown ingest builds a deck from the chinese fixture", async () => {
  const content = await readFixture("presentation-rich-sample.zh-CN.md");
  const deck = createDeckFromSource({
    language: "zh-CN",
    sourceKind: "markdown",
    content,
    presetId: "executive-report"
  });

  assert.equal(deck.language, "zh-CN");
  assert.equal(deck.title, "\u6784\u5EFA\u4E00\u4E2A\u8F7B\u91CF\u7EA7\u6F14\u793A\u8FD0\u884C\u65F6");
  assert.equal(deck.slides.length >= 8, true);
  assert.equal(deck.slides[0].notes?.summary?.includes("\u64B0\u5199\u6001"), true);
  assert.deepEqual(deck.slides[0].notes?.cues, ["\u628A\u8FD9\u4E00\u9875\u5F53\u6210\u5F00\u573A\u5BF9\u7167\u3002"]);
  const lifecycleSlide = deck.slides.find((slide) =>
    slide.steps.some((step) => step.blocks.some((block) => block.id === "authoring-presenting-split"))
  );
  const runtimeSequenceSlide = deck.slides.find((slide) =>
    slide.steps.some((step) => step.blocks.some((block) => block.id === "sequence-setup"))
  );

  assert.ok(lifecycleSlide);
  assert.ok(runtimeSequenceSlide);

  assert.deepEqual(lifecycleSlide.notes?.stepGuidance, [
    {
      step: 3,
      cue: "\u5148\u505c\u5728\u53cc\u5217\u5bf9\u7167\u4e0a\uff0c\u518d\u8f6c\u5230\u8868\u683c\u3002",
      targetBlockId: "authoring-presenting-split"
    },
    {
      step: 4,
      timing: "\u8fd9\u91cc\u505c\u534a\u62cd\uff0c\u518d\u5207\u5230\u5bfc\u51fa\u5c42\u3002",
      targetBlockId: "state-artifact-table"
    }
  ]);
  assert.deepEqual(runtimeSequenceSlide.notes?.stepGuidance, [
      {
        step: 2,
        cue: "\u5148\u8bb2\u65f6\u95f4\u7ebf\uff0c\u518d\u8bb2\u63a7\u5236\u5668\u3002",
        targetBlockId: "sequence-setup",
        spotlightTargetId: "sequence-setup"
      },
      {
        step: 3,
        emphasis: "\u64ad\u653e\u63a7\u5236\u5668",
        targetBlockId: "runtime-timeline",
        highlightTargetId: "runtime-timeline"
      },
      {
        step: 7,
        emphasis: "\u5bfc\u51fa\u5668\u4e0e\u6838\u5fc3\u6a21\u578b",
        targetBlockId: "runtime-sequence",
        appearTargetId: "runtime-sequence",
        laserPoints: [
          { x: 0.15, y: 0.72 },
          { x: 0.42, y: 0.5 },
          { x: 0.74, y: 0.33 }
        ]
      }
    ]);
  assert.equal(lifecycleSlide.steps[2].blocks[0].id, "authoring-presenting-split");
  assert.equal(lifecycleSlide.steps[3].blocks[0].id, "state-artifact-table");
  assert.equal(runtimeSequenceSlide.steps[1].blocks[0].id, "sequence-setup");
  assert.equal(runtimeSequenceSlide.steps[2].blocks[0].id, "runtime-timeline");
  assert.equal(runtimeSequenceSlide.steps[6].blocks[0].id, "runtime-sequence");
  assert.deepEqual(runtimeSequenceSlide.steps[1].actions, [{ kind: "spotlight", targetId: "sequence-setup" }]);
  assert.deepEqual(runtimeSequenceSlide.steps[2].actions, [{ kind: "highlight", targetId: "runtime-timeline" }]);
  assert.deepEqual(runtimeSequenceSlide.steps[6].actions, [
    { kind: "appear", targetId: "runtime-sequence" },
    {
      kind: "laser",
      points: [
        { x: 0.15, y: 0.72 },
        { x: 0.42, y: 0.5 },
        { x: 0.74, y: 0.33 }
      ]
    }
  ]);
  assert.equal(deck.slides.some((slide) => slide.steps.some((step) => step.blocks.some((block) => block.kind === "callout"))), true);
  assert.equal(deck.slides.some((slide) => slide.steps.some((step) => step.blocks.some((block) => block.kind === "metrics"))), true);
  assert.equal(deck.slides.some((slide) => slide.steps.some((step) => step.blocks.some((block) => block.kind === "two-column"))), true);
  assert.equal(deck.slides.some((slide) => slide.steps.some((step) => step.blocks.some((block) => block.kind === "timeline"))), true);
  assert.equal(deck.slides.some((slide) => slide.steps.some((step) => step.blocks.some((block) => block.kind === "comparison"))), true);
  assert.equal(deck.slides.some((slide) => slide.steps.some((step) => step.blocks.some((block) => block.kind === "table"))), true);
});

test("markdown ingest parses quadrant directive blocks", () => {
  const deck = createDeckFromSource({
    language: "en-US",
    sourceKind: "markdown",
    content: `## Priority Matrix

::: quadrant {#priority-quadrant}
x-axis: Delivery confidence
y-axis: Narrative complexity
top-left: Stable core | Deterministic rendering and review loops.
top-right: Rich motion | Stronger stage language without breaking predictability.
bottom-left: Low leverage polish | UI cleanup that does not move runtime quality.
bottom-right: Heavy choreography | Media sequencing before the model is settled.
:::
`
  });

  const quadrantBlock = deck.slides[0].steps[1].blocks[0];

  assert.deepEqual(quadrantBlock, {
    id: "priority-quadrant",
    kind: "quadrant",
    xLabel: "Delivery confidence",
    yLabel: "Narrative complexity",
    topLeft: {
      title: "Stable core",
      detail: "Deterministic rendering and review loops."
    },
    topRight: {
      title: "Rich motion",
      detail: "Stronger stage language without breaking predictability."
    },
    bottomLeft: {
      title: "Low leverage polish",
      detail: "UI cleanup that does not move runtime quality."
    },
    bottomRight: {
      title: "Heavy choreography",
      detail: "Media sequencing before the model is settled."
    }
  });
});

test("deck schema rejects invalid action targets and invalid table shapes", () => {
  assert.throws(
    () =>
      validateDeck({
        title: "Invalid deck",
        language: "en-US",
        slides: [
          {
            id: "slide-1",
            steps: [
              {
                id: "step-1",
                blocks: [
                  {
                    id: "table-1",
                    kind: "table",
                    headers: ["A", "B"],
                    rows: [["only-one-cell"]]
                  }
                ],
                actions: [{ kind: "highlight", targetId: "missing-block" }]
              }
            ]
          }
        ]
      }),
    (error) =>
      typeof error === "object" &&
      error !== null &&
      "issues" in error &&
      Array.isArray(error.issues) &&
      error.issues.some((issue) => issue.message === "Table row 1 must contain 2 cells.") &&
      error.issues.some((issue) => issue.message.includes('Action target "missing-block" must reference a visible block'))
  );
});

test("deck schema rejects invalid action timing config", () => {
  assert.throws(
    () =>
      validateDeck({
        title: "Bad Timing Deck",
        language: "en-US",
        slides: [
          {
            id: "slide-1",
            steps: [
              {
                id: "step-1",
                blocks: [
                  {
                    id: "block-1",
                    kind: "text",
                    text: "Action timing should validate."
                  }
                ],
                actions: [
                  {
                    kind: "highlight",
                    targetId: "block-1",
                    timing: {
                      delayMs: -20,
                      durationMs: 0,
                      easing: "bounce-hard"
                    }
                  }
                ]
              }
            ]
          }
        ]
      }),
    /delayMs|durationMs|easing/
  );
});

test("deck schema normalizes speaker notes from string input", () => {
  const deck = validateDeck({
    title: "Structured Notes",
    language: "en-US",
    slides: [
      {
        id: "slide-1",
        notes: "Summary: Explain the slide boundary.\nCue: Pause before the export section.\nEmphasis: HTML bundle",
        steps: [
          {
            id: "step-1",
            blocks: [
              {
                id: "block-1",
                kind: "text",
                text: "Deck validation should normalize notes."
              }
            ]
          }
        ]
      }
    ]
  });

  assert.equal(deck.slides[0].notes?.summary, "Explain the slide boundary.");
  assert.deepEqual(deck.slides[0].notes?.cues, ["Pause before the export section."]);
  assert.deepEqual(deck.slides[0].notes?.emphasis, ["HTML bundle"]);
});

test("speaker note parser supports explicit target blocks", () => {
  const notes = parseSpeakerNotesText(
    "Summary: Focus the audience.\nStep 2 Cue: [details] Explain the metrics block.\nStep 2 Spotlight: 0.5, 0.4, 0.2\nStep 2 Spotlight Shape: circle\nStep 2 Spotlight Timing: 120, 420, ease-out\nStep 2 Spotlight Exit Timing: 20, 180, ease-in\nStep 3 Emphasis: [decision] Final decision boundary.\nStep 3 Highlight: [decision]\nStep 3 Highlight Timing: 80, 280, ease-in-out\nStep 3 Highlight Exit Timing: 40, 220, ease-in\nStep 3 Laser: 0.1,0.2 -> 0.4,0.5\nStep 3 Laser Anchor: target\nStep 3 Laser Timing: 260, 680, cubic-bezier(0.22,1,0.36,1)\nStep 3 Laser Exit Timing: 10, 240, ease-in"
  );

  assert.deepEqual(notes.stepGuidance, [
    { step: 2, cue: "Explain the metrics block.", targetBlockId: "details", spotlight: { x: 0.5, y: 0.4, radius: 0.2 }, spotlightShape: "circle", spotlightTiming: { delayMs: 120, durationMs: 420, easing: "ease-out" }, spotlightExitTiming: { delayMs: 20, durationMs: 180, easing: "ease-in" } },
    {
      step: 3,
      emphasis: "Final decision boundary.",
      targetBlockId: "decision",
      highlightTargetId: "decision",
      highlightTiming: { delayMs: 80, durationMs: 280, easing: "ease-in-out" },
      highlightExitTiming: { delayMs: 40, durationMs: 220, easing: "ease-in" },
      laserPoints: [
        { x: 0.1, y: 0.2 },
        { x: 0.4, y: 0.5 }
      ],
      laserAnchorFrom: "target",
      laserTiming: { delayMs: 260, durationMs: 680, easing: "cubic-bezier(0.22,1,0.36,1)" },
      laserExitTiming: { delayMs: 10, durationMs: 240, easing: "ease-in" }
    }
  ]);
});

test("speaker note parser supports anchored spotlight syntax", () => {
  const notes = parseSpeakerNotesText(
    "Step 2 Spotlight: [runtime-timeline]\nStep 2 Spotlight Shape: pill\nStep 2 Spotlight Timing: 120, 420, ease-out\nStep 2 Spotlight Exit Timing: 20, 180, ease-in"
  );

  assert.deepEqual(notes.stepGuidance, [
    {
      step: 2,
      spotlightTargetId: "runtime-timeline",
      spotlightShape: "pill",
      spotlightTiming: { delayMs: 120, durationMs: 420, easing: "ease-out" },
      spotlightExitTiming: { delayMs: 20, durationMs: 180, easing: "ease-in" }
    }
  ]);
});

test("speaker note parser supports explicit target blocks in chinese", () => {
  const notes = parseSpeakerNotesText(
    "\u6458\u8981\uff1a\u805a\u7126\u5f53\u524d\u9875\u3002\n\u7b2c2\u6b65 \u63d0\u793a\uff1a[details] \u5148\u89e3\u91ca\u6307\u6807\u5757\u3002\n\u7b2c2\u6b65 \u805a\u5149\u706f\uff1a0.5, 0.4, 0.2\n\u7b2c2\u6b65 \u805a\u5149\u706f\u8282\u594f\uff1a120, 420, ease-out\n\u7b2c2\u6b65 \u805a\u5149\u706f\u9000\u51fa\u8282\u594f\uff1a20, 180, ease-in\n\u7b2c3\u6b65 \u5f3a\u8c03\uff1a[decision] \u518d\u843d\u5230\u7ed3\u8bba\u5757\u3002\n\u7b2c3\u6b65 \u51fa\u73b0\uff1a[decision]\n\u7b2c3\u6b65 \u51fa\u73b0\u8282\u594f\uff1a140, 320, ease-out\n\u7b2c3\u6b65 \u51fa\u73b0\u9000\u51fa\u8282\u594f\uff1a30, 200, ease-in\n\u7b2c3\u6b65 \u6fc0\u5149\uff1a0.1,0.2 -> 0.4,0.5\n\u7b2c3\u6b65 \u6fc0\u5149\u8282\u594f\uff1a260, 680, cubic-bezier(0.22,1,0.36,1)\n\u7b2c3\u6b65 \u6fc0\u5149\u9000\u51fa\u8282\u594f\uff1a10, 240, ease-in"
  );

  assert.deepEqual(notes.stepGuidance, [
    { step: 2, cue: "\u5148\u89e3\u91ca\u6307\u6807\u5757\u3002", targetBlockId: "details", spotlight: { x: 0.5, y: 0.4, radius: 0.2 }, spotlightTiming: { delayMs: 120, durationMs: 420, easing: "ease-out" }, spotlightExitTiming: { delayMs: 20, durationMs: 180, easing: "ease-in" } },
    {
      step: 3,
      emphasis: "\u518d\u843d\u5230\u7ed3\u8bba\u5757\u3002",
      targetBlockId: "decision",
      appearTargetId: "decision",
      appearTiming: { delayMs: 140, durationMs: 320, easing: "ease-out" },
      appearExitTiming: { delayMs: 30, durationMs: 200, easing: "ease-in" },
      laserPoints: [
        { x: 0.1, y: 0.2 },
        { x: 0.4, y: 0.5 }
      ],
      laserTiming: { delayMs: 260, durationMs: 680, easing: "cubic-bezier(0.22,1,0.36,1)" },
      laserExitTiming: { delayMs: 10, durationMs: 240, easing: "ease-in" }
    }
  ]);
});

test("speaker note parser rejects invalid action timing values", () => {
  assert.throws(() => parseSpeakerNotesText("Step 2 Highlight Timing: 120"), /Invalid action timing note value/);
  assert.throws(() => parseSpeakerNotesText("Step 2 Laser Timing: fast, 300"), /Delay and duration must be numbers/);
});

test("speaker note parser accepts spotlight shape and laser anchor directives", () => {
  const notes = parseSpeakerNotesText(
    "Step 2 Spotlight: [runtime-timeline]\nStep 2 Spotlight Shape: pill\nStep 3 Laser: 0.1,0.2 -> 0.4,0.5\nStep 3 Laser Anchor: target"
  );

  assert.deepEqual(notes.stepGuidance, [
    { step: 2, spotlightTargetId: "runtime-timeline", spotlightShape: "pill" },
    {
      step: 3,
      laserPoints: [
        { x: 0.1, y: 0.2 },
        { x: 0.4, y: 0.5 }
      ],
      laserAnchorFrom: "target"
    }
  ]);
});

test("deck schema accepts explicit step-bound speaker guidance", () => {
  const deck = validateDeck({
    title: "Step Guidance",
    language: "en-US",
    slides: [
      {
        id: "slide-1",
        notes: {
          summary: "Keep the slide progression explicit.",
          stepGuidance: [
            { step: 2, cue: "Introduce the chart after the heading." },
            { step: 3, emphasis: "Decision boundary" }
          ]
        },
        steps: [
          {
            id: "step-1",
            blocks: [{ id: "block-1", kind: "heading", text: "Step Guidance" }]
          },
          {
            id: "step-2",
            blocks: [{ id: "block-2", kind: "text", text: "Second step." }]
          },
          {
            id: "step-3",
            blocks: [{ id: "block-3", kind: "text", text: "Third step." }]
          }
        ]
      }
    ]
  });

  assert.deepEqual(deck.slides[0].notes?.stepGuidance, [
    { step: 2, cue: "Introduce the chart after the heading." },
    { step: 3, emphasis: "Decision boundary" }
  ]);
});

test("deck schema rejects step guidance that exceeds slide step count", () => {
  try {
    validateDeck({
      title: "Bad Step Guidance",
      language: "en-US",
      slides: [
        {
          id: "slide-1",
          notes: {
            stepGuidance: [{ step: 4, cue: "Too far." }]
          },
          steps: [
            {
              id: "step-1",
              blocks: [{ id: "block-1", kind: "text", text: "Only one step." }]
            }
          ]
        }
      ]
    });
    assert.fail("Expected validateDeck to reject out-of-range step guidance.");
  } catch (error) {
    assert.equal(
      typeof error === "object" &&
        error !== null &&
        "issues" in error &&
        Array.isArray(error.issues) &&
        error.issues.some((issue) => issue.message === 'Speaker note step 4 exceeds slide "slide-1" step count 1.'),
      true
    );
  }
});

test("deck schema rejects step guidance target blocks that are not visible yet", () => {
  try {
    validateDeck({
      title: "Bad Target Binding",
      language: "en-US",
      slides: [
        {
          id: "slide-1",
          notes: {
            stepGuidance: [{ step: 1, cue: "Too early.", targetBlockId: "details" }]
          },
          steps: [
            {
              id: "step-1",
              blocks: [{ id: "intro", kind: "heading", text: "Intro" }]
            },
            {
              id: "step-2",
              blocks: [{ id: "details", kind: "text", text: "Visible later." }]
            }
          ]
        }
      ]
    });
    assert.fail("Expected validateDeck to reject step guidance that targets a future block.");
  } catch (error) {
    assert.equal(
      typeof error === "object" &&
        error !== null &&
        "issues" in error &&
        Array.isArray(error.issues) &&
        error.issues.some((issue) => issue.message === 'Speaker note target "details" must be visible by step 1 in slide "slide-1".'),
      true
    );
  }
});

test("deck schema rejects step guidance action targets that are not visible yet", () => {
  try {
    validateDeck({
      title: "Bad Action Target Binding",
      language: "en-US",
      slides: [
        {
          id: "slide-1",
          notes: {
            stepGuidance: [{ step: 1, highlightTargetId: "details" }]
          },
          steps: [
            {
              id: "step-1",
              blocks: [{ id: "intro", kind: "heading", text: "Intro" }]
            },
            {
              id: "step-2",
              blocks: [{ id: "details", kind: "text", text: "Visible later." }]
            }
          ]
        }
      ]
    });
    assert.fail("Expected validateDeck to reject step guidance action targets that target a future block.");
  } catch (error) {
    assert.equal(
      typeof error === "object" &&
        error !== null &&
        "issues" in error &&
        Array.isArray(error.issues) &&
        error.issues.some((issue) => issue.message === 'Speaker note highlight target "details" must be visible by step 1 in slide "slide-1".'),
      true
    );
  }
});

test("speaker note parser rejects invalid spotlight and laser values", () => {
  assert.throws(() => parseSpeakerNotesText("Step 2 Spotlight: 0.5, 0.4"), /Invalid spotlight note value/);
  assert.throws(() => parseSpeakerNotesText("Step 2 Laser: 0.5,0.4"), /Invalid laser note value/);
  assert.throws(() => parseSpeakerNotesText("Step 2 Spotlight Shape: oval"), /Invalid spotlight shape note value/);
  assert.throws(() => parseSpeakerNotesText("Step 2 Laser Anchor: origin"), /Invalid laser anchor note value/);
});

test("deck converts to pptx input", async () => {
  const content = await readFixture("presentation-rich-sample.md");
  const deck = createDeckFromSource({
    language: "en-US",
    sourceKind: "markdown",
    content
  });
  const pptxInput = deckToPptxInput(deck);

  assert.equal(pptxInput.title, deck.title);
  assert.equal(pptxInput.slides.length, deck.slides.length);
  assert.equal(pptxInput.slides[0].title.length > 0, true);
  assert.equal(pptxInput.slides[0].notes?.includes("Summary:"), true);
  assert.equal(pptxInput.slides[0].notes?.includes("Cues:"), true);
  assert.equal(pptxInput.slides[2].notes?.includes("Step 3 Cues:"), true);
});

test("builder defaults to pptx engine for editable PPTX output", async () => {
  const result = await createPresentation()
    .preset("executive-report")
    .target("editable-pptx")
    .input({
      title: "Q2 Review",
      slides: [
        {
          title: "Status",
          bullets: ["Ship v1", "Stabilize operations"]
        }
      ]
    })
    .build();

  assert.equal(result.finalEngine, "pptx");
  assert.equal(result.artifactKind, "buffer");
  assert.ok(result.artifact.byteLength > 0);
});

test("explicit pptx engine builds successfully", async () => {
  const result = await createPresentation()
    .preset("technical-brief")
    .target("editable-pptx")
    .engine("pptx")
    .input({
      title: "Technical Brief",
      slides: [
        {
          title: "Risks",
          bullets: ["Timing"]
        }
      ]
    })
    .build();

  assert.equal(result.requestedEngine, "pptx");
  assert.equal(result.finalEngine, "pptx");
  assert.equal(result.artifactKind, "buffer");
});

test("builder accepts deck input and exports pptx", async () => {
  const content = await readFixture("presentation-rich-sample.md");
  const deck = createDeckFromSource({
    language: "en-US",
    sourceKind: "markdown",
    content,
    presetId: "product-showcase"
  });

  const result = await createPresentation()
    .preset("product-showcase")
    .target("editable-pptx")
    .input(deck)
    .build();

  assert.equal(result.finalEngine, "pptx");
  assert.equal(result.artifactKind, "buffer");
  assert.ok(result.artifact.byteLength > 0);
});

test("pptx input can convert back into a deck", () => {
  const deck = pptxInputToDeck({
    title: "Reverse Bridge",
    slides: [
      {
        title: "One",
        body: "Body",
        bullets: ["A", "B"]
      }
    ]
  });

  assert.equal(deck.title, "Reverse Bridge");
  assert.equal(deck.slides.length, 1);
  assert.equal(deck.slides[0].steps.length, 3);
  assert.equal(deck.slides[0].notes, undefined);
});

test("builder exports an html bundle in memory", async () => {
  const content = await readFixture("presentation-rich-sample.md");
  const deck = createDeckFromSource({
    language: "en-US",
    sourceKind: "markdown",
    content,
    presetId: "technical-brief"
  });

  const result = await createPresentation()
    .preset("technical-brief")
    .target("html-bundle")
    .input(deck)
    .build();

  assert.equal(result.finalEngine, "html");
  assert.equal(result.artifactKind, "file-map");
  assert.ok(result.artifact["index.html"]);
  assert.ok(result.artifact["speaker.html"]);
  assert.ok(result.artifact["deck.json"]);
  assert.ok(result.artifact["deck.js"]);
  assert.ok(result.artifact["runtime.js"]);
  assert.ok(String(result.artifact["index.html"].content).includes("runtime.js"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("slide-overlay"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("is-highlighted"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("block-two-column"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("block-timeline"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("block-comparison"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("speaker-note-section"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("speaker-current-guidance"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("currentGuidance"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("stepGuidance"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("is-guidance-target"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("is-deemphasized"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("has-focus-mask"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("slide-overlay-host"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("renderStageOverlay"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("targetBlock"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("highlightTargetId"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("appearTargetId"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("spotlight"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("laser"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("action-focus-ring"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("action-guidance-line"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("action-laser-dot"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("action-laser-line"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("resolveActionTiming"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("motionProfile"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("byBlockKind"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("exitTiming"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("data-block-kind"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("actionBlockKind"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("spotlightTargetRect"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("spotlightShape"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("laserAnchorFrom"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("captureOverlaySnapshot"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("overlayExitSnapshot"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("--action-easing"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("focus-mask"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("is-exiting"));
  assert.ok(String(result.artifact["theme.css"].content).includes("ppt-undraw-line"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("BroadcastChannel"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("localStorage"));
  assert.ok(String(result.artifact["runtime.js"].content).includes('window.addEventListener("message"'));
  assert.ok(String(result.artifact["runtime.js"].content).includes('window.addEventListener("hashchange"'));
  assert.ok(String(result.artifact["runtime.js"].content).includes('"request-state"'));
  assert.ok(String(result.artifact["runtime.js"].content).includes('window.open(targetUrl, "_blank")'));
  assert.ok(String(result.artifact["runtime.js"].content).includes('const targetUrl = "./speaker.html" + hashForState(snapshot);'));
  assert.ok(String(result.artifact["runtime.js"].content).includes('data-command="blackout"'));
  assert.ok(String(result.artifact["runtime.js"].content).includes('data-command="timer"'));
  assert.ok(String(result.artifact["runtime.js"].content).includes("toggleBlackout"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("toggleTimer"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("jumpToSelection"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("window.setInterval"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("updateTimerDisplay"));
  assert.ok(String(result.artifact["runtime.js"].content).includes("is-blackout"));
});

test("deck schema rejects step guidance spotlight targets that are not visible yet", () => {
  try {
    validateDeck({
      title: "Bad Spotlight Binding",
      language: "en-US",
      slides: [
        {
          id: "slide-1",
          notes: {
            stepGuidance: [{ step: 1, spotlightTargetId: "details" }]
          },
          steps: [
            {
              id: "step-1",
              blocks: [{ id: "intro", kind: "heading", text: "Intro" }]
            },
            {
              id: "step-2",
              blocks: [{ id: "details", kind: "text", text: "Visible later." }]
            }
          ]
        }
      ]
    });
    assert.fail("Expected validateDeck to reject spotlight targets that are not visible yet.");
  } catch (error) {
    assert.equal(
      typeof error === "object" &&
        error !== null &&
        "issues" in error &&
        Array.isArray(error.issues) &&
        error.issues.some((issue) => issue.message === 'Speaker note spotlight target "details" must be visible by step 1 in slide "slide-1".'),
      true
    );
  }
});

test("builder exports an html bundle with action-ready deck content", async () => {
  const deck = validateDeck({
    title: "Action Deck",
    language: "en-US",
    slides: [
      {
        id: "slide-1",
        title: "Action Test",
        notes: {
          summary: "Show the action overlay states in sequence.",
          cues: ["Call out the highlight before the spotlight."]
        },
        steps: [
          {
            id: "step-1",
            blocks: [
              {
                id: "intro",
                kind: "heading",
                text: "Runtime Actions"
              }
            ],
            transition: {
              kind: "none"
            }
          },
          {
            id: "step-2",
            blocks: [
              {
                id: "details",
                kind: "text",
                text: "Highlight, spotlight, and laser should all render."
              }
            ],
            actions: [
              { kind: "highlight", targetId: "details", timing: { delayMs: 80, durationMs: 280, easing: "ease-in-out" }, exitTiming: { delayMs: 30, durationMs: 190, easing: "ease-in" } },
              { kind: "spotlight", x: 0.55, y: 0.42, radius: 0.18, shape: "circle", timing: { delayMs: 120, durationMs: 420, easing: "ease-out" }, exitTiming: { delayMs: 20, durationMs: 180, easing: "ease-in" } },
              {
                kind: "laser",
                points: [
                  { x: 0.15, y: 0.72 },
                  { x: 0.42, y: 0.5 },
                  { x: 0.74, y: 0.33 }
                ],
                anchorFrom: "target",
                timing: { delayMs: 260, durationMs: 680, easing: "cubic-bezier(0.22,1,0.36,1)" },
                exitTiming: { delayMs: 10, durationMs: 240, easing: "ease-in" }
              }
            ],
            transition: {
              kind: "fade"
            }
          }
        ]
      }
    ]
  });

  const result = await createPresentation()
    .preset("technical-brief")
    .target("html-bundle")
    .input(deck)
    .build();
  const deckArtifact = JSON.parse(String(result.artifact["deck.json"].content));

  assert.equal(result.artifactKind, "file-map");
  assert.ok(String(result.artifact["deck.json"].content).includes('"highlight"'));
  assert.ok(String(result.artifact["deck.json"].content).includes('"spotlight"'));
  assert.ok(String(result.artifact["deck.json"].content).includes('"laser"'));
  assert.equal(deckArtifact.slides[0].steps[1].actions[1].shape, "circle");
  assert.equal(deckArtifact.slides[0].steps[1].actions[2].anchorFrom, "target");
  assert.ok(String(result.artifact["deck.json"].content).includes('"timing"'));
  assert.ok(String(result.artifact["deck.json"].content).includes('"exitTiming"'));
  assert.ok(String(result.artifact["deck.json"].content).includes('"durationMs"'));
  assert.ok(String(result.artifact["deck.json"].content).includes('"summary"'));
});

test("builder exports an html bundle to a directory", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "component-one-html-"));
  const outputDir = path.join(tempDir, "bundle");

  const result = await createPresentation()
    .preset("product-showcase")
    .target("html-bundle")
    .input({
      title: "HTML Bundle",
      slides: [
        {
          title: "Intro",
          body: "This bundle should open directly."
        },
        {
          title: "Bullets",
          bullets: ["Step one", "Step two"]
        }
      ]
    })
    .output({
      mode: "file",
      path: outputDir
    })
    .build();

  assert.equal(result.finalEngine, "html");
  assert.equal(result.artifactKind, "directory");
  assert.equal((await stat(path.join(result.outputPath, "index.html"))).isFile(), true);
  assert.equal((await stat(path.join(result.outputPath, "speaker.html"))).isFile(), true);
  assert.equal((await stat(path.join(result.outputPath, "deck.json"))).isFile(), true);
  assert.equal((await stat(path.join(result.outputPath, "runtime.js"))).isFile(), true);

  await rm(tempDir, { recursive: true, force: true });
});

test("pptx output accepts path, url, and buffer assets", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "component-one-ppt-"));
  const localAssetPath = path.join(tempDir, "hero.png");
  await writeFile(localAssetPath, onePixelPng);
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(onePixelPng, {
      status: 200,
      headers: {
        "content-type": "image/png"
      }
    });

  try {
    const result = await createPresentation()
      .preset("product-showcase")
      .target("editable-pptx")
      .input({
        title: "Showcase",
        slides: [
          {
            title: "Local asset",
            image: {
              kind: "path",
              path: localAssetPath
            }
          },
          {
            title: "Remote asset",
            image: {
              kind: "url",
              url: "https://example.com/hero.png"
            }
          },
          {
            title: "Buffer asset",
            image: {
              kind: "buffer",
              data: onePixelPng,
              fileName: "buffer-hero.png",
              mimeType: "image/png"
            }
          }
        ]
      })
      .build();

    assert.equal(result.finalEngine, "pptx");
    assert.equal(result.artifactKind, "buffer");
    assert.ok(result.artifact.byteLength > 0);
  } finally {
    globalThis.fetch = originalFetch;
  }

  await rm(tempDir, { recursive: true, force: true });
});

test("file output writes a pptx file", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "component-one-ppt-"));
  const pptxPath = path.join(tempDir, "review");

  const pptxResult = await createPresentation()
    .preset("executive-report")
    .target("editable-pptx")
    .input({
      title: "Write Test",
      slides: [
        {
          title: "One",
          body: "Body"
        }
      ]
    })
    .output({
      mode: "file",
      path: pptxPath
    })
    .build();

  assert.equal(pptxResult.artifactKind, "file");
  assert.equal(path.extname(pptxResult.outputPath), ".pptx");
  assert.equal((await stat(pptxResult.outputPath)).isFile(), true);

  await rm(tempDir, { recursive: true, force: true });
});

test("builder validates required inputs", async () => {
  await assert.rejects(
    () =>
      createPresentation()
        .preset("executive-report")
        .input({
          title: "Missing target",
          slides: [{ title: "One" }]
        })
        .build(),
    /target is required/
  );

  await assert.rejects(
    () =>
      createPresentation()
        .preset("executive-report")
        .target("editable-pptx")
        .build(),
    /input is required/
  );
});

async function readFixture(fileName) {
  return readFile(new URL(`./fixtures/${fileName}`, import.meta.url), "utf8");
}
