# Plano — o GPT vira plugin até 11/12/2026 (KINEO-PAGINAS-IA-0111, parte b)

Escrito em 01/11/2026 (domingo), a partir de `memory/gpt-vira-plugin-ate-11-12.md`, `memory/conector-que-gera-video-2010.md` e
do código da main 85a82bbe9. Curto e executável: o que existe, o que falta, quem faz, e o que pode dar errado.

## Por que importa

- A OpenAI desliga os GPTs personalizados em **11/12/2026**. As ações próprias do nosso GPT (`createKineoHandoff`, `getKineoFacts`)
  **não migram**; o compartilhamento também não. O GPT "Kineo AI Video Maker" é privado desde 09/10 e nunca trouxe cliente.
- O ChatGPT é o canal que paga (8 de 11 pagantes vieram de lá — pela busca, não pelo GPT). O **plugin público** é o único jeito
  de a Kineo aparecer *dentro* do ChatGPT como ferramenta. Prazo duro, custo zero de mídia.

## O que já existe (conferido no código)

| Peça | Onde | Estado |
|---|---|---|
| Servidor MCP do plugin (sem login) | `app/api/mcp/chatgpt/route.ts` + `lib/mcp/kineoMcp.ts`, `chatgptContract.ts` | No ar. 2 ferramentas: `kineo_facts` (motores, durações, formatos — sem preço) e `create_video_handoff` (salva o roteiro aprovado e devolve link de 7 dias para o Studio). **Não renderiza.** Conta `mcp_initialized` / `mcp_tool_called` com `channel: chatgpt_plugin`. |
| Pacote do plugin 0.1.1 | `docs/chatgpt-plugin/package/` (`plugin.json`, `mcp.json`, ícone) | Enviado ao portal em **26/10 19:50 BRT — "Version 0.1.1 · In review"** (a 1.0.0 foi rejeitada em 21/10 só pela política de privacidade, já corrigida em 26/10). |
| Raiz sem OAuth para o plugin | `app/.well-known/oauth-protected-resource/route.ts` (404 na raiz), `KINEO-MCP-RAIZ-2610` | No ar. O portal parou de exigir o login do Studio para o `/api/mcp/chatgpt`. |
| Verificação de domínio | `app/.well-known/openai-apps-challenge/route.ts` | No ar. |
| Conector que GERA vídeo (OAuth na conta do cliente) | `app/api/mcp/studio/*` + `lib/mcp/studioMcp.ts`, `studioTools.ts`, `studioOauth*.ts`; interruptor `MCP_STUDIO_LIVE` (`lib/mcp/studioLaunch.ts`) | No ar para todos desde 20/10. Ferramentas `kineo_create_video` / `kineo_video_status` / `kineo_account` / `kineo_list_videos`, cobrando o crédito do próprio cliente. Provado no Claude e no ChatGPT como **servidor MCP personalizado** (fora de diretório/loja). |
| Servidor do diretório do Claude | `app/api/mcp/route.ts` | Só roteiro (o diretório recusa mídia gerada). Intocado. |
| Página/tutorial | `app/claude-connector/` (com `StudioSection.tsx`) | No ar; precisa da versão ChatGPT do tutorial (pendência de 21/10). |
| Instruções do GPT | `docs/GPT-INSTRUCOES-V3-COLAR-2026-09-24.txt` | Viram a "skill" do plugin na migração. |

## O que falta

1. **Saber o resultado da revisão da 0.1.1** (enviada há 6 dias). Não há registro no repositório depois de 26/10.
2. **Publicar** a 0.1.1 assim que aprovada (botão "Publish plugin" no portal — só o fundador).
3. **Decidir o destino do GPT privado**: com o plugin publicado, o GPT não faz falta; não clicar em "Migrar" antes disso (a
   migração automática não leva as ações e pode criar um segundo app concorrendo com o nosso).
4. **Versão 0.2 do plugin (depois da aprovação, uma revisão ativa por vez)**: nome mais amplo ("Kineo AI Video" — sem prometer
   render enquanto as ferramentas só salvam roteiro), descrição que diga o que acontece no clique (o link abre o Studio com o
   roteiro; o 1º filme curto é grátis — texto lido de `lib/freeTierOffer.ts`, nunca digitado no pacote).
5. **Medir**: painel com `mcp_initialized`/`mcp_tool_called` do canal `chatgpt_plugin` → `handoff aberto` → cadastro → 1º filme.
   Sem isso, "ninguém usa" e "usam e não convertem" são o mesmo zero.
6. **Tutorial ChatGPT do conector que gera vídeo** (o caminho de quem já paga e quer gerar dentro do ChatGPT) e as 3 pendências de
   21/10: título do `kineo_create_video` volta em branco; consentimento manda revogar "no Claude" mesmo vindo do ChatGPT; teste do
   estorno quando o render falha.
7. **ChatGPT Business (workspace "Kineo", 2 assentos, pago até 07/11)**: ninguém usa. Decidir **antes de 07/11** se cancela ou fica
   com 1 assento (só ficar se o portal exigir o workspace para manter o plugin — conferir no portal).

## Passos com dono e data

| # | Quando | Dono | Passo | Pronto quando |
|---|---|---|---|---|
| 1 | até 03/11 | Fundador | Abrir platform.openai.com → Plugins → "Kineo Script Studio" e dizer o status da 0.1.1 (aprovada / rejeitada + motivo). | Status no chat. |
| 2 | até 05/11 | Claude | Conferir no portal (pelo Chrome do fundador) se o plugin depende do workspace Business; escrever a recomendação cancela × 1 assento. | Recomendação com o print. |
| 3 | até 06/11 | Fundador | Cancelar o Business ou reduzir para 1 assento (dinheiro saindo/entrando = decisão dele). | Feito antes da renovação de 07/11. |
| 4 | no dia da aprovação | Fundador | Clicar "Publish plugin". | Plugin visível na loja. |
| 4b | se rejeitada | Claude | Corrigir o motivo no código/pacote em worktree limpa, testar o MCP (`tools/list`, as 2 ferramentas) e preparar a 0.1.2 para reenvio. | Pacote novo + roteiro de clique. |
| 5 | até 10/11 | Claude | Painel do canal plugin (eventos acima, por dia) no `/admin` + guardião. | Cartão no admin. |
| 6 | até 15/11 | Claude | Pacote 0.2 (nome amplo honesto, descrição, 5+3 casos de teste novos, release notes) — só depois da 0.1.1 publicada. | Pacote em `docs/chatgpt-plugin/package`. |
| 7 | até 17/11 | Fundador | Enviar a 0.2 no portal (Submit). | "In review". |
| 8 | até 20/11 | Claude | Consertar as 3 pendências do conector que gera vídeo + tutorial ChatGPT na `/claude-connector` (ou página irmã). | Guardião verde + página no ar. |
| 9 | até 01/12 | Fundador | Só com o plugin público no ar: remover/arquivar o GPT privado (não migrar). | GPT fora; plugin no lugar. |
| 10 | 11/12 | — | Prazo da OpenAI. Folga planejada: 10 dias. | — |

## Riscos e o que fazer

- **Revisão demora ou rejeita de novo** (a 1ª levou ~16 dias). Mitigação: reenviar no mesmo dia da resposta; a folga de 10 dias
  existe para isso. Se em 25/11 não houver plugin aprovado, o que o cliente perde é só o GPT privado — que não traz ninguém.
- **Nome "Video Maker" lido como enganoso** enquanto as ferramentas do plugin só salvam roteiro. Mitigação: nome amplo e descrição
  exata; ferramenta que renderiza continua só no conector com OAuth (`/api/mcp/studio`), nunca no servidor do plugin.
- **Gerar vídeo dentro do plugin público** exigiria OAuth no plugin e passaria por revisão de mídia gerada. Fora do escopo até 11/12;
  reavaliar em 2027 com números do painel.
- **Workspace Business cancelado quebrar o plugin**: conferir no portal ANTES de cancelar (passo 2).
- **Texto com preço digitado no pacote** envelhece em silêncio (já aconteceu no site). Mitigação: o pacote não cita preço; o
  `kineo_facts` não devolve preço (regra do `chatgptContract.ts`).
- **Clique na "Migração" automática** do GPT pode criar um app paralelo e confundir a revisão. Mitigação: não migrar; arquivar o GPT
  só depois do plugin público.

## O que o fundador precisa saber

- Nada para "migrar": o plugin próprio já existe e está em revisão desde 26/10. Falta saber se foi aprovado e apertar Publicar.
- Há uma decisão de dinheiro com prazo: o ChatGPT Business renova em **07/11** e ninguém usa.
- O conector que gera vídeo dentro do Claude/ChatGPT já funciona para quem adiciona por URL; o plugin da loja é a vitrine que leva
  gente até a Kineo.
