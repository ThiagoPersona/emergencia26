# Remoção de Blocos das Práticas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover do material publicado os blocos “Como montar seu banco” e “Treino mínimo semanal”.

**Architecture:** Alteração editorial direta em dois arquivos Markdown. Um teste de conteúdo impedirá que os títulos e textos removidos reapareçam nas páginas práticas.

**Tech Stack:** Markdown, Node.js `node:test`, Docsify e GitHub Pages.

## Global Constraints

- Preservar todas as demais seções dos dois arquivos.
- Não alterar navegação, estilos, simulador ou conteúdo clínico restante.
- Não adicionar a pasta local `Praticas/` ao Git.
- Sincronizar `main` após os testes.

---

### Task 1: Remover os blocos editoriais

**Files:**
- Modify: `Intensivao/praticas/TREINO_VISUAL.md`
- Modify: `Intensivao/praticas/PROCEDIMENTOS.md`
- Test: `Intensivao/tests/pages-workflow.test.js`

**Interfaces:**
- Consumes: arquivos Markdown renderizados diretamente pelo Docsify.
- Produces: páginas sem os dois blocos removidos e teste contra regressão editorial.

- [ ] **Step 1: Escrever o teste de regressão**

Adicionar ao final de `Intensivao/tests/pages-workflow.test.js`:

```js
test("paginas praticas omitem blocos editoriais removidos", () => {
  const visual = fs.readFileSync(path.join(__dirname, "..", "praticas", "TREINO_VISUAL.md"), "utf8");
  const procedures = fs.readFileSync(path.join(__dirname, "..", "praticas", "PROCEDIMENTOS.md"), "utf8");

  assert.doesNotMatch(visual, /Como montar seu banco|O simulador aceita fases com mídia versionada/);
  assert.doesNotMatch(procedures, /Treino mínimo semanal|\| Procedimento \| Repetições \| Meta \|/);
});
```

- [ ] **Step 2: Executar o teste e confirmar a falha**

Run: `node --test Intensivao/tests/pages-workflow.test.js`

Expected: FAIL porque os dois blocos ainda existem.

- [ ] **Step 3: Remover os blocos Markdown**

Em `TREINO_VISUAL.md`, excluir desde `## Como montar seu banco` até o fim do arquivo. Em `PROCEDIMENTOS.md`, excluir desde `## Treino mínimo semanal` até o fim do arquivo. Manter uma única quebra de linha ao final de cada documento.

- [ ] **Step 4: Executar as verificações**

Run: `node --test Intensivao/tests/*.test.js`

Expected: todos os testes aprovados.

Run: `rg -n "Como montar seu banco|O simulador aceita fases com mídia versionada|Treino mínimo semanal|Procedimento \\| Repetições \\| Meta" Intensivao/praticas`

Expected: nenhuma ocorrência.

Run: `git diff --check`

Expected: saída vazia e código 0.

- [ ] **Step 5: Commitar e sincronizar**

```bash
git add Intensivao/praticas/TREINO_VISUAL.md Intensivao/praticas/PROCEDIMENTOS.md Intensivao/tests/pages-workflow.test.js docs/superpowers/plans/2026-08-16-remocao-blocos-praticas.md
git commit -m "chore: remove blocos editoriais das práticas"
git push origin main
```
