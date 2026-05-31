import test from "node:test";
import assert from "node:assert/strict";

import { escapeHtml, createHtmlDocument, createThemeCss } from "../dist/adapters/html/template.js";
import { createRuntimeScript } from "../dist/adapters/html/runtime.js";
import { requirePptPreset } from "../dist/index.js";

// ---------------------------------------------------------------------------
// template.ts — escapeHtml
// ---------------------------------------------------------------------------

test("escapeHtml escapes HTML special characters", () => {
  assert.equal(escapeHtml("hello & world"), "hello &amp; world");
  assert.equal(escapeHtml("<script>"), "&lt;script&gt;");
  assert.equal(escapeHtml('"quote"'), "&quot;quote&quot;");
  assert.equal(escapeHtml("it's"), "it&#39;s");
  assert.equal(escapeHtml("a > b"), "a &gt; b");
  assert.equal(escapeHtml("plain text"), "plain text");
  assert.equal(escapeHtml(""), "");
});

test("escapeHtml handles combined special characters", () => {
  const input = '<div class="test" data-value="a & b">it\'s</div>';
  const expected = "&lt;div class=&quot;test&quot; data-value=&quot;a &amp; b&quot;&gt;it&#39;s&lt;/div&gt;";
  assert.equal(escapeHtml(input), expected);
});

// ---------------------------------------------------------------------------
// template.ts — createHtmlDocument
// ---------------------------------------------------------------------------

test("createHtmlDocument produces valid audience HTML skeleton", () => {
  const html = createHtmlDocument({
    title: "Test Deck",
    language: "en-US",
    mode: "audience"
  });

  assert.ok(html.includes("<!doctype html>"), "has doctype");
  assert.ok(html.includes('<html lang="en-US">'), "has language");
  assert.ok(html.includes("<title>Test Deck</title>"), "has title");
  assert.ok(html.includes('data-view="audience"'), "has audience view");
  assert.ok(html.includes('id="app"'), "has #app container");
  assert.ok(html.includes('src="./runtime.js"'), "links runtime.js");
  assert.ok(html.includes('href="./theme.css"'), "links theme.css");
  assert.ok(html.includes('src="./deck.js"'), "links deck.js");
});

test("createHtmlDocument renders speaker view mode", () => {
  const html = createHtmlDocument({
    title: "Test Deck - Speaker View",
    language: "zh-CN",
    mode: "speaker"
  });

  assert.ok(html.includes('data-view="speaker"'), "has speaker view");
  assert.ok(html.includes('<html lang="zh-CN">'), "has zh-CN language");
  assert.ok(html.includes("Test Deck - Speaker View"), "has speaker title");
});

// ---------------------------------------------------------------------------
// template.ts — createThemeCss
// ---------------------------------------------------------------------------

test("createThemeCss includes preset design tokens", () => {
  const preset = requirePptPreset("technical-brief");
  const css = createThemeCss(preset);

  // Design tokens
  assert.ok(css.includes("--ppt-bg"), "has bg token");
  assert.ok(css.includes("--ppt-surface"), "has surface token");
  assert.ok(css.includes("--ppt-title"), "has title token");
  assert.ok(css.includes("--ppt-body"), "has body token");
  assert.ok(css.includes("--ppt-muted"), "has muted token");
  assert.ok(css.includes("--ppt-accent"), "has accent token");
  assert.ok(css.includes("--ppt-secondary"), "has secondary token");
  assert.ok(css.includes("--ppt-heading-font"), "has heading font token");
  assert.ok(css.includes("--ppt-body-font"), "has body font token");

  // Preset-specific colors
  assert.ok(css.includes("#F9FAFB"), "has technical-brief background color");
  assert.ok(css.includes("#7C3AED"), "has technical-brief accent color");
  assert.ok(css.includes("#0891B2"), "has technical-brief secondary color");
});

test("createThemeCss includes block styles for all deck block kinds", () => {
  const preset = requirePptPreset("executive-report");
  const css = createThemeCss(preset);

  assert.ok(css.includes("block-heading"), "heading style");
  assert.ok(css.includes("block-text"), "text style");
  assert.ok(css.includes("block-bullets"), "bullets style");
  assert.ok(css.includes("block-callout"), "callout style");
  assert.ok(css.includes("block-metrics"), "metrics style");
  assert.ok(css.includes("block-two-column"), "two-column style");
  assert.ok(css.includes("block-timeline"), "timeline style");
  assert.ok(css.includes("block-process"), "process style");
  assert.ok(css.includes("block-quadrant"), "quadrant style");
  assert.ok(css.includes("block-comparison"), "comparison style");
  assert.ok(css.includes("block-quote"), "quote style");
  assert.ok(css.includes("block-code"), "code style");
  assert.ok(css.includes("block-table"), "table style");
  assert.ok(css.includes("block-image"), "image style");
});

test("createThemeCss includes speaker view and overlay styles", () => {
  const preset = requirePptPreset("product-showcase");
  const css = createThemeCss(preset);

  // Speaker view
  assert.ok(css.includes("speaker-card"), "speaker card style");
  assert.ok(css.includes("speaker-controls"), "speaker controls style");
  assert.ok(css.includes("speaker-note"), "speaker note style");
  assert.ok(css.includes("speaker-button"), "speaker button style");
  assert.ok(css.includes("speaker-input"), "speaker input style");
  assert.ok(css.includes("speaker-current-guidance"), "speaker current guidance style");

  // Overlay actions
  assert.ok(css.includes("action-focus-mask"), "focus mask style");
  assert.ok(css.includes("action-focus-ring"), "focus ring style");
  assert.ok(css.includes("action-spotlight-ring"), "spotlight ring style");
  assert.ok(css.includes("action-guidance-line"), "guidance line style");
  assert.ok(css.includes("action-guidance-dot"), "guidance dot style");
  assert.ok(css.includes("action-laser-dot"), "laser dot style");

  // Overlay animations
  assert.ok(css.includes("ppt-appear"), "appear animation");
  assert.ok(css.includes("ppt-fade-overlay"), "fade overlay animation");
  assert.ok(css.includes("ppt-overlay-exit"), "overlay exit animation");
  assert.ok(css.includes("ppt-draw-line"), "draw line animation");
  assert.ok(css.includes("ppt-undraw-line"), "undraw line animation");
  assert.ok(css.includes("ppt-glint"), "glint animation");
  assert.ok(css.includes("ppt-point-glow"), "point glow animation");
  // Slide states
  assert.ok(css.includes("is-highlighted"), "highlighted state");
  assert.ok(css.includes("is-appearing"), "appearing state");
  assert.ok(css.includes("is-guidance-target"), "guidance target state");
  assert.ok(css.includes("is-deemphasized"), "deemphasized state");
  assert.ok(css.includes("is-blackout"), "blackout state");
  assert.ok(css.includes("is-exiting"), "exiting state");

  // Responsive
  assert.ok(css.includes("@media"), "responsive media query");
});

test("createThemeCss generates different output for different presets", () => {
  const reportCss = createThemeCss(requirePptPreset("executive-report"));
  const techCss = createThemeCss(requirePptPreset("technical-brief"));
  const productCss = createThemeCss(requirePptPreset("product-showcase"));

  // Different accent colors
  assert.ok(reportCss.includes("#2563EB"), "executive-report accent blue");
  assert.ok(techCss.includes("#7C3AED"), "technical-brief accent purple");
  assert.ok(productCss.includes("#DC2626"), "product-showcase accent red");
});

// ---------------------------------------------------------------------------
// runtime.ts — createRuntimeScript
// ---------------------------------------------------------------------------

test("createRuntimeScript produces valid JS runtime string", () => {
  const preset = requirePptPreset("technical-brief");
  const script = createRuntimeScript(preset);

  assert.ok(script.includes("window.__PPT_DECK__"), "references deck payload");
  assert.ok(script.includes("motionProfile"), "includes motion profile");
  assert.ok(script.includes("labels"), "includes i18n labels");
  assert.ok(script.includes("function render"), "has render function");

  // Runtime state management
  assert.ok(script.includes("slideIndex"), "slide index state");
  assert.ok(script.includes("stepIndex"), "step index state");
  assert.ok(script.includes("isBlackout"), "blackout state");
  assert.ok(script.includes("serializeRuntimeState"), "serialize function");
  assert.ok(script.includes("normalizeRuntimeState"), "normalize function");
  assert.ok(script.includes("hydrateInitialState"), "hydrate function");

  // Rendering
  assert.ok(script.includes("renderBlock"), "block renderer");
  assert.ok(script.includes("renderNotes"), "notes renderer");
  assert.ok(script.includes("renderCurrentGuidance"), "guidance renderer");
  assert.ok(script.includes("renderStageOverlay"), "overlay renderer");
  assert.ok(script.includes("renderOverlay"), "overlay SVG renderer");

  // Actions
  assert.ok(script.includes("overlayStyle"), "overlay style helper");
  assert.ok(script.includes("motionDefaultsFor"), "motion defaults");
  assert.ok(script.includes("captureOverlaySnapshot"), "overlay snapshot");
  assert.ok(script.includes("stagePoint"), "stage coordinate mapping");

  // Speaker view features
  assert.ok(script.includes("speakerWindow"), "speaker window ref");
  assert.ok(script.includes("openSpeakerView"), "open speaker view");
  assert.ok(script.includes("toggleBlackout"), "toggle blackout");
  assert.ok(script.includes("toggleTimer"), "toggle timer");
  assert.ok(script.includes("jumpTo"), "jump to position");
  assert.ok(script.includes("jumpToSelection"), "jump to selection");
  assert.ok(script.includes("bindSpeakerControls"), "bind controls");

  // Sync mechanisms
  assert.ok(script.includes("BroadcastChannel"), "broadcast channel sync");
  assert.ok(script.includes("localStorage"), "storage sync");
  assert.ok(script.includes("postMessage"), "postMessage sync");
  assert.ok(script.includes("hashchange"), "hash change sync");
  assert.ok(script.includes("hashForState"), "state hashing");
  assert.ok(script.includes("readStateFromHash"), "read from hash");
  assert.ok(script.includes("readStateFromStorage"), "read from storage");

  // Keyboard shortcuts
  assert.ok(script.includes("ArrowRight"), "right arrow");
  assert.ok(script.includes("ArrowLeft"), "left arrow");
  assert.ok(script.includes('"f"'), "fullscreen shortcut");
  assert.ok(script.includes('"b"'), "blackout shortcut");
  assert.ok(script.includes('"t"'), "timer shortcut");
  assert.ok(script.includes('"s"'), "speaker view shortcut");

  // Timer
  assert.ok(script.includes("timerLabel"), "timer label");
  assert.ok(script.includes("currentElapsedMs"), "elapsed time");
  assert.ok(script.includes("updateTimerDisplay"), "timer display update");
  assert.ok(script.includes("setInterval"), "timer interval");
});

test("createRuntimeScript includes preset motion profile overrides", () => {
  const preset = requirePptPreset("technical-brief");
  const script = createRuntimeScript(preset);

  assert.ok(script.includes("motionDefaultsFor"), "motion defaults helper");
  assert.ok(script.includes("byBlockKind"), "block-specific motion");
  // Technical brief specific motion values
  assert.ok(script.includes("260"), "highlight enter duration 260ms");
});

test("createRuntimeScript is valid executable JavaScript", () => {
  const preset = requirePptPreset("executive-report");
  const script = createRuntimeScript(preset);
  const wrapped = `const window = { addEventListener(){}, location: { hash: "" }, history: { replaceState(){} } };\n${script}`;

  // Should parse without syntax error
  assert.doesNotThrow(() => {
    new Function(wrapped);
  }, "Runtime script must be syntactically valid JavaScript");
});

test("createRuntimeScript includes both en-US and zh-CN label sets", () => {
  const preset = requirePptPreset("technical-brief");
  const script = createRuntimeScript(preset);

  // The runtime script always includes both language label sets;
  // Chinese labels are stored as Unicode escape sequences in the
  // generated JS source (e.g. "\\u6F14\\u8BB2" = "演讲者视图" at runtime).
  assert.ok(script.includes("Speaker View"), "has english speaker view label");
  assert.ok(script.includes("\\u6F14\\u8BB2\\u8005\\u89C6\\u56FE"), "has chinese speaker view label");
  assert.ok(script.includes("Slide"), "has english slide label");
  assert.ok(script.includes("\\u9875\\u9762"), "has chinese slide label");
  assert.ok(script.includes("Step"), "has english step label");
  assert.ok(script.includes("\\u6B65\\u9AA4"), "has chinese step label");
});

test("createRuntimeScript includes overlay SVG renderer for all action types", () => {
  const preset = requirePptPreset("product-showcase");
  const script = createRuntimeScript(preset);

  assert.ok(script.includes("highlight"), "highlight action support");
  assert.ok(script.includes("appear"), "appear action support");
  assert.ok(script.includes("spotlight"), "spotlight action support");
  assert.ok(script.includes("laser"), "laser action support");
  assert.ok(script.includes("spotlightShape"), "spotlight shape guidance support");
  assert.ok(script.includes("laserAnchorFrom"), "laser anchor guidance support");
  assert.ok(script.includes("action-laser-line"), "laser path overlay support");
});

test("createRuntimeScript limits audience overlays to explicit runtime actions", () => {
  const preset = requirePptPreset("product-showcase");
  const script = createRuntimeScript(preset);

  assert.ok(script.includes("const activeHasAction = actions.length > 0;"), "current-step actions suppress exit overlay");
  assert.ok(script.includes("const shouldRenderGuidanceLines = actions.length === 0 && guidanceTargetIds.size > 0 && !context.focusMode;"), "guidance lines only render without active actions");
  assert.ok(script.includes("if (context.focusMode) {"), "focus mask only renders for explicit highlight state");
});
