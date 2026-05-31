import type { PptDeck, PptTemplatePreset } from "../../types.js";

export function createHtmlDocument(options: { title: string; language: PptDeck["language"]; mode: "audience" | "speaker" }): string {
  return [
    "<!doctype html>",
    `<html lang="${options.language}">`,
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>${escapeHtml(options.title)}</title>`,
    '  <link rel="stylesheet" href="./theme.css" />',
    "</head>",
    `<body data-view="${options.mode}">`,
    '  <div id="app" role="main"></div>',
    '  <script src="./deck.js"></script>',
    '  <script src="./runtime.js"></script>',
    "</body>",
    "</html>"
  ].join("\n");
}

export function createThemeCss(preset: PptTemplatePreset): string {
  return `
/* ============================================================
   @civilization-os/ppt — Presentation Theme
   Preset: ${preset.id} | ${preset.name}
   ============================================================ */

/* ---- Design Tokens ---- */
:root {
  --ppt-bg: #${preset.theme.colors.background};
  --ppt-surface: #${preset.theme.colors.surface};
  --ppt-title: #${preset.theme.colors.title};
  --ppt-body: #${preset.theme.colors.body};
  --ppt-muted: #${preset.theme.colors.muted};
  --ppt-accent: #${preset.theme.colors.accent};
  --ppt-secondary: #${preset.theme.colors.secondary};
  --ppt-canvas: #eef2f7;
  --ppt-surface-muted: color-mix(in srgb, var(--ppt-surface) 82%, #f3f6fb);
  --ppt-line-soft: rgba(148,163,184,0.16);

  --ppt-heading-font: "${preset.theme.fonts.heading}", Georgia, "Palatino Linotype", "Book Antiqua", Palatino, "Times New Roman", serif;
  --ppt-body-font: "${preset.theme.fonts.body}", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  --ppt-mono-font: "SF Mono", "Cascadia Code", "JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace;

  --ppt-radius-lg: 16px;
  --ppt-radius: 10px;
  --ppt-radius-sm: 8px;
  --ppt-space-4: 20px;
  --ppt-shadow-sm: 0 2px 6px rgba(15,23,42,0.04);
  --ppt-shadow-md: 0 12px 32px rgba(15,23,42,0.07);
  --ppt-border: 1px solid var(--ppt-line-soft);
  --ppt-ease: cubic-bezier(0.22, 1, 0.36, 1);
}

/* ---- Reset ---- */
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
html, body {
  margin: 0;
  min-height: 100%;
  font-family: var(--ppt-body-font);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
body {
  background: var(--ppt-canvas);
  color: var(--ppt-body);
}

/* ============================================================
   Audience View — clean, content-forward
   ============================================================ */
body[data-view="audience"] {
  background: var(--ppt-canvas);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: clamp(10px, 1.2vw, 18px);
}
body[data-view="audience"] #app {
  width: 100%;
}

/* ============================================================
   Speaker View — refined sidebar workspace
   ============================================================ */
body[data-view="speaker"] {
  background: #edf1f6;
  padding: clamp(12px, 1.4vw, 20px);
}

/* ---- Layout ---- */
#app { width: 100%; }
.presentation-shell { width: min(100%, 1440px); margin: 0 auto; display: grid; gap: var(--ppt-space-4); }

body[data-view="speaker"] .presentation-shell {
  width: min(100%, 1600px);
  grid-template-columns: minmax(0, 1.62fr) minmax(340px, 0.88fr);
  align-items: start;
}

/* ---- Stage Card ---- */
.stage-card {
  background: transparent;
  border: var(--ppt-border);
  border-radius: var(--ppt-radius-lg);
  box-shadow: var(--ppt-shadow-sm);
  padding: 0;
  overflow: hidden;
}
body[data-view="audience"] .stage-card {
  padding: 0;
  background: transparent;
}

/* ---- Slide Shell ---- */
.slide-shell {
  aspect-ratio: 16 / 9;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: clamp(24px, 3vw, 42px) clamp(28px, 3.6vw, 52px);
  background: color-mix(in srgb, var(--ppt-surface) 90%, var(--ppt-bg));
  border-radius: var(--ppt-radius-lg);
  position: relative;
  overflow: hidden;
  border: var(--ppt-border);
  box-shadow: var(--ppt-shadow-md);
}

/* Accent bar — thin, quiet */
.slide-accent {
  position: absolute; inset: 0 auto auto 0;
  width: 100%; height: 5px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--ppt-accent) 88%, white), color-mix(in srgb, var(--ppt-secondary) 80%, white));
  opacity: 0.92;
  z-index: 3;
}

/* ---- Blackout ---- */
.slide-shell.is-blackout { background: #0b0f19; }
.slide-shell.is-blackout .slide-accent,
.slide-shell.is-blackout .slide-title,
.slide-shell.is-blackout .slide-step,
.slide-shell.is-blackout .presentation-footer { display: none; }
.blackout-banner {
  position: absolute; inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(226,232,240,0.35);
  font-family: var(--ppt-heading-font);
  font-size: clamp(1.2rem, 2vw, 1.6rem);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  z-index: 4;
}

/* ---- Slide Title ---- */
.slide-title {
  font-family: var(--ppt-heading-font);
  font-size: clamp(1.85rem, 3.2vw, 3.15rem);
  line-height: 1.04;
  font-weight: 700;
  letter-spacing: 0;
  color: var(--ppt-title);
  margin: 16px 0 20px;
  max-width: min(84%, 13ch);
  position: relative;
  z-index: 2;
}

/* ---- Step Content ---- */
.slide-step {
  display: grid;
  gap: clamp(10px, 1.4vw, 18px);
  align-content: start;
  min-height: 0;
  position: relative;
  z-index: 2;
  width: min(100%, 980px);
}

/* ---- Overlay System ---- */
.slide-overlay-host { position: absolute; inset: 0; pointer-events: none; z-index: 3; }
.slide-overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; overflow: visible; }

/* ---- Block states ---- */
.slide-block {
  position: relative;
  border-radius: var(--ppt-radius-sm);
  transition: background-color 250ms var(--ppt-ease),
              box-shadow 250ms var(--ppt-ease),
              opacity 250ms var(--ppt-ease);
}
.slide-block.is-appearing {
  animation: ppt-appear 380ms var(--ppt-ease);
}
.slide-block.is-highlighted {
  background: color-mix(in srgb, var(--ppt-accent) 6%, transparent);
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--ppt-accent) 32%, transparent);
}
.slide-block.is-guidance-target {
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--ppt-secondary) 28%, transparent);
  background: color-mix(in srgb, var(--ppt-secondary) 5%, transparent);
}
.slide-block.is-highlighted,
.slide-block.is-guidance-target,
.slide-block.is-appearing { z-index: 4; }
.slide-block.is-deemphasized {
  opacity: 0.42;
  transition: opacity 350ms ease;
}

/* ---- Overlay transitions ---- */
.slide-overlay.is-exiting { animation: ppt-overlay-exit 240ms ease-out forwards; }
.slide-overlay.is-exiting .action-focus-mask,
.slide-overlay.is-exiting .action-focus-ring,
.slide-overlay.is-exiting .action-spotlight-ring,
.slide-overlay.is-exiting .action-spotlight-glow,
.slide-overlay.is-exiting .action-guidance-dot,
.slide-overlay.is-exiting .action-laser-dot {
  animation: ppt-overlay-exit 220ms ease-out forwards !important;
}
.slide-overlay.is-exiting .action-guidance-line {
  animation: ppt-undraw-line 220ms ease-in forwards !important;
  stroke-dashoffset: 0;
}

/* ---- Overlay Action Elements ---- */
.action-focus-mask {
  opacity: 0;
  animation: ppt-fade-overlay var(--action-duration, 400ms) var(--action-easing, ease-out) forwards;
  animation-delay: var(--action-delay, 0ms);
}
.action-focus-ring {
  fill: rgba(124,58,237,0.02);
  stroke: rgba(124,58,237,0.34);
  stroke-width: 1.5;
  animation: ppt-fade-overlay var(--action-duration, 400ms) var(--action-easing, ease-out) forwards;
  animation-delay: var(--action-delay, 0ms);
  opacity: 0;
}
.action-focus-ring.is-guidance {
  fill: rgba(8,145,178,0.02);
  stroke: rgba(8,145,178,0.34);
}
.action-spotlight-glow {
  opacity: 0;
  animation: ppt-fade-overlay 420ms ease-out forwards;
  animation-delay: var(--action-delay, 0ms);
}
.action-spotlight-ring {
  fill: rgba(255,255,255,0.015);
  stroke: rgba(255,255,255,0.28);
  stroke-width: 1.25;
  animation: ppt-fade-overlay var(--action-duration, 400ms) var(--action-easing, ease-out) forwards;
  animation-delay: var(--action-delay, 0ms);
  opacity: 0;
}
.action-guidance-line,
.action-laser-line {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  pathLength: 1;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: ppt-draw-line var(--action-duration, 500ms) var(--ppt-ease) forwards;
  animation-delay: var(--action-delay, 0ms);
}
.action-guidance-line { stroke: rgba(8,145,178,0.55); stroke-width: 2; }
.action-laser-line { stroke: #dc2626; stroke-width: 3; }
.action-guidance-dot { fill: rgba(8,145,178,0.78); }
.action-laser-dot { fill: #dc2626; }
.action-guidance-dot,
.action-laser-dot {
  transform-origin: center;
  animation: ppt-fade-overlay var(--action-duration, 360ms) var(--action-easing, ease-out) forwards;
  animation-delay: var(--action-delay, 0ms);
  opacity: 0;
}
/* ============================================================
   Block Styles
   ============================================================ */
.block-heading {
  font-family: var(--ppt-heading-font);
  color: var(--ppt-title);
  font-size: clamp(1.12rem, 1.75vw, 1.58rem);
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: 0;
  margin: 0;
}
.block-text {
  font-size: clamp(0.95rem, 1.28vw, 1.08rem);
  line-height: 1.68;
  color: var(--ppt-body);
  max-width: 70ch;
  margin: 0;
}
.block-callout {
  border-radius: var(--ppt-radius);
  background: color-mix(in srgb, var(--ppt-accent) 4%, var(--ppt-surface));
  border: 1px solid color-mix(in srgb, var(--ppt-accent) 14%, transparent);
  padding: 16px 18px;
  font-size: clamp(0.94rem, 1.18vw, 1.04rem);
  line-height: 1.64;
  color: var(--ppt-title);
  margin: 0;
}
.block-bullets {
  margin: 0;
  padding-left: 1.4rem;
  display: grid;
  gap: 8px;
  font-size: clamp(0.95rem, 1.2vw, 1.06rem);
}
.block-bullets li { line-height: 1.6; padding-left: 0.2rem; }
.block-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: clamp(8px, 1vw, 14px);
  margin: 0;
}
.block-metric-item {
  border: var(--ppt-border);
  border-radius: var(--ppt-radius);
  background: var(--ppt-surface);
  padding: clamp(10px, 1vw, 16px) clamp(12px, 1.2vw, 18px);
}
.block-metric-label {
  display: block;
  color: var(--ppt-muted);
  font-size: 0.75rem;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}
.block-metric-value {
  display: block;
  color: var(--ppt-title);
  font-family: var(--ppt-heading-font);
  font-size: clamp(1.1rem, 1.8vw, 1.5rem);
  line-height: 1.1;
  font-weight: 700;
}
.block-two-column {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(10px, 1.2vw, 18px);
  margin: 0;
}
.block-two-column-panel {
  border: var(--ppt-border);
  border-radius: var(--ppt-radius);
  background: var(--ppt-surface-muted);
  padding: 16px 18px;
}
.block-two-column-label {
  display: block;
  color: var(--ppt-muted);
  font-size: 0.7rem;
  text-transform: uppercase;
  margin-bottom: 6px;
  letter-spacing: 0.06em;
  font-weight: 600;
}
.block-two-column-copy {
  white-space: pre-wrap;
  line-height: 1.6;
  color: var(--ppt-body);
  font-size: 0.95rem;
}
.block-timeline {
  display: grid;
  gap: 12px;
  margin: 0;
}
.block-timeline-item {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}
.block-timeline-label {
  display: inline-flex;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ppt-accent) 7%, var(--ppt-surface));
  color: var(--ppt-title);
  font-size: 0.75rem;
  font-weight: 700;
}
.block-timeline-detail {
  border-left: 2px solid color-mix(in srgb, var(--ppt-accent) 16%, transparent);
  padding-left: 16px;
  line-height: 1.6;
  color: var(--ppt-body);
  white-space: pre-wrap;
}
.block-process {
  display: grid;
  gap: 12px;
  margin: 0;
}
.block-process-item {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  padding: 14px 16px;
  border: var(--ppt-border);
  border-radius: var(--ppt-radius);
  background: var(--ppt-surface-muted);
}
.block-process-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ppt-accent) 10%, var(--ppt-surface));
  color: var(--ppt-title);
  font-family: var(--ppt-heading-font);
  font-size: 0.84rem;
  font-weight: 700;
}
.block-process-copy {
  display: grid;
  gap: 4px;
}
.block-process-title {
  color: var(--ppt-title);
  font-size: 0.96rem;
  line-height: 1.3;
}
.block-process-detail {
  color: var(--ppt-body);
  font-size: 0.93rem;
  line-height: 1.6;
}
.block-quadrant {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 12px 16px;
  align-items: stretch;
  margin: 0;
}
.block-quadrant-y-label {
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  min-height: 100%;
  padding: 12px 8px;
  border-radius: var(--ppt-radius);
  border: var(--ppt-border);
  background: color-mix(in srgb, var(--ppt-secondary) 8%, var(--ppt-surface));
  color: var(--ppt-muted);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}
.block-quadrant-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
}
.block-quadrant-cell {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border: var(--ppt-border);
  border-radius: var(--ppt-radius);
  background: var(--ppt-surface-muted);
  min-height: 112px;
}
.block-quadrant-title {
  color: var(--ppt-title);
  font-size: 0.95rem;
  line-height: 1.3;
}
.block-quadrant-detail {
  color: var(--ppt-body);
  font-size: 0.9rem;
  line-height: 1.6;
}
.block-quadrant-x-label {
  grid-column: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  border-radius: var(--ppt-radius);
  border: var(--ppt-border);
  background: color-mix(in srgb, var(--ppt-accent) 8%, var(--ppt-surface));
  color: var(--ppt-muted);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.block-comparison {
  display: grid;
  gap: 6px;
  margin: 0;
}
.block-comparison-header,
.block-comparison-row {
  display: grid;
  grid-template-columns: minmax(110px, 0.8fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(6px, 0.8vw, 12px);
  align-items: stretch;
}
.block-comparison-header {
  color: var(--ppt-muted);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
}
.block-comparison-cell {
  border: var(--ppt-border);
  border-radius: var(--ppt-radius);
  background: var(--ppt-surface-muted);
  padding: 10px 12px;
  white-space: pre-wrap;
  line-height: 1.55;
  font-size: 0.9rem;
}
.block-comparison-label { font-weight: 600; color: var(--ppt-title); }
.block-quote {
  border-left: 3px solid color-mix(in srgb, var(--ppt-accent) 55%, white);
  padding-left: 16px;
  color: color-mix(in srgb, var(--ppt-secondary) 72%, black);
  font-style: italic;
  line-height: 1.6;
  margin: 0;
}
.block-code {
  white-space: pre-wrap;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: var(--ppt-radius);
  padding: clamp(12px, 1.3vw, 18px) clamp(14px, 1.5vw, 22px);
  font-family: var(--ppt-mono-font);
  font-size: clamp(0.8rem, 1vw, 0.92rem);
  line-height: 1.55;
  margin: 0;
}
.block-table {
  border: var(--ppt-border);
  border-radius: var(--ppt-radius);
  overflow: hidden;
  background: var(--ppt-surface);
  margin: 0;
}
.block-table table { width: 100%; border-collapse: collapse; font-size: clamp(0.82rem, 1vw, 0.95rem); }
.block-table th,
.block-table td {
  border: 1px solid rgba(148,163,184,0.12);
  padding: 7px 10px;
  text-align: left;
}
.block-table th {
  background: rgba(241,245,249,0.95);
  color: var(--ppt-title);
  font-weight: 700;
}
.block-image {
  display: grid;
  gap: 6px;
  margin: 0;
}
.block-image img {
  max-width: 100%;
  max-height: 340px;
  border-radius: var(--ppt-radius);
  object-fit: contain;
  border: var(--ppt-border);
  background: var(--ppt-surface-muted);
}
.block-image figcaption {
  margin-top: 0;
  color: var(--ppt-muted);
  font-size: 0.82rem;
  font-style: italic;
}

/* ---- Presentation Footer ---- */
.presentation-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: auto;
  padding-top: 18px;
  color: var(--ppt-muted);
  font-size: 0.82rem;
  position: relative;
  z-index: 2;
  border-top: 1px solid rgba(148,163,184,0.1);
}
.step-progress {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.88);
  border: var(--ppt-border);
  color: var(--ppt-title);
  font-weight: 600;
  font-size: 0.8rem;
}
.control-hint {
  font-size: 0.75rem;
  color: var(--ppt-muted);
  text-align: right;
}

/* ============================================================
   Speaker Card
   ============================================================ */
.speaker-card {
  padding: clamp(12px, 1.4vw, 20px);
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: sticky;
  top: clamp(10px, 1.5vw, 20px);
  max-height: calc(100vh - 2 * clamp(10px, 1.5vw, 20px));
  overflow-y: auto;
  background: rgba(248,250,252,0.98);
  border: var(--ppt-border);
  border-radius: var(--ppt-radius-lg);
  box-shadow: var(--ppt-shadow-sm);
  scrollbar-width: thin;
  scrollbar-color: rgba(148,163,184,0.25) transparent;
}
.speaker-card h2, .speaker-card h3 {
  margin: 0;
  color: var(--ppt-title);
  font-family: var(--ppt-heading-font);
}
.speaker-card h2 {
  font-size: 1.05rem;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--ppt-accent) 24%, transparent);
}
.speaker-card h3 {
  font-size: 0.82rem;
  line-height: 1.3;
  font-weight: 600;
}

/* Meta row */
.speaker-meta {
  display: grid;
  gap: 4px;
  font-size: 0.85rem;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(148,163,184,0.1);
}
.speaker-meta > div { display: flex; gap: 4px; }

/* Controls */
.speaker-controls {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: var(--ppt-radius);
  background: var(--ppt-surface);
  border: var(--ppt-border);
}
.speaker-controls-row {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.speaker-controls-row.is-jump {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
}
.speaker-button, .speaker-input {
  width: 100%;
  border-radius: var(--ppt-radius-sm);
  border: var(--ppt-border);
  font: inherit;
  font-size: 0.82rem;
}
.speaker-button {
  padding: 7px 12px;
  background: var(--ppt-surface-muted);
  color: var(--ppt-title);
  cursor: pointer;
  font-weight: 600;
  transition: background 120ms ease;
}
.speaker-button:hover { background: rgba(241,245,249,0.9); }
.speaker-button:active { background: rgba(226,232,240,0.8); }
.speaker-button:focus-visible {
  outline: 2px solid var(--ppt-accent);
  outline-offset: 1px;
}
.speaker-button.is-danger {
  color: #b91c1c;
  background: rgba(239,68,68,0.06);
  border-color: rgba(239,68,68,0.2);
}
.speaker-button.is-active {
  background: color-mix(in srgb, var(--ppt-accent) 8%, #ffffff);
  border-color: color-mix(in srgb, var(--ppt-accent) 20%, transparent);
}
.speaker-input {
  padding: 7px 10px;
  background: #ffffff;
  color: var(--ppt-body);
}
.speaker-input:focus-visible {
  outline: 2px solid var(--ppt-accent);
  outline-offset: 1px;
}
.speaker-status-inline {
  color: var(--ppt-muted);
  font-size: 0.8rem;
  font-style: italic;
}

/* Notes */
.speaker-note { line-height: 1.55; white-space: pre-wrap; font-size: 0.85rem; }
.speaker-note-section { display: grid; gap: 4px; }
.speaker-note-section + .speaker-note-section { margin-top: 10px; }
.speaker-note-label {
  color: var(--ppt-muted);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
}
.speaker-note-list {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 3px;
  font-size: 0.85rem;
}

/* Preview */
.speaker-preview { display: grid; gap: 8px; }
.speaker-preview-item {
  background: var(--ppt-surface);
  border-radius: var(--ppt-radius);
  padding: 8px 12px;
  border: var(--ppt-border);
  font-size: 0.85rem;
}
.speaker-preview-item strong { color: var(--ppt-title); }
.speaker-current-guidance {
  border: 1px solid color-mix(in srgb, var(--ppt-accent) 18%, transparent);
  background: color-mix(in srgb, var(--ppt-accent) 4%, var(--ppt-surface));
}

body[data-view="audience"] .speaker-card { display: none; }

/* ============================================================
   Keyframes
   ============================================================ */
@keyframes ppt-appear {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes ppt-fade-overlay {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes ppt-overlay-exit {
  0% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes ppt-draw-line {
  0% { stroke-dashoffset: 1; opacity: 0.15; }
  100% { stroke-dashoffset: 0; opacity: 1; }
}
@keyframes ppt-undraw-line {
  0% { stroke-dashoffset: 0; opacity: 1; }
  100% { stroke-dashoffset: 1; opacity: 0; }
}
@keyframes ppt-glint {
  0% { opacity: 0.45; }
  50% { opacity: 0.68; }
  100% { opacity: 0.45; }
}
@keyframes ppt-point-glow {
  0% { opacity: 0.4; }
  50% { opacity: 0.82; }
  100% { opacity: 0.4; }
}

/* ============================================================
   Responsive
   ============================================================ */
@media (max-width: 860px) {
  body[data-view="speaker"] { padding: 8px; }
  body[data-view="speaker"] .presentation-shell { grid-template-columns: 1fr; }
  .speaker-card { position: static; max-height: none; }
  .stage-card { padding: 0; background: none; border: 0; box-shadow: none; }
  body[data-view="speaker"] .stage-card {
    padding: 0;
    background: transparent;
    border: var(--ppt-border);
    box-shadow: var(--ppt-shadow-sm);
  }
  .slide-shell { padding: 16px 16px 18px; }
  .slide-title { max-width: 100%; font-size: 1.3rem; margin: 14px 0 12px; }
  .block-two-column,
  .block-comparison-header,
  .block-comparison-row,
  .block-timeline-item,
  .speaker-controls-row,
  .speaker-controls-row.is-jump { grid-template-columns: 1fr; }
  .presentation-footer { flex-direction: column; align-items: flex-start; gap: 6px; }
  .control-hint { text-align: left; }
}

@media (prefers-contrast: high) {
  .slide-block.is-highlighted { outline: 2px solid var(--ppt-accent); }
  .slide-block.is-guidance-target { outline: 2px solid var(--ppt-secondary); }
  .action-focus-mask { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`.trim();
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
