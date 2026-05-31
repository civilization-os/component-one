const deck = window.__PPT_DECK__;
const STAGE_WIDTH = 1000;
const STAGE_HEIGHT = 562.5;
const RUNTIME_MESSAGE_TYPE = "component-one:ppt-runtime";
const RUNTIME_STORAGE_KEY = "component-one:ppt:" + encodeURIComponent((deck?.presetId ?? "default") + ":" + deck?.title);

if (!deck) {
  throw new Error("Missing deck payload.");
}

const app = document.getElementById("app");
const isSpeakerView = document.body.dataset.view === "speaker";
const instanceId = Math.random().toString(36).slice(2);
let speakerWindow = null;
let broadcastChannel = null;
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

function persistState(snapshot) {
  const hash = hashForState(snapshot);

  if (window.location.hash !== hash) {
    window.history.replaceState(null, "", hash);
  }

  try {
    window.localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage failures for file:// and private contexts.
  }
}

function initializeSyncChannel() {
  try {
    if ("BroadcastChannel" in window) {
      broadcastChannel = new BroadcastChannel(RUNTIME_STORAGE_KEY);
      broadcastChannel.addEventListener("message", (event) => {
        const payload = event.data;

        if (!payload || payload.type !== RUNTIME_MESSAGE_TYPE || payload.sourceId === instanceId || payload.action !== "sync-state") {
          return;
        }

        applyRuntimeState(payload.state, { renderView: true, broadcast: false, persist: true });
      });
    }
  } catch {
    broadcastChannel = null;
  }
}

function linkedWindows() {
  const windows = [];

  if (window.opener && !window.opener.closed) {
    windows.push(window.opener);
  }

  if (speakerWindow && !speakerWindow.closed) {
    windows.push(speakerWindow);
  }

  return windows;
}

function sendRuntimeMessage(target, action, snapshot) {
  if (!target || typeof target.postMessage !== "function") {
    return;
  }

  try {
    target.postMessage(
      {
        type: RUNTIME_MESSAGE_TYPE,
        action,
        sourceId: instanceId,
        state: snapshot
      },
      "*"
    );
  } catch {
    // Ignore unreachable cross-window targets.
  }
}

function broadcastRuntimeState(snapshot) {
  for (const target of linkedWindows()) {
    sendRuntimeMessage(target, "sync-state", snapshot);
  }

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({
        type: RUNTIME_MESSAGE_TYPE,
        action: "sync-state",
        sourceId: instanceId,
        state: snapshot
      });
    } catch {
      // Ignore channel failures.
    }
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

  if (options.persist !== false) {
    persistState(normalized);
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
  const wrapperStart = '<div class="' + classes + '" data-block-id="' + escapeHtml(block.id) + '">';
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

function renderActionHint(action) {
  if (!action) return "";
  if (action.kind === "highlight") return "Highlight " + action.targetId;
  if (action.kind === "appear") return "Appear " + action.targetId;
  if (action.kind === "spotlight") return "Spotlight";
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

  if (explicit?.appearTargetId) {
    guidance.push({ label: labels.appear, value: explicit.appearTargetId, targetBlockId: explicit.appearTargetId });
  }

  if (explicit?.spotlight) {
    guidance.push({
      label: labels.spotlight,
      value: [explicit.spotlight.x, explicit.spotlight.y, explicit.spotlight.radius].join(", ")
    });
  }

  if (explicit?.laserPoints && explicit.laserPoints.length > 0) {
    guidance.push({
      label: labels.laser,
      value: explicit.laserPoints.map((point) => point.x + "," + point.y).join(" -> ")
    });
  }

  return guidance;
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

  if (item.appearTargetId) {
    guidanceParts.push("appear [" + item.appearTargetId + "]");
  }

  if (item.spotlight) {
    guidanceParts.push("spotlight " + [item.spotlight.x, item.spotlight.y, item.spotlight.radius].join(", "));
  }

  if (item.laserPoints && item.laserPoints.length > 0) {
    guidanceParts.push("laser " + item.laserPoints.map((point) => point.x + "," + point.y).join(" -> "));
  }

  const guidance = guidanceParts.join(" / ");
  const target = item.targetBlockId ? " [" + item.targetBlockId + "]" : "";

  if (deck.language === "zh-CN") {
    return "第" + item.step + "步" + target + ": " + guidance;
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
      ? '<div class="speaker-note"><strong>' + escapeHtml(labels.targetBlock) + ':</strong> ' + escapeHtml(item.targetBlockId) + "</div>"
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
  const emphasizedIds = new Set([...highlightedIds, ...appearingIds, ...guidanceTargetIds]);

  return {
    highlightedIds,
    appearingIds,
    guidanceTargetIds,
    emphasizedIds,
    focusMode: emphasizedIds.size > 0
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

function overlayTimingStyle(delayMs, durationMs) {
  return ' style="--action-delay:' + delayMs + 'ms;--action-duration:' + durationMs + 'ms"';
}

function stagePoint(point) {
  return {
    x: normalizeCoordinate(point.x, STAGE_WIDTH),
    y: normalizeCoordinate(point.y, STAGE_HEIGHT)
  };
}

function stageRectForElement(element, shellRect) {
  const rect = element.getBoundingClientRect();
  const x = ((rect.left - shellRect.left) / shellRect.width) * STAGE_WIDTH;
  const y = ((rect.top - shellRect.top) / shellRect.height) * STAGE_HEIGHT;
  const width = (rect.width / shellRect.width) * STAGE_WIDTH;
  const height = (rect.height / shellRect.height) * STAGE_HEIGHT;
  return {
    id: element.dataset.blockId,
    x,
    y,
    width,
    height
  };
}

function renderStageOverlay(actions, renderState) {
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

  for (const blockId of renderState.emphasizedIds) {
    const block = app.querySelector('[data-block-id="' + escapeAttribute(blockId) + '"]');

    if (block) {
      targetRects.push(stageRectForElement(block, shellRect));
    }
  }

  const primaryRect = targetRects.find((rect) => renderState.highlightedIds.has(rect.id))
    ?? targetRects.find((rect) => renderState.guidanceTargetIds.has(rect.id))
    ?? targetRects[0]
    ?? null;

  host.innerHTML = renderOverlay(actions, {
    focusMode: renderState.focusMode,
    targetRects,
    guidanceTargetIds: renderState.guidanceTargetIds,
    primaryRect
  });
}

function renderOverlay(actions, context) {
  if ((!actions || actions.length === 0) && !context.focusMode) {
    return "";
  }

  const spotlight = actions.find((action) => action.kind === "spotlight");
  const lasers = actions.filter((action) => action.kind === "laser");
  const targetRects = context.targetRects ?? [];
  const guidanceTargetIds = context.guidanceTargetIds ?? new Set();
  const primaryRect = context.primaryRect ?? null;

  if (!spotlight && lasers.length === 0 && targetRects.length === 0) {
    return "";
  }

  const parts = [];
  const defs = [];
  const maskShapes = ['<rect width="' + STAGE_WIDTH + '" height="' + STAGE_HEIGHT + '" fill="white"></rect>'];

  if (spotlight) {
    const cx = normalizeCoordinate(spotlight.x, STAGE_WIDTH);
    const cy = normalizeCoordinate(spotlight.y, STAGE_HEIGHT);
    const radius = normalizeCoordinate(spotlight.radius, Math.min(STAGE_WIDTH, STAGE_HEIGHT));
    maskShapes.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + radius + '" fill="black"></circle>');
    parts.push('<circle class="action-spotlight-ring" cx="' + cx + '" cy="' + cy + '" r="' + radius + '"' + overlayTimingStyle(60, 420) + '></circle>');
  }

  for (const [index, rect] of targetRects.entries()) {
    const padding = 14;
    const x = Math.max(0, rect.x - padding);
    const y = Math.max(0, rect.y - padding);
    const width = Math.min(STAGE_WIDTH - x, rect.width + padding * 2);
    const height = Math.min(STAGE_HEIGHT - y, rect.height + padding * 2);
    maskShapes.push('<rect x="' + x + '" y="' + y + '" width="' + width + '" height="' + height + '" rx="18" ry="18" fill="black"></rect>');
    parts.push(
      '<rect class="action-focus-ring' + (guidanceTargetIds.has(rect.id) ? ' is-guidance' : '') + '" x="' + x + '" y="' + y + '" width="' + width + '" height="' + height + '" rx="18" ry="18"' + overlayTimingStyle(90 + index * 40, 520) + '></rect>'
    );
  }

  if (maskShapes.length > 1) {
    defs.push('<mask id="focus-mask">' + maskShapes.join("") + "</mask>");
    parts.unshift('<rect class="action-focus-mask" width="' + STAGE_WIDTH + '" height="' + STAGE_HEIGHT + '" fill="rgba(15, 23, 42, 0.52)" mask="url(#focus-mask)"' + overlayTimingStyle(0, 220) + '></rect>');
  }

  for (const [index, laser] of lasers.entries()) {
    const motionPoints = laser.points.map((point) => stagePoint(point));

    if (primaryRect) {
      motionPoints.unshift({
        x: primaryRect.x + primaryRect.width / 2,
        y: primaryRect.y + primaryRect.height / 2
      });
    }

    const points = motionPoints.map((point) => point.x + "," + point.y).join(" ");
    const lastPoint = motionPoints[motionPoints.length - 1];
    const laserDelay = 210 + index * 90;

    parts.push('<polyline class="action-laser-line" points="' + points + '"' + overlayTimingStyle(laserDelay, 620) + '></polyline>');
    parts.push('<circle class="action-laser-dot" cx="' + lastPoint.x + '" cy="' + lastPoint.y + '" r="8"' + overlayTimingStyle(laserDelay + 120, 620) + '></circle>');
  }

  for (const [index, rect] of targetRects.filter((item) => guidanceTargetIds.has(item.id)).entries()) {
    const startX = STAGE_WIDTH - 92;
    const startY = 82;
    const midX = Math.max(rect.x + rect.width / 2, STAGE_WIDTH * 0.56);
    const midY = Math.max(100, rect.y - 22);
    const endX = rect.x + rect.width / 2;
    const endY = rect.y + rect.height / 2;
    const points = [startX + "," + startY, midX + "," + midY, endX + "," + endY].join(" ");
    const guidanceDelay = 140 + index * 70;
    parts.push('<polyline class="action-guidance-line" points="' + points + '"' + overlayTimingStyle(guidanceDelay, 560) + '></polyline>');
    parts.push('<circle class="action-guidance-dot" cx="' + endX + '" cy="' + endY + '" r="7"' + overlayTimingStyle(guidanceDelay + 110, 560) + '></circle>');
  }

  return '<svg class="slide-overlay" viewBox="0 0 ' + STAGE_WIDTH + " " + STAGE_HEIGHT + '" preserveAspectRatio="none">' + (defs.length > 0 ? "<defs>" + defs.join("") + "</defs>" : "") + parts.join("") + "</svg>";
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

  renderStageOverlay(activeActions, renderState);

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
  applyRuntimeState(nextState);
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
  applyRuntimeState(nextState);
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

  applyRuntimeState(nextState);
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

  applyRuntimeState(nextState);
}

function previous() {
  const nextState = serializeRuntimeState();

  if (state.stepIndex > 0) {
    nextState.stepIndex -= 1;
  } else if (state.slideIndex > 0) {
    nextState.slideIndex -= 1;
    nextState.stepIndex = deck.slides[nextState.slideIndex].steps.length - 1;
  }

  applyRuntimeState(nextState);
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
    applyRuntimeState(payload.state, { renderView: true, broadcast: false, persist: true });
  }
});

window.addEventListener("storage", (event) => {
  if (event.key !== RUNTIME_STORAGE_KEY || !event.newValue) {
    return;
  }

  try {
    applyRuntimeState(JSON.parse(event.newValue), { renderView: true, broadcast: false, persist: false });
  } catch {
    // Ignore malformed storage payloads.
  }
});

window.addEventListener("hashchange", () => {
  const snapshot = readStateFromHash();

  if (snapshot) {
    applyRuntimeState(snapshot, { renderView: true, broadcast: false, persist: false });
  }
});

Object.assign(state, hydrateInitialState());
persistState(serializeRuntimeState());
initializeSyncChannel();

if (isSpeakerView && window.opener && !window.opener.closed) {
  sendRuntimeMessage(window.opener, "request-state", serializeRuntimeState());
}

render();

if (isSpeakerView) {
  window.setInterval(() => {
    updateTimerDisplay();
  }, 1000);
}