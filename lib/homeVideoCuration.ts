import { PUBLIC_ENGINE_EXAMPLES, type PublicEngineExample } from '@/lib/publicExamples'

type HomeExample = Omit<PublicEngineExample, 'ownershipVerifiedAt'> & {
  ownershipVerifiedAt: string
  homePreviewPath?: string
}

// Founder approved these exact twelve videos on 07 Sep 2026 after watching
// the local gallery. Engine identities came from the owner-scoped SELECT.
// Home only: keep existing /arena, /examples and ID lookups unchanged.
export const APPROVED_HOME_VIDEOS: readonly HomeExample[] = [
  { id: 'ca6c04df-6c08-48cb-b1ce-a43b1b171869', title: "Mysterious spheres in Australia", engine: 'cinematic_ai', videoPath: '/previews/curation-sep07/ca6c04df-6c08-48cb-b1ce-a43b1b171869-v.mp4', homePreviewPath: '/previews/curation-sep07/ca6c04df-6c08-48cb-b1ce-a43b1b171869-h.mp4', posterPath: '/previews/curation-sep07/ca6c04df-6c08-48cb-b1ce-a43b1b171869-h.webp', ownershipEvidence: 'founder_confirmed_owned', ownershipVerifiedAt: '2026-09-07' },
  { id: '9aacaf46-49d9-46fb-8b7e-ef7d01d77592', title: "A mystery in the night sky", engine: 'fast', videoPath: '/previews/curation-sep07/9aacaf46-49d9-46fb-8b7e-ef7d01d77592-v.mp4', homePreviewPath: '/previews/curation-sep07/9aacaf46-49d9-46fb-8b7e-ef7d01d77592-h.mp4', posterPath: '/previews/curation-sep07/9aacaf46-49d9-46fb-8b7e-ef7d01d77592-h.webp', ownershipEvidence: 'founder_confirmed_owned', ownershipVerifiedAt: '2026-09-07' },
  { id: 'f3de57b0-3486-4400-ba72-c9390774d426', title: "The Dyatlov Pass incident", engine: 'cinematic_kling', videoPath: '/previews/curation-sep07/f3de57b0-3486-4400-ba72-c9390774d426-v.mp4', homePreviewPath: '/previews/curation-sep07/f3de57b0-3486-4400-ba72-c9390774d426-h.mp4', posterPath: '/previews/curation-sep07/f3de57b0-3486-4400-ba72-c9390774d426-h.webp', ownershipEvidence: 'founder_confirmed_owned', ownershipVerifiedAt: '2026-09-07' },
  { id: 'cbd676d0-340a-4728-8a5f-439fd9dd64c5', title: "The mystery of the Mary Celeste", engine: 'cinematic_ai', videoPath: '/previews/curation-sep07/cbd676d0-340a-4728-8a5f-439fd9dd64c5-v.mp4', homePreviewPath: '/previews/curation-sep07/cbd676d0-340a-4728-8a5f-439fd9dd64c5-h.mp4', posterPath: '/previews/curation-sep07/cbd676d0-340a-4728-8a5f-439fd9dd64c5-h.webp', ownershipEvidence: 'founder_confirmed_owned', ownershipVerifiedAt: '2026-09-07' },
  { id: 'a09706da-a79f-4029-b213-69f43d6a2775', title: "Easter Island: traces in stone", engine: 'cinematic_ai', videoPath: '/previews/curation-sep07/a09706da-a79f-4029-b213-69f43d6a2775-v.mp4', homePreviewPath: '/previews/curation-sep07/a09706da-a79f-4029-b213-69f43d6a2775-h.mp4', posterPath: '/previews/curation-sep07/a09706da-a79f-4029-b213-69f43d6a2775-h.webp', ownershipEvidence: 'founder_confirmed_owned', ownershipVerifiedAt: '2026-09-07' },
  { id: '49d10f33-3877-42c1-82b8-c0b2cb881fc7', title: "Easter Island: a new perspective", engine: 'fast', videoPath: '/previews/curation-sep07/49d10f33-3877-42c1-82b8-c0b2cb881fc7-v.mp4', homePreviewPath: '/previews/curation-sep07/49d10f33-3877-42c1-82b8-c0b2cb881fc7-h.mp4', posterPath: '/previews/curation-sep07/49d10f33-3877-42c1-82b8-c0b2cb881fc7-h.webp', ownershipEvidence: 'founder_confirmed_owned', ownershipVerifiedAt: '2026-09-07' },
  { id: '0ab3e871-2c99-4f6e-9f3c-59773208b12e', title: "The Norwegian town without sunlight", engine: 'fast', videoPath: '/previews/curation-sep07/0ab3e871-2c99-4f6e-9f3c-59773208b12e-v.mp4', homePreviewPath: '/previews/curation-sep07/0ab3e871-2c99-4f6e-9f3c-59773208b12e-h.mp4', posterPath: '/previews/curation-sep07/0ab3e871-2c99-4f6e-9f3c-59773208b12e-h.webp', ownershipEvidence: 'founder_confirmed_owned', ownershipVerifiedAt: '2026-09-07' },
  { id: '7ffd064e-cb37-4a97-a207-70a202bc72b6', title: "The Voynich manuscript", engine: 'cinematic_ai', videoPath: '/previews/curation-sep07/7ffd064e-cb37-4a97-a207-70a202bc72b6-v.mp4', homePreviewPath: '/previews/curation-sep07/7ffd064e-cb37-4a97-a207-70a202bc72b6-h.mp4', posterPath: '/previews/curation-sep07/7ffd064e-cb37-4a97-a207-70a202bc72b6-h.webp', ownershipEvidence: 'founder_confirmed_owned', ownershipVerifiedAt: '2026-09-07' },
  { id: 'a66e975a-3f6c-4bf4-9510-cd15b895b58b', title: "The secret Chinese aircraft", engine: 'cinematic_omni', videoPath: '/previews/curation-sep07/a66e975a-3f6c-4bf4-9510-cd15b895b58b-v.mp4', homePreviewPath: '/previews/curation-sep07/a66e975a-3f6c-4bf4-9510-cd15b895b58b-h.mp4', posterPath: '/previews/curation-sep07/a66e975a-3f6c-4bf4-9510-cd15b895b58b-h.webp', ownershipEvidence: 'founder_confirmed_owned', ownershipVerifiedAt: '2026-09-07' },
  { id: 'cc17475a-0707-4309-aa11-ac4b85918c78', title: "The internet’s mysterious song", engine: 'cinematic_omni', videoPath: '/previews/curation-sep07/cc17475a-0707-4309-aa11-ac4b85918c78-v.mp4', homePreviewPath: '/previews/curation-sep07/cc17475a-0707-4309-aa11-ac4b85918c78-h.mp4', posterPath: '/previews/curation-sep07/cc17475a-0707-4309-aa11-ac4b85918c78-h.webp', ownershipEvidence: 'founder_confirmed_owned', ownershipVerifiedAt: '2026-09-07' },
  { id: '1b8e12f9-83e5-411c-8fda-0b277d289934', title: "Tunguska: the sky split open", engine: 'cinematic_omni', videoPath: '/previews/curation-sep07/1b8e12f9-83e5-411c-8fda-0b277d289934-v.mp4', homePreviewPath: '/previews/curation-sep07/1b8e12f9-83e5-411c-8fda-0b277d289934-h.mp4', posterPath: '/previews/curation-sep07/1b8e12f9-83e5-411c-8fda-0b277d289934-h.webp', ownershipEvidence: 'founder_confirmed_owned', ownershipVerifiedAt: '2026-09-07' },
  { id: '38158db0-f02e-4c6c-a4c8-3c65461413a9', title: "A witness to Tunguska", engine: 'cinematic_omni', videoPath: '/previews/curation-sep07/38158db0-f02e-4c6c-a4c8-3c65461413a9-v.mp4', homePreviewPath: '/previews/curation-sep07/38158db0-f02e-4c6c-a4c8-3c65461413a9-h.mp4', posterPath: '/previews/curation-sep07/38158db0-f02e-4c6c-a4c8-3c65461413a9-h.webp', ownershipEvidence: 'founder_confirmed_owned', ownershipVerifiedAt: '2026-09-07' },
]

export const ROBOT_VIDEO_ID = '36a04f7b-65f7-42d9-a2ab-198b5a7f115e'
const replacedEngines = new Set(['fast', 'cinematic_ai', 'cinematic_kling', 'cinematic_omni'])
export const HOME_ENGINE_EXAMPLES: readonly HomeExample[] = [
  ...PUBLIC_ENGINE_EXAMPLES.filter(v => v.id === ROBOT_VIDEO_ID),
  ...APPROVED_HOME_VIDEOS,
  // No approved replacement from Veo/H3; preserve them and Kling 3 verbatim.
  ...PUBLIC_ENGINE_EXAMPLES.filter(v => !replacedEngines.has(v.engine)),
]
