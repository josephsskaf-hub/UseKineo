import { React, offlineModules } from './gpt24h-offline-support.mjs'
// Offline UI boundaries only. No customer data, provider, browser or network.
export function engineFixture(replacements = {}) {
  const plain = name => function Mock({ children }) { return React.createElement('div', { 'data-offline-boundary': name }, children) }
  const mocks = Object.fromEntries(['Footer','AgencyVolumeBridge','StickyFreeShortCTA','WallMedia','ScriptToSeedanceBridge'].map(name => [`components/${name}.tsx`, { __esModule: true, default: plain(name) }]))
  mocks['components/OrganicCtaLink.tsx'] = { __esModule: true, default: ({ children, source, placement, ...props }) => React.createElement('a', props, children) }
  mocks['app/youtube-shorts-from-topic/TopicGeneratorForm.tsx'] = { __esModule: true, default: plain('TopicGeneratorForm') }
  const local = offlineModules()
  const { PUBLIC_ENGINE_EXAMPLES, FOUNDER_SHOWCASE, ENGINE_PAGE_LEAD } = local('lib/publicExamples.ts')
  mocks['lib/engineWall.ts'] = {
    getEngineRenders: async () => [],
    getHouseEngineExamples: (engine, limit) => {
      const seen = new Set()
      return [...ENGINE_PAGE_LEAD, ...FOUNDER_SHOWCASE, ...PUBLIC_ENGINE_EXAMPLES]
        .filter(v => v.engine === engine && !seen.has(v.id) && seen.add(v.id))
        .slice(0, limit).map(v => ({ ...v, videoUrl: v.previewPath ?? v.arenaPreviewPath ?? v.videoPath,
          posterUrl: v.posterPath ?? v.arenaPosterPath, badge: engine }))
    },
  }
  return offlineModules({ replacements, mocks })
}
