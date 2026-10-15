// KINEO-SAIR-DA-CONTA-1510 — o ÚNICO caminho de saída do navegador. Todo botão "Sign out" chama `sairDaConta()`.
// Por que cada passo existe está no cabeçalho de lib/auth/sairDaConta.ts. Regras deste arquivo:
//   · nunca esperar a trava do auth-js para apagar cookie (foi ela que prendeu o fundador em 15/10);
//   · servidor PRIMEIRO (com os cookies ainda no pedido, para revogar a sessão no Supabase), navegador DEPOIS;
//   · navegação dura (location.replace) — router.push reaproveitaria a árvore e o cache do App Router logados;
//   · um clique ou dez: a mesma promessa (sem saídas concorrentes disputando a trava).
import { createClient } from '@/lib/supabase/client'
import {
  SAIR_DA_CONTA_DESTINO,
  SAIR_DA_CONTA_LOCAL_TIMEOUT_MS,
  SAIR_DA_CONTA_ROTA,
  SAIR_DA_CONTA_TIMEOUT_MS,
  linhasParaApagarCookies,
  nomesDeSessaoConhecidos,
  nomesDeSessaoNoTextoDeCookie,
} from '@/lib/auth/sairDaConta'

let saidaEmCurso: Promise<void> | null = null

/** Apaga no navegador todo cookie sb-* (todas as variações de domínio) e as chaves sb-* do localStorage. Síncrono. */
export function apagarSessaoNoNavegador(): void {
  if (typeof document === 'undefined') return
  try {
    const nomes = [
      ...nomesDeSessaoNoTextoDeCookie(document.cookie),
      ...nomesDeSessaoConhecidos(process.env.NEXT_PUBLIC_SUPABASE_URL),
    ]
    const seguro = window.location.protocol === 'https:'
    for (const linha of linhasParaApagarCookies(nomes, window.location.hostname, seguro)) document.cookie = linha
  } catch {
    /* segue: o servidor também apagou */
  }
  try {
    const chaves: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith('sb-')) chaves.push(k)
    }
    chaves.forEach((k) => window.localStorage.removeItem(k))
  } catch {
    /* modo privado / storage bloqueado */
  }
}

function comTeto<T>(p: Promise<T>, ms: number): Promise<T | 'teto'> {
  return Promise.race([p, new Promise<'teto'>((resolve) => setTimeout(() => resolve('teto'), ms))])
}

async function executarSaida(): Promise<void> {
  const supabase = createClient()
  // 1. Nada mais renova nem regrava o cookie enquanto saímos (relógio de refresh e realtime parados).
  try { supabase.auth.stopAutoRefresh() } catch { /* ignora */ }
  try { void supabase.removeAllChannels() } catch { /* ignora */ }

  // 2. Servidor: revoga a sessão no Supabase e devolve Set-Cookie apagando todo sb-* (no-store).
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), SAIR_DA_CONTA_TIMEOUT_MS)
  try {
    await fetch(SAIR_DA_CONTA_ROTA, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal: ctrl.signal,
    })
  } catch {
    /* rede caiu ou estourou o teto: o passo 4 apaga no navegador do mesmo jeito */
  } finally {
    clearTimeout(timer)
  }

  // 3. signOut local do auth-js, com teto: avisa as outras abas (SIGNED_OUT) e limpa a memória do cliente.
  //    A sessão já foi revogada no passo 2, então ele não consegue renovar nada. Não dependemos dele para sair.
  try { await comTeto(supabase.auth.signOut({ scope: 'local' }), SAIR_DA_CONTA_LOCAL_TIMEOUT_MS) } catch { /* ignora */ }

  // 4. Apaga no navegador (de novo, imediatamente antes de sair da página) e navega DURO.
  apagarSessaoNoNavegador()
  window.location.replace(SAIR_DA_CONTA_DESTINO)
}

/** Sai da conta. Chamadas repetidas (duplo clique, dois botões) devolvem a mesma saída em curso. */
export function sairDaConta(): Promise<void> {
  if (!saidaEmCurso) {
    saidaEmCurso = executarSaida().catch(() => {
      // Último recurso: nunca deixar a pessoa presa na conta por erro inesperado.
      apagarSessaoNoNavegador()
      window.location.replace(SAIR_DA_CONTA_DESTINO)
    })
  }
  return saidaEmCurso
}
