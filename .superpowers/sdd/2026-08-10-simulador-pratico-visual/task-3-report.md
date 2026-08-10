# Relatorio Task 3

## Status

Concluida.

## Implementacao

- Criado `Intensivao/praticas-session.js` como modulo UMD puro.
- Implementadas criacao, inicio idempotente, progressao limitada, acao primaria, relogio, serializacao allowlist e restauracao validada.
- `praticas-app.js` delega os quatro wrappers legados ao modulo quando disponivel e preserva os fallbacks existentes.
- Cobertos modos `exam`, `directed` e `review`, com `directed` como padrao.

## TDD

- RED: os testes novos falharam pela ausencia do modulo e do novo campo `mode` no wrapper.
- GREEN: a implementacao minima fez os testes especificos passarem.
- REFACTOR: mantida a logica pura no modulo e a compatibilidade das assinaturas antigas do app.

## Testes

- `node --test Intensivao/tests/praticas-session.test.js Intensivao/tests/praticas-app.test.js`: 15/15 aprovados.
- `node --test Intensivao/tests/*.test.js`: 43/43 aprovados.
- `git diff --check`: aprovado.
- UMD verificado no Node e no global `TemePracticeSession`.

## Arquivos alterados

- `Intensivao/praticas-session.js`
- `Intensivao/tests/praticas-session.test.js`
- `Intensivao/praticas-app.js`
- `Intensivao/tests/praticas-app.test.js`
- `.superpowers/sdd/2026-08-10-simulador-pratico-visual/task-3-report.md`

## Escopo

- `Praticas/` nao foi alterado.
- Nenhum conteudo de estacao, CSS, DOM, `localStorage`, timer real ou gravacao foi adicionado ao modulo.
