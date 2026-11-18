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

module.exports = { findPricingMarkers }
