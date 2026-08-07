# GO-LIVE DO REVERSE TRIAL — checklist de ligamento

Status em 06/08/2026 20:50 (horario local do fundador).

Autorizacao do fundador nesta sessao: "pode ligar o codigo novo! voce tem meu OK".
O ligamento NAO foi executado porque o QA adversarial (docs/QA-REVERSE-TRIAL-2026-08-07.md,
commit a4d73dd) reprovou com 3 bloqueadores. Os 3 foram corrigidos no commit 6dfad6a.
Este arquivo e a unica fonte da ordem de ligamento.

## O que ja esta em producao (flag OFF, comportamento identico ao de antes)

- ec9f112 e anteriores: nucleo da fase 2, e-mails D0-D10, troca atomica de copy,
  fix do Post to Earn, anti-abuso, primeiro minuto pago.
- QA confirmou ZERO regressao no ar: 8 rotas 200, copy do free tier intacta,
  nenhum caminho novo executado em 961 perfis (any_trial=0, fp_rows=0, trial_events=0).

## Represados (precisam de push antes de ligar)

- a4d73dd — relatorio de QA
- 6dfad6a — correcao dos 3 bloqueadores

## Ordem de ligamento (NAO pular passo, NAO inverter)

1. Push dos 2 commits represados e deploy verde na Vercel (deploy READY com o SHA 6dfad6a).
2. Fundador cria a variavel de ambiente na Vercel, projeto `kineo`, ambiente Production:
   - Nome: `KINEO_TRIAL_FINGERPRINT_SALT`
   - Valor: string aleatoria de 64 caracteres hex (gerar nova; nunca reutilizar de outro
     ambiente). Sem ela o anti-abuso concede trial a todo mundo — agora com aviso vermelho
     em /admin/trial-abuse e evento `trial_fingerprint_salt_missing`, mas ainda concedendo.
   - Caminho: vercel.com -> projeto kineo -> Settings -> Environment Variables -> Add New
     -> marcar Production -> Save.
3. So depois, no mesmo lugar, criar/editar:
   - Nome: `KINEO_REVERSE_TRIAL_ENABLED`
   - Valor: `true`
   - Production.
4. Redeploy (a flag e lida no build das paginas estaticas — sem redeploy a copy nova nao sai).
5. Reteste fim a fim em producao, com conta NOVA de verdade (o QA nao conseguiu executar
   isto: o `.env.local` da raiz e stub). Roteiro minimo:
   - criar conta nova -> conferir no /admin/trial-abuse ou no banco: trial_status='active',
     40 creditos concedidos UMA vez, trial_ends_at coerente com a variante;
   - gerar 1 Fast -> tem que sair SEM marca d'agua, SEM corte de 15s, e sem consumir cota free;
   - gerar 1 Seedance -> tem que ENTREGAR (era exatamente aqui que o QA achou o "cobra e nao
     entrega": debitava 20 creditos e devolvia 402);
   - tentar Veo/Kling -> tem que dar 402 com a mensagem de Studio;
   - conferir que a copy publica nao promete mais "3 free Shorts every 24h".
6. Se qualquer passo do 5 falhar: voltar `KINEO_REVERSE_TRIAL_ENABLED` para `false` e
   redeploy. O rollback e essa unica variavel — nenhum dado precisa ser desfeito.
7. So depois de 5 verde: liberar o TAAFT $347 (gate de trafego pago do bloco de
   DECISOES FINAIS em docs/ORDENS-AQUISICAO-2026-08-02.md).

## Pendencias conhecidas que NAO impedem ligar

- 480p do free tier residual: o builder do Creatomate e 1080x1920 fixo, sem knob.
  Com a flag ON o free residual sai 1 Fast/30d + 15s + marca d'agua, mas em 1080p.
- E-mail de boas-vindas do plano PAGO nao existe (webhook nao manda nada). Item seguinte.
- Comprador de pacote avulso pode tomar 402 em Seedance ja pago — divida anterior ao trial.
- Post to Earn: link colado so vira credito automatico com `YOUTUBE_API_KEY` no ambiente;
  sem ela o claim fica `pending` para revisao manual (copy publica ja diz "reviewed within 24h").

## Regra que vale mais que o cronograma

O QA reprovou depois de o fundador ter autorizado ligar. Manter essa ordem: autorizacao do
fundador libera o RISCO DE NEGOCIO, nao substitui a verificacao tecnica. Ligar sem o passo 5
seria entregar ao cliente novo exatamente a tela que mente que passamos a semana consertando.

## Nota 23h — deploy nao disparou

O push de 4b0de92 chegou ao GitHub (git ls-remote confirma) mas a Vercel NAO abriu build:
o ultimo deploy de producao continua ec9f112, de 2h antes. As duas variaveis de ambiente ja
estao criadas (KINEO_REVERSE_TRIAL_ENABLED=true e KINEO_TRIAL_FINGERPRINT_SALT), ou seja o
PROXIMO deploy liga o trial.

POR ISSO, REGRA DESTA JANELA: NAO clicar em "Redeploy" num deploy antigo. Redeploy reconstroi
O MESMO COMMIT (ec9f112), que NAO contem as correcoes dos 3 bloqueadores do QA (6dfad6a) —
seria ligar o trial exatamente na versao que cobra e nao entrega. O deploy tem que ser do
HEAD atual. Este commit existe para forcar um push novo e testar se o webhook do GitHub
volta a disparar.
