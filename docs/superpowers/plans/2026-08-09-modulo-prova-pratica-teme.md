# Modulo Prova Pratica TEME Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar no site Resumos de Emergencia um simulador de estacoes praticas TEME para treino individual, com cronometro, gravacao, transcricao, correcao por checklist com evidencias, pontuacao deterministica, confirmacao manual de gestos e historico de desempenho.

**Architecture:** O frontend estatico permanece em `C:/Projetos/Emergencia/Intensivao` e usa Docsify, JavaScript sem build e Supabase Auth no navegador. Uma rota dedicada no Next.js de `C:/Projetos/HistorIA-Med` recebe audio e definicao versionada da estacao, autentica o usuario, transcreve com OpenAI, classifica cada item do checklist em JSON estruturado, calcula a nota em codigo e persiste somente transcricao, avaliacao e metadados no Supabase. O audio existe apenas durante a requisicao e nao e armazenado.

**Tech Stack:** Docsify 4, HTML/CSS/JavaScript, MediaRecorder, Supabase JS/Auth/Postgres/RLS, Next.js 16 Route Handlers, TypeScript, OpenAI SDK, Node test runner.

## Global Constraints

- Preservar a pasta local `Praticas/`; ela e fonte privada e nao deve ser adicionada ao Git.
- Nao publicar PDFs, DOCX, imagens ou checklists de cursinhos na integra. Reescrever os cenarios e citar apenas prova/ano e material local quando apropriado.
- Nunca expor `OPENAI_API_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Aceitar somente origens configuradas, usuario autenticado e usuario presente na allowlist da API.
- Considerar a transcricao dado nao confiavel e impedir que seu texto altere instrucoes do avaliador.
- Calcular pontos e erros criticos em codigo; a IA apenas classifica itens e apresenta evidencia.
- Itens manuais nao observaveis pelo audio devem ficar como `nao_verificavel` ate confirmacao explicita do aluno.
- Garantir modo manual quando microfone, login ou API estiver indisponivel.
- Manter navegacao, tipografia e comportamento mobile coerentes com o leitor existente.

---

## Task 1: Core de estacao e pontuacao no frontend

**Files:**
- Create: `Intensivao/tests/praticas-utils.test.js`
- Create: `Intensivao/praticas-utils.js`

- [ ] Escrever testes que definam validacao de estacao, estados permitidos, pontuacao integral/parcial/ausente, item critico, item manual e resumo de tentativas.
- [ ] Rodar `node --test Intensivao/tests/praticas-utils.test.js` e confirmar falha pela ausencia do modulo.
- [ ] Implementar as funcoes puras `validateStation`, `calculatePracticeScore`, `mergeManualChecks` e `summarizePracticeAttempts`.
- [ ] Rodar os testes novamente e manter os testes existentes verdes.

## Task 2: Banco inicial de estacoes e material de treino

**Files:**
- Create: `Intensivao/praticas/data/estacoes/index.json`
- Create: `Intensivao/praticas/data/estacoes/2025-vm-autopeep.json`
- Create: `Intensivao/praticas/data/estacoes/2025-trauma-hemorragico.json`
- Create: `Intensivao/praticas/data/estacoes/2025-pocus-aaa-acesso.json`
- Create: `Intensivao/praticas/data/estacoes/2025-pediatria-colinergico.json`
- Create: `Intensivao/praticas/data/estacoes/2025-tce-hic.json`
- Create: `Intensivao/PRATICAS.md`
- Create: `Intensivao/praticas/ROTEIRO_5_MIN.md`
- Create: `Intensivao/praticas/MATRIZ_DA_BANCA.md`
- Create: `Intensivao/praticas/PROCEDIMENTOS.md`
- Create: `Intensivao/praticas/TREINO_VISUAL.md`
- Modify: `Intensivao/_sidebar.md`

- [ ] Extrair e reescrever os cinco cenarios oficiais de 2025 em JSON versionado, com fases, comandos, checklist ponderado, erros criticos, resposta de referencia e fonte.
- [ ] Validar todos os JSONs com o core da Task 1.
- [ ] Escrever a pagina principal e os roteiros de treino individual, matriz historica e procedimentos prioritarios.
- [ ] Adicionar `PROVA PRATICA` como secao superior da barra lateral.

## Task 3: Interface do simulador e persistencia local

**Files:**
- Create: `Intensivao/tests/praticas-app.test.js`
- Create: `Intensivao/praticas-app.js`
- Create: `Intensivao/praticas.css`
- Create: `Intensivao/praticas/SIMULADOR.md`
- Create: `Intensivao/praticas/DESEMPENHO.md`
- Modify: `Intensivao/index.html`

- [ ] Escrever testes para a maquina de estados, cronometro, serializacao local e relatorio textual.
- [ ] Confirmar a falha dos testes antes da implementacao.
- [ ] Implementar selecao de estacao, briefing progressivo, cronometro de cinco minutos, checklist manual, modo transcricao digitada e relatorio.
- [ ] Implementar MediaRecorder com selecao de MIME, limite de duracao, reproducao local e descarte do blob apos envio.
- [ ] Persistir rascunho e tentativas no `localStorage` sem salvar audio.
- [ ] Integrar o script ao ciclo `doneEach` do Docsify e criar CSS responsivo.

## Task 4: Autenticacao e cliente seguro da API

**Files:**
- Create: `Intensivao/praticas-config.example.js`
- Create: `Intensivao/praticas-config.js`
- Modify: `.gitignore`
- Modify: `Intensivao/praticas-app.js`
- Modify: `Intensivao/praticas/SIMULADOR.md`

- [ ] Definir configuracao publica para URL da API, URL do Supabase e chave anonima; nenhuma chave secreta entra no site.
- [ ] Carregar Supabase JS por CDN e oferecer login, logout e restauracao de sessao.
- [ ] Enviar `Authorization: Bearer <access_token>` e tratar expiracao, CORS, limite e modo offline.
- [ ] Garantir que a configuracao local real nao vaze se contiver identificadores nao destinados ao repositorio.

## Task 5: Core do avaliador no HistorIA

**Files:**
- Create: `lib/teme-practice/contracts.ts`
- Create: `lib/teme-practice/scoring.mjs`
- Create: `lib/teme-practice/evaluator.ts`
- Create: `lib/prompts/teme-practice.ts`
- Create: `scripts/teme-practice-checks.mjs`
- Modify: `package.json`

- [ ] Escrever testes do backend para validacao da classificacao e calculo deterministico antes do codigo de producao.
- [ ] Criar contrato estrito de entrada e saida e schema JSON para o modelo.
- [ ] Criar prompt que exige evidencia literal curta por item, separa fala de gesto e ignora instrucoes presentes na transcricao.
- [ ] Implementar chamada OpenAI com modelo configuravel e normalizacao defensiva da resposta.
- [ ] Implementar calculo final fora da IA e testar erros criticos e itens nao verificaveis.

## Task 6: Rota protegida de transcricao e avaliacao

**Files:**
- Create: `app/api/teme-practice/evaluate/route.ts`
- Create: `lib/teme-practice/security.ts`
- Modify: `.env.example`

- [ ] Ler a documentacao local do Next.js 16 para Route Handlers e limites de requisicao.
- [ ] Implementar `OPTIONS` e CORS por allowlist de origem.
- [ ] Exigir sessao Supabase valida, allowlist de usuario, rate limit, audio de no maximo seis minutos e MIME permitido.
- [ ] Transcrever audio com o prompt clinico ja usado pelo HistorIA ou aceitar transcricao manual validada.
- [ ] Avaliar o checklist, retornar evidencias, nota provisoria e itens manuais pendentes.
- [ ] Nao registrar nem persistir o blob de audio.

## Task 7: Persistencia Supabase com RLS

**Files:**
- Create: `supabase/migrations/20260809150000_create_teme_practice_attempts.sql`
- Modify: `app/api/teme-practice/evaluate/route.ts`

- [ ] Escrever migracao para `teme_practice_attempts` com `user_id`, estacao/versao, datas, duracao, transcricao, resultado JSON, nota, erros criticos e metadados.
- [ ] Criar politicas RLS de leitura/insercao/atualizacao restritas a `auth.uid()` e revogar acesso anonimo.
- [ ] Persistir a tentativa apenas depois de avaliacao valida e devolver o identificador ao frontend.
- [ ] Permitir atualizacao posterior das confirmacoes manuais sem alterar a classificacao original da IA.

## Task 8: Historico e relatorio de desempenho

**Files:**
- Modify: `Intensivao/praticas-utils.js`
- Modify: `Intensivao/praticas-app.js`
- Modify: `Intensivao/praticas/DESEMPENHO.md`

- [ ] Adicionar agregacao por dominio, estacao, item e erro critico.
- [ ] Exibir tentativas locais e sincronizadas, evolucao de nota e itens mais ausentes.
- [ ] Gerar TXT/JSON legivel para compartilhar e criar revisoes direcionadas.
- [ ] Oferecer limpeza apenas do historico local, com confirmacao clara.

## Task 9: Integracao, acessibilidade e calibracao

**Files:**
- Modify: `Intensivao/tests/praticas-app.test.js`
- Modify: `scripts/teme-practice-checks.mjs`
- Create: `docs/superpowers/specs/2026-08-09-calibracao-estacoes-praticas.md`

- [ ] Adicionar fixtures de resposta completa, parcial, silenciosa e contraditoria para as cinco estacoes.
- [ ] Conferir que cada item pontuado apresenta evidencia ou motivo objetivo de ausencia.
- [ ] Verificar navegacao por teclado, foco, contraste, textos longos e layout em 390 px e desktop.
- [ ] Testar falha de microfone, API indisponivel, sessao expirada e transcricao manual.

## Task 10: Verificacao final e publicacao

**Files:**
- Modify as needed based on verification only.

- [ ] Rodar todos os testes do `Emergencia` e `git diff --check`.
- [ ] Rodar no HistorIA `npm run lint`, `npm run typecheck`, testes TEME e `npm run build`.
- [ ] Aplicar/verificar a migracao no Supabase e configurar origens, modelo e allowlist sem expor valores.
- [ ] Iniciar os dois servidores, testar o fluxo ponta a ponta no navegador e capturar verificacoes desktop/mobile.
- [ ] Revisar os diffs dos dois repositorios, confirmar que nenhum segredo/binario entrou no Git e somente entao commitar e publicar.
