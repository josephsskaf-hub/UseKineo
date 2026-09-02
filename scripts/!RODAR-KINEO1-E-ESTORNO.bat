@echo off
setlocal
cd /d "%~dp0.."
echo ===== TESTES + TYPECHECK + COMMIT + FILA =====
echo.
echo [1/5] teste do Kineo 1 (cinema)
node scripts\test-kineo1-cinema-2026-09-02.mjs
if errorlevel 1 goto :falhou
echo.
echo [2/5] teste do estorno explicado / ordem do debito
node scripts\test-estorno-explicado-2026-09-02.mjs
if errorlevel 1 goto :falhou
echo.
echo [3/5] typecheck (demora ~1 min; erros conhecidos: acacia x2, TrialDowngradeModal)
node "..\..\..\node_modules\typescript\bin\tsc" --noEmit -p tsconfig.json 2>&1 | findstr /C:"error TS" | findstr /V /C:"acacia" | findstr /V /C:"TrialDowngradeModal"
echo (se nada apareceu acima, o typecheck esta limpo)
echo.
echo [4/5] commit
git add -A
git commit -m "estorno explicado + debito depois da trava de narracao (caso albertopopacristian, TAAFT, conta com 62s de vida: pediu 60s com 40s de fala, o guard recusou DEPOIS de debitar - 25cr debitados, teto do trial somado, trial_expired por credit_cap, estorno e revive em 1 segundo, e a tela nunca disse que o credito voltou; ele foi ver o preco e sumiu): o debito adiantado sai de antes da trava para depois dela (mesmo `cost`, so a ordem muda), entao recusa didatica nao toca em credito - sem debito, sem estorno, sem trial_expired; narration_guard_blocked para de carimbar refunded:true chumbado e passa a dizer se houve cobranca; a tela de roteiro curto ganha a linha verde 'seus N creditos voltaram, nada foi cobrado, um clique renderiza', so na recusa real do servidor; 21 verificacoes; handoff 160"
echo.
echo [5/5] enfileirar
bash scripts/enfileirar.sh
echo.
echo ===== PRONTO - agora clique no SUBIR-SITE.bat da raiz =====
pause
exit /b 0

:falhou
echo.
echo !!! UM TESTE FALHOU - nada foi commitado. Mande o print para o Claude.
pause
exit /b 1
