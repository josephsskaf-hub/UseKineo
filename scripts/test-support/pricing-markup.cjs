// Find a rendered marker and its actual HTML ancestors in offline tests.
function findPricingMarkers(html, attribute, value) {
  const stack = []
  const markers = []
  const source = html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<!--[\s\S]*?-->/g, '')
  for (const match of source.matchAll(/<(\/?)([a-z][\w:-]*)\b([^>]*)>/gi)) {
    const [, closing, tag, raw] = match
    if (closing) {
      if (stack.at(-1)?.tag === tag) stack.pop()
      continue
    }
    const attrs = Object.fromEntries(Array.from(raw.matchAll(/\s([^\s=/>]+)(?:="([^"]*)")?/g), ([, name, val]) => [name, val ?? '']))
    const hidden = Object.hasOwn(attrs, 'hidden') || /(?:^|;)\s*display\s*:\s*none\b/.test(attrs.style ?? '')
    if (attrs[attribute] === value) {
      markers.push({ position: match.index, visible: !hidden && !stack.some(entry => entry.hideChildren) })
    }
    if (!/^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(tag)) {
      stack.push({ tag, hideChildren: hidden || (tag === 'details' && !Object.hasOwn(attrs, 'open')) })
    }
  }
  return markers
}

// Keep exact parity for the grid and allow only the approved Studio text.
function normalizeStudioCopy(markup) {
  if (!markup) return markup
  const start = markup.indexOf(' data-tier="pro"')
  if (start < 0) return markup
  const before = markup.slice(0, start)
  const studio = markup.slice(start)
    .replace(/<li><svg\b[^>]*><path\b[^>]*><\/path><\/svg><span>(?:Unlimited projects · files stay while your account is active|Save up to 10 reusable characters)<\/span><\/li>/, '')
    .replace('<summary>See 60-second films by engine</summary>', '<summary>See credits by engine</summary>')
    .replace('<p class="pv-caption">Each count assumes you use all monthly credits on that engine.</p>',
      '<p class="pv-caption">A clip is one AI scene. A film is a finished Short with voice, captions and music.</p>')
  return before + studio
}

module.exports = { findPricingMarkers, normalizeStudioCopy }
