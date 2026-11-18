export const themeAuditRoutes = [
  ['menu', '/studio'],
  ['studio', '/studio'],
  ['film', '/create/film'],
  ['clip', '/create/clip'],
  ['cartoon', '/create/cartoon'],
  ['ads', '/create/ads'],
  ['recreate', '/recreate'],
  ['library', '/library'],
  ['creators', '/for-creators'],
  ['login', '/login'],
  ['signup', '/signup'],
  ['pricing', '/pricing'],
]

// Runs read-only in the browser. Measure the visible DOM with color properties
// excluded. Keep labels, icons, styles that affect flow, and control states.
export function captureThemeLayout(surface) {
  const navigation = [...document.querySelectorAll('[data-nav-area="app"][data-nav-surface]')]
  if (surface === 'menu' && !navigation.some(node => node.getBoundingClientRect().right > 0)) {
    return { theme: document.documentElement.dataset.theme, width: innerWidth, nodes: [] }
  }
  const root = document.body
  const attrs = ['role', 'aria-label', 'aria-current', 'aria-expanded', 'aria-pressed', 'aria-disabled', 'aria-selected', 'aria-checked', 'title', 'type', 'placeholder', 'href', 'd', 'viewBox', 'points']
  const styleNames = [
    'display', 'visibility', 'position', 'order', 'gridTemplateColumns', 'gap',
    'flexDirection', 'justifyContent', 'alignItems', 'padding', 'margin', 'borderWidth',
    'borderRadius', 'fontSize', 'fontWeight', 'lineHeight',
  ]
  const q = n => Math.round(n * 2) / 2
  const nodes = []
  function visit(element, key) {
    if (element.matches('script, style, link, meta, nextjs-portal, [data-nextjs-dialog-overlay]')) return
    const style = getComputedStyle(element)
    // Keep the wrapper for a hidden element, but its unrendered descendants
    // cannot affect flow. This also tracks disclosure visibility.
    const hidden = style.display === 'none' || style.visibility === 'hidden'
    const rect = element.getBoundingClientRect()
    // The auth carousel's active fill is a scaleX clock. Its CSS layout
    // width is the same at any instant. The selected tab is still compared.
    const width = style.animationName === 'kineoAuthBarra' ? +style.width.replace('px', '') : rect.width
    const text = Array.from(element.childNodes).filter(child => child.nodeType === 3)
      .map(child => child.textContent).join(' ').trim().replace(/\s+/g, ' ')
    const generated = ['::before', '::after'].map(pseudo => {
      const css = getComputedStyle(element, pseudo)
      return css.content === 'none' || css.content === 'normal'
        ? null
        : [css.content, css.display, css.position, css.width, css.height]
    })
    nodes.push({
      key,
      tag: element.localName,
      text,
      attrs: Object.fromEntries(attrs.filter(name => element.hasAttribute(name)).map(name => [name, element.getAttribute(name)])),
      state: [element.hasAttribute('disabled'), element.hasAttribute('open'), element.checked ?? null],
      box: [q(rect.x), q(rect.y), q(width), q(rect.height)],
      layout: styleNames.map(name => style[name]),
      shadow: style.boxShadow,
      generated,
    })
    if (!hidden) Array.from(element.children).forEach((child, i) => visit(child, key + '.' + i))
  }
  visit(root, '0')
  return { theme: document.documentElement.dataset.theme, width: innerWidth, nodes }
}

export function themeLayoutDifferences(light, dark) {
  const differences = []
  if (light.theme !== 'light' || dark.theme !== 'dark' || light.width !== dark.width) differences.push('Temas ou viewports inválidos')
  if (!light.nodes?.length || !dark.nodes?.length) return [...differences, 'Sem estrutura renderizada']
  const darkNodes = new Map(dark.nodes.map(node => [node.key, node]))
  for (const lightNode of light.nodes) {
    const darkNode = darkNodes.get(lightNode.key)
    if (!darkNode) {
      differences.push(lightNode.key + ' ' + lightNode.tag + ' ausente no escuro')
      continue
    }
    darkNodes.delete(lightNode.key)
    const shadowGeometry = value => value?.replace(/(?:rgba?|hsla?|color|lab|lch|oklab|oklch)\([^)]*\)/g, 'color')
    const changed = Object.keys(lightNode).filter(key => key === 'shadow'
      ? shadowGeometry(lightNode.shadow) !== shadowGeometry(darkNode.shadow)
      : JSON.stringify(lightNode[key]) !== JSON.stringify(darkNode[key]))
    if (changed.length) differences.push(lightNode.key + ' ' + lightNode.tag + ' ' + changed.join(', '))
  }
  for (const [key, node] of darkNodes) differences.push(key + ' ' + node.tag + ' ausente no claro')
  return differences
}
