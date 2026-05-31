import { z } from "zod";

import { compactSpeakerNotes, parseSpeakerNotesText } from "./notes.js";
import type { PptDeck, PptSourceInput } from "./types.js";

const normalizedCoordinateSchema = z.number().nonnegative();
const spotlightShapeSchema = z.union([z.literal("auto"), z.literal("circle"), z.literal("pill")]);
const laserAnchorFromSchema = z.union([z.literal("target"), z.literal("custom")]);
const actionEasingSchema = z
  .string()
  .trim()
  .regex(/^(linear|ease|ease-in|ease-out|ease-in-out|cubic-bezier\([^)]*\)|steps\([^)]*\))$/);
const pptActionTimingSchema = z.object({
  delayMs: z.number().int().min(0).optional(),
  durationMs: z.number().int().positive().optional(),
  easing: actionEasingSchema.optional()
});

export const pptLanguageSchema = z.union([z.literal("en-US"), z.literal("zh-CN")]);
export const pptSourceKindSchema = z.union([z.literal("text"), z.literal("markdown")]);
export const pptPresetIdSchema = z.union([z.literal("executive-report"), z.literal("technical-brief"), z.literal("product-showcase")]);

export const pptAssetSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("path"),
    path: z.string().min(1)
  }),
  z.object({
    kind: z.literal("url"),
    url: z.string().url()
  }),
  z.object({
    kind: z.literal("buffer"),
    data: z.instanceof(Uint8Array).or(z.instanceof(ArrayBuffer)),
    extension: z.string().optional(),
    fileName: z.string().optional(),
    mimeType: z.string().optional()
  })
]);

const pptMetricItemSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1)
});

const pptTimelineItemSchema = z.object({
  label: z.string().min(1),
  detail: z.string().min(1)
});

const pptProcessItemSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1)
});

const pptQuadrantCellSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1)
});

const pptComparisonItemSchema = z.object({
  label: z.string().min(1),
  left: z.string().min(1),
  right: z.string().min(1)
});

const pptSpeakerStepGuidanceSchema = z.object({
  step: z.number().int().positive(),
  cue: z.string().min(1).optional(),
  timing: z.string().min(1).optional(),
  emphasis: z.string().min(1).optional(),
  targetBlockId: z.string().min(1).optional(),
  highlightTargetId: z.string().min(1).optional(),
  highlightTiming: pptActionTimingSchema.optional(),
  highlightExitTiming: pptActionTimingSchema.optional(),
  appearTargetId: z.string().min(1).optional(),
  appearTiming: pptActionTimingSchema.optional(),
  appearExitTiming: pptActionTimingSchema.optional(),
  spotlightTargetId: z.string().min(1).optional(),
  spotlight: z
    .object({
      x: normalizedCoordinateSchema,
      y: normalizedCoordinateSchema,
      radius: z.number().positive(),
      shape: spotlightShapeSchema.optional()
    })
    .optional(),
  spotlightShape: spotlightShapeSchema.optional(),
  spotlightTiming: pptActionTimingSchema.optional(),
  spotlightExitTiming: pptActionTimingSchema.optional(),
  laserPoints: z
    .array(
      z.object({
        x: normalizedCoordinateSchema,
        y: normalizedCoordinateSchema
      })
    )
    .min(2)
    .optional(),
  laserAnchorFrom: laserAnchorFromSchema.optional(),
  laserTiming: pptActionTimingSchema.optional(),
  laserExitTiming: pptActionTimingSchema.optional()
});

export const pptSpeakerNotesSchema = z
  .union([
    z.string().min(1).transform((value) => parseSpeakerNotesText(value)),
    z
      .object({
        summary: z.string().optional(),
        cues: z.array(z.string().min(1)).optional(),
        timing: z.array(z.string().min(1)).optional(),
        emphasis: z.array(z.string().min(1)).optional(),
        stepGuidance: z.array(pptSpeakerStepGuidanceSchema).optional(),
        raw: z.string().optional()
      })
      .transform((value) => compactSpeakerNotes(value))
  ])
  .superRefine((notes, ctx) => {
    const hasContent = Boolean(
      notes.summary ||
        notes.raw ||
        (notes.cues && notes.cues.length > 0) ||
        (notes.timing && notes.timing.length > 0) ||
        (notes.emphasis && notes.emphasis.length > 0) ||
        (notes.stepGuidance && notes.stepGuidance.length > 0)
    );

    if (!hasContent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Speaker notes must contain at least one non-empty field."
      });
    }
  });

const pptDeckTableBlockSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("table"),
  headers: z.array(z.string().min(1)).min(1),
  rows: z.array(z.array(z.string()))
});

export const pptDeckBlockSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.string().min(1),
    kind: z.literal("heading"),
    text: z.string().min(1)
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal("text"),
    text: z.string().min(1)
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal("bullets"),
    items: z.array(z.string().min(1)).min(1),
    itemAnchors: z.record(z.string(), z.string()).optional()
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal("callout"),
    text: z.string().min(1)
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal("metrics"),
    items: z.array(pptMetricItemSchema).min(1)
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal("two-column"),
    left: z.string().min(1),
    right: z.string().min(1)
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal("timeline"),
    items: z.array(pptTimelineItemSchema).min(1)
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal("process"),
    items: z.array(pptProcessItemSchema).min(1)
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal("quadrant"),
    xLabel: z.string().min(1).optional(),
    yLabel: z.string().min(1).optional(),
    topLeft: pptQuadrantCellSchema,
    topRight: pptQuadrantCellSchema,
    bottomLeft: pptQuadrantCellSchema,
    bottomRight: pptQuadrantCellSchema
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal("comparison"),
    leftTitle: z.string().min(1),
    rightTitle: z.string().min(1),
    items: z.array(pptComparisonItemSchema).min(1)
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal("quote"),
    text: z.string().min(1)
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal("code"),
    code: z.string().min(1),
    language: z.string().optional()
  }),
  pptDeckTableBlockSchema,
  z.object({
    id: z.string().min(1),
    kind: z.literal("image"),
    asset: pptAssetSchema,
    caption: z.string().optional()
  })
]).superRefine((block, ctx) => {
  if (block.kind !== "table") {
    return;
  }

  for (const [rowIndex, row] of block.rows.entries()) {
    if (row.length !== block.headers.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Table row ${rowIndex + 1} must contain ${block.headers.length} cells.`,
        path: ["rows", rowIndex]
      });
    }
  }
});

export const pptDeckActionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("appear"),
    targetId: z.string().min(1),
    timing: pptActionTimingSchema.optional(),
    exitTiming: pptActionTimingSchema.optional()
  }),
  z.object({
    kind: z.literal("highlight"),
    targetId: z.string().min(1),
    timing: pptActionTimingSchema.optional(),
    exitTiming: pptActionTimingSchema.optional()
  }),
  z.object({
    kind: z.literal("spotlight"),
    targetId: z.string().min(1).optional(),
    x: normalizedCoordinateSchema.optional(),
    y: normalizedCoordinateSchema.optional(),
    radius: z.number().positive().optional(),
    shape: spotlightShapeSchema.optional(),
    timing: pptActionTimingSchema.optional(),
    exitTiming: pptActionTimingSchema.optional()
  }),
  z.object({
    kind: z.literal("laser"),
    points: z
      .array(
        z.object({
          x: normalizedCoordinateSchema,
          y: normalizedCoordinateSchema
        })
      )
      .min(2),
    anchorFrom: laserAnchorFromSchema.optional(),
    timing: pptActionTimingSchema.optional(),
    exitTiming: pptActionTimingSchema.optional()
  })
]).superRefine((action, ctx) => {
  if (action.kind !== "spotlight") {
    return;
  }

  const hasTarget = Boolean(action.targetId);
  const hasCoords = action.x !== undefined && action.y !== undefined && action.radius !== undefined;

  if (!hasTarget && !hasCoords) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Spotlight action must define either "targetId" or "x, y, radius".'
    });
  }
});

export const pptDeckTransitionSchema = z.object({
  kind: z.union([z.literal("none"), z.literal("fade"), z.literal("slide")])
});

export const pptDeckStepSchema = z.object({
  id: z.string().min(1),
  blocks: z.array(pptDeckBlockSchema).min(1),
  actions: z.array(pptDeckActionSchema).optional(),
  transition: pptDeckTransitionSchema.optional()
});

export const pptDeckSlideSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().optional(),
    notes: pptSpeakerNotesSchema.optional(),
    steps: z.array(pptDeckStepSchema).min(1)
  })
  .superRefine((slide, ctx) => {
    const stepIds = new Set<string>();
    const visibleBlockIds = new Set<string>();
    const visibleBlockIdsByStep = new Map<number, Set<string>>();

    for (const [stepIndex, step] of slide.steps.entries()) {
      if (stepIds.has(step.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate step id "${step.id}" in slide "${slide.id}".`,
          path: ["steps", stepIndex, "id"]
        });
      }
      stepIds.add(step.id);

      for (const [blockIndex, block] of step.blocks.entries()) {
        if (visibleBlockIds.has(block.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate block id "${block.id}" in slide "${slide.id}".`,
            path: ["steps", stepIndex, "blocks", blockIndex, "id"]
          });
        }
        visibleBlockIds.add(block.id);
      }

      visibleBlockIdsByStep.set(stepIndex + 1, new Set(visibleBlockIds));

      for (const [actionIndex, action] of (step.actions ?? []).entries()) {
        if ("targetId" in action && action.targetId && !visibleBlockIds.has(action.targetId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Action target "${action.targetId}" must reference a visible block in slide "${slide.id}".`,
            path: ["steps", stepIndex, "actions", actionIndex, "targetId"]
          });
        }
      }
    }

    for (const [guidanceIndex, guidance] of (slide.notes?.stepGuidance ?? []).entries()) {
      if (guidance.step > slide.steps.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Speaker note step ${guidance.step} exceeds slide "${slide.id}" step count ${slide.steps.length}.`,
          path: ["notes", "stepGuidance", guidanceIndex, "step"]
        });
        continue;
      }

      if (guidance.targetBlockId) {
        assertVisibleStepTarget(ctx, slide.id, guidance.step, guidanceIndex, "targetBlockId", "Speaker note target", guidance.targetBlockId, visibleBlockIdsByStep);
      }

      if (guidance.highlightTargetId) {
        assertVisibleStepTarget(
          ctx,
          slide.id,
          guidance.step,
          guidanceIndex,
          "highlightTargetId",
          "Speaker note highlight target",
          guidance.highlightTargetId,
          visibleBlockIdsByStep
        );
      }

      if (guidance.appearTargetId) {
        assertVisibleStepTarget(
          ctx,
          slide.id,
          guidance.step,
          guidanceIndex,
          "appearTargetId",
          "Speaker note appear target",
          guidance.appearTargetId,
          visibleBlockIdsByStep
        );
      }

      if (guidance.spotlightTargetId) {
        assertVisibleStepTarget(
          ctx,
          slide.id,
          guidance.step,
          guidanceIndex,
          "spotlightTargetId",
          "Speaker note spotlight target",
          guidance.spotlightTargetId,
          visibleBlockIdsByStep
        );
      }
    }
  });

export const pptDeckSchema = z
  .object({
    title: z.string().min(1),
    language: pptLanguageSchema,
    sourceKind: pptSourceKindSchema.optional(),
    presetId: pptPresetIdSchema.optional(),
    slides: z.array(pptDeckSlideSchema).min(1)
  })
  .superRefine((deck, ctx) => {
    const slideIds = new Set<string>();

    for (const [slideIndex, slide] of deck.slides.entries()) {
      if (slideIds.has(slide.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate slide id "${slide.id}" in deck "${deck.title}".`,
          path: ["slides", slideIndex, "id"]
        });
      }
      slideIds.add(slide.id);
    }
  });

export const pptSourceInputSchema = z.object({
  language: pptLanguageSchema,
  sourceKind: pptSourceKindSchema,
  content: z.string().min(1),
  title: z.string().optional(),
  presetId: pptPresetIdSchema.optional()
});

export function validateDeck(input: unknown): PptDeck {
  return pptDeckSchema.parse(input) as PptDeck;
}

export function validateSourceInput(input: unknown): PptSourceInput {
  return pptSourceInputSchema.parse(input) as PptSourceInput;
}

function assertVisibleStepTarget(
  ctx: z.RefinementCtx,
  slideId: string,
  step: number,
  guidanceIndex: number,
  field: "targetBlockId" | "highlightTargetId" | "appearTargetId" | "spotlightTargetId",
  label: string,
  targetId: string,
  visibleBlockIdsByStep: Map<number, Set<string>>
) {
  const visibleByThatStep = visibleBlockIdsByStep.get(step);

  if (!visibleByThatStep?.has(targetId)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} "${targetId}" must be visible by step ${step} in slide "${slideId}".`,
      path: ["notes", "stepGuidance", guidanceIndex, field]
    });
  }
}
