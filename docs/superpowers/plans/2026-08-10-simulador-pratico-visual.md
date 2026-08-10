# Simulador Prático Visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o simulador prático atual em um banco visual progressivo de 30 estações, com modos prova/dirigido/revisão, mídia local licenciada, correção por IA e experiência responsiva.

**Architecture:** O frontend estático continuará sem etapa de build. `praticas-app.js` será o orquestrador e consumirá módulos UMD testáveis para catálogo, sessão e mídia; o índice terá metadados e carregará uma estação por vez. O backend HistorIA-Med aceitará o contrato versão 2 e persistirá os novos metadados, sem alterar a regra determinística de pontuação.

**Tech Stack:** JavaScript UMD, HTML/Docsify, CSS responsivo, JSON versionado, Node test runner, Next.js/TypeScript no HistorIA-Med, GitHub Pages, OpenAI e Supabase existentes.

## Global Constraints

- O formato padrão é híbrido e estruturado; não implementar examinador por voz em tempo real.
- O banco publicado deve conter exatamente 30 estações e checklist de 100 pontos em cada uma.
- O modo prova deve ocultar domínio, título diagnóstico, checklist e interpretação das imagens.
- Talks e Eagles podem orientar cenários, mas seus nomes e conteúdo literal não aparecem no material publicado.
- Toda mídia deve ser local, desidentificada, possuir fonte, licença, URL de licença e textos alternativos separados para prova e revisão.
- Não usar hotlinks, imagens sem licença clara nem mídia extraída dos cursos.
- A progressão entre fases não pode interromper cronômetro ou gravação.
- O frontend deve continuar funcionando no GitHub Pages por rota hash, no celular e no computador.
- A IA classifica evidências; o código calcula a nota.
- O áudio bruto continua sem persistência.
- `Praticas/` é acervo local não rastreado e nunca deve ser adicionado ao Git.

---

## File Structure

### Frontend Emergencia

- Create: `Intensivao/praticas-catalog.js` — filtros, sorteio e ciclo sem repetição.
- Create: `Intensivao/praticas-session.js` — progressão e restauração da sessão.
- Create: `Intensivao/praticas-media.js` — manifesto, preload e renderização segura.
- Modify: `Intensivao/praticas-app.js` — orquestra os novos módulos e telas.
- Modify: `Intensivao/praticas-utils.js` — valida contrato versão 2.
- Modify: `Intensivao/praticas.css` — catálogo, fase clínica e visualizador responsivo.
- Modify: `Intensivao/index.html` — carrega módulos antes do app.
- Create: `Intensivao/assets/praticas/media.json` — manifesto de mídia e licenças.
- Create: `Intensivao/assets/praticas/ATRIBUICOES.md` — atribuições legíveis.
- Create: `Intensivao/assets/praticas/{ecg,pocus,radiologia,clinica,equipamentos}/` — arquivos otimizados.
- Modify: `Intensivao/praticas/data/estacoes/index.json` — metadados das 30 estações.
- Create/Modify: `Intensivao/praticas/data/estacoes/*.json` — estações versão 2.
- Create: `Intensivao/tests/praticas-catalog.test.js`.
- Create: `Intensivao/tests/praticas-session.test.js`.
- Create: `Intensivao/tests/praticas-media.test.js`.
- Modify: `Intensivao/tests/praticas-stations.test.js`.
- Modify: `Intensivao/tests/praticas-app.test.js`.
- Modify: `Intensivao/tests/pages-workflow.test.js`.

### Backend HistorIA-Med

- Modify: `lib/teme-practice/contracts.ts` — campos opcionais versão 2.
- Modify: `C:/Projetos/HistorIA-Med/lib/teme-practice/scoring.mjs` — valida novos metadados sem confiar no cliente.
- Modify: `C:/Projetos/HistorIA-Med/lib/teme-practice/scoring.d.mts` — declara o contrato do validador.
- Modify: `C:/Projetos/HistorIA-Med/app/api/teme-practice/evaluate/route.ts` — devolve dificuldade, origem e tags do snapshot.
- Modify: `C:/Projetos/HistorIA-Med/scripts/teme-practice-checks.mjs` — testa contrato e compatibilidade.

---

### Task 1: Contrato Versão 2 E Validação Do Banco

**Files:**
- Modify: `Intensivao/praticas-utils.js`
- Modify: `Intensivao/tests/praticas-utils.test.js`
- Modify: `Intensivao/tests/praticas-stations.test.js`

**Interfaces:**
- Produces: `validateStation(station, options?) -> { valid, errors }` com validação de fases, origem, dificuldade, tags e referências de mídia.
- Produces: estações antigas continuam válidas durante a migração quando `options.requireVersion2 !== true`.

- [ ] **Step 1: Write failing tests for version 2 validation**

Adicionar casos que rejeitam origem/dificuldade inválidas, fase sem `prompt`, mídia sem identificador, pesos diferentes de 100 quando `requireVersion2` estiver ativo e títulos diagnósticos ausentes.

```js
const result = validateStation(version2Station, { requireVersion2: true });
assert.equal(result.valid, true, result.errors.join("; "));
assert.equal(validateStation({ ...version2Station, difficulty: "impossivel" }, { requireVersion2: true }).valid, false);
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test Intensivao/tests/praticas-utils.test.js Intensivao/tests/praticas-stations.test.js`

Expected: FAIL porque `validateStation` ainda não valida o contrato versão 2.

- [ ] **Step 3: Implement strict optional version 2 validation**

Validar `examTitle`, `domains`, `difficulty`, `origin`, `tags`, `phases[].patientState`, `phases[].media`, `references` e soma de 100 pontos. Preservar compatibilidade com chamadas antigas.

- [ ] **Step 4: Run targeted and full frontend tests**

Run: `node --test Intensivao/tests/praticas-utils.test.js Intensivao/tests/praticas-stations.test.js && node --test Intensivao/tests/*.test.js`

- [ ] **Step 5: Commit**

```bash
git add Intensivao/praticas-utils.js Intensivao/tests/praticas-utils.test.js Intensivao/tests/praticas-stations.test.js
git commit -m "Valida contrato visual das estações práticas"
```

### Task 2: Catálogo, Filtros E Sorteio Sem Repetição

**Files:**
- Create: `Intensivao/praticas-catalog.js`
- Create: `Intensivao/tests/praticas-catalog.test.js`

**Interfaces:**
- Produces: `filterStations(entries, filters, attempts) -> entries[]`.
- Produces: `pickStation(entries, cycleIds, randomFn) -> { station, cycleIds }`.
- Produces: `getRecommendedStations(entries, attempts, limit) -> entries[]`.

- [ ] **Step 1: Write failing catalog tests**

Cobrir filtros por domínio, dificuldade, tag, mídia, não realizadas e recomendação baseada em `frequentGaps`. Cobrir ciclo completo antes de repetição com `randomFn` injetável.

- [ ] **Step 2: Verify RED**

Run: `node --test Intensivao/tests/praticas-catalog.test.js`

Expected: FAIL porque o módulo não existe.

- [ ] **Step 3: Implement the UMD catalog module**

Expor API em `TemePracticeCatalog` no navegador e `module.exports` no Node. Não acessar DOM ou `localStorage` dentro das funções puras.

- [ ] **Step 4: Verify GREEN and full suite**

Run: `node --test Intensivao/tests/praticas-catalog.test.js && node --test Intensivao/tests/*.test.js`

- [ ] **Step 5: Commit**

```bash
git add Intensivao/praticas-catalog.js Intensivao/tests/praticas-catalog.test.js
git commit -m "Adiciona catálogo de estações práticas"
```

### Task 3: Sessão Progressiva E Restauração

**Files:**
- Create: `Intensivao/praticas-session.js`
- Create: `Intensivao/tests/praticas-session.test.js`
- Modify: `Intensivao/tests/praticas-app.test.js`

**Interfaces:**
- Produces: `createSession(station, mode, nowMs)`.
- Produces: `movePhase(session, station, direction)`.
- Produces: `serializeSession(session)` e `restoreSession(raw, station, nowMs)`.
- Produces: `getPrimaryAction(session, station)`.

- [ ] **Step 1: Write failing tests**

Testar avanço, retorno, limites, ação final, cálculo de tempo restante após atualização e rejeição de rascunho pertencente a outra versão da estação.

- [ ] **Step 2: Verify RED**

Run: `node --test Intensivao/tests/praticas-session.test.js`

- [ ] **Step 3: Implement session module without DOM dependencies**

Preservar `startedAtMs`; movimentar fase nunca altera início, status ou dados de gravação.

- [ ] **Step 4: Migrate app pure helpers to delegation**

Manter exports antigos de `praticas-app.js` como wrappers temporários para não quebrar testes existentes.

- [ ] **Step 5: Verify and commit**

Run: `node --test Intensivao/tests/praticas-session.test.js Intensivao/tests/praticas-app.test.js && node --test Intensivao/tests/*.test.js`

```bash
git add Intensivao/praticas-session.js Intensivao/tests/praticas-session.test.js Intensivao/praticas-app.js Intensivao/tests/praticas-app.test.js
git commit -m "Estrutura progressão das estações práticas"
```

### Task 4: Manifesto E Visualizador De Mídia

**Files:**
- Create: `Intensivao/praticas-media.js`
- Create: `Intensivao/tests/praticas-media.test.js`
- Create: `Intensivao/assets/praticas/media.json`
- Create: `Intensivao/assets/praticas/ATRIBUICOES.md`
- Modify: `Intensivao/praticas.css`

**Interfaces:**
- Produces: `validateMediaManifest(manifest) -> { valid, errors }`.
- Produces: `collectStationMedia(station, manifest) -> media[]`.
- Produces: `preloadStationMedia(media, loaders?) -> Promise<{ loaded, failures }>`.
- Produces: `renderPhaseMedia(container, media, { reviewMode })`.

- [ ] **Step 1: Write failing manifest and collection tests**

Rejeitar ID duplicado, URL remota em `src`, licença/fonte ausente, alt de prova igual à interpretação diagnóstica e referência de estação inexistente.

- [ ] **Step 2: Verify RED**

Run: `node --test Intensivao/tests/praticas-media.test.js`

- [ ] **Step 3: Implement pure validation and preload injection**

O preload deve aceitar loaders injetados nos testes e usar `Image`/`video` somente no navegador.

- [ ] **Step 4: Implement viewer UI**

Adicionar botões com ícones e tooltips para ampliar, reduzir, restaurar e tela cheia; usar diálogo sem arredondamento excessivo; comparação empilha abaixo de 640 px; vídeos são mudos, em loop e controláveis.

- [ ] **Step 5: Verify and commit**

Run: `node --test Intensivao/tests/praticas-media.test.js && node --test Intensivao/tests/*.test.js`

```bash
git add Intensivao/praticas-media.js Intensivao/tests/praticas-media.test.js Intensivao/assets/praticas/media.json Intensivao/assets/praticas/ATRIBUICOES.md Intensivao/praticas.css
git commit -m "Adiciona suporte visual às estações práticas"
```

### Task 5: Integração Dos Modos E Da Interface

**Files:**
- Modify: `Intensivao/praticas-app.js`
- Modify: `Intensivao/praticas.css`
- Modify: `Intensivao/index.html`
- Modify: `Intensivao/tests/praticas-app.test.js`
- Modify: `Intensivao/tests/pages-workflow.test.js`

**Interfaces:**
- Consumes: `TemePracticeCatalog`, `TemePracticeSession`, `TemePracticeMedia`.
- Produces: setup com modos `exam`, `directed`, `review`; carregamento sob demanda; fase visual; revisão visual.

- [ ] **Step 1: Write failing integration assertions**

Verificar ordem dos scripts, título neutro no modo prova, controles anterior/próxima/finalizar, bloqueio de início enquanto mídia carrega e ausência de interpretação antes da revisão.

- [ ] **Step 2: Verify RED**

Run: `node --test Intensivao/tests/praticas-app.test.js Intensivao/tests/pages-workflow.test.js`

- [ ] **Step 3: Replace eager station loading with metadata index and selected fetch**

Persistir modo, filtros, ciclo aleatório e rascunho em chaves versionadas. Não armazenar áudio em `localStorage`.

- [ ] **Step 4: Build setup and running screens**

Usar controles adequados: tabs/segmented control para modo, selects para filtros e botões apenas para comandos. A fase exibe estado clínico, sinais vitais, tarefa e mídia antes das ações.

- [ ] **Step 5: Build review visual and related stations**

Após correção, renderizar mídia com `reviewAlt`, `reviewCaption`, atribuição e recomendações do catálogo.

- [ ] **Step 6: Verify and commit**

Run: `node --test Intensivao/tests/*.test.js && git diff --check`

```bash
git add Intensivao/praticas-app.js Intensivao/praticas.css Intensivao/index.html Intensivao/tests/praticas-app.test.js Intensivao/tests/pages-workflow.test.js
git commit -m "Integra modos e casos visuais no simulador"
```

### Task 6: Curadoria E Otimização Das Mídias

**Files:**
- Modify: `Intensivao/assets/praticas/media.json`
- Modify: `Intensivao/assets/praticas/ATRIBUICOES.md`
- Create: arquivos sob `Intensivao/assets/praticas/`
- Modify: `Intensivao/tests/praticas-media.test.js`

**Interfaces:**
- Produces: IDs estáveis de mídia consumidos pelas estações.
- Produces: no mínimo um conjunto de ECG, POCUS, radiologia, curvas/monitores, clínica e equipamentos.

- [ ] **Step 1: Define the required media inventory**

Incluir recursos para BAVT, IAM inferior/VD, torsades, capnografia, curvas de VM, pneumotórax, edema pulmonar, FAST, choque obstrutivo, TC de AVC/TCE, radiografia respiratória, acesso vascular e bloqueio regional.

- [ ] **Step 2: Research and verify each source license**

Priorizar domínio público institucional, Wikimedia Commons, artigos CC compatíveis e POCUS Atlas CC BY-NC 4.0. Registrar fonte e licença antes do download.

- [ ] **Step 3: Download, de-identify and optimize assets**

Remover metadados, converter imagens para WebP quando não houver prejuízo diagnóstico, criar thumbnails e manter vídeos curtos. Não alterar achados clínicos.

- [ ] **Step 4: Add file-existence and attribution tests**

O teste deve resolver cada `src` e `thumbnail` contra `Intensivao/` e rejeitar arquivo ausente.

- [ ] **Step 5: Verify and commit**

Run: `node --test Intensivao/tests/praticas-media.test.js && git diff --check`

```bash
git add Intensivao/assets/praticas Intensivao/tests/praticas-media.test.js
git commit -m "Adiciona acervo visual licenciado das práticas"
```

### Task 7: Estações 1 A 15

**Files:**
- Modify: cinco JSON históricos existentes.
- Create: dez JSON novos em `Intensivao/praticas/data/estacoes/`.
- Modify: `Intensivao/praticas/data/estacoes/index.json`.
- Modify: `Intensivao/tests/praticas-stations.test.js`.

**Station IDs:**
- `2025-vm-autopeep`
- `2025-trauma-hemorragico`
- `2025-pocus-aaa-acesso`
- `2025-pediatria-colinergico`
- `2025-tce-hic`
- `sim-va-rsi-choque-01`
- `sim-va-cico-crico-01`
- `sim-vm-sdra-dissincronia-01`
- `sim-trauma-pediatrico-01`
- `sim-trauma-torax-instavel-01`
- `sim-aph-trauma-penetrante-01`
- `sim-pocus-blue-dispneia-01`
- `sim-pocus-efast-trauma-01`
- `sim-pocus-rush-choque-01`
- `sim-cardio-iam-inferior-vd-01`

**Interfaces:**
- Cada arquivo passa em `validateStation(station, { requireVersion2: true })`.
- Toda mídia referenciada existe no manifesto.

- [ ] **Step 1: Change station-bank test to require 30 only after both content tasks**

Durante esta tarefa, testar 15 entradas válidas. A exigência final de 30 será ativada na Task 8.

- [ ] **Step 2: Upgrade historical stations**

Adicionar metadados, estados clínicos, mídias quando solicitadas, referências e título neutro sem alterar o checklist oficial.

- [ ] **Step 3: Write ten new progressive stations**

Cada caso terá 3 a 6 fases, checklist objetivo de 100 pontos, erros críticos, resposta oral de referência e referências atuais.

- [ ] **Step 4: Run validation and medical consistency pass**

Run: `node --test Intensivao/tests/praticas-stations.test.js Intensivao/tests/praticas-media.test.js`

- [ ] **Step 5: Commit**

```bash
git add Intensivao/praticas/data/estacoes Intensivao/tests/praticas-stations.test.js
git commit -m "Amplia primeiro bloco de estações práticas"
```

### Task 8: Estações 16 A 30

**Files:**
- Create: quinze JSON em `Intensivao/praticas/data/estacoes/`.
- Modify: `Intensivao/praticas/data/estacoes/index.json`.
- Modify: `Intensivao/tests/praticas-stations.test.js`.

**Station IDs:**
- `sim-cardio-bavt-marcapasso-01`
- `sim-cardio-torsades-pcr-01`
- `sim-cardio-pos-rce-01`
- `sim-ped-asma-grave-01`
- `sim-ped-bronquiolite-bradicardia-01`
- `sim-tox-triciclico-01`
- `sim-tox-metanol-01`
- `sim-animais-escorpiao-choque-01`
- `sim-neuro-avc-oclusao-01`
- `sim-resp-asma-intubado-01`
- `sim-sepse-choque-refratario-01`
- `sim-metabolico-cetoacidose-01`
- `sim-obst-eclampsia-01`
- `sim-obst-pcr-materna-01`
- `sim-proc-bloqueio-fascia-iliaca-01`

**Interfaces:**
- Índice final possui exatamente 30 entradas.
- Distribuição por família coincide com a especificação aprovada.

- [ ] **Step 1: Write the final 30-station assertions**

Testar contagem, IDs únicos, arquivos existentes, soma de pontos, todas as origens genéricas e cobertura das dez famílias.

- [ ] **Step 2: Verify RED with only 15 stations**

Run: `node --test Intensivao/tests/praticas-stations.test.js`

- [ ] **Step 3: Write fifteen progressive stations**

Aplicar as mesmas exigências clínicas e de checklist da Task 7, usando mídias somente quando forem interpretáveis e licenciadas.

- [ ] **Step 4: Verify full bank**

Run: `node --test Intensivao/tests/praticas-stations.test.js Intensivao/tests/praticas-media.test.js && node --test Intensivao/tests/*.test.js`

- [ ] **Step 5: Commit**

```bash
git add Intensivao/praticas/data/estacoes Intensivao/tests/praticas-stations.test.js
git commit -m "Completa banco de trinta estações práticas"
```

### Task 9: Compatibilidade Do HistorIA-Med

**Files:**
- Modify: `C:/Projetos/HistorIA-Med/lib/teme-practice/contracts.ts`
- Modify: `C:/Projetos/HistorIA-Med/lib/teme-practice/scoring.mjs`
- Modify: `C:/Projetos/HistorIA-Med/lib/teme-practice/scoring.d.mts`
- Modify: `C:/Projetos/HistorIA-Med/app/api/teme-practice/evaluate/route.ts`
- Modify: `C:/Projetos/HistorIA-Med/scripts/teme-practice-checks.mjs`

**Interfaces:**
- Consumes: contrato JSON versão 2 do frontend.
- Produces: API aceita metadados opcionais e preserva compatibilidade com snapshots antigos.

- [ ] **Step 1: Write failing backend contract tests**

Incluir estação com `examTitle`, `domains`, `difficulty`, `origin`, `tags`, `patientState`, `media` e `references`.

- [ ] **Step 2: Verify RED**

Run: comando de teste focal do HistorIA-Med identificado no `package.json`.

- [ ] **Step 3: Extend TypeScript contracts and validation**

Aceitar somente valores enumerados, limitar tamanhos de arrays/textos e impedir URLs ou conteúdo arbitrário de afetar o prompt do avaliador.

- [ ] **Step 4: Persist optional metadata safely**

Usar `station_snapshot` existente como fonte de verdade, incluir os metadados derivados na resposta GET e não criar migração destrutiva para tentativas antigas.

- [ ] **Step 5: Run backend tests and commit in HistorIA-Med**

Run: `npm run test:teme-practice && npm run typecheck && npm run lint`

```bash
git add lib/teme-practice app/api/teme-practice/evaluate/route.ts scripts/teme-practice-checks.mjs
git commit -m "Aceita estações práticas visuais versão 2"
```

### Task 10: Auditoria Integrada, Browser E Publicação

**Files:**
- Modify: apenas arquivos apontados por falhas reais de verificação.
- Modify: `.github/workflows/pages.yml` se novos tipos de mídia não forem publicados.
- Modify: `Intensivao/PRATICAS.md` e `Intensivao/praticas/SIMULADOR.md` para refletir os modos finais.

**Interfaces:**
- Produces: GitHub Pages público funcional e backend compatível implantado.

- [ ] **Step 1: Run complete automated checks**

Frontend:

```powershell
node --test Intensivao/tests/*.test.js
git diff --check
```

Backend: executar testes TEME, typecheck e lint definidos no `package.json`.

- [ ] **Step 2: Start local servers and verify desktop flow**

Realizar modo prova completo com áudio, mudança de fases, zoom, tela cheia, finalização e revisão. Confirmar zero erros de console.

- [ ] **Step 3: Verify mobile flow**

Usar viewport de aproximadamente 390 x 844. Confirmar que controles não cobrem mídia/texto, comparação empilha e o relógio permanece legível.

- [ ] **Step 4: Verify degraded paths**

Simular mídia ausente, microfone negado, API indisponível e atualização durante a estação.

- [ ] **Step 5: Audit content and licensing**

Revisar as 30 estações, todas as atribuições e os arquivos publicados. Confirmar que não há nomes de cursos, material literal ou mídia sem licença.

- [ ] **Step 6: Commit documentation/fixes, deploy backend if changed, push frontend**

Publicar primeiro o backend compatível e depois o frontend. Aguardar GitHub Pages servir a revisão final.

- [ ] **Step 7: Verify production end to end**

Abrir `https://thiagopersona.github.io/emergencia26/#/praticas/SIMULADOR`, realizar pelo menos uma estação visual e confirmar a tela de correção.
