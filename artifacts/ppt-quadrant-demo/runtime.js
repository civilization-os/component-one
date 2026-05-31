const deck = window.__PPT_DECK__;
const motionProfile = {"highlight":{"enter":{"delayMs":90,"durationMs":300,"easing":"ease-out"},"exit":{"delayMs":20,"durationMs":220,"easing":"ease-in"}},"appear":{"enter":{"delayMs":180,"durationMs":520,"easing":"cubic-bezier(0.16, 1, 0.3, 1)"},"exit":{"delayMs":10,"durationMs":210,"easing":"ease-in"}},"spotlight":{"enter":{"delayMs":80,"durationMs":360,"easing":"ease-out"},"exit":{"delayMs":0,"durationMs":220,"easing":"ease-in"}},"laser":{"enter":{"delayMs":230,"durationMs":560,"easing":"cubic-bezier(0.22, 1, 0.36, 1)"},"exit":{"delayMs":0,"durationMs":220,"easing":"ease-in"}},"byBlockKind":{"comparison":{"highlight":{"enter":{"delayMs":110,"durationMs":340,"easing":"ease-out"},"exit":{"delayMs":30,"durationMs":240,"easing":"ease-in"}},"appear":{"enter":{"delayMs":200,"durationMs":580,"easing":"cubic-bezier(0.16, 1, 0.3, 1)"},"exit":{"delayMs":20,"durationMs":220,"easing":"ease-in"}}},"timeline":{"spotlight":{"enter":{"delayMs":70,"durationMs":320,"easing":"ease-out"},"exit":{"delayMs":0,"durationMs":200,"easing":"ease-in"}},"laser":{"enter":{"delayMs":210,"durationMs":520,"easing":"cubic-bezier(0.22, 1, 0.36, 1)"},"exit":{"delayMs":0,"durationMs":210,"easing":"ease-in"}}}}};
const STAGE_WIDTH = 1000;
const STAGE_HEIGHT = 562.5;
const RUNTIME_MESSAGE_TYPE = "component-one:ppt-runtime";
const RUNTIME_STORAGE_KEY = "component-one:ppt:" + encodeURIComponent((deck?.presetId ?? "default") + ":" + deck?.title);

if (!deck) {
  throw new Error("Missing deck payload.");
}

const app = document.getElementById("app");
const isSpeakerView = document.body.dataset.view === "speaker";
const isFileProtocol = window.location.protocol === "file:";
const instanceId = Math.random().toString(36).slice(2);
let speakerWindow = null;
let broadcastChannel = null;
let syncFallbackTimer = null;
let lastOverlaySnapshot = null;
let overlayExitSnapshot = null;
const emptyRenderState = {
  highlightedIds: new Set(),
  appearingIds: new Set(),
  guidanceTargetIds: new Set(),
  emphasizedIds: new Set(),
  focusMode: false
};
const state = {
  slideIndex: 0,
  stepIndex: 0,
  startedAt: Date.now(),
  pausedAt: null,
  totalPausedMs: 0,
  isBlackout: false
};
let prevSlideIndex = -1;
let prevStepIndex = -1;
let prevVisibleBlockCount = 0;
const labels = deck.language === "zh-CN"
  ? {
      speakerView: "\u6F14\u8BB2\u8005\u89C6\u56FE",
      deck: "\u6F14\u793A\u7A3F",
      slide: "\u9875\u9762",
      step: "\u6B65\u9AA4",
      timer: "\u8BA1\u65F6",
      action: "\u52A8\u4F5C",
      notes: "\u5907\u6CE8",
      nextStep: "\u4E0B\u4E00\u6B65",
      noNotes: "\u65E0\u5907\u6CE8",
      endOfSlide: "\u5F53\u524D\u9875\u7ED3\u675F",
      summary: "\u6458\u8981",
      cues: "\u63D0\u793A",
      timing: "\u8282\u594F",
      exit: "\u9000\u51FA",
      emphasis: "\u5F3A\u8C03",
      highlight: "\u9AD8\u4EAE",
      appear: "\u51FA\u73B0",
      spotlight: "\u805A\u5149\u706F",
      laser: "\u6FC0\u5149",
      stepGuidance: "\u6B65\u9AA4\u7ED1\u5B9A",
      targetBlock: "\u76EE\u6807\u5757",
      currentGuidance: "\u5F53\u524D\u63D0\u793A",
      controlsTitle: "\u6F14\u793A\u63A7\u5236",
      previous: "\u4E0A\u4E00\u6B65",
      next: "\u4E0B\u4E00\u6B65",
      jumpSlide: "\u9875\u9762",
      jumpStep: "\u6B65\u9AA4",
      jumpGo: "\u8DF3\u8F6C",
      blackout: "\u9ED1\u5C4F",
      resumeStage: "\u6062\u590D\u821E\u53F0",
      pauseTimer: "\u6682\u505C\u8BA1\u65F6",
      resumeTimer: "\u6062\u590D\u8BA1\u65F6",
      timerPaused: "\u8BA1\u65F6\u5DF2\u6682\u505C",
      stageBlackout: "\u821E\u53F0\u9ED1\u5C4F\u4E2D",
      blackoutScreen: "\u9ED1\u5C4F\u4E2D",
      controls: "\u4F7F\u7528 ArrowLeft / ArrowRight \u6216 Space\u3002\u6309 F \u5168\u5C4F\uFF0C\u6309 S \u6253\u5F00\u6F14\u8BB2\u8005\u89C6\u56FE\u3002",
      none: "\u65E0"
    }
  : {
      speakerView: "Speaker View",
      deck: "Deck",
      slide: "Slide",
      step: "Step",
      timer: "Timer",
      action: "Action",
      notes: "Notes",
      nextStep: "Next Step",
      noNotes: "No notes.",
      endOfSlide: "End of slide.",
      summary: "Summary",
      cues: "Cues",
      timing: "Timing",
      exit: "Exit",
      emphasis: "Emphasis",
      highlight: "Highlight",
      appear: "Appear",
      spotlight: "Spotlight",
      laser: "Laser",
      stepGuidance: "Step Guidance",
      targetBlock: "Target Block",
      currentGuidance: "Current Guidance",
      controlsTitle: "Presentation Controls",
      previous: "Previous",
      next: "Next",
      jumpSlide: "Slide",
      jumpStep: "Step",
      jumpGo: "Go",
      blackout: "Blackout",
      resumeStage: "Resume Stage",
      pauseTimer: "Pause Timer",
      resumeTimer: "Resume Timer",
      timerPaused: "Timer paused",
      stageBlackout: "Stage blacked out",
      blackoutScreen: "Blackout",
      controls: "Use ArrowLeft / ArrowRight or Space. Press F for fullscreen and S for speaker view.",
      none: "None"
    };

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function maxStepIndex(slideIndex) {
  const slide = deck.slides[slideIndex];
  return Math.max(0, (slide?.steps.length ?? 1) - 1);
}

function clampNumber(value, fallback, max) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(max, Math.trunc(value)));
}

function normalizeRuntimeState(input) {
  const slideIndex = clampNumber(input?.slideIndex ?? 0, 0, Math.max(0, deck.slides.length - 1));
  const stepIndex = clampNumber(input?.stepIndex ?? 0, 0, maxStepIndex(slideIndex));
  const startedAt = Number.isFinite(input?.startedAt) ? Math.trunc(input.startedAt) : Date.now();
  const pausedAt = Number.isFinite(input?.pausedAt) ? Math.trunc(input.pausedAt) : null;
  const totalPausedMs = Number.isFinite(input?.totalPausedMs) ? Math.max(0, Math.trunc(input.totalPausedMs)) : 0;
  const isBlackout = Boolean(input?.isBlackout);

  return {
    slideIndex,
    stepIndex,
    startedAt,
    pausedAt,
    totalPausedMs,
    isBlackout
  };
}

function serializeRuntimeState() {
  return {
    slideIndex: state.slideIndex,
    stepIndex: state.stepIndex,
    startedAt: state.startedAt,
    pausedAt: state.pausedAt,
    totalPausedMs: state.totalPausedMs,
    isBlackout: state.isBlackout
  };
}

function statesEqual(left, right) {
  return left.slideIndex === right.slideIndex &&
    left.stepIndex === right.stepIndex &&
    left.startedAt === right.startedAt &&
    left.pausedAt === right.pausedAt &&
    left.totalPausedMs === right.totalPausedMs &&
    left.isBlackout === right.isBlackout;
}

function hashForState(snapshot) {
  return "#slide=" + (snapshot.slideIndex + 1) +
    "&step=" + (snapshot.stepIndex + 1) +
    "&startedAt=" + snapshot.startedAt +
    "&pausedAt=" + (snapshot.pausedAt ?? "") +
    "&pausedMs=" + snapshot.totalPausedMs +
    "&blackout=" + (snapshot.isBlackout ? "1" : "0");
}

function readStateFromHash() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;

  if (!hash) {
    return null;
  }

  const params = new URLSearchParams(hash);
  const slide = Number.parseInt(params.get("slide") ?? "", 10);
  const step = Number.parseInt(params.get("step") ?? "", 10);
  const startedAt = Number.parseInt(params.get("startedAt") ?? "", 10);
  const pausedAt = Number.parseInt(params.get("pausedAt") ?? "", 10);
  const totalPausedMs = Number.parseInt(params.get("pausedMs") ?? "", 10);
  const isBlackout = params.get("blackout") === "1";

  if (!Number.isFinite(slide) && !Number.isFinite(step) && !Number.isFinite(startedAt) && !Number.isFinite(pausedAt) && !Number.isFinite(totalPausedMs) && !isBlackout) {
    return null;
  }

  return normalizeRuntimeState({
    slideIndex: Number.isFinite(slide) ? slide - 1 : 0,
    stepIndex: Number.isFinite(step) ? step - 1 : 0,
    startedAt,
    pausedAt,
    totalPausedMs,
    isBlackout
  });
}

function readStateFromStorage() {
  try {
    const raw = window.localStorage.getItem(RUNTIME_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    return normalizeRuntimeState(JSON.parse(raw));
  } catch {
    return null;
  }
}

function persistState(snapshot, options = { pushHistory: false }) {
  const hash = hashForState(snapshot);

  if (window.location.hash !== hash) {
    if (options.pushHistory) {
      window.history.pushState(null, "", hash);
    } else {
      window.history.replaceState(null, "", hash);
    }
  }

  if (isFileProtocol) return;
  try { window.localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify(snapshot)); } catch {}
}

function initializeSyncChannel() {
  // Prefer BroadcastChannel (covers both tabs and same-origin windows),
  // fall back to postMessage for opener/opened pairs on file://.
  try {
    if (!isFileProtocol && "BroadcastChannel" in window) {
      broadcastChannel = new BroadcastChannel(RUNTIME_STORAGE_KEY);
      broadcastChannel.addEventListener("message", (event) => {
        const payload = event.data;
        if (!payload) return;
        if (payload.type !== RUNTIME_MESSAGE_TYPE || payload.sourceId === instanceId) return;
        if (payload.action === "sync-state") {
          applyRuntimeState(payload.state, { renderView: true, broadcast: false, persist: !isFileProtocol });
        } else if (payload.action === "request-state" && !isSpeakerView) {
          // Reply so late-joining speaker windows catch up immediately
          try { broadcastChannel.postMessage({ type: RUNTIME_MESSAGE_TYPE, action: "sync-state", sourceId: instanceId, state: serializeRuntimeState() }); } catch {}
        }
      });
    }
  } catch {
    broadcastChannel = null;
  }
}

function linkedWindows() {
  const windows = [];
  if (window.opener && !window.opener.closed) windows.push(window.opener);
  if (speakerWindow && !speakerWindow.closed) windows.push(speakerWindow);
  return windows;
}

function sendRuntimeMessage(target, action, snapshot) {
  if (!target || typeof target.postMessage !== "function") return;
  try { target.postMessage({ type: RUNTIME_MESSAGE_TYPE, action, sourceId: instanceId, state: snapshot }, "*"); } catch {}
}

function broadcastRuntimeState(snapshot) {
  // Primary channel: BroadcastChannel (works across tabs + windows on http/https)
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: RUNTIME_MESSAGE_TYPE, action: "sync-state", sourceId: instanceId, state: snapshot });
    } catch {}
    return;
  }

  // Fallback on file:// or restricted contexts: postMessage between opener/opened
  for (const target of linkedWindows()) {
    sendRuntimeMessage(target, "sync-state", snapshot);
  }
}

function applyRuntimeState(nextState, options = {}) {
  const normalized = normalizeRuntimeState(nextState);

  if (statesEqual(normalized, serializeRuntimeState())) {
    if (options.persist) {
      persistState(normalized);
    }
    return false;
  }

  state.slideIndex = normalized.slideIndex;
  state.stepIndex = normalized.stepIndex;
  state.startedAt = normalized.startedAt;
  state.pausedAt = normalized.pausedAt;
  state.totalPausedMs = normalized.totalPausedMs;
  state.isBlackout = normalized.isBlackout;

  if (options.persist !== false) {
    persistState(normalized, { pushHistory: options.pushHistory === true });
  }

  if (options.broadcast !== false) {
    broadcastRuntimeState(normalized);
  }

  if (options.renderView !== false) {
    render();
  }

  return true;
}

function hydrateInitialState() {
  return readStateFromHash() ?? readStateFromStorage() ?? normalizeRuntimeState(state);
}

function blockClasses(block, renderState) {
  const classes = ["slide-block", "slide-block-" + block.kind];

  if (renderState.highlightedIds.has(block.id)) {
    classes.push("is-highlighted");
  }

  if (renderState.appearingIds.has(block.id)) {
    classes.push("is-appearing");
  }

  if (renderState.guidanceTargetIds.has(block.id)) {
    classes.push("is-guidance-target");
  }

  if (renderState.focusMode && !renderState.emphasizedIds.has(block.id)) {
    classes.push("is-deemphasized");
  }

  return classes.join(" ");
}

function renderBlock(block, renderState = emptyRenderState) {
  const classes = blockClasses(block, renderState);
  const wrapperStart = '<div class="' + classes + '" data-block-id="' + escapeHtml(block.id) + '" data-block-kind="' + escapeHtml(block.kind) + '">';
  const wrapperEnd = "</div>";

  switch (block.kind) {
    case "heading":
      return wrapperStart + '<h2 class="block-heading">' + escapeHtml(block.text) + "</h2>" + wrapperEnd;
    case "text":
      return wrapperStart + '<p class="block-text">' + escapeHtml(block.text) + "</p>" + wrapperEnd;
    case "bullets":
      return wrapperStart + '<ul class="block-bullets">' + block.items.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>" + wrapperEnd;
    case "callout":
      return wrapperStart + '<div class="block-callout">' + escapeHtml(block.text) + "</div>" + wrapperEnd;
    case "metrics":
      return wrapperStart + '<div class="block-metrics">' + block.items.map((item) => '<div class="block-metric-item"><span class="block-metric-label">' + escapeHtml(item.label) + '</span><span class="block-metric-value">' + escapeHtml(item.value) + "</span></div>").join("") + "</div>" + wrapperEnd;
    case "two-column":
      return wrapperStart + '<div class="block-two-column"><div class="block-two-column-panel"><span class="block-two-column-label">Left</span><div class="block-two-column-copy">' + escapeHtml(block.left) + '</div></div><div class="block-two-column-panel"><span class="block-two-column-label">Right</span><div class="block-two-column-copy">' + escapeHtml(block.right) + "</div></div></div>" + wrapperEnd;
    case "timeline":
      return wrapperStart + '<div class="block-timeline">' + block.items.map((item) => '<div class="block-timeline-item"><span class="block-timeline-label">' + escapeHtml(item.label) + '</span><div class="block-timeline-detail">' + escapeHtml(item.detail) + "</div></div>").join("") + "</div>" + wrapperEnd;
    case "process":
      return wrapperStart + '<div class="block-process">' + block.items.map((item, index) => '<div class="block-process-item"><span class="block-process-index">' + escapeHtml(String(index + 1).padStart(2, "0")) + '</span><div class="block-process-copy"><strong class="block-process-title">' + escapeHtml(item.title) + '</strong><div class="block-process-detail">' + escapeHtml(item.detail) + "</div></div></div>").join("") + "</div>" + wrapperEnd;
    case "quadrant":
      return wrapperStart +
        '<div class="block-quadrant">' +
          '<div class="block-quadrant-y-label">' + escapeHtml(block.yLabel ?? "Y Axis") + '</div>' +
          '<div class="block-quadrant-grid">' +
            renderQuadrantCell("top-left", block.topLeft) +
            renderQuadrantCell("top-right", block.topRight) +
            renderQuadrantCell("bottom-left", block.bottomLeft) +
            renderQuadrantCell("bottom-right", block.bottomRight) +
          "</div>" +
          '<div class="block-quadrant-x-label">' + escapeHtml(block.xLabel ?? "X Axis") + "</div>" +
        "</div>" +
        wrapperEnd;
    case "comparison":
      return wrapperStart +
        '<div class="block-comparison">' +
        '<div class="block-comparison-header"><span></span><span>' + escapeHtml(block.leftTitle) + '</span><span>' + escapeHtml(block.rightTitle) + "</span></div>" +
        block.items.map((item) => '<div class="block-comparison-row"><div class="block-comparison-cell block-comparison-label">' + escapeHtml(item.label) + '</div><div class="block-comparison-cell">' + escapeHtml(item.left) + '</div><div class="block-comparison-cell">' + escapeHtml(item.right) + "</div></div>").join("") +
        "</div>" +
        wrapperEnd;
    case "quote":
      return wrapperStart + '<blockquote class="block-quote">' + escapeHtml(block.text) + "</blockquote>" + wrapperEnd;
    case "code":
      return wrapperStart + '<pre class="block-code"><code>' + escapeHtml(block.code) + "</code></pre>" + wrapperEnd;
    case "table":
      return wrapperStart +
        '<div class="block-table"><table><thead><tr>' +
        block.headers.map((header) => "<th>" + escapeHtml(header) + "</th>").join("") +
        "</tr></thead><tbody>" +
        block.rows.map((row) => "<tr>" + row.map((cell) => "<td>" + escapeHtml(cell) + "</td>").join("") + "</tr>").join("") +
        "</tbody></table></div>" +
        wrapperEnd;
    case "image": {
      const src = block.asset.kind === "url" ? block.asset.url : block.asset.path;
      const caption = block.caption ? '<figcaption>' + escapeHtml(block.caption) + "</figcaption>" : "";
      return wrapperStart +
        '<figure class="block-image"><img src="' + escapeHtml(src) + '" alt="' + escapeHtml(block.caption ?? block.id) + '" />' + caption + "</figure>" +
        wrapperEnd;
    }
    default:
      return "";
  }
}

function renderQuadrantCell(position, cell) {
  return '<div class="block-quadrant-cell block-quadrant-cell-' + position + '">' +
    '<strong class="block-quadrant-title">' + escapeHtml(cell.title) + '</strong>' +
    '<div class="block-quadrant-detail">' + escapeHtml(cell.detail) + "</div>" +
    "</div>";
}

function renderActionHint(action) {
  if (!action) return "";
  if (action.kind === "highlight") return "Highlight " + action.targetId;
  if (action.kind === "appear") return "Appear " + action.targetId;
  if (action.kind === "spotlight") return action.targetId ? "Spotlight " + action.targetId : "Spotlight";
  if (action.kind === "laser") return "Laser";
  return action.kind;
}

function normalizeNotes(notes) {
  if (!notes) {
    return null;
  }

  if (typeof notes === "string") {
    return {
      summary: notes,
      raw: notes
    };
  }

  return notes;
}

function noteItemForStep(values, stepIndex) {
  if (!values || values.length === 0) {
    return null;
  }

  return values[Math.min(stepIndex, values.length - 1)] ?? null;
}

function currentGuidance(notes, stepIndex) {
  const normalized = normalizeNotes(notes);

  if (!normalized) {
    return [];
  }

  const guidance = [];
  const explicit = normalized.stepGuidance?.find((item) => item.step === stepIndex + 1) ?? null;
  const cue = explicit?.cue ?? noteItemForStep(normalized.cues, stepIndex);
  const timing = explicit?.timing ?? noteItemForStep(normalized.timing, stepIndex);
  const emphasis = explicit?.emphasis ?? noteItemForStep(normalized.emphasis, stepIndex);
  const targetBlockId = explicit?.targetBlockId;

  if (cue) {
    guidance.push({ label: labels.cues, value: cue, targetBlockId });
  }

  if (timing) {
    guidance.push({ label: labels.timing, value: timing, targetBlockId });
  }

  if (emphasis) {
    guidance.push({ label: labels.emphasis, value: emphasis, targetBlockId });
  }

  if (explicit?.highlightTargetId) {
    guidance.push({ label: labels.highlight, value: explicit.highlightTargetId, targetBlockId: explicit.highlightTargetId });
  }

  if (explicit?.highlightTiming) {
    guidance.push({ label: labels.highlight + " " + labels.timing, value: formatActionTimingValue(explicit.highlightTiming) });
  }

  if (explicit?.highlightExitTiming) {
    guidance.push({ label: labels.highlight + " " + labels.exit + " " + labels.timing, value: formatActionTimingValue(explicit.highlightExitTiming) });
  }

  if (explicit?.appearTargetId) {
    guidance.push({ label: labels.appear, value: explicit.appearTargetId, targetBlockId: explicit.appearTargetId });
  }

  if (explicit?.appearTiming) {
    guidance.push({ label: labels.appear + " " + labels.timing, value: formatActionTimingValue(explicit.appearTiming) });
  }

  if (explicit?.appearExitTiming) {
    guidance.push({ label: labels.appear + " " + labels.exit + " " + labels.timing, value: formatActionTimingValue(explicit.appearExitTiming) });
  }

  if (explicit?.spotlight) {
    guidance.push({
      label: labels.spotlight,
      value: [explicit.spotlight.x, explicit.spotlight.y, explicit.spotlight.radius].join(", ")
    });
  }

  if (explicit?.spotlightShape) {
    guidance.push({ label: labels.spotlight + " shape", value: explicit.spotlightShape });
  }

  if (explicit?.spotlightTargetId) {
    guidance.push({ label: labels.spotlight, value: explicit.spotlightTargetId, targetBlockId: explicit.spotlightTargetId });
  }

  if (explicit?.spotlightTiming) {
    guidance.push({ label: labels.spotlight + " " + labels.timing, value: formatActionTimingValue(explicit.spotlightTiming) });
  }

  if (explicit?.spotlightExitTiming) {
    guidance.push({ label: labels.spotlight + " " + labels.exit + " " + labels.timing, value: formatActionTimingValue(explicit.spotlightExitTiming) });
  }

  if (explicit?.laserPoints && explicit.laserPoints.length > 0) {
    guidance.push({
      label: labels.laser,
      value: explicit.laserPoints.map((point) => point.x + "," + point.y).join(" -> ")
    });
  }

  if (explicit?.laserAnchorFrom) {
    guidance.push({ label: labels.laser + " anchor", value: explicit.laserAnchorFrom });
  }

  if (explicit?.laserTiming) {
    guidance.push({ label: labels.laser + " " + labels.timing, value: formatActionTimingValue(explicit.laserTiming) });
  }

  if (explicit?.laserExitTiming) {
    guidance.push({ label: labels.laser + " " + labels.exit + " " + labels.timing, value: formatActionTimingValue(explicit.laserExitTiming) });
  }

  return guidance;
}

function formatActionTimingValue(timing) {
  return [timing.delayMs, timing.durationMs, timing.easing].filter((item) => item !== undefined && item !== "").join(", ");
}

function renderNoteSection(label, content) {
  return '<section class="speaker-note-section"><strong class="speaker-note-label">' + escapeHtml(label) + '</strong><div>' + content + "</div></section>";
}

function renderNoteList(items) {
  return '<ul class="speaker-note-list">' + items.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>";
}

function formatStepGuidanceItem(item) {
  const guidanceParts = [item.cue, item.timing, item.emphasis].filter(Boolean);

  if (item.highlightTargetId) {
    guidanceParts.push("highlight [" + item.highlightTargetId + "]");
  }

  if (item.highlightTiming) {
    guidanceParts.push("highlight timing " + formatActionTimingValue(item.highlightTiming));
  }

  if (item.highlightExitTiming) {
    guidanceParts.push("highlight exit timing " + formatActionTimingValue(item.highlightExitTiming));
  }

  if (item.appearTargetId) {
    guidanceParts.push("appear [" + item.appearTargetId + "]");
  }

  if (item.appearTiming) {
    guidanceParts.push("appear timing " + formatActionTimingValue(item.appearTiming));
  }

  if (item.appearExitTiming) {
    guidanceParts.push("appear exit timing " + formatActionTimingValue(item.appearExitTiming));
  }

  if (item.spotlight) {
    guidanceParts.push("spotlight " + [item.spotlight.x, item.spotlight.y, item.spotlight.radius].join(", "));
  }

  if (item.spotlightShape) {
    guidanceParts.push("spotlight shape " + item.spotlightShape);
  }

  if (item.spotlightTargetId) {
    guidanceParts.push("spotlight [" + item.spotlightTargetId + "]");
  }

  if (item.spotlightTiming) {
    guidanceParts.push("spotlight timing " + formatActionTimingValue(item.spotlightTiming));
  }

  if (item.spotlightExitTiming) {
    guidanceParts.push("spotlight exit timing " + formatActionTimingValue(item.spotlightExitTiming));
  }

  if (item.laserPoints && item.laserPoints.length > 0) {
    guidanceParts.push("laser " + item.laserPoints.map((point) => point.x + "," + point.y).join(" -> "));
  }

  if (item.laserAnchorFrom) {
    guidanceParts.push("laser anchor " + item.laserAnchorFrom);
  }

  if (item.laserTiming) {
    guidanceParts.push("laser timing " + formatActionTimingValue(item.laserTiming));
  }

  if (item.laserExitTiming) {
    guidanceParts.push("laser exit timing " + formatActionTimingValue(item.laserExitTiming));
  }

  const guidance = guidanceParts.join(" / ");
  const target = item.targetBlockId ? " [" + item.targetBlockId + "]" : "";

  if (deck.language === "zh-CN") {
    return "\u7b2c" + item.step + "\u6b65" + target + ": " + guidance;
  }

  return "Step " + item.step + target + ": " + guidance;
}

function renderCurrentGuidance(notes, stepIndex) {
  const guidance = currentGuidance(notes, stepIndex);

  if (guidance.length === 0) {
    return '<div class="speaker-preview-item speaker-current-guidance">' + escapeHtml(labels.none) + "</div>";
  }

  return '<div class="speaker-preview-item speaker-current-guidance">' + guidance.map((item) => {
    const target = item.targetBlockId
      ? '<div class="speaker-note"><strong>' + escapeHtml(labels.targetBlock) + ':</strong> ' + escapeHtml(item.value) + "</div>"
      : "";
    return renderNoteSection(item.label, '<div class="speaker-note">' + escapeHtml(item.value) + "</div>" + target);
  }).join("") + "</div>";
}

function renderNotes(notes) {
  const normalized = normalizeNotes(notes);

  if (!normalized) {
    return '<div class="speaker-preview-item speaker-note">' + escapeHtml(labels.noNotes) + "</div>";
  }

  const parts = [];

  if (normalized.summary) {
    parts.push(renderNoteSection(labels.summary, '<div class="speaker-note">' + escapeHtml(normalized.summary) + "</div>"));
  }

  if (normalized.cues && normalized.cues.length > 0) {
    parts.push(renderNoteSection(labels.cues, renderNoteList(normalized.cues)));
  }

  if (normalized.timing && normalized.timing.length > 0) {
    parts.push(renderNoteSection(labels.timing, renderNoteList(normalized.timing)));
  }

  if (normalized.emphasis && normalized.emphasis.length > 0) {
    parts.push(renderNoteSection(labels.emphasis, renderNoteList(normalized.emphasis)));
  }

  if (normalized.stepGuidance && normalized.stepGuidance.length > 0) {
    parts.push(
      renderNoteSection(
        labels.stepGuidance,
        '<ul class="speaker-note-list">' +
          normalized.stepGuidance
            .map((item) => "<li>" + escapeHtml(formatStepGuidanceItem(item)) + "</li>")
            .join("") +
          "</ul>"
      )
    );
  }

  if (parts.length === 0 && normalized.raw) {
    parts.push(renderNoteSection(labels.summary, '<div class="speaker-note">' + escapeHtml(normalized.raw) + "</div>"));
  }

  return '<div class="speaker-preview-item speaker-note">' + parts.join("") + "</div>";
}

function currentSlide() {
  return deck.slides[state.slideIndex];
}

function currentStep() {
  return currentSlide().steps[state.stepIndex];
}

function nextPreview() {
  const slide = currentSlide();
  return slide.steps[state.stepIndex + 1] ?? null;
}

function currentRenderState(actions, guidance) {
  const highlightedIds = new Set(actions.filter((action) => action.kind === "highlight").map((action) => action.targetId));
  const appearingIds = new Set(actions.filter((action) => action.kind === "appear").map((action) => action.targetId));
  const guidanceTargetIds = new Set(guidance.map((item) => item.targetBlockId).filter(Boolean));
  const spotlightTargetIds = new Set(actions.filter((action) => action.kind === "spotlight" && action.targetId).map((action) => action.targetId));
  const hasLaser = actions.some((action) => action.kind === "laser");
  const focusMode = highlightedIds.size > 0;
  const emphasizedIds = new Set([
    ...highlightedIds,
    ...spotlightTargetIds,
    ...(hasLaser ? appearingIds : [])
  ]);

  return {
    highlightedIds,
    appearingIds,
    guidanceTargetIds,
    emphasizedIds,
    focusMode
  };
}

function currentElapsedMs() {
  const end = state.pausedAt ?? Date.now();
  return Math.max(0, end - state.startedAt - state.totalPausedMs);
}

function timerLabel() {
  const elapsed = currentElapsedMs();
  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, "0");
  return minutes + ":" + seconds;
}

function normalizeCoordinate(value, dimension) {
  return value >= 0 && value <= 1 ? value * dimension : value;
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}


function cloneRenderState(renderState) {
  return {
    highlightedIds: new Set(renderState.highlightedIds),
    appearingIds: new Set(renderState.appearingIds),
    guidanceTargetIds: new Set(renderState.guidanceTargetIds),
    emphasizedIds: new Set(renderState.emphasizedIds),
    focusMode: renderState.focusMode
  };
}

function cloneAction(action) {
  if (action.kind === "highlight" || action.kind === "appear") {
    return {
      kind: action.kind,
      targetId: action.targetId,
      timing: action.timing ? { ...action.timing } : undefined,
      exitTiming: action.exitTiming ? { ...action.exitTiming } : undefined
    };
  }

  if (action.kind === "spotlight") {
    return {
      kind: "spotlight",
      targetId: action.targetId,
      x: action.x,
      y: action.y,
      radius: action.radius,
      shape: action.shape,
      timing: action.timing ? { ...action.timing } : undefined,
      exitTiming: action.exitTiming ? { ...action.exitTiming } : undefined
    };
  }

  return {
    kind: "laser",
    points: action.points.map((point) => ({ x: point.x, y: point.y })),
    anchorFrom: action.anchorFrom,
    timing: action.timing ? { ...action.timing } : undefined,
    exitTiming: action.exitTiming ? { ...action.exitTiming } : undefined
  };
}

function captureOverlaySnapshot(actions, renderState, slideIndex, stepIndex) {
  return {
    slideIndex,
    stepIndex,
    signature: JSON.stringify({
      slideIndex,
      stepIndex,
      focusMode: renderState.focusMode,
      actions
    }),
    actions: actions.map((action) => cloneAction(action)),
    renderState: cloneRenderState(renderState)
  };
}

function stagePoint(point) {
  return {
    x: normalizeCoordinate(point.x, STAGE_WIDTH),
    y: normalizeCoordinate(point.y, STAGE_HEIGHT)
  };
}

function motionDefaultsFor(kind, phase, blockKind) {
  const blockProfile = blockKind ? motionProfile.byBlockKind?.[blockKind]?.[kind] : null;
  return blockProfile?.[phase] ?? motionProfile[kind]?.[phase] ?? { delayMs: 0, durationMs: 240, easing: phase === "exit" ? "ease-in" : "ease-out" };
}

function resolveActionTiming(action, kind, phase, fallback = {}, blockKind) {
  const motionDefaults = motionDefaultsFor(kind, phase, blockKind);
  const actionTiming = phase === "exit" ? action?.exitTiming : action?.timing;
  const delayMs = actionTiming?.delayMs ?? fallback.delayMs ?? motionDefaults.delayMs ?? 0;
  const durationMs = actionTiming?.durationMs ?? fallback.durationMs ?? motionDefaults.durationMs ?? 240;
  const easing = actionTiming?.easing ?? fallback.easing ?? motionDefaults.easing ?? (phase === "exit" ? "ease-in" : "ease-out");

  return {
    delayMs,
    durationMs,
    easing
  };
}

function actionBlockKind(action, context) {
  if (!action) {
    return context.anchorRect?.kind ?? context.primaryRect?.kind ?? null;
  }

  if (action.kind === "highlight" || action.kind === "appear" || (action.kind === "spotlight" && action.targetId)) {
    const target = context.anchorRects?.find((rect) => rect.id === action.targetId)
      ?? context.targetRects?.find((rect) => rect.id === action.targetId);
    return target?.kind ?? context.anchorRect?.kind ?? context.primaryRect?.kind ?? null;
  }

  return context.anchorRect?.kind ?? context.primaryRect?.kind ?? context.anchorRects?.[0]?.kind ?? context.targetRects?.[0]?.kind ?? null;
}

function findStageRectForBlockId(blockId, cachedRects) {
  if (!blockId) {
    return null;
  }

  const cached = cachedRects?.find((rect) => rect.id === blockId);
  if (cached) {
    return cached;
  }

  const block = app.querySelector('[data-block-id="' + escapeAttribute(blockId) + '"]');
  const shell = app.querySelector(".slide-shell");

  if (!block || !shell) {
    return null;
  }

  return stageRectForElement(block, shell.getBoundingClientRect());
}

function stageRectForElement(element, shellRect) {
  const rect = element.getBoundingClientRect();
  const x = ((rect.left - shellRect.left) / shellRect.width) * STAGE_WIDTH;
  const y = ((rect.top - shellRect.top) / shellRect.height) * STAGE_HEIGHT;
  const width = (rect.width / shellRect.width) * STAGE_WIDTH;
  const height = (rect.height / shellRect.height) * STAGE_HEIGHT;
  return {
    id: element.dataset.blockId,
    kind: element.dataset.blockKind,
    x,
    y,
    width,
    height
  };
}

function renderStageOverlay(actions, renderState, exitSnapshot) {
  const host = app.querySelector(".slide-overlay-host");
  const shell = app.querySelector(".slide-shell");

  if (!host || !shell || state.isBlackout) {
    if (host) {
      host.innerHTML = "";
    }
    return;
  }

  const shellRect = shell.getBoundingClientRect();
  const targetRects = [];
  const anchorRects = [];
  const anchorIds = new Set([
    ...renderState.emphasizedIds,
    ...renderState.guidanceTargetIds
  ]);

  for (const blockId of renderState.emphasizedIds) {
    const block = app.querySelector('[data-block-id="' + escapeAttribute(blockId) + '"]');

    if (block) {
      targetRects.push(stageRectForElement(block, shellRect));
    }
  }

  for (const blockId of anchorIds) {
    const block = app.querySelector('[data-block-id="' + escapeAttribute(blockId) + '"]');

    if (block) {
      anchorRects.push(stageRectForElement(block, shellRect));
    }
  }

  const primaryRect = targetRects.find((rect) => renderState.highlightedIds.has(rect.id))
    ?? targetRects[0]
    ?? null;
  const anchorRect = anchorRects.find((rect) => renderState.highlightedIds.has(rect.id))
    ?? anchorRects.find((rect) => renderState.guidanceTargetIds.has(rect.id))
    ?? primaryRect
    ?? anchorRects[0]
    ?? null;

  const overlays = [];
  const activeHasAction = actions.length > 0;

  if (exitSnapshot && exitSnapshot.slideIndex === state.slideIndex && !activeHasAction) {
    const exitRects = [];
    const exitAnchorRects = [];
    const exitAnchorIds = new Set([
      ...exitSnapshot.renderState.emphasizedIds,
      ...exitSnapshot.renderState.guidanceTargetIds
    ]);

    for (const blockId of exitSnapshot.renderState.emphasizedIds) {
      const block = app.querySelector('[data-block-id="' + escapeAttribute(blockId) + '"]');

      if (block) {
        exitRects.push(stageRectForElement(block, shellRect));
      }
    }

    for (const blockId of exitAnchorIds) {
      const block = app.querySelector('[data-block-id="' + escapeAttribute(blockId) + '"]');

      if (block) {
        exitAnchorRects.push(stageRectForElement(block, shellRect));
      }
    }

    const exitPrimaryRect = exitRects.find((rect) => exitSnapshot.renderState.highlightedIds.has(rect.id))
      ?? exitRects[0]
      ?? null;
    const exitAnchorRect = exitAnchorRects.find((rect) => exitSnapshot.renderState.highlightedIds.has(rect.id))
      ?? exitAnchorRects.find((rect) => exitSnapshot.renderState.guidanceTargetIds.has(rect.id))
      ?? exitPrimaryRect
      ?? exitAnchorRects[0]
      ?? null;

    const exitMarkup = renderOverlay(exitSnapshot.actions, {
      focusMode: exitSnapshot.renderState.focusMode,
      targetRects: exitRects,
      anchorRects: exitAnchorRects,
      guidanceTargetIds: exitSnapshot.renderState.guidanceTargetIds,
      primaryRect: exitPrimaryRect,
      anchorRect: exitAnchorRect
    }, { exitMode: true });

    if (exitMarkup) {
      overlays.push(exitMarkup);
    }
  }

  const activeMarkup = renderOverlay(actions, {
    focusMode: renderState.focusMode,
    targetRects,
    anchorRects,
    guidanceTargetIds: renderState.guidanceTargetIds,
    primaryRect,
    anchorRect
  });

  if (activeMarkup) {
    overlays.push(activeMarkup);
  }

  host.innerHTML = overlays.join("");
}

function renderOverlay(actions, context, options = {}) {
  if ((!actions || actions.length === 0) && !context.focusMode) return "";

  const spotlight = actions.find((a) => a.kind === "spotlight");
  const lasers = actions.filter((a) => a.kind === "laser");
  const targetRects = context.targetRects ?? [];
  const anchorRects = context.anchorRects ?? targetRects;
  const guidanceTargetIds = context.guidanceTargetIds ?? new Set();
  const primaryRect = context.primaryRect ?? null;
  const anchorRect = context.anchorRect
    ?? anchorRects.find((rect) => guidanceTargetIds.has(rect.id))
    ?? primaryRect
    ?? anchorRects[0]
    ?? targetRects[0]
    ?? null;
  const spotlightTargetRect = findStageRectForBlockId(spotlight?.targetId, anchorRects)
    ?? anchorRect
    ?? null;
  const phase = options.exitMode ? "exit" : "enter";
  const highlightAction = actions.find((a) => a.kind === "highlight");
  const appearAction = actions.find((a) => a.kind === "appear");

  const focusTiming = resolveActionTiming(highlightAction, "highlight", phase,
    { delayMs: 80, durationMs: 500, easing: phase === "exit" ? "ease-in" : "ease-out" },
    actionBlockKind(highlightAction, context));
  const guidanceTiming = resolveActionTiming(appearAction, "appear", phase,
    { delayMs: 160, durationMs: 600, easing: phase === "exit" ? "ease-in" : "cubic-bezier(0.16, 1, 0.3, 1)" },
    actionBlockKind(appearAction, context));
  const spotlightTiming = resolveActionTiming(spotlight, "spotlight", phase,
    { delayMs: 60, durationMs: 500, easing: phase === "exit" ? "ease-in" : "ease-out" },
    actionBlockKind(spotlight, context));
  const shouldRenderGuidanceLines = actions.length === 0 && guidanceTargetIds.size > 0 && !context.focusMode;

  if (!spotlight && lasers.length === 0 && targetRects.length === 0) return "";

  const defs = [];
  const els = [];
  const maskShapes = [svg("rect", { width: STAGE_WIDTH, height: STAGE_HEIGHT, fill: "white" })];

  // Define glow filter once
  const hasGlow = lasers.length > 0 || targetRects.length > 0 || spotlight;
  if (hasGlow) {
    defs.push(
      svg("filter", { id: "glow-" + instanceId, x: "-20%", y: "-20%", width: "140%", height: "140%" },
        svg("feGaussianBlur", { in: "SourceGraphic", stdDeviation: "4", result: "blur" }),
        svg("feMerge", null,
          svg("feMergeNode", { in: "blur" }),
          svg("feMergeNode", { in: "blur" }),
          svg("feMergeNode", { in: "SourceGraphic" })
        )
      ),
      svg("filter", { id: "glow-strong-" + instanceId, x: "-30%", y: "-30%", width: "160%", height: "160%" },
        svg("feGaussianBlur", { in: "SourceGraphic", stdDeviation: "6", result: "blur" }),
        svg("feMerge", null,
          svg("feMergeNode", { in: "blur" }),
          svg("feMergeNode", { in: "blur" }),
          svg("feMergeNode", { in: "blur" }),
          svg("feMergeNode", { in: "SourceGraphic" })
        )
      )
    );
  }

  // --- Spotlight ---
  if (spotlight) {
    const spotlightShape = spotlight.shape ?? (spotlightTargetRect && spotlightTargetRect.width / Math.max(1, spotlightTargetRect.height) >= 1.6 ? "pill" : "circle");
    if (spotlightTargetRect) {
      const padX = Math.max(22, spotlightTargetRect.width * 0.12);
      const padY = Math.max(18, spotlightTargetRect.height * 0.32);
      const x = Math.max(0, spotlightTargetRect.x - padX);
      const y = Math.max(0, spotlightTargetRect.y - padY);
      const width = Math.min(STAGE_WIDTH - x, spotlightTargetRect.width + padX * 2);
      const height = Math.min(STAGE_HEIGHT - y, spotlightTargetRect.height + padY * 2);
      if (spotlightShape === "pill") {
        const rx = Math.min(28, Math.max(16, height / 2));
        const glowX = Math.max(0, x - 18);
        const glowY = Math.max(0, y - 18);
        const glowWidth = Math.min(STAGE_WIDTH - glowX, width + 36);
        const glowHeight = Math.min(STAGE_HEIGHT - glowY, height + 36);

        maskShapes.push(svg("rect", { x, y, width, height, rx, ry: rx, fill: "black" }));
        els.push(svg("rect", {
          class: "action-spotlight-glow",
          x: glowX,
          y: glowY,
          width: glowWidth,
          height: glowHeight,
          rx: rx + 18,
          ry: rx + 18,
          fill: "rgba(255,255,255,0.08)",
          filter: "url(#glow-strong-" + instanceId + ")",
          style: "--action-delay:" + spotlightTiming.delayMs + "ms"
        }));
        els.push(svg("rect", {
          class: "action-spotlight-ring",
          x,
          y,
          width,
          height,
          rx,
          ry: rx,
          filter: "url(#glow-" + instanceId + ")",
          style: overlayStyle(spotlightTiming)
        }));
      } else {
        const cx = x + width / 2;
        const cy = y + height / 2;
        const r = Math.max(width, height) / 2;
        maskShapes.push(svg("circle", { cx, cy, r, fill: "black" }));
        defs.push(svg("radialGradient", { id: "sg-anchor-" + instanceId, cx: "50%", cy: "50%", r: "50%" },
          svg("stop", { offset: "0%", "stop-color": "rgba(255,255,255,0.15)" }),
          svg("stop", { offset: "40%", "stop-color": "rgba(255,255,255,0.06)" }),
          svg("stop", { offset: "100%", "stop-color": "rgba(255,255,255,0)" })
        ));
        els.push(svg("circle", {
          class: "action-spotlight-glow", cx, cy, r: r * 2.4,
          fill: "url(#sg-anchor-" + instanceId + ")",
          style: "--action-delay:" + spotlightTiming.delayMs + "ms"
        }));
        els.push(svg("circle", {
          class: "action-spotlight-ring", cx, cy, r,
          filter: "url(#glow-" + instanceId + ")",
          style: overlayStyle(spotlightTiming)
        }));
      }
    } else {
      const cx = normalizeCoordinate(spotlight.x, STAGE_WIDTH);
      const cy = normalizeCoordinate(spotlight.y, STAGE_HEIGHT);
      const r = normalizeCoordinate(spotlight.radius, Math.min(STAGE_WIDTH, STAGE_HEIGHT));
      maskShapes.push(svg("circle", { cx, cy, r, fill: "black" }));
      defs.push(svg("radialGradient", { id: "sg-" + instanceId, cx: "50%", cy: "50%", r: "50%" },
        svg("stop", { offset: "0%", "stop-color": "rgba(255,255,255,0.15)" }),
        svg("stop", { offset: "40%", "stop-color": "rgba(255,255,255,0.06)" }),
        svg("stop", { offset: "100%", "stop-color": "rgba(255,255,255,0)" })
      ));
      els.push(svg("circle", {
        class: "action-spotlight-glow", cx, cy, r: r * 3.2,
        fill: "url(#sg-" + instanceId + ")",
        style: "--action-delay:" + spotlightTiming.delayMs + "ms"
      }));
      els.push(svg("circle", {
        class: "action-spotlight-ring", cx, cy, r,
        filter: "url(#glow-" + instanceId + ")",
        style: overlayStyle(spotlightTiming)
      }));
    }
  }

  // --- Focus mask + rings ---
  if (context.focusMode) {
    for (const rect of targetRects) {
      const pad = 18;
      const x = Math.max(0, rect.x - pad);
      const y = Math.max(0, rect.y - pad);
      const w = Math.min(STAGE_WIDTH - x, rect.width + pad * 2);
      const h = Math.min(STAGE_HEIGHT - y, rect.height + pad * 2);
      maskShapes.push(svg("rect", { x, y, width: w, height: h, rx: 14, ry: 14, fill: "black" }));
      els.push(svg("rect", {
        class: "action-focus-ring" + (guidanceTargetIds.has(rect.id) ? " is-guidance" : ""),
        x, y, width: w, height: h, rx: 14, ry: 14,
        filter: "url(#glow-" + instanceId + ")",
        style: overlayStyle(focusTiming, focusTiming.delayMs + targetRects.indexOf(rect) * 30)
      }));
    }

    if (maskShapes.length > 1) {
      defs.push(svg("mask", { id: "fm-" + instanceId }, ...maskShapes));
      els.unshift(svg("rect", {
        class: "action-focus-mask",
        width: STAGE_WIDTH, height: STAGE_HEIGHT,
        fill: "rgba(15, 23, 42, 0.44)",
        mask: "url(#fm-" + instanceId + ")",
        style: overlayStyle(focusTiming, Math.max(0, focusTiming.delayMs - 60))
      }));
    }
  }

  // --- Laser (always renders as a dot) ---
  for (const laser of lasers) {
    const lt = resolveActionTiming(laser, "laser", phase,
      { delayMs: 210, durationMs: 400, easing: phase === "exit" ? "ease-in" : "ease-out" },
      actionBlockKind(laser, context));
    const anchorFrom = laser.anchorFrom ?? (anchorRect ? "target" : "custom");

    let cx, cy;
    if (anchorFrom === "target" && anchorRect) {
      cx = anchorRect.x + anchorRect.width / 2;
      cy = anchorRect.y + anchorRect.height / 2;
      cy = Math.min(STAGE_HEIGHT, cy + anchorRect.height * 0.18);
    } else {
      const p = stagePoint(laser.points[0]);
      cx = p.x;
      cy = p.y;
    }

    const authoredPoints = laser.points.map((point) => stagePoint(point));
    const laserPathPoints = anchorFrom === "target" && anchorRect
      ? [{ x: cx, y: cy }, ...authoredPoints]
      : authoredPoints;
    const laserPath = laserPathPoints.map((point, index) =>
      (index === 0 ? "M" : "L") + point.x + "," + point.y
    ).join(" ");

    // Small halo
    defs.push(svg("radialGradient", { id: "ld-" + instanceId, cx: "50%", cy: "50%", r: "50%" },
      svg("stop", { offset: "0%", "stop-color": "rgba(239,68,68,0.15)" }),
      svg("stop", { offset: "70%", "stop-color": "rgba(239,68,68,0.03)" }),
      svg("stop", { offset: "100%", "stop-color": "rgba(239,68,68,0)" })
    ));
    els.push(svg("circle", {
      cx, cy, r: 18,
      fill: "url(#ld-" + instanceId + ")",
      style: "--action-delay:" + lt.delayMs + "ms"
    }));
    els.push(svg("path", {
      class: "action-laser-line",
      d: laserPath,
      filter: "url(#glow-" + instanceId + ")",
      style: overlayStyle(lt)
    }));
    // The dot itself (no glow filter — restrained)
    els.push(svg("circle", {
      class: "action-laser-dot", cx, cy, r: 5,
      style: overlayStyle(lt, lt.delayMs + 180)
    }));
  }

  // --- Guidance lines (bezier curve from corner) ---
  if (shouldRenderGuidanceLines) {
    for (const rect of targetRects.filter((r) => guidanceTargetIds.has(r.id))) {
      const ex = rect.x + rect.width / 2;
      const ey = rect.y + rect.height / 2;
      const sx = STAGE_WIDTH - 72;
      const sy = 72;
      // Quadratic bezier: M start Q controlX,controlY endX,endY
      const cpx = (sx + ex) / 2;
      const cpy = Math.min(sy, ey) - 20;
      const d = "M" + sx + "," + sy + " Q" + cpx + "," + cpy + " " + ex + "," + ey;
      const gd = guidanceTiming.delayMs + targetRects.indexOf(rect) * 60;
      els.push(svg("path", {
        class: "action-guidance-line", d,
        filter: "url(#glow-" + instanceId + ")",
        style: overlayStyle(guidanceTiming, gd)
      }));
      els.push(svg("circle", {
        class: "action-guidance-dot", cx: ex, cy: ey, r: 6,
        filter: "url(#glow-" + instanceId + ")",
        style: overlayStyle(guidanceTiming, gd + 120)
      }));
    }
  }

  return svg("svg", {
    class: "slide-overlay" + (options.exitMode ? " is-exiting" : ""),
    viewBox: "0 0 " + STAGE_WIDTH + " " + STAGE_HEIGHT,
    preserveAspectRatio: "none"
  },
    defs.length > 0 ? svg("defs", null, ...defs) : "",
    ...els
  );
}

function svg(tag, attrs) {
  let html = "<" + tag;
  if (attrs) {
    for (const key of Object.keys(attrs)) {
      const val = attrs[key];
      if (val !== undefined && val !== null && val !== "") {
        html += " " + key + '="' + escapeAttribute(String(val)) + '"';
      }
    }
  }
  const children = Array.from(arguments).slice(2).filter(Boolean);
  if (children.length > 0) {
    html += ">" + children.join("") + "</" + tag + ">";
  } else {
    html += " />";
  }
  return html;
}

function overlayStyle(timing, overrideDelay) {
  const delay = overrideDelay ?? timing.delayMs ?? 0;
  const dur = timing.durationMs ?? 320;
  const ease = timing.easing ?? "ease-out";
  return "--action-delay:" + delay + "ms;--action-duration:" + dur + "ms;--action-easing:" + escapeAttribute(ease);
}

function render() {
  const slide = currentSlide();
  const step = currentStep();
  const totalSlides = deck.slides.length;
  const totalSteps = slide.steps.length;
  const timer = timerLabel();
  const visibleSteps = slide.steps.slice(0, state.stepIndex + 1);
  const blocks = visibleSteps.flatMap((item) => item.blocks);
  const activeActions = step.actions ?? [];
  const currentAction = activeActions[0];
  const guidance = currentGuidance(slide.notes, state.stepIndex);
  const stageStatus = [
    state.isBlackout ? labels.stageBlackout : null,
    state.pausedAt ? labels.timerPaused : null
  ].filter(Boolean).join(" - ");
  const renderState = currentRenderState(activeActions, guidance);

  // --- Step/slide transition detection ---
  const isStepAdvance = prevStepIndex >= 0 && state.stepIndex > prevStepIndex;
  if (isStepAdvance && prevVisibleBlockCount > 0 && prevVisibleBlockCount < blocks.length) {
    for (let i = prevVisibleBlockCount; i < blocks.length; i++) {
      renderState.appearingIds.add(blocks[i].id);
    }
  }
  prevVisibleBlockCount = blocks.length;
  prevSlideIndex = state.slideIndex;
  prevStepIndex = state.stepIndex;

  const overlaySnapshot = captureOverlaySnapshot(activeActions, renderState, state.slideIndex, state.stepIndex);

  if (lastOverlaySnapshot && lastOverlaySnapshot.signature !== overlaySnapshot.signature) {
    overlayExitSnapshot = lastOverlaySnapshot;
  } else if (!lastOverlaySnapshot || lastOverlaySnapshot.signature === overlaySnapshot.signature) {
    overlayExitSnapshot = null;
  }

  lastOverlaySnapshot = overlaySnapshot;

  app.innerHTML =
    '<div class="presentation-shell">' +
      '<section class="stage-card">' +
        '<div class="slide-shell' + (state.isBlackout ? " is-blackout" : "") + (renderState.focusMode ? " has-focus-mask" : "") + '">' +
          '<div class="slide-accent"></div>' +
          (state.isBlackout
            ? '<div class="blackout-banner">' + escapeHtml(labels.blackoutScreen) + "</div>"
            : '<div class="slide-overlay-host"></div>' +
              '<h1 class="slide-title">' + escapeHtml(slide.title ?? deck.title) + "</h1>" +
              '<div class="slide-step">' + blocks.map((block) => renderBlock(block, renderState)).join("") + "</div>" +
              '<div class="presentation-footer">' +
                '<span class="step-progress">Slide ' + (state.slideIndex + 1) + " / " + totalSlides + " - Step " + (state.stepIndex + 1) + " / " + totalSteps + "</span>" +
                '<span class="control-hint">' + escapeHtml(labels.controls) + "</span>" +
              "</div>"
          ) +
        "</div>" +
      "</section>" +
      '<aside class="speaker-card">' +
        "<h2>" + escapeHtml(labels.speakerView) + "</h2>" +
        '<div class="speaker-meta">' +
          "<div><strong>" + escapeHtml(labels.deck) + ":</strong> " + escapeHtml(deck.title) + "</div>" +
          "<div><strong>" + escapeHtml(labels.slide) + ":</strong> " + (state.slideIndex + 1) + " / " + totalSlides + "</div>" +
          "<div><strong>" + escapeHtml(labels.step) + ":</strong> " + (state.stepIndex + 1) + " / " + totalSteps + "</div>" +
          "<div><strong>" + escapeHtml(labels.timer) + ':</strong> <span class="speaker-timer">' + timer + "</span></div>" +
          "<div><strong>" + escapeHtml(labels.action) + ":</strong> " + escapeHtml(renderActionHint(currentAction) || labels.none) + "</div>" +
          (stageStatus ? '<div class="speaker-status-inline">' + escapeHtml(stageStatus) + "</div>" : "") +
        "</div>" +
        '<div class="speaker-controls">' +
          "<h3>" + escapeHtml(labels.controlsTitle) + "</h3>" +
          '<div class="speaker-controls-row">' +
            '<button type="button" class="speaker-button" data-command="previous">' + escapeHtml(labels.previous) + "</button>" +
            '<button type="button" class="speaker-button" data-command="next">' + escapeHtml(labels.next) + "</button>" +
          "</div>" +
          '<div class="speaker-controls-row is-jump">' +
            '<input class="speaker-input" data-jump-slide type="number" min="1" max="' + totalSlides + '" value="' + (state.slideIndex + 1) + '" aria-label="' + escapeHtml(labels.jumpSlide) + '" />' +
            '<input class="speaker-input" data-jump-step type="number" min="1" max="' + totalSteps + '" value="' + (state.stepIndex + 1) + '" aria-label="' + escapeHtml(labels.jumpStep) + '" />' +
            '<button type="button" class="speaker-button" data-command="jump">' + escapeHtml(labels.jumpGo) + "</button>" +
          "</div>" +
          '<div class="speaker-controls-row">' +
            '<button type="button" class="speaker-button is-danger' + (state.isBlackout ? " is-active" : "") + '" data-command="blackout">' + escapeHtml(state.isBlackout ? labels.resumeStage : labels.blackout) + "</button>" +
            '<button type="button" class="speaker-button' + (state.pausedAt ? " is-active" : "") + '" data-command="timer">' + escapeHtml(state.pausedAt ? labels.resumeTimer : labels.pauseTimer) + "</button>" +
          "</div>" +
        "</div>" +
        '<div class="speaker-preview">' +
          "<h3>" + escapeHtml(labels.currentGuidance) + "</h3>" +
          renderCurrentGuidance(slide.notes, state.stepIndex) +
          "<h3>" + escapeHtml(labels.notes) + "</h3>" +
          renderNotes(slide.notes) +
          "<h3>" + escapeHtml(labels.nextStep) + "</h3>" +
          '<div class="speaker-preview-item">' + (nextPreview() ? nextPreview().blocks.map((block) => renderBlock(block)).join("") : escapeHtml(labels.endOfSlide)) + "</div>" +
        "</div>" +
      "</aside>" +
      "</div>";

  renderStageOverlay(activeActions, renderState, overlayExitSnapshot);

  if (!isSpeakerView) {
    const card = app.querySelector(".speaker-card");
    if (card) {
      card.remove();
    }
    return;
  }

  bindSpeakerControls();
}

function bindSpeakerControls() {
  const previousButton = app.querySelector('[data-command="previous"]');
  const nextButton = app.querySelector('[data-command="next"]');
  const jumpButton = app.querySelector('[data-command="jump"]');
  const blackoutButton = app.querySelector('[data-command="blackout"]');
  const timerButton = app.querySelector('[data-command="timer"]');

  previousButton?.addEventListener("click", previous);
  nextButton?.addEventListener("click", next);
  jumpButton?.addEventListener("click", jumpToSelection);
  blackoutButton?.addEventListener("click", toggleBlackout);
  timerButton?.addEventListener("click", toggleTimer);

  const stepInput = app.querySelector("[data-jump-step]");
  const slideInput = app.querySelector("[data-jump-slide]");
  const submitFromInput = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      jumpToSelection();
    }
  };

  slideInput?.addEventListener("keydown", submitFromInput);
  stepInput?.addEventListener("keydown", submitFromInput);
}

function updateTimerDisplay() {
  const timerNode = app.querySelector(".speaker-timer");

  if (timerNode) {
    timerNode.textContent = timerLabel();
  }
}

function jumpTo(slideNumber, stepNumber) {
  const slideIndex = clampNumber(slideNumber - 1, 0, Math.max(0, deck.slides.length - 1));
  const stepIndex = clampNumber(stepNumber - 1, 0, maxStepIndex(slideIndex));
  const nextState = serializeRuntimeState();
  nextState.slideIndex = slideIndex;
  nextState.stepIndex = stepIndex;
  applyRuntimeState(nextState, { pushHistory: true });
}

function jumpToSelection() {
  const slideInput = app.querySelector("[data-jump-slide]");
  const stepInput = app.querySelector("[data-jump-step]");
  const slideNumber = Number.parseInt(slideInput?.value ?? "", 10);
  const stepNumber = Number.parseInt(stepInput?.value ?? "", 10);
  jumpTo(Number.isFinite(slideNumber) ? slideNumber : state.slideIndex + 1, Number.isFinite(stepNumber) ? stepNumber : state.stepIndex + 1);
}

function toggleBlackout() {
  const nextState = serializeRuntimeState();
  nextState.isBlackout = !state.isBlackout;
  applyRuntimeState(nextState, { pushHistory: true });
}

function toggleTimer() {
  const now = Date.now();
  const nextState = serializeRuntimeState();

  if (state.pausedAt) {
    nextState.totalPausedMs += now - state.pausedAt;
    nextState.pausedAt = null;
  } else {
    nextState.pausedAt = now;
  }

  applyRuntimeState(nextState, { pushHistory: true });
}

function next() {
  const slide = currentSlide();
  const nextState = serializeRuntimeState();

  if (state.stepIndex < slide.steps.length - 1) {
    nextState.stepIndex += 1;
  } else if (state.slideIndex < deck.slides.length - 1) {
    nextState.slideIndex += 1;
    nextState.stepIndex = 0;
  }

  applyRuntimeState(nextState, { pushHistory: true });
}

function previous() {
  const nextState = serializeRuntimeState();

  if (state.stepIndex > 0) {
    nextState.stepIndex -= 1;
  } else if (state.slideIndex > 0) {
    nextState.slideIndex -= 1;
    nextState.stepIndex = deck.slides[nextState.slideIndex].steps.length - 1;
  }

  applyRuntimeState(nextState, { pushHistory: true });
}

function openSpeakerView() {
  const snapshot = serializeRuntimeState();
  const targetUrl = "./speaker.html" + hashForState(snapshot);

  if (speakerWindow && !speakerWindow.closed) {
    try {
      speakerWindow.focus();
      sendRuntimeMessage(speakerWindow, "sync-state", snapshot);
      return;
    } catch {
      speakerWindow = null;
    }
  }

  speakerWindow = window.open(targetUrl, "_blank");
}

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
    event.preventDefault();
    next();
    return;
  }

  if (event.key === "ArrowLeft" || event.key === "PageUp") {
    event.preventDefault();
    previous();
    return;
  }

  if (event.key.toLowerCase() === "f") {
    document.documentElement.requestFullscreen?.();
    return;
  }

  if (event.key.toLowerCase() === "b") {
    event.preventDefault();
    toggleBlackout();
    return;
  }

  if (event.key.toLowerCase() === "t") {
    event.preventDefault();
    toggleTimer();
    return;
  }

  if (event.key.toLowerCase() === "s") {
    openSpeakerView();
    return;
  }

  if (event.key === "Escape") {
    // Exit fullscreen if active, or resume from blackout
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    }
    if (state.isBlackout) {
      toggleBlackout();
    }
    return;
  }

  if (event.key === "?") {
    // Toggle help overlay (rendered as part of speaker card)
    state.showHelp = !state.showHelp;
    render();
  }
});

window.addEventListener("message", (event) => {
  const payload = event.data;

  if (!payload || payload.type !== RUNTIME_MESSAGE_TYPE || payload.sourceId === instanceId) {
    return;
  }

  if (payload.action === "request-state") {
    sendRuntimeMessage(event.source, "sync-state", serializeRuntimeState());
    return;
  }

  if (payload.action === "sync-state" && payload.state) {
    // If this is the first sync for a speaker view, clear the pending flag
    if (isSpeakerView && state.pendingSync) {
      state.pendingSync = false;
    }
    applyRuntimeState(payload.state, { renderView: true, broadcast: false, persist: !isFileProtocol });
  }
});

// popstate: browser back/forward navigation
window.addEventListener("popstate", () => {
  const snapshot = readStateFromHash();
  if (snapshot) {
    applyRuntimeState(snapshot, { renderView: true, broadcast: false, persist: false });
  }
});

// storage: cross-tab sync fallback
window.addEventListener("storage", (event) => {
  if (event.key !== RUNTIME_STORAGE_KEY || !event.newValue) return;
  try { applyRuntimeState(JSON.parse(event.newValue), { renderView: true, broadcast: false, persist: false }); } catch {}
});

window.addEventListener("hashchange", () => {
  const snapshot = readStateFromHash();
  if (snapshot) {
    applyRuntimeState(snapshot, { renderView: true, broadcast: false, persist: false });
  }
});

// Touch: swipe to navigate
let touchStartX = 0;
let touchStartY = 0;
window.addEventListener("touchstart", (event) => {
  if (event.touches.length !== 1) return;
  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
}, { passive: true });

window.addEventListener("touchend", (event) => {
  if (touchStartX === 0) return;
  const dx = event.changedTouches[0].clientX - touchStartX;
  const dy = event.changedTouches[0].clientY - touchStartY;
  touchStartX = 0;
  // Only trigger if horizontal swipe exceeds threshold and is dominant over vertical
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    if (dx > 0) previous();
    else next();
  }
}, { passive: true });

Object.assign(state, hydrateInitialState());
persistState(serializeRuntimeState());
initializeSyncChannel();

// Speaker view: request latest state from opener BEFORE first render
if (isSpeakerView) {
  state.pendingSync = true;
  if (window.opener && !window.opener.closed) {
    sendRuntimeMessage(window.opener, "request-state", serializeRuntimeState());
  }
  // Fallback: render after 800ms even if no sync arrives
  syncFallbackTimer = setTimeout(() => {
    if (state.pendingSync) {
      state.pendingSync = false;
      render();
    }
  }, 800);
}

render();

if (isSpeakerView) {
  window.setInterval(() => { updateTimerDisplay(); }, 1000);
}