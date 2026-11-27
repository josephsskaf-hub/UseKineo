import { PUBLIC_CREATE_EDITORS } from './publicEditorRelease'
import { CREATE_SHELL_RELEASE, CREATE_FILM_INPLACE, CAIXA_NOVA_RELEASE, CLIP_RECREATE_JUNTOS_RELEASE } from './release'
import { CLIP_WORKSPACE_RELEASE } from './clipRecreateJuntos'
import { CREATE_CLIP_INPLACE } from './clipNaMolduraRelease'
import { CLIPS_PUBLIC } from '@/lib/clips/clipLaunch'
import { RECREATE_RELEASE } from '@/lib/recreate/release'
import { RECREATE_FLOW_ENABLED } from '@/lib/recreate/flowRelease'
import { KIDS_CARTOON_LIVE } from '@/lib/kidsCartoon/kidsCartoon'

export function publicEditor(tab: string) {
  if (!PUBLIC_CREATE_EDITORS || CREATE_SHELL_RELEASE !== 'public') return false
  if (tab === 'film') return CREATE_FILM_INPLACE === 'public' && CAIXA_NOVA_RELEASE === 'public'
  if (tab === 'cartoon') return KIDS_CARTOON_LIVE
  if (tab === 'clip') return CLIPS_PUBLIC && CREATE_CLIP_INPLACE === 'public' && RECREATE_RELEASE === 'public' &&
    RECREATE_FLOW_ENABLED && CLIP_RECREATE_JUNTOS_RELEASE === 'public' && CLIP_WORKSPACE_RELEASE === 'public'
  return tab === 'ads'
}
