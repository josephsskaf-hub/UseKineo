// KINEO-MENU-CONFIG-1811 [dono 18/11: botão de configurações na página e capas cortadas] — as trocas INTENCIONAIS no RecreateClient desta obra
// (import do botão, foco de 9 capas, "My videos" do cabeçalho vira o botão de configurações). O guardião test-clip-recreate-juntos-1511 (B5) as aplica
// DEPOIS das de 16/11: cada troca tem de achar alvo ÚNICO, e qualquer outra diferença no RecreateClient continua vermelha. Gerado do diff real.
export const TROCAS_MENU_CONFIG_1811 = [
 [
  "import Link from 'next/link'",
  "import SiteSettingsMenu from '@/components/SiteSettingsMenu'\nimport Link from 'next/link'"
 ],
 [
  "export const FOCO_DA_CAPA: Readonly<Record<string, string>> = { basquete: '50% 30%', 'cachorro-craque-humano': '50% 8%', 'invasor-de-campo': '50% 25%' }",
  "export const FOCO_DA_CAPA: Readonly<Record<string, string>> = {\n  basquete: '50% 30%',\n  'cachorro-craque-humano': '50% 8%',\n  'invasor-de-campo': '50% 25%',\n  'sueter-aconchegante': '50% 12%',\n  'escolha-o-favorito': '50% 9%',\n  'selfie-confete': '50% 28%',\n  'effect-cinematic-slowmo': '50% 22%',\n  'effect-restore-old-photo': '50% 23%',\n  'effect-color-burst': '50% 16%',\n  'effect-wings': '50% 16%',\n  'effect-kiss': '50% 20%',\n  'effect-pet-lion': '50% 0%',\n}"
 ],
 [
  "{createTabs ? <CreateNavConta /> : <Link href=\"/library\">My videos ↗</Link>}</header>",
  "{createTabs ? <CreateNavConta /> : <SiteSettingsMenu signedIn={signedIn} />}</header>"
 ]
]
export function comMenuConfig1811(fonte) {
  return TROCAS_MENU_CONFIG_1811.reduce((t, [de, para]) => { if (t.split(de).length !== 2) throw new Error('MENU-CONFIG-1811 sem alvo único: ' + de.slice(0, 80)); return t.replace(de, () => para) }, fonte)
}
