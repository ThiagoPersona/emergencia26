# Relatorio Task 2

## Status

Concluida, com fix de Round 1.

## Commit

- `Adiciona catálogo de estações práticas`
- `Corrige filtros vazios do catálogo`

## Testes

- RED: `node --test Intensivao/tests/praticas-catalog.test.js` falhou pela ausencia inicial do modulo.
- GREEN: `node --test Intensivao/tests/praticas-catalog.test.js`: 6/6 aprovados.
- RED do Round 1: o novo caso para `domain`, `difficulty` e `tag` vazios falhou com resultado vazio.
- GREEN do Round 1: `node --test Intensivao/tests/praticas-catalog.test.js`: 7/7 aprovados.
- Suíte completa: `node --test Intensivao/tests/*.test.js`: 34/34 aprovados.
- `git diff --check`: aprovado.
- UMD verificado em Node e no global `TemePracticeCatalog`.

## Arquivos alterados

- `Intensivao/praticas-catalog.js`
- `Intensivao/tests/praticas-catalog.test.js`
- `.superpowers/sdd/2026-08-10-simulador-pratico-visual/task-2-report.md`

## Preocupacoes

- Nenhuma preocupacao funcional identificada.
- `Praticas/` nao foi alterado.
