# Menu de conta · volta 1

**FATO CONFIRMADO · 23/11/2026.** Um 503 guardava o resultado vazio durante a visita em `components/billing/useVisibleAccountOffer.ts`. A próxima superfície visível reaproveitava o vazio. Respostas HTTP inválidas e falhas de rede agora liberam a leitura seguinte. Uma resposta válida com `show: false` segue em cache.

**TESTADO LOCALMENTE.** O guardião monta a barra de preços e a engrenagem reais. Após um 503, a segunda superfície consulta uma vez e mostra a recarga ao assinante. Quando ambas entram visíveis juntas, compartilham o GET. Uma conta inelegível consulta uma vez e permanece sem recarga. Falha de rede e resposta inválida também permitem recuperar na próxima abertura.

**SUGESTÃO.** Após a liberação para a casa, abrir /pricing e Settings com um assinante, repetir com a conta grátis e conferir um evento por superfície que de fato ficou visível. O teste de erro usa rede simulada local. O HTML de comparação mantém as imagens aceitas no primeiro parecer, pois o estado normal da tela permanece igual.
