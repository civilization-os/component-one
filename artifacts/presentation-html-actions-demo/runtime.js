const deck = window.__PPT_DECK__;
const STAGE_WIDTH = 1000;
const STAGE_HEIGHT = 562.5;

if (!deck) {
  throw new Error("Missing deck payload.");
}

const app = document.getElementById("app");
const isSpeakerView = document.body.dataset.view === "speaker";
const emptyRenderState = {
  highlightedIds: new Set(),
  appearingIds: new Set()
};
const state = {
  slideIndex: 0,
  stepIndex: 0,
  startedAt: Date.now()
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function blockClasses(block, renderState) {
  const classes = ["slide-block", "slide-block-" + block.kind];

  if (renderState.highlightedIds.has(block.id)) {
    classes.push("is-highlighted");
  }

  if (renderState.appearingIds.has(block.id)) {
    classes.push("is-appearing");
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

function normalizeCoordinate(value, dimension) {
  return value >= 0 && value <= 1 ? value * dimension : value;
}

function renderOverlay(actions) {
  if (!actions || actions.length === 0) {
    return "";
  }

  const spotlight = actions.find((action) => action.kind === "spotlight");
  const lasers = actions.filter((action) => action.kind === "laser");

  if (!spotlight && lasers.length === 0) {
    return "";
  }

  const parts = [];

  if (spotlight) {
    const cx = normalizeCoordinate(spotlight.x, STAGE_WIDTH);
    const cy = normalizeCoordinate(spotlight.y, STAGE_HEIGHT);
    const radius = normalizeCoordinate(spotlight.radius, Math.min(STAGE_WIDTH, STAGE_HEIGHT));
    parts.push(
      '<defs><mask id="spotlight-mask"><rect width="' + STAGE_WIDTH + '" height="' + STAGE_HEIGHT + '" fill="white"></rect><circle cx="' + cx + '" cy="' + cy + '" r="' + radius + '" fill="black"></circle></mask></defs>' +
      '<rect width="' + STAGE_WIDTH + '" height="' + STAGE_HEIGHT + '" fill="rgba(15, 23, 42, 0.34)" mask="url(#spotlight-mask)"></rect>'
    );
  }

  for (const laser of lasers) {
    const points = laser.points
      .map((point) => {
        const x = normalizeCoordinate(point.x, STAGE_WIDTH);
        const y = normalizeCoordinate(point.y, STAGE_HEIGHT);
        return x + "," + y;
      })
      .join(" ");

    parts.push('<polyline points="' + points + '" fill="none" stroke="#ef4444" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"></polyline>');
  }

  return '<svg class="slide-overlay" viewBox="0 0 ' + STAGE_WIDTH + " " + STAGE_HEIGHT + '" preserveAspectRatio="none">' + parts.join("") + "</svg>";
}

function render() {
  const slide = currentSlide();
  const step = currentStep();
  const totalSlides = deck.slides.length;
  const totalSteps = slide.steps.length;
  const minutes = Math.floor((Date.now() - state.startedAt) / 60000);
  const seconds = Math.floor(((Date.now() - state.startedAt) % 60000) / 1000).toString().padStart(2, "0");
  const visibleSteps = slide.steps.slice(0, state.stepIndex + 1);
  const blocks = visibleSteps.flatMap((item) => item.blocks);
  const activeActions = step.actions ?? [];
  const currentAction = activeActions[0];
  const renderState = {
    highlightedIds: new Set(activeActions.filter((action) => action.kind === "highlight").map((action) => action.targetId)),
    appearingIds: new Set(activeActions.filter((action) => action.kind === "appear").map((action) => action.targetId))
  };

  app.innerHTML =
    '<div class="presentation-shell">' +
      '<section class="stage-card">' +
        '<div class="slide-shell">' +
          '<div class="slide-accent"></div>' +
          renderOverlay(activeActions) +
          '<h1 class="slide-title">' + escapeHtml(slide.title ?? deck.title) + "</h1>" +
          '<div class="slide-step">' + blocks.map((block) => renderBlock(block, renderState)).join("") + "</div>" +
          '<div class="presentation-footer">' +
            '<span class="step-progress">Slide ' + (state.slideIndex + 1) + " / " + totalSlides + " - Step " + (state.stepIndex + 1) + " / " + totalSteps + "</span>" +
            '<span class="control-hint">Use ArrowLeft / ArrowRight or Space. Press F for fullscreen and S for speaker view.</span>' +
          "</div>" +
        "</div>" +
      "</section>" +
      '<aside class="speaker-card">' +
        '<h2>Speaker View</h2>' +
        '<div class="speaker-meta">' +
          "<div><strong>Deck:</strong> " + escapeHtml(deck.title) + "</div>" +
          "<div><strong>Slide:</strong> " + (state.slideIndex + 1) + " / " + totalSlides + "</div>" +
          "<div><strong>Step:</strong> " + (state.stepIndex + 1) + " / " + totalSteps + "</div>" +
          "<div><strong>Timer:</strong> " + minutes + ":" + seconds + "</div>" +
          "<div><strong>Action:</strong> " + escapeHtml(renderActionHint(currentAction) || "None") + "</div>" +
        "</div>" +
        '<div class="speaker-preview">' +
          "<h3>Notes</h3>" +
          '<div class="speaker-preview-item speaker-note">' + escapeHtml(slide.notes ?? "No notes.") + "</div>" +
          "<h3>Next Step</h3>" +
          '<div class="speaker-preview-item">' + (nextPreview() ? nextPreview().blocks.map((block) => renderBlock(block)).join("") : "End of slide.") + "</div>" +
        "</div>" +
      "</aside>" +
    "</div>";

  if (!isSpeakerView) {
    const card = app.querySelector(".speaker-card");
    if (card) card.remove();
  }
}

function next() {
  const slide = currentSlide();
  if (state.stepIndex < slide.steps.length - 1) {
    state.stepIndex += 1;
  } else if (state.slideIndex < deck.slides.length - 1) {
    state.slideIndex += 1;
    state.stepIndex = 0;
  }
  render();
}

function previous() {
  if (state.stepIndex > 0) {
    state.stepIndex -= 1;
  } else if (state.slideIndex > 0) {
    state.slideIndex -= 1;
    state.stepIndex = deck.slides[state.slideIndex].steps.length - 1;
  }
  render();
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

  if (event.key.toLowerCase() === "s") {
    window.open("./speaker.html", "_blank", "noopener,noreferrer");
  }
});

render();