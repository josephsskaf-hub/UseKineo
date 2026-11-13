// KINEO-VIDEO-COM-PRIMEIRO-QUADRO-1311 [dono 13/11 05:49, pelo celular, depois de achar os Recreates dele: "deu certo, agora só seria bom já
// deixar eles pré-carregados e não apagados"] — no iPhone, um <video preload="metadata"> SEM capa aparece como um retângulo preto até a pessoa
// tocar no play: o Safari do celular lê os metadados e não desenha quadro nenhum. Os Recreates e clipes não têm capa (a `image_url` da linha é a
// FOTO DO ROSTO que a pessoa enviou, não um quadro do vídeo). O fragmento `#t=0.1` no endereço manda o navegador posicionar o vídeo em 0,1 s, e
// para isso ele baixa e desenha esse quadro: o vídeo já aparece "aceso", sem tocar sozinho e sem baixar o arquivo inteiro.
// ⚠️ Só para o `src` do <video>. O link de download continua com o endereço limpo.
export function comPrimeiroQuadro(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  return url.includes('#') ? url : `${url}#t=0.1`
}
