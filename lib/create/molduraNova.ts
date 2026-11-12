// KINEO-LIBRARY-MOLDURA-NOVA-1211 [fundador 12/11: "a Library está voltando no fluxo antigo"] — quais telas de app/(dashboard) abrem na
// moldura da tela nova (cabeçalho da CreateShell, sem a lateral antiga). Hoje só a /library (opção B da foto div1-library-decisao-ABC.png);
// as outras seguem na casca de sempre até a decisão do dono sobre a C. Módulo puro (sem import).

export const MOLDURA_TOPO_ROTAS: readonly string[] = ['/library']

/** A rota mora na moldura nova (sem a lateral antiga)? */
export function usaMolduraNova(pathname: string): boolean {
  return MOLDURA_TOPO_ROTAS.some((r) => pathname === r || pathname.startsWith(r + '/'))
}
