# Modulo de Prova Pratica TEME - Design

Data: 2026-08-09

Status: arquitetura aprovada pelo usuario

## Objetivo

Criar um metodo de treino individual para a segunda etapa do TEME, composta por estacoes praticas de cinco minutos corrigidas por checklist. O sistema deve reproduzir a pressao temporal da prova, gravar a resposta oral, transcrever o audio, confrontar a fala com o checklist da estacao e gerar uma devolutiva tecnica, transparente e longitudinal.

O resultado esperado nao e apenas um banco de casos. O modulo deve funcionar como um examinador auxiliar para treino deliberado: apresentar um cenario, ocultar a resposta, controlar o tempo, registrar a verbalizacao, apontar omissoes e selecionar revisoes conforme os erros recorrentes.

## Achados do acervo

O acervo local contem provas e relatos de estacoes TEME22-25, checklists oficiais de 2024-25 e simulacoes de dois cursos. A analise identificou os seguintes padroes:

- Via aerea/ventilacao, trauma e POCUS aparecem em todos os anos analisados.
- Reanimacao e emergencias cardiovasculares sao recorrentes.
- Uma estacao costuma variar entre pediatria, neurologia, toxicologia, sepse, obstetricia ou outro caso clinico.
- A banca atribui pontos separados para verbalizacao, diagnostico, dose/alvo, sequencia, reconhecimento visual e execucao manual.
- Uma conduta clinicamente correta pode nao pontuar se nao for verbalizada ou demonstrada.
- Procedimentos sao fragmentados em passos pequenos, cada um com pontuacao propria.
- Os materiais de cursinho sao uteis para criar cenarios, mas contem divergencias e possiveis erros. Eles nao serao tratados como gabarito oficial.

## Hierarquia de fontes

1. Checklists e documentos oficiais das estacoes TEME.
2. Referencias oficiais e diretrizes relacionadas ao edital vigente.
3. Relatos consistentes de candidatos sobre estacoes anteriores.
4. Materiais de cursos, usados para identificar formatos e criar simulacoes reescritas.
5. Atualizacoes clinicas, claramente separadas quando divergirem da resposta esperada pela banca.

Materiais de cursos nao serao publicados integralmente. Textos, imagens e checklists derivados deles serao reescritos e confrontados com fontes oficiais. Imagens publicadas no site devem ser oficiais com atribuicao, proprias ou produzidas especificamente para o projeto.

## Arquitetura aprovada

### Frontend de estudo

O frontend permanecera no projeto `C:\Projetos\Emergencia`, publicado no GitHub Pages. O leitor atual em Docsify sera ampliado, preservando o material teorico que ja funciona.

A barra lateral recebera um item de primeiro nivel chamado **PROVA PRATICA**, proximo de `INTENSIVAO`, para refletir a prioridade atual. A area tera os seguintes acessos:

- Inicio da prova pratica.
- Simular uma estacao.
- Roteiro universal de cinco minutos.
- Matriz da banca TEME22-25.
- Procedimentos e verbalizacao.
- Treino visual e equipamentos.
- Desempenho e revisao dirigida.

Arquivos previstos no frontend:

```text
Intensivao/
  PRATICAS.md
  praticas/
    SIMULADOR.md
    ROTEIRO_5_MIN.md
    MATRIZ_DA_BANCA.md
    PROCEDIMENTOS.md
    TREINO_VISUAL.md
    DESEMPENHO.md
    data/
      estacoes/
        <id-da-estacao>.json
  praticas-utils.js
  assets/
    praticas/
```

### Backend de IA

O backend sera implementado no projeto `C:\Projetos\HistorIA-Med`, que ja possui Next.js/Vercel, autenticacao Supabase, chave OpenAI protegida, transcricao com `gpt-4o-transcribe`, validacao de audio, controle de uso e tratamento de termos medicos.

O frontend publico nunca recebera a `OPENAI_API_KEY`. A chave permanecera apenas nas variaveis protegidas do Vercel.

O backend recebera uma rota dedicada ao treino TEME, separada da transcricao de atendimentos do HistorIA. Inicialmente, o acesso sera permitido apenas ao usuario autorizado por configuracao do servidor.

Fluxo da requisicao:

```text
GitHub Pages
  -> login Supabase
  -> grava audio por ate 5 minutos
  -> envia audio + estacao + versao do checklist
HistorIA-Med/Vercel
  -> valida usuario, origem, tamanho e tipo do arquivo
  -> transcreve em portugues medico
  -> avalia a transcricao contra o checklist
  -> devolve classificacao estruturada e evidencias
Supabase
  -> salva tentativa, resultado e ajustes manuais
GitHub Pages
  -> exibe correcao, calcula nota final e atualiza desempenho
```

## Autenticacao e seguranca

- O login utilizara a conta Supabase ja existente no HistorIA-Med.
- O frontend enviara o token de sessao como `Bearer` para a rota dedicada.
- A rota aceitara somente as origens explicitamente autorizadas do GitHub Pages e do ambiente local de desenvolvimento.
- O usuario sera validado no servidor e, na primeira versao, confrontado com uma allowlist de IDs autorizados.
- O endpoint tera limite de frequencia, limite de tamanho e duracao maxima ligeiramente superior a cinco minutos.
- Audio, transcricao e resultado usarao `Cache-Control: no-store`.
- O audio sera processado em memoria e descartado apos a transcricao. Nao sera salvo no banco na primeira versao.
- Logs tecnicos nao incluirao transcricao completa, checklist respondido ou conteudo do audio.
- A transcricao sera tratada como entrada nao confiavel. Frases como "ignore o checklist" nao poderao modificar as regras de avaliacao.
- A chave da API nao sera copiada para o repositorio Emergencia, HTML, JavaScript publico ou `localStorage`.

## Modelo de uma estacao

Cada estacao sera armazenada como dado estruturado versionado. O arquivo deve conter:

- identificador e versao;
- titulo e dominio;
- origem: oficial reconstruida, curso reescrito ou simulada;
- duracao em segundos;
- instrucoes ao candidato;
- telas ou fases progressivas do caso;
- imagens e equipamentos apresentados;
- tarefas solicitadas;
- checklist pontuado;
- erros criticos;
- resposta de referencia;
- referencias utilizadas.

Cada item do checklist deve informar:

- identificador estavel;
- acao esperada;
- criterio objetivo de cumprimento;
- pontuacao maxima;
- pontuacao parcial, somente quando prevista;
- natureza: verbal, visual, calculo, sequencia ou execucao fisica;
- se e um item critico;
- termos ou formulacoes equivalentes aceitaveis;
- erros que nao podem ser confundidos com a resposta correta.

Exemplo conceitual:

```json
{
  "id": "va-crico-indicacao",
  "label": "Indica cricotireoidostomia",
  "criterion": "Reconhece falha de intubacao e ventilacao e indica acesso frontal do pescoco",
  "points": 0.5,
  "partialPoints": 0,
  "type": "verbal",
  "critical": true,
  "acceptedConcepts": ["cricotireoidostomia", "via aerea cirurgica"]
}
```

## Experiencia de treino

### Antes da estacao

O usuario podera escolher:

- estacao especifica;
- dominio;
- estacao aleatoria;
- apenas estacoes ainda nao realizadas;
- revisao baseada em erros anteriores.

O checklist, a resposta e a pontuacao permanecerao ocultos.

### Durante a estacao

1. O sistema apresenta as orientacoes ao candidato.
2. O usuario autoriza o microfone.
3. O botao `Iniciar estacao` dispara simultaneamente o cronometro e a gravacao.
4. O cenario e mostrado em etapas semelhantes aos slides da prova.
5. O usuario avanca as tarefas por comando visivel, sem revelar respostas.
6. O cronometro permanece visivel e gera avisos discretos em dois minutos, um minuto e trinta segundos.
7. Aos cinco minutos, a gravacao e encerrada automaticamente.

O sistema nao exibira dicas clinicas durante o modo prova. Um modo de treino guiado podera existir separadamente, identificado de forma clara.

### Depois da estacao

1. O audio fica disponivel para reproducao local.
2. O sistema envia o audio para transcricao e avaliacao.
3. A transcricao completa e exibida ao usuario.
4. Cada item recebe classificacao, justificativa curta, evidencia textual e confianca.
5. Itens fisicos ficam pendentes de confirmacao manual.
6. O usuario confirma ou corrige os itens antes de fechar a tentativa.
7. A aplicacao calcula a pontuacao final de forma deterministica.
8. O relatorio e salvo e o painel longitudinal e atualizado.

## Avaliacao pela IA

A IA nao inventara diretamente a nota. Ela classificara as evidencias de cada item como:

- `cumprido`;
- `parcial`;
- `ausente`;
- `incorreto`;
- `nao_verificavel`.

Para cada item, a resposta estruturada contera:

- classificacao;
- trecho exato da transcricao usado como evidencia;
- justificativa objetiva;
- grau de confianca;
- alerta de erro critico, quando aplicavel.

A pontuacao sera calculada pelo codigo a partir do checklist versionado:

- `cumprido`: pontuacao integral;
- `parcial`: usa `partialPoints` somente quando o item o definir explicitamente; caso contrario, recebe zero ate revisao manual;
- `ausente` ou `incorreto`: zero;
- `nao_verificavel`: aguarda confirmacao manual.

Para itens de execucao fisica, verbalizar "estou realizando" prova apenas que o passo foi lembrado. O sistema exibira separadamente:

- lembrado/verbalizado;
- execucao confirmada pelo usuario.

Essa separacao impede que o audio seja usado como falsa comprovacao de habilidade manual.

## Relatorio tecnico

Cada tentativa produzira:

- nota total e percentual;
- nota por tarefa;
- desempenho por dominio;
- itens omitidos;
- doses ou alvos incorretos;
- erros de sequencia e prioridade;
- erros criticos;
- itens tecnicos confirmados manualmente;
- pontos positivos da resposta;
- resposta modelo curta, baseada no checklist e nas referencias;
- tres prioridades de revisao;
- comparacao com tentativas anteriores da mesma estacao.

O painel longitudinal mostrara:

- numero de estacoes realizadas;
- media geral e por dominio;
- evolucao temporal;
- itens mais frequentemente omitidos;
- erros criticos recorrentes;
- habilidades fisicas ainda nao confirmadas;
- estacoes recomendadas para a proxima sessao.

## Persistencia

O Supabase do HistorIA-Med armazenara uma tabela dedicada a tentativas praticas, protegida por RLS para que cada usuario leia e altere apenas seus registros.

Dados persistidos:

- usuario;
- estacao e versao;
- horario e duracao;
- transcricao;
- classificacao estruturada da IA;
- ajustes e confirmacoes manuais;
- pontuacao final;
- dominios avaliados;
- prioridades de revisao.

O audio bruto nao sera persistido na primeira versao.

## Falhas e modo degradado

O treino nunca dependera totalmente da IA para funcionar.

- Sem permissao de microfone: cronometro e autocorrecao manual continuam disponiveis.
- Falha de transcricao: o audio permanece temporariamente no navegador para nova tentativa ou reproducao.
- Falha da avaliacao: a transcricao e o checklist manual continuam disponiveis.
- Sem conexao: a estacao pode ser realizada, mas o envio e a correcao por IA exigem reconexao.
- Classificacao de baixa confianca: o item sera destacado para decisao do usuario.
- Alteracao do checklist: tentativas anteriores mantem a versao usada originalmente.

## Estrategia de conteudo

O banco sera desenvolvido em tres camadas:

1. **Estacoes historicas:** reconstrucoes TEME22-25 com o maior grau de fidelidade permitido pelos documentos existentes.
2. **Estacoes de treino:** cenarios dos cursos reescritos, corrigidos e convertidos para o formato oficial.
3. **Estacoes novas:** simulacoes criadas a partir da matriz de recorrencia e das lacunas do acervo.

As primeiras familias priorizadas serao:

1. Via aerea e ventilacao mecanica.
2. Trauma, hemorragia e procedimentos.
3. POCUS e acesso vascular.
4. Reanimacao e cardiovascular.
5. Casos clinicos variaveis: pediatria, neurologia, toxicologia, sepse/metabolico e obstetricia.

## Integracao com o material teorico

Cada item incorreto podera apontar para:

- secao exata do resumo teorico correspondente;
- procedimento relacionado;
- imagem ou curva para revisar;
- outra estacao que cobre a mesma competencia.

O modulo pratico nao duplicara capitulos teoricos extensos. Ele utilizara os resumos existentes como base de recuperacao apos o erro.

## Testes

### Frontend

- validacao do esquema das estacoes;
- cronometro e encerramento automatico em cinco minutos;
- gravacao, reproducao e descarte de audio;
- navegacao entre fases sem exposicao do checklist;
- calculo deterministico da pontuacao;
- confirmacao manual de itens fisicos;
- persistencia e restauracao da tentativa;
- layout em celular e desktop;
- funcionamento no GitHub Pages com rotas por hash.

### Backend

- autenticacao obrigatoria;
- allowlist inicial de usuario;
- CORS restrito;
- limites de arquivo, duracao, tipo e frequencia;
- transcricao em portugues;
- resposta estruturada valida;
- resistencia a instrucao maliciosa dentro da transcricao;
- descarte do audio apos processamento;
- logs sem conteudo sensivel;
- erros seguros sem exposicao de chave ou detalhes internos.

### Calibracao clinica

- criar transcricoes de referencia para cada estacao;
- testar resposta completa, parcial, ausente e explicitamente incorreta;
- comparar a classificacao da IA com o checklist manual;
- ajustar criterios equivalentes antes de liberar uma estacao;
- revisar manualmente itens com baixa concordancia;
- testar doses, unidades, negacoes e sequencias criticas.

## Fases de implementacao

1. Estruturar dados, paginas e matriz das estacoes.
2. Criar simulador local com cronometro, gravacao e checklist manual.
3. Criar autenticacao no frontend e rota segura no HistorIA-Med.
4. Integrar transcricao e avaliacao estruturada.
5. Criar persistencia e painel longitudinal.
6. Converter as estacoes historicas e os primeiros cenarios prioritarios.
7. Calibrar a IA com respostas de referencia e realizar verificacao mobile/desktop.

## Criterios de aceitacao

O primeiro ciclo estara concluido quando:

- uma estacao completa puder ser realizada sozinho em cinco minutos;
- o audio for gravado e reproduzido no celular e no computador;
- a transcricao identificar adequadamente termos, doses e siglas da estacao piloto;
- cada item do checklist mostrar evidencia e justificativa;
- a nota for calculada pelo checklist, nao por julgamento livre da IA;
- itens fisicos exigirem confirmacao manual;
- o relatorio for salvo e aparecer no painel;
- nenhuma chave secreta estiver presente no frontend ou repositorio publico;
- falhas da API permitirem concluir a autocorrecao manual;
- a estacao piloto estiver validada contra o checklist e as referencias utilizadas.

## Decisoes finais

- O estudo sera prioritariamente individual.
- A avaliacao por IA faz parte da primeira versao funcional.
- O frontend continuara no GitHub Pages.
- O backend reutilizara a infraestrutura segura do HistorIA-Med.
- A conta Supabase existente sera usada para autenticacao e sincronizacao.
- A IA produz classificacao provisoria e evidencias; o codigo calcula a nota.
- Acoes fisicas exigem confirmacao manual.
- Audio bruto nao sera armazenado inicialmente.
- O sistema sempre tera modo manual de contingencia.
