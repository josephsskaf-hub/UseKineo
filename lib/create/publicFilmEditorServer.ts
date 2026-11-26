import { PUBLIC_CREATE_EDITORS } from './publicEditorRelease'
import { CREATE_SHELL_RELEASE, CREATE_FILM_INPLACE, CAIXA_NOVA_RELEASE } from './release'

export function publicFilmEditor(): boolean {
  return PUBLIC_CREATE_EDITORS && CREATE_SHELL_RELEASE === 'public' &&
    CREATE_FILM_INPLACE === 'public' && CAIXA_NOVA_RELEASE === 'public'
}
