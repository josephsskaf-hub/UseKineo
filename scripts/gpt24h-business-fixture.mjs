import { React, offlineModules } from './gpt24h-offline-support.mjs'
export function businessFixture(replacements = {}) {
  return offlineModules({ replacements, mocks: {
    'lib/supabase/client.ts': { createClient() { throw new Error('No auth/database in offline SSR') } },
    'lib/analytics.ts': { trackEvent() { throw new Error('No telemetry in offline SSR') } },
    'components/OrganicCtaLink.tsx': { __esModule:true, default:({children,source,placement,...props})=>React.createElement('a',props,children) },
  } })
}
