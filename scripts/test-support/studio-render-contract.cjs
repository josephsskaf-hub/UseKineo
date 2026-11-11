// Compare flow inputs and actions across approved layout revisions, independently of CSS and presentation copy.
const { parse } = require('next/dist/compiled/node-html-parser')

function studioRenderContract(html) {
  const page = parse(html)
  const rows = (selector, attrs) => page.querySelectorAll(selector).map(element =>
    attrs.map(attr => attr === 'text' ? element.text.trim() : element.getAttribute(attr) ?? null))
  return {
    tabs: rows('[data-create-tab]', ['data-create-tab', 'href', 'aria-current']),
    steps: rows('.rc-step', ['data-step-state']),
    inputs: rows('.rc-panel input, .rc-panel textarea', ['id', 'type', 'maxlength', 'accept', 'readonly', 'checked', 'disabled', 'text']),
    consent: rows('label.rc-consent', ['text']),
    action: rows('.rc-generate', ['data-create-continue', 'data-recreate-generate', 'disabled', 'aria-describedby', 'text']),
    blocker: rows('#ct-continue-reason, #rc-generate-reason', ['role', 'text']),
    simulation: rows('.rc-simulate', ['disabled', 'text']),
    selectedVideos: rows('.rc-stage video', ['src', 'poster', 'loop', 'muted']),
    examples: rows('.rc-card', ['data-create-example', 'class']),
    galleryMedia: rows('.rc-card video', ['src', 'poster']),
    ratingsAndSelection: rows('.rc-card [aria-label^="Like "], .rc-card [aria-label^="Use "], .rc-card [aria-label^="Report "], .rc-card [aria-label^="Expand "]', ['aria-label', 'disabled', 'aria-pressed']),
  }
}

module.exports = { studioRenderContract, parse }
