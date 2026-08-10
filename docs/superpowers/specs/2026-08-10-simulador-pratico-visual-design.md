# Simulador Prático Visual E Progressivo - Design

Data: 2026-08-10

Status: design aprovado pelo usuário

## Relação Com O Projeto Atual

Este documento amplia o design do módulo de prova prática TEME criado em 2026-08-09. Permanecem válidas a gravação de áudio, a transcrição, a avaliação por checklist, a confirmação manual de gestos, o cálculo determinístico da nota, a persistência no Supabase e o funcionamento degradado sem IA.

A ampliação transforma o banco inicial de cinco estações históricas em um simulador de treinamento deliberado, com casos progressivos, imagens, vídeos curtos e estações inéditas. O objetivo deixa de ser apenas reproduzir provas anteriores e passa a ser preparar o candidato para situações novas no mesmo padrão de avaliação.

## Objetivo

Criar um simulador individual de estações práticas de Medicina de Emergência que:

- reproduza o formato oral e temporal da segunda etapa do TEME;
- apresente casos clínicos em fases progressivas;
- permita interpretação de ECG, radiografia, tomografia, ultrassom, capnografia, curvas ventilatórias, monitores, fotografias clínicas e equipamentos;
- utilize estações históricas, cenários reescritos do acervo local e casos inéditos;
- avalie verbalização, prioridades, sequência, doses, alvos, interpretação visual e procedimentos;
- reduza memorização mecânica por meio de variações de apresentação e evolução;
- funcione em celular, tablet e computador pelo GitHub Pages.

## Decisão De Interação

O simulador usará progressão híbrida e estruturada.

O caso e suas respostas clínicas serão previamente escritos e validados. Durante a estação, o usuário verbaliza sua conduta e avança manualmente pelas fases. A IA não responderá em tempo real; ela transcreverá e avaliará toda a resposta ao final.

Essa escolha preserva previsibilidade, evita que latência da API consuma o tempo da prova, limita custos e permite que a mesma estação seja comparável entre tentativas.

## Modos De Treino

### Modo Prova

- Sorteia uma estação sem revelar domínio ou diagnóstico.
- Prioriza estações não realizadas recentemente.
- Mantém checklist, resposta, referências e interpretação visual ocultos.
- Usa cronômetro único de cinco minutos.
- Não exibe dicas clínicas.

### Treino Dirigido

- Permite filtrar por domínio, dificuldade, competência e presença de mídia.
- Permite selecionar estações ainda não realizadas.
- Informa o domínio, mas não revela o diagnóstico final antes do início.
- Usa o mesmo cronômetro e a mesma correção do modo prova.

### Revisão Dirigida

- Usa o histórico para priorizar competências frequentemente ausentes ou incorretas.
- Recomenda estações diferentes que cobrem a mesma falha.
- Não altera o checklist nem facilita a correção.

## Banco Inicial

O primeiro banco ampliado terá 30 estações completas, incluindo as cinco estações históricas já existentes.

Distribuição planejada:

| Família | Quantidade | Exemplos de competências |
|---|---:|---|
| Via aérea e ventilação mecânica | 4 | RSI, via aérea difícil, crico, curvas e auto-PEEP |
| Trauma e APH | 4 | hemorragia, trauma pediátrico, tórax, transporte e triagem |
| POCUS | 4 | choque, dispneia, FAST, aorta e acesso vascular |
| Cardiovascular e PCR | 4 | SCA, bradiarritmia, marcapasso, PCR e pós-RCE |
| Pediatria | 3 | insuficiência respiratória, intoxicação e reanimação |
| Toxicologia e animais peçonhentos | 3 | síndromes tóxicas, antídotos e choque por envenenamento |
| Neurologia | 2 | AVC, TCE e hipertensão intracraniana |
| Respiratório, sepse e metabólico | 3 | asma grave, choque séptico e distúrbio ácido-base |
| Obstetrícia | 2 | pré-eclâmpsia/eclâmpsia e PCR materna |
| Procedimentos, analgesia e sedação | 1 | bloqueio, sedação e segurança procedural |

Os materiais locais Talks e Eagles serão usados para identificar formatos, tarefas e competências. Nenhum cenário será publicado como cópia literal. O conteúdo publicado usará somente os rótulos genéricos `histórica`, `inspirada no acervo` ou `inédita`.

## Modelo De Estação Versão 2

Cada estação continuará sendo um arquivo JSON versionado e receberá metadados para catálogo, progressão e mídia.

```json
{
  "id": "sim-cardio-bavt-choque-01",
  "version": 1,
  "title": "Bradicardia instável com deterioração",
  "examTitle": "Estação 14",
  "domain": "Cardiovascular",
  "domains": ["Cardiovascular", "Procedimentos"],
  "difficulty": "intermediaria",
  "origin": "inedita",
  "tags": ["bradicardia", "marcapasso", "PCR"],
  "durationSeconds": 300,
  "briefing": "Conduza o atendimento conforme os dados apresentados.",
  "phases": [
    {
      "id": "avaliacao-inicial",
      "title": "Tarefa 1",
      "prompt": "Avalie o paciente e indique a conduta inicial.",
      "patientState": {
        "summary": "Homem, 68 anos, com síncope e dor torácica.",
        "vitals": ["PA 78/46 mmHg", "FC 32 bpm", "SpO2 94% em ar ambiente"]
      },
      "media": ["ecg-bavt-001"]
    }
  ],
  "checklist": [
    {
      "id": "reconhece-bavt",
      "label": "Reconhece bloqueio atrioventricular total",
      "weight": 60,
      "verification": "verbal",
      "critical": true
    },
    {
      "id": "indica-marcapasso",
      "label": "Indica estimulação cardíaca na instabilidade refratária",
      "weight": 40,
      "verification": "verbal",
      "critical": true
    }
  ],
  "criticalErrors": ["Não reconhecer a bradicardia instável"],
  "referenceAnswer": "Reconheço bradicardia instável por bloqueio atrioventricular total e inicio tratamento imediato, preparando estimulação cardíaca sem atrasar suporte hemodinâmico.",
  "references": ["AHA. Part 9: Adult Advanced Life Support. 2025. https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-advanced-life-support"]
}
```

### Regras Do Esquema

- `examTitle` é mostrado no modo prova para não revelar o assunto.
- `title` é mostrado no catálogo e na correção.
- `origin` aceita `historica`, `acervo_reescrito` ou `inedita`.
- `difficulty` aceita `basica`, `intermediaria` ou `avancada`.
- Cada fase deve ter identificador, título, tarefa e estado clínico coerente.
- Mídias são referenciadas por identificador e nunca por URL remota dentro da estação.
- O checklist deve totalizar 100 pontos.
- Itens visuais devem especificar exatamente o achado esperado sem expô-lo durante a prova.
- A resposta de referência deve seguir uma ordem oral executável em cinco minutos.

## Catálogo E Carregamento

O índice de estações conterá apenas metadados necessários para filtros e sorteio. O JSON completo da estação será carregado somente quando selecionado.

Antes do cronômetro iniciar, o simulador deve:

1. carregar o arquivo da estação;
2. validar o esquema;
3. localizar todas as mídias obrigatórias;
4. pré-carregar os recursos da estação;
5. liberar os botões de início somente após o carregamento.

Se um recurso obrigatório falhar, a estação não começa. A interface informa qual recurso não pôde ser preparado e permite tentar novamente ou sortear outra estação.

## Modelo De Mídia

As mídias serão registradas em `Intensivao/assets/praticas/media.json`.

```json
{
  "id": "equipamento-pocus-semiportatil",
  "type": "image",
  "src": "assets/praticas/equipamentos/pocus-semiportatil.webp",
  "thumbnail": "assets/praticas/equipamentos/pocus-semiportatil-thumb.webp",
  "examAlt": "Equipamento apresentado na tarefa prática.",
  "reviewAlt": "Aparelho de ultrassom semipórtatil empregado para POCUS.",
  "reviewCaption": "Equipamento de ultrassom apropriado para avaliação à beira do leito.",
  "credit": "Wikimedia Commons contributor",
  "sourceUrl": "https://commons.wikimedia.org/wiki/File:Pocus_(ultrasound)_semi-portable.jpg",
  "license": "CC BY-SA 4.0",
  "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
  "modified": "Conversão para WebP e remoção de margens vazias."
}
```

Tipos aceitos na primeira versão:

- `image`: PNG, JPEG ou WebP;
- `video`: MP4 ou WebM curto, mudo e com reprodução em loop;
- `comparison`: duas imagens exibidas lado a lado, com alternativa empilhada no celular.

Durante a prova, texto alternativo e legenda serão neutros. Na correção, o sistema poderá mostrar descrição diagnóstica, marcações e explicações.

## Fontes E Direitos De Uso

Ordem de preferência:

1. Imagens de domínio público com origem institucional.
2. Wikimedia Commons com licença Creative Commons compatível.
3. Artigos em acesso aberto com licença explícita que permita reutilização.
4. POCUS Atlas sob CC BY-NC 4.0, com atribuição e uso educacional não comercial.
5. Curvas, monitores, diagramas e imagens produzidos especificamente para o projeto.

Open-i poderá ser usado para localizar imagens, mas cada licença deverá ser confirmada no artigo original. Materiais sem licença clara não serão publicados. Imagens dos cursos não serão extraídas e republicadas.

Cada arquivo deverá possuir autor ou instituição, URL original, licença, URL da licença e descrição de alterações. Não serão usados hotlinks.

## Experiência Durante A Estação

O cabeçalho fixo exibirá nome neutro da estação, fase atual e cronômetro. A área principal exibirá, nesta ordem:

1. estado clínico e sinais vitais;
2. tarefa solicitada;
3. imagem, vídeo ou comparação, quando houver;
4. controles da estação.

Controles:

- `Fase anterior`, desabilitado na primeira fase;
- `Próxima tarefa` nas fases intermediárias;
- `Finalizar estação` na última fase;
- `Encerrar estação` como saída antecipada.

Voltar a uma fase não reinicia o tempo nem apaga a gravação. O cronômetro apresenta avisos discretos em 60 e 30 segundos. A troca de fase não interrompe o `MediaRecorder`.

## Visualizador De Mídia

Imagens devem:

- respeitar a largura disponível sem recorte;
- permitir zoom, redução e restauração;
- permitir arrastar quando ampliadas;
- abrir em tela cheia;
- manter controles acessíveis no celular;
- preservar nitidez suficiente para interpretação.

Vídeos devem:

- iniciar em modo mudo;
- repetir em loop;
- oferecer pausar e reiniciar;
- usar uma imagem de capa local;
- não bloquear o cronômetro.

O visualizador nunca mostrará o diagnóstico durante a estação.

## Correção E Aprendizado

A API continuará recebendo a estação completa, a transcrição ou áudio e a duração. Os novos metadados não alteram o cálculo da nota.

Depois da correção, o usuário verá:

- nota e erros críticos;
- avaliação de cada item com evidência textual;
- confirmação manual de procedimentos;
- imagens novamente, agora com descrição e interpretação;
- resposta-modelo na sequência ideal;
- referências clínicas;
- três prioridades de revisão;
- outras estações que treinam as mesmas competências.

O histórico registrará também dificuldade, origem e tags para permitir recomendações mais úteis.

## Organização Do Frontend

O arquivo atual `praticas-app.js` permanecerá como orquestrador. Novas responsabilidades serão separadas:

```text
Intensivao/
  praticas-app.js              orquestra telas, áudio e integração com API
  praticas-catalog.js          filtros, sorteio e ciclo sem repetição
  praticas-session.js          progressão, fases e restauração de sessão
  praticas-media.js            manifesto, preload, zoom e tela cheia
  praticas-utils.js            validação e cálculo determinístico
  praticas.css                 layout responsivo do módulo
  praticas/data/estacoes/
    index.json
    sim-cardio-bavt-choque-01.json
  assets/praticas/
    media.json
    ecg/
    pocus/
    radiologia/
    clinica/
    equipamentos/
```

Os módulos serão carregados pelo `index.html` antes de `praticas-app.js`. Todos continuarão compatíveis com JavaScript direto no navegador e testes Node, sem etapa de build.

## Compatibilidade Com O Backend

O contrato `PracticeStation` do HistorIA-Med será ampliado com campos opcionais para metadados, fases e referências. A pontuação continuará baseada apenas no checklist validado.

O backend continuará:

- validando autenticação, origem, arquivo e estação;
- tratando a transcrição como entrada não confiável;
- classificando evidências sem inventar a nota;
- salvando o snapshot versionado da estação;
- descartando áudio bruto após o processamento.

Não será criada uma segunda API para imagens, pois todas as mídias são recursos estáticos do GitHub Pages.

## Qualidade Clínica

Cada nova estação deve ser revisada em quatro dimensões:

1. Coerência entre história, sinais vitais, exames, evolução e diagnóstico.
2. Condutas, doses e alvos confrontados com diretrizes atuais.
3. Checklist objetivo, com pontuação proporcional e itens críticos explícitos.
4. Resposta-modelo possível de verbalizar dentro de cinco minutos.

Materiais de cursos servem para identificar competências, não como autoridade clínica. Divergências serão resolvidas pela hierarquia de fontes já adotada no projeto.

## Falhas E Contingências

- Sem microfone: cronômetro, progressão e autocorreção manual continuam disponíveis.
- Sem API: a estação pode ser concluída e revisada manualmente.
- Imagem obrigatória indisponível antes do início: bloquear a estação e oferecer nova tentativa.
- Vídeo incompatível: mostrar a imagem de capa e informar a limitação.
- Atualização acidental durante estação: restaurar estação, fase e tempo restante pelo armazenamento local; áudio em andamento não é recuperável.
- Licença ausente ou inválida: o teste do banco rejeita a mídia.
- Estação inválida: removê-la do sorteio e registrar erro legível no console.

## Testes Automatizados

### Banco De Estações

- índice contém exatamente 30 estações no primeiro ciclo;
- identificadores e arquivos são únicos;
- todas as estações passam no esquema versão 2;
- todo checklist totaliza 100 pontos;
- todas as referências de mídia existem no manifesto;
- todos os arquivos do manifesto existem no disco;
- toda mídia tem fonte e licença compatível;
- toda mídia possui textos alternativos de prova e revisão;
- nenhuma origem publicada expõe nomes dos cursos.

### Motor Do Simulador

- sorteio não repete estação antes de completar o ciclo;
- filtros combinam domínio, dificuldade, competência e status;
- título diagnóstico fica oculto no modo prova;
- próxima fase e fase anterior preservam cronômetro e gravação;
- última fase oferece `Finalizar estação`;
- sessão é restaurada após atualização;
- recurso ausente bloqueia início com mensagem útil.

### Visualizador

- imagem abre, amplia, reduz, restaura e fecha;
- comparação responde a desktop e celular;
- vídeo pausa, reinicia e repete;
- textos diagnósticos aparecem somente na correção;
- controles não cobrem a imagem nem o conteúdo.

### Integração

- API aceita estação versão 2;
- avaliação e cálculo permanecem determinísticos;
- histórico salva novos metadados sem quebrar tentativas antigas;
- GitHub Pages publica scripts, JSON, imagens e vídeos;
- navegação por hash funciona em celular e computador.

## Verificação Manual

- realizar uma estação completa com áudio em desktop;
- realizar uma estação completa com áudio em celular;
- testar zoom e tela cheia em ECG, POCUS e tomografia;
- simular falha de imagem e falha da API;
- confirmar que o checklist não aparece antes da correção;
- verificar ausência de erros no console;
- conferir visualmente as 30 estações antes da publicação.

## Critérios De Aceitação

O ciclo estará concluído quando:

- 30 estações válidas estiverem disponíveis;
- os modos prova, treino dirigido e revisão funcionarem;
- cada estação visual apresentar todas as mídias necessárias;
- imagens puderem ser estudadas adequadamente em celular e computador;
- nenhuma estação pedir interpretação de recurso ausente;
- a progressão não interromper cronômetro ou gravação;
- a IA corrigir os novos checklists e salvar o resultado;
- o histórico recomendar casos conforme erros anteriores;
- todas as mídias tiverem licença e atribuição registradas;
- testes automatizados e verificações manuais passarem;
- o conjunto estiver publicado e funcional no GitHub Pages.

## Decisões Finais

- O formato padrão é híbrido e estruturado, sem examinador em tempo real.
- O primeiro banco ampliado terá 30 estações.
- Casos históricos, reescritos e inéditos coexistirão.
- Nomes de cursos não aparecerão no conteúdo publicado.
- Imagens e vídeos serão armazenados localmente com licença verificada.
- O modo prova ocultará domínio e diagnóstico.
- O usuário poderá voltar fases sem pausar tempo ou gravação.
- A IA avaliará ao final; o código continuará calculando a nota.
- O frontend continuará sem build e publicado no GitHub Pages.
- A infraestrutura segura existente do HistorIA-Med será reutilizada.
