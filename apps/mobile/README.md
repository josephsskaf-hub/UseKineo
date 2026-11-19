# Kineo Local

Protótipo Capacitor 7.6.10 para simulador. Os dois projetos nativos abrem a mesma origem de desenvolvimento em `http://localhost:3339/app-launch`. A sessão pertence à WebView. O login existente da Kineo pode ser usado dentro do protótipo. O navegador do computador tem sua própria sessão.

## Executar

1. No site, use a configuração pública de desenvolvimento habitual e inicie `npm run dev -- -H 127.0.0.1 -p 3339`.
2. Nesta pasta, execute `npm ci` e `npm run sync` para copiar o shell e gerar a configuração nativa. O build do site usa o pacote da raiz.
3. **Android** — JDK 21, SDK 35 e um AVD com WebView. Com o emulador aberto, execute `adb reverse tcp:3339 tcp:3339`, depois `npm run android` e selecione esse emulador. Para mais de um aparelho, use `adb -s <serial> reverse tcp:3339 tcp:3339`. O HTTP local no Android está limitado a localhost na variante debug.
4. **iPhone** — no Mac com Xcode, CocoaPods e um simulador, execute `npm run sync` e `npm run ios`. Inicie o servidor do site nesse mesmo Mac. O simulador alcança o loopback do host. O projeto usa ATS com exceção de rede local. O simulador dispensa inscrição paga na loja.
5. Dentro da janela do aplicativo, entre com uma conta existente, abra Studio, encerre e reabra. Confira que o ícone abre Studio enquanto a sessão estiver válida e volta à home após sair.

O identificador é `com.usekineo.prototype`. Nenhuma credencial de distribuição integra os projetos. A opção `server.url` é para desenvolvimento em loopback. A versão de loja requer decidir pagamentos, retorno do login externo e salvamento de mídia. Consulte o [estudo](../../docs/estudos-1911/APLICATIVO.md).
