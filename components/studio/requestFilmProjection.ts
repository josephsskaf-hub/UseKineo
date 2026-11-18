// The default build eliminates this call and the entire module. Only real input can activate an authorized Film box.
export function requestFilmProjection(field: HTMLTextAreaElement) {
  const owner = field.closest('[data-testid="studio-simples"]')?.nextElementSibling
  if (!(owner instanceof HTMLElement) || !owner.hasAttribute('data-founder-film-projection')) return
  if (owner.dataset.requested || !field.value.trim() || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  owner.dataset.requested = '1'
  const controllerUrl = '/screening-room/studio-idea.js'
  void import(/* webpackIgnore: true */ controllerUrl).then(({ mountProjection }) => {
    if (owner.isConnected && field.isConnected) mountProjection(owner, field)
  }).catch(() => { /* The existing Film box is the fallback. */ })
}
