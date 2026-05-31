export type PptLanguage = "en-US" | "zh-CN";

export type PptSourceKind = "text" | "markdown";

export type PptPresetId = "executive-report" | "technical-brief" | "product-showcase";

export type PptTarget = "editable-pptx" | "html-bundle";

export type PptEngine = "pptx" | "html";

export type PptArtifactKind = "buffer" | "file" | "file-map" | "directory";

export type PptPlaceholderKind = "text" | "image" | "chart" | "table" | "shape";

export type PptOutput = { mode: "memory" } | { mode: "file"; path: string };

export type PptTextStyle = {
  fontFace: string;
  fontSize: number;
  color: string;
  bold?: boolean;
  italic?: boolean;
};

export type PptPlaceholder = {
  id: string;
  kind: PptPlaceholderKind;
  role: string;
  x: number;
  y: number;
  w: number;
  h: number;
  style?: PptTextStyle;
};

export type PptLayoutPreset = {
  id: string;
  name: string;
  purpose: string;
  placeholders: PptPlaceholder[];
};

export type PptTemplatePreset = {
  id: PptPresetId;
  name: string;
  description: string;
  aspectRatio: "16:9";
  size: {
    width: number;
    height: number;
    unit: "in";
  };
  capabilities: string[];
  supportedTargets: PptTarget[];
  preferredEngines: Record<PptTarget, PptEngine>;
  theme: {
    fonts: {
      heading: string;
      body: string;
    };
    colors: {
      background: string;
      surface: string;
      title: string;
      body: string;
      muted: string;
      accent: string;
      secondary: string;
    };
  };
  motionProfile: PptMotionProfile;
  layouts: PptLayoutPreset[];
};

export type PptPathAssetInput = {
  kind: "path";
  path: string;
};

export type PptUrlAssetInput = {
  kind: "url";
  url: string;
};

export type PptBufferAssetInput = {
  kind: "buffer";
  data: Uint8Array | ArrayBuffer;
  extension?: string;
  fileName?: string;
  mimeType?: string;
};

export type PptAssetInput = PptPathAssetInput | PptUrlAssetInput | PptBufferAssetInput;

export type PptDeckMetricItem = {
  label: string;
  value: string;
};

export type PptDeckTimelineItem = {
  label: string;
  detail: string;
};

export type PptDeckProcessItem = {
  title: string;
  detail: string;
};

export type PptDeckQuadrantCell = {
  title: string;
  detail: string;
};

export type PptDeckComparisonItem = {
  label: string;
  left: string;
  right: string;
};

export type PptDeckBlockKind =
  | "heading"
  | "text"
  | "bullets"
  | "callout"
  | "metrics"
  | "two-column"
  | "timeline"
  | "process"
  | "quadrant"
  | "comparison"
  | "quote"
  | "code"
  | "table"
  | "image";

export type PptDeckPoint = {
  x: number;
  y: number;
};

export type PptSpotlightShape = "auto" | "circle" | "pill";

export type PptLaserAnchorFrom = "target" | "custom";

export type PptActionTiming = {
  delayMs?: number;
  durationMs?: number;
  easing?: string;
};

export type PptMotionPhaseProfile = {
  enter: PptActionTiming;
  exit: PptActionTiming;
};

export type PptMotionProfile = {
  highlight: PptMotionPhaseProfile;
  appear: PptMotionPhaseProfile;
  spotlight: PptMotionPhaseProfile;
  laser: PptMotionPhaseProfile;
  byBlockKind?: Partial<Record<PptDeckBlockKind, Partial<Omit<PptMotionProfile, "byBlockKind">>>>;
};

export type PptSpeakerSpotlight = {
  x: number;
  y: number;
  radius: number;
  shape?: PptSpotlightShape;
};

export type PptSpeakerStepGuidance = {
  step: number;
  cue?: string;
  timing?: string;
  emphasis?: string;
  targetBlockId?: string;
  highlightTargetId?: string;
  highlightTiming?: PptActionTiming;
  highlightExitTiming?: PptActionTiming;
  appearTargetId?: string;
  appearTiming?: PptActionTiming;
  appearExitTiming?: PptActionTiming;
  spotlightTargetId?: string;
  spotlight?: PptSpeakerSpotlight;
  spotlightShape?: PptSpotlightShape;
  spotlightTiming?: PptActionTiming;
  spotlightExitTiming?: PptActionTiming;
  laserPoints?: PptDeckPoint[];
  laserAnchorFrom?: PptLaserAnchorFrom;
  laserTiming?: PptActionTiming;
  laserExitTiming?: PptActionTiming;
};

export type PptSpeakerNotes = {
  summary?: string;
  cues?: string[];
  timing?: string[];
  emphasis?: string[];
  stepGuidance?: PptSpeakerStepGuidance[];
  raw?: string;
};

export type PptDeckBlock =
  | { id: string; kind: "heading"; text: string }
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "bullets"; items: string[]; itemAnchors?: Record<number, string> }
  | { id: string; kind: "callout"; text: string }
  | { id: string; kind: "metrics"; items: PptDeckMetricItem[] }
  | { id: string; kind: "two-column"; left: string; right: string }
  | { id: string; kind: "timeline"; items: PptDeckTimelineItem[] }
  | { id: string; kind: "process"; items: PptDeckProcessItem[] }
  | {
      id: string;
      kind: "quadrant";
      xLabel?: string;
      yLabel?: string;
      topLeft: PptDeckQuadrantCell;
      topRight: PptDeckQuadrantCell;
      bottomLeft: PptDeckQuadrantCell;
      bottomRight: PptDeckQuadrantCell;
    }
  | { id: string; kind: "comparison"; leftTitle: string; rightTitle: string; items: PptDeckComparisonItem[] }
  | { id: string; kind: "quote"; text: string }
  | { id: string; kind: "code"; code: string; language?: string }
  | { id: string; kind: "table"; headers: string[]; rows: string[][] }
  | { id: string; kind: "image"; asset: PptAssetInput; caption?: string };

export type PptDeckAction =
    | { kind: "appear"; targetId: string; timing?: PptActionTiming; exitTiming?: PptActionTiming }
    | { kind: "highlight"; targetId: string; timing?: PptActionTiming; exitTiming?: PptActionTiming }
    | { kind: "spotlight"; targetId?: string; x?: number; y?: number; radius?: number; shape?: PptSpotlightShape; timing?: PptActionTiming; exitTiming?: PptActionTiming }
    | { kind: "laser"; points: PptDeckPoint[]; anchorFrom?: PptLaserAnchorFrom; timing?: PptActionTiming; exitTiming?: PptActionTiming };

export type PptDeckTransition = { kind: "none" | "fade" | "slide" };

export type PptDeckStep = {
  id: string;
  blocks: PptDeckBlock[];
  actions?: PptDeckAction[];
  transition?: PptDeckTransition;
};

export type PptDeckSlide = {
  id: string;
  title?: string;
  notes?: PptSpeakerNotes;
  steps: PptDeckStep[];
};

export type PptDeck = {
  title: string;
  language: PptLanguage;
  sourceKind?: PptSourceKind;
  presetId?: PptPresetId;
  slides: PptDeckSlide[];
};

export type PptSourceInput = {
  language: PptLanguage;
  sourceKind: PptSourceKind;
  content: string;
  title?: string;
  presetId?: PptPresetId;
};

export type PptxSlideInput = {
  title: string;
  body?: string;
  bullets?: string[];
  notes?: string;
  image?: PptAssetInput;
  layoutId?: string;
};

export type PptxPresentationInput = {
  title: string;
  subtitle?: string;
  subject?: string;
  author?: string;
  company?: string;
  slides: PptxSlideInput[];
};

export type PptPresentationInput = PptxPresentationInput | PptDeck;

export type PptArtifactFile = {
  path: string;
  content: string | Uint8Array;
};

export type PptArtifactFileMap = Record<string, PptArtifactFile>;

export type PptBuildResult =
  | {
      target: PptTarget;
      presetId: PptPresetId;
      requestedEngine?: PptEngine;
      finalEngine: PptEngine;
      artifactKind: "buffer";
      artifact: Uint8Array;
    }
  | {
      target: PptTarget;
      presetId: PptPresetId;
      requestedEngine?: PptEngine;
      finalEngine: PptEngine;
      artifactKind: "file-map";
      artifact: PptArtifactFileMap;
    }
  | {
      target: PptTarget;
      presetId: PptPresetId;
      requestedEngine?: PptEngine;
      finalEngine: PptEngine;
      artifactKind: "file";
      outputPath: string;
    }
  | {
      target: PptTarget;
      presetId: PptPresetId;
      requestedEngine?: PptEngine;
      finalEngine: PptEngine;
      artifactKind: "directory";
      outputPath: string;
    };

export interface PptPresentationBuilder {
  preset(id: PptPresetId): PptPresentationBuilder;
  target(target: PptTarget): PptPresentationBuilder;
  engine(engine: PptEngine): PptPresentationBuilder;
  input(input: PptPresentationInput): PptPresentationBuilder;
  output(output: PptOutput): PptPresentationBuilder;
  build(): Promise<PptBuildResult>;
}
