# Provas do aplicativo · 19/11/2026

[Ver navegador e aplicativo lado a lado em 390 e 1920 px](APLICATIVO-COMPARACAO.html). A comparação contém as fotografias e abre localmente sem servidor.

| Percurso | Resultado e limite |
|---|---|
| Instalação da PWA | **TESTADO LOCALMENTE.** O Chrome instalou a aplicação a partir do manifesto servido pelo Next, registrou o app no perfil de teste e o iniciou pelo identificador `/`. O destino final foi a home do visitante, com `display-mode: standalone` confirmado no documento. Quatro capturas em dois temas e duas larguras. O navegador era Chrome no Windows, inclusive na captura estreita. |
| Convite | **TESTADO LOCALMENTE.** Em 390 px com perfil móvel de iPhone emulado, o toque mostrou as instruções do Safari. Após o X e uma recarga, o convite continuou fechado. No desktop ficou oculto. No perfil Android, um evento controlado chamou o prompt uma vez mediante toque. A decisão de disparar o evento em um Android físico continua a cargo do Chrome. |
| Sessão e cache | **TESTADO LOCALMENTE.** O guardião executa o GET real com dois retornos controlados de auth.getUser. Usuário válido recebe 307 para Studio; visitante recebe 307 para home. As respostas são privadas, variam por cookie e têm no-store. Na instalação real, o GET também retornou 307. O service worker preexistente continua dedicado a push, sem cache de mídia, página ou API. |
| Android | **TESTADO LOCALMENTE.** APK debug compilado com JDK 21 e SDK 35, instalado via adb em AVD API 35 x86_64, conectado ao Next local via adb reverse. Inicialização real até a home. Detectei sobreposição da barra do sistema, ativei o ajuste de margens e fotografei o APK recompilado em um segundo AVD. A janela de login foi aberta no primeiro. |
| Studio com conta real | **QUESTÃO PENDENTE.** O emulador usa uma sessão independente do navegador. Sem autenticação confirmada no protótipo, a prova de redirecionamento do guardião não comprova Studio logado no aparelho. |
| iOS | **IMPLEMENTADO.** Projeto Xcode e dependências gerados e sincronizados pelo Capacitor. **BLOQUEADO neste Windows.** CocoaPods, Xcode e o Simulator de iPhone não estão disponíveis. O passo de compilação e a captura instalada em iPhone exigem um Mac. |
| Produção | **QUESTÃO PENDENTE.** Revisão e eventual publicação pertencem à CEO. Sem conta criada, compra, envio a loja ou emissão de push. |

## O que exige trabalho no embrulho

No segundo AVD, o mesmo APK recebeu uma página local de ensaio com quatro controles, isolada da conta. A prova exercita a ponte Android; o ensaio de cliente autenticado com um vídeo do próprio cliente ainda falta.

- **Foto · TESTADO LOCALMENTE.** Um input `type=file accept=image/*` abriu o seletor de fotos do Android. Escolhi um PNG da marca e o campo recebeu um arquivo. A prova vai até a seleção, sem enviar foto de cliente a servidor. O Capacitor implementa o seletor em `BridgeWebChromeClient.onShowFileChooser`.
- **MP4 · TESTADO LOCALMENTE.** Repeti com um MP4 local o mecanismo usado pela Library em `app/(dashboard)/library/LibraryClient.tsx`: fetch, Blob, URL temporária e link com download acionado por clique. O clique ocorreu; o arquivo não apareceu na pasta Downloads do emulador. **SUGESTÃO** · implementar exportação para MediaStore/folha de compartilhamento e conferir nome e bytes no arquivo final. No iPhone, validar a exportação para Arquivos.
- **Google · TESTADO LOCALMENTE até a saída.** Um link ao domínio de contas produziu um intent VIEW externo no Android. **FATO CONFIRMADO** · `components/GoogleSignInButton.tsx` usa o callback web, e o protótipo não registra retorno nativo de OAuth. O teste não fechou um login Google real. Usar navegador do sistema com callback verificado para a WebView, ou uma integração nativa aprovada. [Política OAuth](https://developers.google.com/identity/protocols/oauth2/policies#browsers)
- **Stripe · TESTADO LOCALMENTE até a saída.** Um link à raiz pública do domínio do checkout também gerou intent VIEW externo. Nenhuma sessão de compra foi criada. A abertura de link não confirma pagamento, retorno à conta ou conformidade com as lojas. **SUGESTÃO** · decidir o modelo de compra antes de incluir esse percurso na versão de loja.

O Android de laboratório entrega intents externos ao navegador WebView Shell da imagem AOSP. Em celulares comerciais, o aplicativo escolhido para abrir o intent depende do sistema. As provas de upload, download e destinos externos acima são exclusivas do Android.
