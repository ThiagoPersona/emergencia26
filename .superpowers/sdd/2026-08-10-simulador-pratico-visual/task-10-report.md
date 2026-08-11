# Task 10 - Auditoria Integrada do Simulador Pratico TEME

## Escopo executado

- Checkout auditado: `C:\Projetos\Emergencia\.worktrees\simulador-pratico-visual`.
- Branch: `feature/simulador-pratico-visual`.
- Base confirmada: `cbb2906`.
- O backend em `C:\Projetos\HistorIA-Med-teme-practice-v2` nao foi alterado.
- O acervo nao rastreado `Praticas/` nao foi lido nem adicionado ao Git.
- Nao houve deploy, push ou merge.

## Falha encontrada e correcao

O workflow `.github/workflows/pages-intensivao.yml` copiava o diretorio
`Intensivao/praticas`, mas nao o acervo local
`Intensivao/assets/praticas`. Assim, imagens, videos, posters, miniaturas,
manifesto e atribuicoes do simulador ficariam ausentes no GitHub Pages.

Foi adicionado o diretorio de destino e a copia recursiva de
`Intensivao/assets/praticas/.` para as duas rotas publicadas:

- `site/assets/praticas/`
- `site/Intensivao/assets/praticas/`

O teste de regressao foi escrito e executado antes da correcao. Ele falhou
pela ausencia dessas copias e passou apos a alteracao.

## Arquivos alterados

- `.github/workflows/pages-intensivao.yml`: publica todo o acervo de midia
  pratica nas duas rotas do Pages.
- `Intensivao/tests/pages-workflow.test.js`: cobre a copia recursiva do acervo
  local nas duas rotas.
- `Intensivao/PRATICAS.md`: atualiza o banco para 30 estacoes v2 e descreve os
  modos prova, treino dirigido e revisao.
- `Intensivao/praticas/SIMULADOR.md`: documenta as 30 estacoes, o checklist de
  100 pontos e os tres modos do simulador.
- `.superpowers/sdd/2026-08-10-simulador-pratico-visual/task-10-report.md`:
  este relatorio.

## Auditorias automatizadas

Uma auditoria Node independente confirmou:

- 30 entradas no indice e 30 arquivos de estacao.
- 21 itens de midia com arquivos locais existentes e nao vazios.
- Tipos de midia publicados: `.jpg`, `.mp4`, `.svg` e `.webp`.
- Nenhum caminho remoto em `src`, `thumbnail` ou `poster`.
- Atribuicao, fonte HTTPS e licenca HTTPS para cada item do manifesto.
- Nenhum ID de midia ausente nas fases das estacoes.
- Todos os checklists totalizam exatamente 100 pontos.
- Nenhum nome dos cursos Talks ou Eagles nas estacoes publicadas.
- O workflow contem as duas copias recursivas requeridas para o acervo.

As validacoes existentes tambem cobrem contrato visual v2, caminhos relativos
seguros, referencias locais resolviveis, ausencia de midia remota no manifesto
e preservacao dos checklists historicos.

## Testes e verificacoes

Executados apos a correcao:

```powershell
node --test Intensivao/tests/pages-workflow.test.js
node --test Intensivao/tests/*.test.js
```

Resultado da suite completa: 98 testes aprovados, 0 falhas.

Tambem executado sem apontamentos:

```powershell
git diff --check
```

## Preocupacoes e limites

- A verificacao visual interativa em desktop e mobile, incluindo fluxo completo
  de prova e cenarios degradados, fica para o controlador conforme a tarefa.
- Nao houve smoke test HTTP nem inicio de servidor local, pois a auditoria desta
  tarefa encontrou uma falha de publicacao estatica e a verificacao visual foi
  expressamente delegada.
- O deploy do Pages continua fora do escopo desta tarefa; a correcao sera
  efetiva quando o workflow rodar na branch publicada.
