# Tema Gestão Em Emergência Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar um tema completo de Gestão do Departamento de Emergência com banco próprio de 15 questões oficiais.

**Architecture:** Manter a arquitetura Docsify/Markdown existente. O conteúdo didático ficará em `temas/026_...md`, o treino em `provas/026_...md`, e os índices continuarão sendo a fonte de navegação e do painel de desempenho.

**Tech Stack:** Markdown, HTML embutido nos quizzes, Docsify, Mermaid e testes Node.js.

## Global Constraints

- Todo o texto visível deve permanecer em português do Brasil.
- Não alterar conteúdo clínico ou gabaritos das questões movidas.
- O total geral deve permanecer em 632 cards.
- Usar referências oficiais e conteúdo reescrito, sem transcrição longa dos livros.

---

### Task 1: Testes de integração do novo tema

**Files:**
- Modify: `Intensivao/tests/pages-workflow.test.js`

**Interfaces:**
- Consumes: estrutura Markdown atual e links relativos do Docsify.
- Produces: testes de presença, contagem e redistribuição dos cards.

- [ ] Escrever testes que exijam o capítulo 026, a linha em `PROVAS.md`, a entrada na sidebar, 15 cards em Gestão, 14 no tema 17 e total declarado de 632.
- [ ] Executar `node --test Intensivao/tests/pages-workflow.test.js` e confirmar falha pela ausência do tema.

### Task 2: Capítulo e banco de Gestão

**Files:**
- Create: `Intensivao/temas/026_gestao-departamento-emergencia.md`
- Create: `Intensivao/provas/026_gestao-departamento-emergencia.md`
- Modify: `Intensivao/provas/017_paliativos-vulnerabilidades-etica-gestao.md`

**Interfaces:**
- Consumes: padrão de capítulos e cards existente.
- Produces: capítulo estudável isoladamente e banco com 15 cards.

- [ ] Redigir o capítulo completo conforme o design.
- [ ] Mover os 15 cards definidos na especificação para o novo arquivo, preservando seus atributos e justificativas.
- [ ] Renumerar apenas a apresentação sequencial dos cards; manter a fonte oficial visível.
- [ ] Executar o teste focado e corrigir qualquer erro de contagem.

### Task 3: Índices e resumo integrado

**Files:**
- Modify: `Intensivao/temas/017_paliativos-vulnerabilidades-etica-gestao.md`
- Modify: `Intensivao/LEITURA_OFICIAL.md`
- Modify: `Intensivao/_sidebar.md`
- Modify: `Intensivao/index-online-sidebar.md`
- Modify: `Intensivao/PROVAS.md`
- Modify: `Intensivao/INTENSIVAO.md`
- Modify: `Intensivao/MAPA_DE_QUESTOES_TEME22-26.md`

**Interfaces:**
- Consumes: capítulo e banco criados na Task 2.
- Produces: navegação, dashboard e revisão geral coerentes.

- [ ] Remover o bloco detalhado de Gestão do tema 17 e ajustar título/checklists/referências.
- [ ] Incluir o tema 26 nos índices e a linha 15/15 no banco de provas.
- [ ] Criar seção 26 de Gestão em `INTENSIVAO.md` e separar a distribuição temática do mapa.
- [ ] Executar testes focados até passarem.

### Task 4: Verificação e publicação

**Files:**
- Test: `Intensivao/tests/*.test.js`

**Interfaces:**
- Consumes: todos os arquivos alterados.
- Produces: site publicado e verificado.

- [ ] Executar `node --test Intensivao/tests/*.test.js`.
- [ ] Executar `git diff --check` e validar links/contagens por script.
- [ ] Commitar, fazer push e aguardar o workflow do GitHub Pages.
- [ ] Abrir o tema e as provas em produção, conferir navegação, Mermaid, cards e erros do navegador.

