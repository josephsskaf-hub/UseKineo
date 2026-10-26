**FATO CONFIRMADO · TESTADO LOCALMENTE — 2026-10-26.** Inventário completo dos 1014 scripts históricos scripts/test-*.mjs: 852 verdes; 162 vermelhos reproduzidos na base 62213b00, sem asserção adicional após normalizar apenas caminhos, posições de stack e horários. Resultado por arquivo e assinatura em [historical-suite.json](./historical-suite.json); os vermelhos estão em [historical-reds.json](./historical-reds.json).

**FATO CONFIRMADO.** A comparação da main foi executada para todos os vermelhos da candidata; a main inteira não foi necessária. Foram concluídos 130 replays de impacto em árvores isoladas. As classes registram asserção, helper/fixture/dependência ou bloqueio offline; não diagnosticam o estado da produção.

**FATO CONFIRMADO.** Nenhum conteúdo de .env foi lido; os processos dos testes receberam ambiente sem credenciais, bloqueio de rede JavaScript e Git restrito ao transporte de arquivo. Não houve render pago nem acesso a dados de produção nesta validação.

**FATO CONFIRMADO · TESTADO LOCALMENTE.** Os dois scripts novos também passaram: 205 verificações da vitrine e 324 do desfaz exato em memória. O conjunto executado tem 1016 scripts únicos: 854 verdes e 162 vermelhos preexistentes. Os comprovantes dos dois scripts estão no mesmo inventário JSON.

**FATO CONFIRMADO.** A auditoria completa dos vermelhos preserva mensagens, motivos e contagens de falha. As únicas diferenças restantes são duas contagens verdes de arquivos/rotas adicionais e a apresentação de um caminho temporário/PID no erro de compilação de um fixture. O diagnóstico decodificado desse compilador é idêntico nos dois lados (TS2307, dependência ausente no fixture); o JSON registra a conferência.


**QUESTÃO PENDENTE / DESCONHECIDO.** A execução offline não mede exposição, indexação, consentimentos de clientes externos ou aquisição. Esses resultados dependem da publicação autorizada e de uso real.
