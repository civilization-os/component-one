const deck = window.__PPT_DECK__;

if (!deck) {
  throw new Error("Missing deck payload.");
}

const app = document.getElementById("app");
const isSpeakerView = document.body.dataset.view === "speaker";
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

function renderBlock(block) {
  switch (block.kind) {
    case "heading":
      return '<h2 class="block-heading">' + escapeHtml(block.text) + "</h2>";
    case "text":
      return '<p class="block-text">' + escapeHtml(block.text) + "</p>";
    case "bullets":
      return '<ul class="block-bullets">' + block.items.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>";
    case "quote":
      return '<blockquote class="block-quote">' + escapeHtml(block.text) + "</blockquote>";
    case "code":
      return '<pre class="block-code"><code>' + escapeHtml(block.code) + "</code></pre>";
    case "table":
      return '<div class="block-table"><table><thead><tr>' +
        block.headers.map((header) => "<th>" + escapeHtml(header) + "</th>").join("") +
        "</tr></thead><tbody>" +
        block.rows.map((row) => "<tr>" + row.map((cell) => "<td>" + escapeHtml(cell) + "</td>").join("") + "</tr>").join("") +
        "</tbody></table></div>";
    case "image": {
      const src = block.asset.kind === "url" ? block.asset.url : block.asset.path;
      const caption = block.caption ? '<figcaption>' + escapeHtml(block.caption) + "</figcaption>" : "";
      return '<figure class="block-image"><img src="' + escapeHtml(src) + '" alt="' + escapeHtml(block.caption ?? block.id) + '" />' + caption + "</figure>";
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

function render() {
  const slide = currentSlide();
  const step = currentStep();
  const totalSlides = deck.slides.length;
  const totalSteps = slide.steps.length;
  const minutes = Math.floor((Date.now() - state.startedAt) / 60000);
  const seconds = Math.floor(((Date.now() - state.startedAt) % 60000) / 1000).toString().padStart(2, "0");
  const visibleSteps = slide.steps.slice(0, state.stepIndex + 1);
  const blocks = visibleSteps.flatMap((item) => item.blocks);
  const currentAction = step.actions?.[0];

  app.innerHTML =
    '<div class="presentation-shell">' +
      '<section class="stage-card">' +
        '<div class="slide-shell">' +
          '<div class="slide-accent"></div>' +
          '<h1 class="slide-title">' + escapeHtml(slide.title ?? deck.title) + "</h1>" +
          '<div class="slide-step">' + blocks.map(renderBlock).join("") + "</div>" +
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
          '<div class="speaker-preview-item">' + (nextPreview() ? nextPreview().blocks.map(renderBlock).join("") : "End of slide.") + "</div>" +
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