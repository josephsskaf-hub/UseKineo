# Refinamento de entrega e revisão — 29/09/2026

Base: `241d4635`. Escopo autorizado pelo fundador: as cinco propostas de refinamento aprovadas nesta conversa.

- **FATO CONFIRMADO / IMPLEMENTADO:** Library apresenta o desfecho real do helper de download, inclusive no botão HD já concluído. Apenas `blob` dispara confirmação de início; bloqueio, abertura em outra aba e indisponibilidade recebem mensagens próprias. Fonte: `lib/ui/deliveryRefinement.ts:3`, `app/(dashboard)/history/HistoryClient.tsx:720`.
- **FATO CONFIRMADO / IMPLEMENTADO:** original/aprimorado compartilham a seleção entre card, player e download. O controle só aparece quando já existe um arquivo aprimorado. Fonte: `components/DeliveryControls.tsx:7`, `lib/ui/deliveryRefinement.ts:16`.
- **FATO CONFIRMADO / IMPLEMENTADO:** título completo acessível sem iniciar reprodução e diálogo de cópia manual quando a API de clipboard falha ou não existe. Fonte: `components/DeliveryControls.tsx:16`.
- **FATO CONFIRMADO / IMPLEMENTADO:** os dois modos de Ads comparam o plano atual ao último plano gerado com sucesso nesta sessão. A memória desaparece ao reiniciar a sessão; não constitui histórico persistente. Fonte: `components/AdsPlanChanges.tsx:8` e suas integrações em `AdsV2Client.tsx` / `AdsV2Simple.tsx`.
- **FATO CONFIRMADO / IMPLEMENTADO:** controles usam variáveis existentes de tema; as novas mensagens seguem `refinementCopy.json` nos 16 idiomas. Nenhuma alteração em API, cobrança ou geração. Fonte: `app/appearance.css` (bloco Delivery clarity), `lib/ui/refinementCopy.json` e diff contra a base.

## Verificação em 29/09/2026

- **TESTADO LOCALMENTE:** `test-delivery-refinement.mjs`: 162 verificações offline, incluindo clipboard negado/ausente e todos os desfechos dos dois caminhos de download.
- **TESTADO LOCALMENTE:** Library visual gallery: 20 verificações; Ads v2 tela: 67; Ads modo simples: 118; Ads simples acabamento: 63. Nenhuma falha. O log de erro de `/plan` no guardião de modo simples pertence ao cenário negativo com fornecedores falsos.
- **TESTADO LOCALMENTE:** `npx tsc --noEmit --incremental false` e `git diff --check` passaram.
- **FATO CONFIRMADO:** guardiões reancorados apenas para os controles aprovados e import do componente de comparação. Os payloads e ações comerciais existentes permanecem protegidos.
- **FATO CONFIRMADO:** comparação autocontida gerada de JSX real em `C:/Users/josep/Documents/Codex/2026-09-21/kineo-ux-ui/outputs/delivery-refinement-20260929/antes-depois.html`. Inclui Library, player, cópia manual, Ads simples/completo, desktop/mobile e light/dark. Dados fictícios, sem geração nem compra. Reprodutor: `scripts/preview-delivery-refinement.mjs`.
- **QUESTÃO PENDENTE / DESCONHECIDO:** inspeção visual automática da prévia local: bloqueada pela política de URLs do navegador. O HTML foi entregue para visualização no Codex. Cenários de bloqueio de clipboard e refação de Ads foram verificados offline, não provocados em produção.
