import type { PptEngine, PptLayoutPreset, PptMotionProfile, PptPlaceholder, PptPresetId, PptTarget, PptTemplatePreset } from "./types.js";

const wideSize = {
  width: 13.333,
  height: 7.5,
  unit: "in" as const
};

const supportedTargets: PptTarget[] = ["editable-pptx", "html-bundle"];

const preferredEngines: Record<PptTarget, PptEngine> = {
  "editable-pptx": "pptx",
  "html-bundle": "html"
};

export const pptTemplatePresets: PptTemplatePreset[] = [
  {
    id: "executive-report",
    name: "Executive Report",
    description: "A restrained report preset for strategy reviews, board updates, and operating summaries.",
    aspectRatio: "16:9",
    size: wideSize,
    capabilities: ["title", "section", "two-column", "metrics", "table"],
    supportedTargets,
    preferredEngines,
    theme: {
      fonts: {
        heading: "Aptos Display",
        body: "Aptos"
      },
      colors: {
        background: "F8FAFC",
        surface: "FFFFFF",
        title: "111827",
        body: "374151",
        muted: "64748B",
        accent: "2563EB",
        secondary: "0F766E"
      }
    },
    motionProfile: createMotionProfile({
      highlight: { enter: { delayMs: 90, durationMs: 300, easing: "ease-out" }, exit: { delayMs: 20, durationMs: 220, easing: "ease-in" } },
      appear: { enter: { delayMs: 180, durationMs: 520, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }, exit: { delayMs: 10, durationMs: 210, easing: "ease-in" } },
      spotlight: { enter: { delayMs: 80, durationMs: 360, easing: "ease-out" }, exit: { delayMs: 0, durationMs: 220, easing: "ease-in" } },
      laser: { enter: { delayMs: 230, durationMs: 560, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }, exit: { delayMs: 0, durationMs: 220, easing: "ease-in" } },
      byBlockKind: {
        comparison: {
          highlight: { enter: { delayMs: 110, durationMs: 340, easing: "ease-out" }, exit: { delayMs: 30, durationMs: 240, easing: "ease-in" } },
          appear: { enter: { delayMs: 200, durationMs: 580, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }, exit: { delayMs: 20, durationMs: 220, easing: "ease-in" } }
        },
        timeline: {
          spotlight: { enter: { delayMs: 70, durationMs: 320, easing: "ease-out" }, exit: { delayMs: 0, durationMs: 200, easing: "ease-in" } },
          laser: { enter: { delayMs: 210, durationMs: 520, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }, exit: { delayMs: 0, durationMs: 210, easing: "ease-in" } }
        }
      }
    }),
    layouts: [
      createTitleLayout("report-title"),
      createSectionLayout("section-divider"),
      createTwoColumnLayout("two-column-analysis"),
      createMetricGridLayout("metric-grid"),
      createTableLayout("data-table")
    ]
  },
  {
    id: "technical-brief",
    name: "Technical Brief",
    description: "A dense technical preset for architecture, system design, and implementation reviews.",
    aspectRatio: "16:9",
    size: wideSize,
    capabilities: ["title", "two-column", "diagram", "code", "timeline"],
    supportedTargets,
    preferredEngines,
    theme: {
      fonts: {
        heading: "Aptos Display",
        body: "Aptos"
      },
      colors: {
        background: "F9FAFB",
        surface: "FFFFFF",
        title: "0F172A",
        body: "334155",
        muted: "64748B",
        accent: "7C3AED",
        secondary: "0891B2"
      }
    },
    motionProfile: createMotionProfile({
      highlight: { enter: { delayMs: 70, durationMs: 260, easing: "ease-in-out" }, exit: { delayMs: 10, durationMs: 190, easing: "ease-in" } },
      appear: { enter: { delayMs: 140, durationMs: 460, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }, exit: { delayMs: 0, durationMs: 180, easing: "ease-in" } },
      spotlight: { enter: { delayMs: 60, durationMs: 320, easing: "ease-out" }, exit: { delayMs: 0, durationMs: 180, easing: "ease-in" } },
      laser: { enter: { delayMs: 190, durationMs: 520, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }, exit: { delayMs: 0, durationMs: 190, easing: "ease-in" } },
      byBlockKind: {
        timeline: {
          spotlight: { enter: { delayMs: 40, durationMs: 280, easing: "ease-out" }, exit: { delayMs: 0, durationMs: 160, easing: "ease-in" } },
          laser: { enter: { delayMs: 150, durationMs: 440, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }, exit: { delayMs: 0, durationMs: 170, easing: "ease-in" } }
        },
        comparison: {
          highlight: { enter: { delayMs: 90, durationMs: 300, easing: "ease-in-out" }, exit: { delayMs: 20, durationMs: 210, easing: "ease-in" } },
          appear: { enter: { delayMs: 170, durationMs: 500, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }, exit: { delayMs: 10, durationMs: 190, easing: "ease-in" } }
        }
      }
    }),
    layouts: [
      createTitleLayout("brief-title"),
      createTwoColumnLayout("problem-solution"),
      createDiagramLayout("architecture-diagram"),
      createCodeLayout("code-or-schema"),
      createTimelineLayout("implementation-plan")
    ]
  },
  {
    id: "product-showcase",
    name: "Product Showcase",
    description: "A visual preset for product narratives, feature walkthroughs, and demo-heavy decks.",
    aspectRatio: "16:9",
    size: wideSize,
    capabilities: ["title", "image-focus", "feature-grid", "two-column", "metrics"],
    supportedTargets,
    preferredEngines,
    theme: {
      fonts: {
        heading: "Aptos Display",
        body: "Aptos"
      },
      colors: {
        background: "FFFFFF",
        surface: "F8FAFC",
        title: "18181B",
        body: "3F3F46",
        muted: "71717A",
        accent: "DC2626",
        secondary: "16A34A"
      }
    },
    motionProfile: createMotionProfile({
      highlight: { enter: { delayMs: 110, durationMs: 360, easing: "ease-out" }, exit: { delayMs: 30, durationMs: 260, easing: "ease-in" } },
      appear: { enter: { delayMs: 210, durationMs: 620, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }, exit: { delayMs: 20, durationMs: 240, easing: "ease-in" } },
      spotlight: { enter: { delayMs: 90, durationMs: 420, easing: "ease-out" }, exit: { delayMs: 10, durationMs: 240, easing: "ease-in" } },
      laser: { enter: { delayMs: 260, durationMs: 700, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }, exit: { delayMs: 10, durationMs: 250, easing: "ease-in" } },
      byBlockKind: {
        comparison: {
          highlight: { enter: { delayMs: 130, durationMs: 390, easing: "ease-out" }, exit: { delayMs: 30, durationMs: 270, easing: "ease-in" } },
          appear: { enter: { delayMs: 240, durationMs: 660, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }, exit: { delayMs: 20, durationMs: 250, easing: "ease-in" } }
        },
        timeline: {
          spotlight: { enter: { delayMs: 100, durationMs: 450, easing: "ease-out" }, exit: { delayMs: 10, durationMs: 250, easing: "ease-in" } },
          laser: { enter: { delayMs: 280, durationMs: 760, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }, exit: { delayMs: 10, durationMs: 260, easing: "ease-in" } }
        }
      }
    }),
    layouts: [
      createTitleLayout("showcase-title"),
      createImageFocusLayout("image-focus"),
      createFeatureGridLayout("feature-grid"),
      createTwoColumnLayout("before-after"),
      createMetricGridLayout("impact-metrics")
    ]
  }
];

function createMotionProfile(profile: PptMotionProfile): PptMotionProfile {
  return profile;
}

export function listPptPresets(): PptTemplatePreset[] {
  return [...pptTemplatePresets];
}

export function getPptPreset(id: PptPresetId): PptTemplatePreset | undefined {
  return pptTemplatePresets.find((preset) => preset.id === id);
}

export function requirePptPreset(id: PptPresetId): PptTemplatePreset {
  const preset = getPptPreset(id);

  if (!preset) {
    throw new Error(`Unknown PPT preset: ${id}`);
  }

  return preset;
}

function createTitleLayout(id: string): PptLayoutPreset {
  return {
    id,
    name: "Title",
    purpose: "Open a deck or major narrative section.",
    placeholders: [
      titlePlaceholder("title", 0.75, 1.35, 8.8, 0.95, 38),
      bodyPlaceholder("subtitle", 0.78, 2.45, 7.8, 0.55, 18),
      shapePlaceholder("accent-line", 0.8, 3.35, 2.25, 0.08)
    ]
  };
}

function createSectionLayout(id: string): PptLayoutPreset {
  return {
    id,
    name: "Section Divider",
    purpose: "Create a clear transition between major sections.",
    placeholders: [
      titlePlaceholder("section-title", 0.8, 2.2, 9.5, 0.85, 34),
      bodyPlaceholder("section-summary", 0.85, 3.2, 6.8, 0.65, 17),
      shapePlaceholder("section-marker", 0, 0, 0.18, 7.5)
    ]
  };
}

function createTwoColumnLayout(id: string): PptLayoutPreset {
  return {
    id,
    name: "Two Column",
    purpose: "Compare two ideas or separate explanation from evidence.",
    placeholders: [
      titlePlaceholder("title", 0.65, 0.5, 12, 0.55, 28),
      bodyPlaceholder("left-heading", 0.75, 1.45, 5.4, 0.35, 16),
      bodyPlaceholder("left-body", 0.75, 1.95, 5.4, 4.45, 15),
      bodyPlaceholder("right-heading", 7.05, 1.45, 5.4, 0.35, 16),
      bodyPlaceholder("right-body", 7.05, 1.95, 5.4, 4.45, 15)
    ]
  };
}

function createMetricGridLayout(id: string): PptLayoutPreset {
  return {
    id,
    name: "Metric Grid",
    purpose: "Show three to six key metrics with concise labels.",
    placeholders: [
      titlePlaceholder("title", 0.65, 0.5, 12, 0.55, 28),
      bodyPlaceholder("metric-1", 0.85, 1.65, 3.75, 1.35, 24),
      bodyPlaceholder("metric-2", 4.8, 1.65, 3.75, 1.35, 24),
      bodyPlaceholder("metric-3", 8.75, 1.65, 3.75, 1.35, 24),
      bodyPlaceholder("metric-4", 0.85, 3.45, 3.75, 1.35, 24),
      bodyPlaceholder("metric-5", 4.8, 3.45, 3.75, 1.35, 24),
      bodyPlaceholder("metric-6", 8.75, 3.45, 3.75, 1.35, 24)
    ]
  };
}

function createTableLayout(id: string): PptLayoutPreset {
  return {
    id,
    name: "Data Table",
    purpose: "Present structured comparison data with a short takeaway.",
    placeholders: [
      titlePlaceholder("title", 0.65, 0.5, 12, 0.55, 28),
      tablePlaceholder("table", 0.75, 1.45, 11.85, 4.7),
      bodyPlaceholder("takeaway", 0.78, 6.35, 11.2, 0.35, 13)
    ]
  };
}

function createDiagramLayout(id: string): PptLayoutPreset {
  return {
    id,
    name: "Diagram",
    purpose: "Reserve space for architecture, process, or dependency diagrams.",
    placeholders: [
      titlePlaceholder("title", 0.65, 0.5, 12, 0.55, 28),
      shapePlaceholder("diagram-canvas", 0.85, 1.45, 11.65, 4.85),
      bodyPlaceholder("caption", 0.9, 6.45, 10.8, 0.32, 12)
    ]
  };
}

function createCodeLayout(id: string): PptLayoutPreset {
  return {
    id,
    name: "Code Or Schema",
    purpose: "Show a code snippet, schema, prompt, or compact technical artifact.",
    placeholders: [
      titlePlaceholder("title", 0.65, 0.5, 12, 0.55, 28),
      bodyPlaceholder("context", 0.75, 1.35, 3.2, 4.95, 14),
      bodyPlaceholder("code", 4.25, 1.35, 8.1, 4.95, 13)
    ]
  };
}

function createTimelineLayout(id: string): PptLayoutPreset {
  return {
    id,
    name: "Timeline",
    purpose: "Show phases, releases, milestones, or implementation steps.",
    placeholders: [
      titlePlaceholder("title", 0.65, 0.5, 12, 0.55, 28),
      shapePlaceholder("timeline-line", 1.0, 3.35, 11.2, 0.06),
      bodyPlaceholder("milestone-1", 0.9, 2.0, 2.2, 1.0, 13),
      bodyPlaceholder("milestone-2", 3.35, 3.65, 2.2, 1.0, 13),
      bodyPlaceholder("milestone-3", 5.8, 2.0, 2.2, 1.0, 13),
      bodyPlaceholder("milestone-4", 8.25, 3.65, 2.2, 1.0, 13),
      bodyPlaceholder("milestone-5", 10.7, 2.0, 2.2, 1.0, 13)
    ]
  };
}

function createImageFocusLayout(id: string): PptLayoutPreset {
  return {
    id,
    name: "Image Focus",
    purpose: "Lead with a screenshot, product image, or visual result.",
    placeholders: [
      titlePlaceholder("title", 0.65, 0.5, 12, 0.55, 28),
      imagePlaceholder("image", 0.85, 1.35, 7.35, 5.25),
      bodyPlaceholder("caption", 8.55, 1.55, 3.75, 4.55, 16)
    ]
  };
}

function createFeatureGridLayout(id: string): PptLayoutPreset {
  return {
    id,
    name: "Feature Grid",
    purpose: "Describe four product capabilities or use cases.",
    placeholders: [
      titlePlaceholder("title", 0.65, 0.5, 12, 0.55, 28),
      bodyPlaceholder("feature-1", 0.85, 1.55, 5.45, 1.75, 16),
      bodyPlaceholder("feature-2", 7.0, 1.55, 5.45, 1.75, 16),
      bodyPlaceholder("feature-3", 0.85, 3.75, 5.45, 1.75, 16),
      bodyPlaceholder("feature-4", 7.0, 3.75, 5.45, 1.75, 16)
    ]
  };
}

function titlePlaceholder(id: string, x: number, y: number, w: number, h: number, fontSize: number): PptPlaceholder {
  return {
    id,
    kind: "text",
    role: "title",
    x,
    y,
    w,
    h,
    style: {
      fontFace: "Aptos Display",
      fontSize,
      color: "title",
      bold: true
    }
  };
}

function bodyPlaceholder(id: string, x: number, y: number, w: number, h: number, fontSize: number): PptPlaceholder {
  return {
    id,
    kind: "text",
    role: "body",
    x,
    y,
    w,
    h,
    style: {
      fontFace: "Aptos",
      fontSize,
      color: "body"
    }
  };
}

function imagePlaceholder(id: string, x: number, y: number, w: number, h: number): PptPlaceholder {
  return {
    id,
    kind: "image",
    role: "media",
    x,
    y,
    w,
    h
  };
}

function tablePlaceholder(id: string, x: number, y: number, w: number, h: number): PptPlaceholder {
  return {
    id,
    kind: "table",
    role: "data",
    x,
    y,
    w,
    h
  };
}

function shapePlaceholder(id: string, x: number, y: number, w: number, h: number): PptPlaceholder {
  return {
    id,
    kind: "shape",
    role: "structure",
    x,
    y,
    w,
    h
  };
}
