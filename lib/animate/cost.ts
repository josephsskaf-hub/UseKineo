// sprint-assinaturas #12 — o custo do clipe do /animate morava em
// lib/animate/service.ts, que importa node:crypto + supabase admin e por isso
// NAO pode entrar num componente cliente. O AnimateClient repetia "5 credits"
// a mao (com o comentario "matches ANIMATE_COST" como unica garantia). Agora
// o numero tem UMA casa, sem dependencia de servidor, e a tela deriva dele.
export const ANIMATE_COST = 5
