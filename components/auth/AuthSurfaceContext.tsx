'use client'

// KINEO-LOGIN-MODAL-1410 — fundador 14/10 ("vai"): entrar e criar conta num MODAL por cima da home, como Higgsfield e
// Krea. O modal NÃO tem lógica de autenticação própria: ele renderiza as MESMAS telas de app/(auth)/login/page.tsx e
// app/(auth)/signup/page.tsx (mesmas chamadas do Supabase, mesmo Google, mesma validação, mesmos eventos, mesmo
// ?redirect). Este contexto só diz à tela onde ela está: na página inteira (padrão, split-screen com o AuthReel) ou
// dentro do modal (só o formulário, sem o painel da vitrine e sem "Back to Home", que vira o X do modal).
//
// Fora do modal ninguém fornece o contexto → inModal=false → as páginas /login e /signup ficam idênticas a antes.

import { createContext, useContext } from 'react'

export type AuthMode = 'login' | 'signup'

export type AuthSurface = {
  /** true só quando a tela de login/cadastro está dentro do modal da home. */
  inModal: boolean
}

const AuthSurfaceContext = createContext<AuthSurface>({ inModal: false })

export const AuthSurfaceProvider = AuthSurfaceContext.Provider

export function useAuthSurface(): AuthSurface {
  return useContext(AuthSurfaceContext)
}
