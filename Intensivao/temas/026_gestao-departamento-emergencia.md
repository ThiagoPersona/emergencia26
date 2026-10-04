# Gestão do Departamento de Emergência

## Leitura de 30 segundos

- **Superlotação é problema do hospital inteiro.** Pense em entrada, processamento e saída; o `boarding` de pacientes já internados costuma ser o principal determinante.
- **Classificar risco não é diagnosticar nem dispensar.** Manchester prioriza por gravidade/tempo-alvo; ESI combina gravidade e previsão de recursos.
- **Lean remove desperdício e melhora fluxo.** `Takt time = tempo disponível / demanda`; compare-o com o ciclo efetivo da etapa, considerando os recursos que trabalham em paralelo.
- **Capacidade igual à demanda não basta.** Com variabilidade e utilização próxima de 100%, a fila cresce de forma não linear.
- **Evento adverso pede cuidado imediato, notificação e aprendizagem sistêmica.** Cultura justa não é impunidade nem caça automática ao culpado.
- **Acreditação é externa, voluntária, periódica e orientada à melhoria contínua.** Não substitui licença sanitária nem auditoria interna.
- **Gestão é assistência.** Fluxo, equipe, informação, leitos, passagem de plantão e plano de contingência alteram desfechos clínicos.

## Por que cai

- **Recorrência:** provas TEME22-26 cobraram ESI, indicadores, regulação, escala de plantão, Resolução CFM 2.077/2014, Lean, takt time, acreditação, psicologia da espera, capacidade, superlotação, análise de causa raiz e Manchester como dado de governança.
- **Mudança no TEME26:** gestão deixou de ser apêndice de ética e virou bloco de alto retorno, com oito questões diretamente relacionadas a processo, qualidade e fluxo.
- **O que a banca testa:** reconhecer a ferramenta certa para o problema, separar entrada de `boarding`, interpretar capacidade e identificar alternativas que culpam pessoas ou prometem soluções isoladas.
- **Como aparece:** caso de um DE superlotado, painel de indicadores, incidente assistencial ou definição objetiva de uma ferramenta.

## Abordagem prática

### 1. Comece definindo o problema

Antes de propor solução, descreva o problema em uma frase mensurável:

> "Entre 14h e 20h, pacientes amarelos aguardam mediana de 110 minutos para avaliação médica, acima do tempo-alvo local, com crescimento de evasão antes do atendimento."

Uma boa definição contém:

1. população e período;
2. etapa do fluxo;
3. indicador;
4. tamanho do desvio;
5. consequência clínica ou operacional.

Evite frases vagas como "o pronto-socorro está caótico" ou soluções disfarçadas de problema, como "faltam mais dez leitos". Primeiro prove onde está a restrição.

### 2. Localize o gargalo: entrada, processamento ou saída

| Domínio | Exemplos | Indicadores úteis | Intervenções típicas |
|---|---|---|---|
| **Entrada (input)** | pico de demanda, epidemia, acesso ambulatorial insuficiente, chegada simultânea de ambulâncias | chegadas/hora, perfil de risco, taxa de ambulâncias, sazonalidade | plano de contingência, previsão de demanda, integração com rede |
| **Processamento (throughput)** | espera por médico, exame, interconsulta, medicação ou decisão | porta-médico, tempo até exame/laudo, tempo até decisão, LOS de altas | fluxo rápido selecionado, protocolos, coleta precoce, equipe por faixa horária |
| **Saída (output)** | paciente internado sem leito, atraso de alta, transferência bloqueada | tempo decisão-leito, número/horas de boarders, ocupação, LOS de internados | gestão de leitos, alta oportuna, rounds de fluxo, escalonamento hospitalar |

**Atalho de prova:** macas em corredor + pacientes já avaliados + demora para transferência interna = problema predominante de **saída/boarding**. Acelerar somente a triagem não libera leitos.

### 3. Faça um huddle operacional curto

O huddle não é reunião longa. Em poucos minutos, a equipe alinha:

- lotação atual e pacientes críticos;
- número de pacientes aguardando internação/UTI/transferência;
- exames, pareceres e altas travados;
- riscos imediatos: isolamento, agitação, deterioração, medicação tempo-dependente;
- responsável e prazo para cada ação;
- gatilho para ativar ou desativar contingência.

Use comunicação fechada: tarefa, responsável, prazo e confirmação. Sem dono e sem horário, a pendência vira paisagem.

### 4. Escolha a ferramenta pelo tipo de problema

| Pergunta | Ferramenta mais útil |
|---|---|
| Onde o paciente espera e o que agrega valor? | Mapa de fluxo de valor (VSM) |
| Qual etapa limita a vazão? | Takt time + tempo de ciclo + análise de capacidade |
| Há deslocamento físico desnecessário? | Diagrama de espaguete |
| Materiais estão desorganizados ou faltam no momento crítico? | 5S + gestão visual/kanban |
| Por que este evento ocorreu? | Análise de causa raiz + 5 porquês + Ishikawa |
| A mudança funciona em pequena escala? | PDSA/PDCA |
| Onde o processo pode falhar antes de causar dano? | FMEA/análise prospectiva de risco |
| Como acompanhar o serviço? | Painel balanceado de indicadores |

### 5. Termine toda intervenção com medida e reavaliação

Defina antes de mudar:

- indicador de resultado: o que se quer melhorar;
- indicador de processo: se a nova rotina está sendo executada;
- indicador de equilíbrio: qual efeito indesejado pode surgir;
- linha de base, meta, prazo e responsável.

Exemplo: reduzir porta-médico sem acompanhar retorno em 72 h, eventos adversos e tempo de permanência pode apenas transferir risco para outro ponto.

## Conceitos que sustentam a conduta

### Gestão Lean no DE

Lean busca maximizar valor para o paciente e reduzir atividades sem valor. Não significa cortar equipe indiscriminadamente.

**Princípios operacionais:**

1. definir valor do ponto de vista do paciente;
2. mapear a cadeia de valor;
3. criar fluxo contínuo quando possível;
4. ajustar produção à demanda;
5. melhorar continuamente.

**Valor não é simplesmente rapidez:** para o paciente, é receber cuidado indicado, seguro e oportuno. Não reduzir tempo retirando consentimento, identificação, higienização ou reavaliação. Separe atividade que agrega valor, atividade necessária por segurança/norma e desperdício evitável. Uma espera clinicamente indicada para observar resposta não equivale a aguardar um laudo esquecido.

**Os três Ms:** `muda` é desperdício; `mura`, irregularidade; `muri`, sobrecarga. Exemplo autoral: altas concentradas no fim do dia geram irregularidade, que sobrecarrega transporte/enfermagem e produz espera. Eliminar apenas a caminhada da equipe não resolve o acúmulo de pacientes sem destino. Respeito às pessoas e participação da linha de frente são parte da melhoria, não obstáculos.

**Desperdícios clássicos adaptados à emergência:**

| Desperdício | Exemplo no DE |
|---|---|
| Espera | paciente aguarda exame, parecer, medicação ou leito |
| Movimento | equipe percorre longas distâncias para buscar material |
| Transporte | paciente muda de setor sem necessidade clínica |
| Estoque | excesso, falta ou vencimento de insumos |
| Superprocessamento | registro duplicado e exames sem impacto na decisão |
| Defeito/retrabalho | prescrição incorreta, coleta repetida, informação perdida |
| Produção excessiva | solicitar exames antecipados sem indicação |
| Talento não utilizado | equipe treinada sem autonomia para resolver problemas |

#### Takt time, tempo de ciclo e gargalo

- **Takt time:** ritmo necessário para absorver a demanda.
- **Tempo de ciclo:** tempo necessário para uma etapa produzir uma unidade de atendimento.
- **Lead time:** tempo total do percurso definido, incluindo trabalho e esperas; no DE, definir se é chegada-saída ou apenas uma etapa. Não confundir com tempo de consulta.
- **Gargalo:** etapa cuja capacidade limita o fluxo total.

```text
Takt time = tempo disponível de operação / demanda esperada
Capacidade aproximada da etapa = número de recursos / tempo de ciclo
Ciclo efetivo = tempo de ciclo / número de recursos paralelos
Utilização = demanda / capacidade
```

Exemplo: há 240 minutos úteis e 40 pacientes esperados. `Takt = 240/40 = 6 minutos por paciente`. Com um único profissional e ciclo de 8 minutos, a capacidade é 7,5 pacientes/h e a etapa não acompanha a demanda de 10/h. Com dois profissionais equivalentes em paralelo, a capacidade agregada passa a 15 pacientes/h e o ciclo efetivo é 4 minutos por paciente.

**Pegadinha central:** com um único recurso, ciclo maior que takt indica incapacidade. Com recursos paralelos, compare o **ciclo efetivo** com o takt ou, de forma equivalente, a **capacidade agregada** com a demanda. Se a capacidade for exatamente igual à demanda, qualquer variabilidade cria espera. Por isso, sistemas urgentes precisam de folga operacional.

**Limites do cálculo:** recursos devem ser equivalentes e realmente disponíveis; a mesma pessoa não pode contar simultaneamente em consulta, reanimação e procedimentos. Pausas, retrabalho e interrupções reduzem capacidade. Takt organiza capacidade, não impõe consulta de seis minutos a todos. A emergência tem gravidade/tempos variáveis: estratifique demanda e preserve prioridade clínica.

**Gargalo não é qualquer etapa com ciclo maior que takt:** isso mostra insuficiência local para aquela demanda. A restrição dominante exige comparar capacidade de todas as etapas, filas e bloqueios; se várias são insuficientes, não há um único gargalo demonstrado. Otimizar uma etapa não restritiva pode apenas aumentar a fila seguinte.

#### Lei de Little

Em regime estável:

```text
Pacientes no sistema = taxa média de chegada x tempo médio no sistema
L = lambda x W
```

Se chegam 10 pacientes/h e o LOS médio é 6 h, haverá em média 60 pacientes no sistema. Reduzir LOS reduz o censo simultâneo, mesmo sem ampliar área física.

Use médias, mesma população, mesma fronteira e unidades compatíveis. Não multiplicar chegada/h por permanência em minutos sem converter; nem usar mediana no lugar da média. Em acúmulo crescente, a hipótese de regime estável falha: a conta não prevê o censo instante a instante. Leito físico sem equipe/material não é capacidade assistencial disponível.

#### Uma conta de fluxo que a prova pode cobrar

Exemplo autoral, capacidade ideal sem interrupções: chegam 12 pacientes/h; dois médicos com ciclo de 8 min oferecem 15/h; uma etapa de coleta com ciclo de 6 min oferece 10/h. Se todos necessitassem coleta, ela seria a restrição entre essas etapas. Aumentar para três médicos não eleva a saída além de 10/h. Na vida real, só parte dos pacientes usa cada recurso: aplicar demanda específica da etapa, não a chegada total indiscriminadamente.

Se houver 30 pacientes com permanência média de 3 h em regime estável, a vazão média é 10/h. Isso não significa que cada profissional atende dez por hora: é uma medida do sistema definido.

### 5S, VSM, kanban e gestão visual

**5S:**

1. **Seiri - utilização:** manter o necessário.
2. **Seiton - ordenação:** cada item em local definido e acessível.
3. **Seiso - limpeza:** identificar e eliminar fontes de sujeira/falha.
4. **Seiketsu - padronização:** tornar o estado correto visível e reproduzível.
5. **Shitsuke - disciplina:** sustentar, auditar e melhorar.

**VSM:** representa etapas, esperas, informação e tempo que agrega ou não valor ao percurso. Não é mapa de custos isolados.

**Kanban:** sinaliza estado e necessidade de reposição/ação. Em fluxo de pacientes, pode mostrar pendências e destino; não deve expor dados sensíveis em área pública.

**Gestão visual:** mostra risco, meta, capacidade e pendências de forma simples. Painel sem rotina de resposta é decoração.

#### Ferramentas Lean sem confundir nomes

| Conceito | Significado | Exemplo autoral no DE |
|---|---|---|
| Gemba | Observar onde o trabalho acontece antes de propor mudança | Acompanhar o percurso de uma amostra de pacientes, sem exposição de dados |
| Kaizen | Melhoria contínua com participação da equipe | Testar posição de insumos e medir busca/deslocamento |
| Trabalho padronizado | Melhor método atual, documentado e revisável | Sequência segura de preparo/coleta; exceções clínicas explícitas |
| Poka-yoke | Prevenir ou detectar erro no desenho do processo | Conector incompatível com via errada; alerta simples é menos robusto |
| Jidoka | Detectar anormalidade e interromper o processo defeituoso | Não liberar amostra com identificação divergente; corrigir antes de prosseguir |
| Andon | Sinal visível que chama ajuda para anormalidade | Acionamento de equipe quando espera/risco ultrapassa gatilho |
| Heijunka | Nivelar carga evitável | Distribuir eletivos e organizar altas ao longo do dia, sem atrasar urgência |

**Fluxo puxado versus empurrado:** no puxado, a etapa seguinte sinaliza necessidade/capacidade para receber trabalho. Encaminhar todos para uma sala já cheia é empurrar congestionamento, não melhorar fluxo. Em saúde, nunca usar falta de sinal/kanban para negar estabilização urgente; acionar contingência e manter responsável pelo paciente.

**Kanban de duas caixas:** ao consumir a primeira, seu sinal inicia reposição enquanto a segunda cobre o prazo de abastecimento. Dimensionar por consumo, prazo e margem de segurança; não esperar ambas esvaziarem. Lean não significa estoque zero de material crítico.

**Padronização não é engessamento:** registrar indicação, responsável, sequência, critérios de exceção e revisão. Primeiro testar com a equipe; depois treinar, disponibilizar materiais e acompanhar adesão. A rotina é uma base para melhorar, não justificativa para ignorar julgamento clínico.

**Lean e Six Sigma:** Lean enfatiza fluxo e desperdício; Six Sigma, redução de variação/defeitos por método analítico. Podem ser combinados. DMAIC significa definir, medir, analisar, melhorar e controlar; não é sinônimo de PDSA nem de análise retrospectiva de um único incidente.

### Classificação de risco

Classificação de risco:

- prioriza por urgência, não por ordem de chegada;
- é dinâmica e exige reavaliação se houver piora ou espera prolongada;
- não é diagnóstico médico definitivo;
- não autoriza dispensar o paciente sem avaliação médica nos serviços abrangidos pela Resolução CFM 2.077/2014;
- gera dados úteis sobre demanda, gravidade, tempos e gargalos.

#### Manchester x ESI

| Sistema | Lógica central | O que não confundir |
|---|---|---|
| **Manchester (MTS)** | queixa/fluxograma, discriminadores e prioridade clínica com tempo-alvo | não estima diretamente o consumo de recursos como eixo principal |
| **Emergency Severity Index (ESI)** | primeiro identifica risco imediato/alto risco; nos níveis menos graves, estima recursos necessários | não é apenas uma escala de cores/tempo |

Tempos clássicos do Manchester:

| Cor | Prioridade | Tempo-alvo para avaliação médica |
|---|---|---:|
| Vermelho | Emergência | Imediato |
| Laranja | Muito urgente | 10 min |
| Amarelo | Urgente | 60 min |
| Verde | Pouco urgente | 120 min |
| Azul | Não urgente | 240 min |

> **Atenção normativa:** a Resolução CFM 2.077/2014 estabelece, para os serviços hospitalares que abrange, acesso imediato à classificação e referência de até 120 minutos para acesso médico na categoria de menor urgência. Para prova, leia exatamente qual norma ou protocolo está sendo perguntado.

**Sequência do ESI:** necessidade de intervenção salvadora imediata leva ao nível 1; alto risco ou comprometimento importante leva ao 2, antes de contar recursos. Nos demais, previsão de dois ou mais recursos sugere nível 3; um, nível 4; nenhum, nível 5. Sinais vitais e população podem exigir elevar prioridade. Contagem é por categorias do manual, não por número de tubos coletados; história/exame não tornam todo paciente ESI 4. Usar a versão adotada e treinamento, não converter automaticamente cor Manchester em número ESI.

**Uso gerencial correto:** distribuição por cor não prova, sozinha, erro de protocolo, superclassificação ou necessidade de trocar o sistema. Cruze com adesão aos tempos-alvo, desfechos, internação, consumo de recursos e auditoria das classificações.

### Superlotação e boarding

- **Crowding/superlotação:** demanda por espaço, equipe ou recursos excede a capacidade de atendimento oportuno.
- **Boarding:** paciente permanece no DE após decisão de internação/transferência, aguardando destino adequado.
- **Paciente vertical:** consegue aguardar e receber parte do cuidado sentado, se clinicamente seguro.
- **Paciente horizontal:** necessita maca/leito; consome espaço físico escasso e exige vigilância proporcional.

O modelo entrada-processamento-saída evita soluções simplistas. Baixa complexidade pode contribuir para demanda, mas pacientes internados bloqueando leitos costumam exercer impacto maior sobre superlotação.

Medidas hospitalares de maior alcance:

- rounds de fluxo com direção, NIR, enfermarias, diagnóstico e DE;
- previsão de altas e alta mais cedo, sem alta insegura;
- nivelamento de cirurgias/eletivos ao longo da semana;
- serviços diagnósticos e transporte interno compatíveis com picos;
- plano de capacidade plena e escalonamento progressivo;
- leitos de retaguarda e responsabilidade compartilhada do paciente internado;
- transferência regulada quando a instituição não oferece continuidade adequada.

### Qualidade: estrutura, processo e resultado

Modelo de Donabedian:

- **Estrutura:** equipe, espaço, equipamentos, leitos, tecnologia.
- **Processo:** o que foi feito e com que adesão, como antibiótico no tempo adequado.
- **Resultado:** mortalidade, retorno, dano, satisfação, tempo de permanência.

Um painel útil mistura dimensões:

| Dimensão | Exemplos |
|---|---|
| Acesso | porta-classificação, porta-médico, abandono sem atendimento |
| Fluxo | LOS de alta, LOS de internado, decisão-leito, horas de boarding |
| Segurança | eventos adversos, deterioração na espera, atraso de medicação crítica |
| Efetividade | adesão a protocolo, mortalidade ajustada, retorno não programado |
| Experiência | atualização sobre espera, reclamações, comunicação |
| Pessoas | absenteísmo, rotatividade, violência, afastamento, treinamento |

**Indicador isolado engana.** Mediana descreve o centro, percentil 90 mostra a cauda de espera, e a média sofre com extremos. Sempre estratifique por turno, risco, destino e população.

| Indicador operacional | Definição e cuidado |
|---|---|
| Porta-médico | Chegada até primeira avaliação; definir marco e estratificar risco |
| Boarding | Decisão de internação até saída efetiva do DE; não todo o LOS |
| Evasão antes de atendimento | Pacientes que saem antes da avaliação / população elegível; definir exclusões |
| Retorno em 72 h | Retornos não programados / altas elegíveis; não prova erro em cada retorno |
| Ocupação | Pacientes/leitos operacionais, no mesmo instante ou período; capacidade física não basta |
| Taxa de internação | Internações / atendimentos elegíveis; depende do perfil clínico |

NEDOCS e outras escalas podem acompanhar superlotação, mas não substituem avaliação de risco local nem indicam sozinhas uma intervenção universal. Evitar metas que premiem apenas alta precoce, escondam pacientes em outra área ou excluam esperas longas do denominador.

**Série temporal:** gráfico de acompanhamento (`run chart`) organiza dados no tempo, com mediana de referência e marcação das mudanças. Carta de controle acrescenta limites calculados e regras de interpretação; limites de controle não são metas clínicas. Variação comum pede revisão do sistema; causa especial pede investigação do evento/contexto. Dois pontos “antes e depois” não demonstram melhoria sustentada, e aumento de notificações pode indicar cultura mais aberta, não mais dano.

### PDSA/PDCA e melhoria contínua

1. **Planejar:** problema, hipótese, medida, meta e pequena mudança.
2. **Executar:** testar em escala limitada.
3. **Estudar/checar:** comparar resultado com linha de base e procurar efeitos indesejados.
4. **Agir/ajustar:** adotar, adaptar ou abandonar; iniciar novo ciclo.

Não implemente em todo o hospital antes de testar processo novo, salvo intervenção de segurança que não possa esperar.

**Modelo de melhoria (IHI):** o que queremos alcançar; como saberemos que melhorou; que mudança pode produzir melhoria. No PDSA, explicitar previsão e comparar aprendizado, não apenas “fizemos uma reunião”. PDCA e PDSA são relacionados, mas `Study` destaca estudo do resultado, não só cumprimento da regra.

Exemplo autoral: testar por dois turnos uma sinalização para laudos prontos, buscando reduzir a mediana laudo-decisão de 50 para 30 min em quatro semanas. Processo: proporção de laudos sinalizados. Resultado: tempo laudo-decisão. Equilíbrio: interrupções, decisão precipitada e reavaliações omitidas. Conferir aderência e causas de falha antes de expandir; não anunciar sucesso apenas porque um turno foi melhor.

### Medidas epidemiológicas e indicadores

- **Incidência:** casos novos em uma população sob risco durante um período. Responde "quantos adoeceram agora?".
- **Prevalência:** total de pessoas com a condição em um ponto ou período. Responde "quantos têm a condição?".
- **Taxa:** incorpora uma dimensão de tempo no denominador.
- **Proporção:** numerador está contido no denominador; varia de 0 a 1 ou 0 a 100%.
- **Razão:** compara grandezas; o numerador não precisa estar contido no denominador.

Para gestão, defina numerador, denominador, janela temporal, fonte do dado e regra de inclusão. "Número de eventos" sem volume assistencial pode aumentar apenas porque o serviço atendeu mais.

### Acreditação

Acreditação é:

- avaliação externa por entidade independente;
- adesão voluntária;
- caráter periódico;
- baseada em padrões previamente definidos;
- orientada à qualidade, segurança e melhoria contínua;
- não fiscalizatória e não substitui licenciamento sanitário.

Na ONA, os níveis progridem da segurança dos processos para gestão integrada e maturidade/excelência organizacional. Evite decorar nomes sem entender a progressão.

| Nível ONA | Nome | Ênfase |
|---|---|---|
| 1 | Acreditado | Qualidade e segurança |
| 2 | Acreditado Pleno | Gestão integrada entre processos |
| 3 | Acreditado com Excelência | Maturidade e melhoria contínua |

A acreditação não obriga usar Lean como única metodologia nem garante ausência de eventos adversos. O manual antigo listado ao final é referência histórica, não declaração de edição vigente em 2026.

### Segurança do paciente e cultura justa

| Situação | Definição prática |
|---|---|
| Circunstância notificável | potencial importante de dano, mesmo sem incidente consumado |
| Near miss/quase erro | incidente não alcançou o paciente |
| Incidente sem dano | alcançou o paciente, mas não causou dano discernível |
| Evento adverso | incidente alcançou o paciente e causou dano |

Exemplo TEME26: insulina em dose dez vezes maior alcançou o paciente e causou hipoglicemia grave revertida. É **evento adverso**, ainda que sem sequela permanente.

#### Resposta imediata ao evento

1. cuide do paciente e mitigue o dano;
2. comunique a liderança e acione o NSP conforme fluxo;
3. preserve equipamentos, registros e cronologia;
4. comunique paciente/família conforme política institucional;
5. notifique sem adulterar prontuário;
6. analise fatores contribuintes e implante barreiras;
7. acompanhe se a barreira reduziu recorrência.

#### Cultura justa

- **Erro humano:** consolar, corrigir sistema e treinar quando necessário.
- **Comportamento de risco:** orientar, remover incentivos ao atalho e redesenhar barreiras.
- **Conduta temerária/violação consciente injustificável:** responsabilização proporcional.

Cultura justa não elimina responsabilidade individual. Ela evita tratar toda falha como desvio moral e também evita normalizar violação deliberada.

#### Análise de causa raiz e Ishikawa

Ishikawa organiza fatores em categorias como método, mão de obra, máquina, material, medição e meio ambiente. A ferramenta amplia hipóteses; sozinha, não prova causalidade.

Perguntas úteis:

- O que aconteceu e qual foi o dano?
- Quais barreiras deveriam impedir o evento?
- Por que cada barreira falhou?
- Que condições latentes favoreceram a falha?
- Qual ação reduz risco de recorrência sem depender apenas de memória?

Escolha ações pela força da barreira e pelo risco residual:

| Força | Exemplos | Como interpretar |
|---|---|---|
| **Barreiras fortes** | função de bloqueio/`hard stop`, incompatibilidade física, automação segura, eliminar ou substituir a etapa perigosa | independem menos da memória e da vigilância humana |
| **Barreiras intermediárias** | padronização, simplificação, diferenciação de embalagens, redundância e dupla checagem independente em situações selecionadas de alto risco | reduzem risco, mas ainda dependem parcialmente do comportamento humano |
| **Barreiras fracas** | alerta genérico, memorando, treinamento ou "reorientar a equipe" isoladamente | úteis como apoio, porém frágeis se forem a única ação |

Dupla checagem não é sinônimo de barreira forte: deve ser realmente independente, reservada a pontos críticos e associada, quando possível, a desenho de sistema mais robusto.

**Ferramentas de análise:** Pareto prioriza categorias mais frequentes; a regra 80/20 é heurística, não proporção obrigatória nem medida de gravidade. Cinco porquês exploram causas, mas não provam uma única raiz. FMEA prospectiva avalia modos de falha, efeitos e barreiras antes do dano; produto gravidade x ocorrência x detecção ajuda priorizar, mas não elimina falha catastrófica só porque é rara. RCA retrospectiva precisa terminar em ação, responsável e verificação.

**Notificação externa não é o primeiro cuidado:** pela RDC 36/2013, eventos adversos com óbito são notificados em até 72 h; demais notificações seguem até o 15º dia útil do mês seguinte. A comunicação interna e mitigação devem ser imediatas. NSP organiza o processo conforme sistema/orientação Anvisa; não aguardar conclusão completa da investigação para a notificação inicial.

### Psicologia da espera e experiência do paciente

A espera parece maior quando é:

- sem explicação;
- incerta;
- desconfortável;
- solitária;
- percebida como injusta;
- iniciada sem reconhecimento da chegada.

Conduta útil:

- reconhecer o paciente;
- informar prioridade clínica e lógica da fila;
- fornecer estimativa realista, sem prometer "em breve";
- atualizar quando houver mudança;
- tratar dor, náusea, sede/jejum e necessidades básicas quando seguro;
- reavaliar clinicamente quem espera.

Comunicação melhora experiência, mas não substitui correção do risco assistencial.

### Rede, regulação, vaga zero e plantões

- A rede não exige passagem sequencial obrigatória por UBS, UPA e hospital. O destino deve corresponder à necessidade clínica e à regulação.
- Núcleo Interno de Regulação organiza acesso e leitos, mas não elimina comunicação entre médico solicitante, regulador e receptor.
- **Vaga zero** é recurso excepcional do médico regulador para risco de morte ou sofrimento intenso quando o destino de referência é necessário. A unidade receptora estabiliza e, se não puder dar continuidade, mantém articulação com a regulação.
- Transferência não é abandono quando há estabilização proporcional, documentação, comunicação e transporte compatível.
- Passagem de plantão deve ocorrer médico a médico, com ciência dos pacientes sob responsabilidade.
- A escala de plantão é documento de responsabilidade. O plantonista não deixa o serviço antes da chegada efetiva do substituto; falta ou impossibilidade deve ser comunicada e coberta formalmente.

> **Resposta de prova TEME25:** na normatização cobrada pela questão, unidades do Programa de Atenção Básica Ampliada podem manter observação por até 8 horas. Na prática, confirme a modalidade real do serviço e a norma vigente/local; não transforme esse número em autorização para manter paciente sem capacidade assistencial adequada.

### Governança e Resolução CFM 2.077/2014

Pontos de alto rendimento para serviços hospitalares de urgência e emergência abrangidos pela resolução:

- classificação de risco obrigatória e acesso imediato;
- todo paciente deve ser atendido por médico;
- coordenador médico de fluxo necessário acima de 50.000 atendimentos/ano;
- passagem de plantão médico a médico e registro completo obrigatórios;
- permanência máxima de 24 h no DE, seguida de alta, internação ou transferência;
- paciente não deve permanecer mais de 4 h na sala de reanimação;
- referência desejável de até 3 pacientes/hora/médico no primeiro atendimento, usada para dimensionamento, não como cadência rígida;
- sala de reanimação: anexo descreve mínimo de 2 leitos por médico no local e manutenção dessa proporção; não interpretar como autorização para deixar médico sozinho com qualquer número de críticos;
- observação: referência mínima de 1 médico para 8 leitos;
- superlotação, falta de leito de UTI e chegada em vaga zero exigem acionamento do coordenador de fluxo ou diretor técnico.

O coordenador de fluxo exerce função exclusivamente administrativa, acompanha tempos, exames, altas, leitos e segurança. Não se confunde com o chefe do serviço nem define sozinho a indicação clínica de UTI.

## Fluxogramas

### Diagnóstico da superlotação

```mermaid
flowchart TD
    A[DE superlotado] --> B[Medir demanda, censo, LOS e boarding]
    B --> C{Onde está a restrição dominante?}
    C -->|Entrada| D[Picos, sazonalidade, ambulâncias e rede]
    C -->|Processamento| E[Médico, exames, pareceres, medicação e decisão]
    C -->|Saída| F[Internação, leito, alta e transferência]
    D --> G[Plano de contingência e capacidade por faixa horária]
    E --> H[VSM, takt, ciclo, protocolos e equipe]
    F --> I[Gestão hospitalar de leitos e plano de capacidade plena]
    G --> J[Definir indicador, meta e balanceamento]
    H --> J
    I --> J
    J --> K[Testar em PDSA e reavaliar]
```

### Resposta a incidente assistencial

```mermaid
flowchart TD
    A[Incidente identificado] --> B[Cuidar do paciente e conter dano]
    B --> C[Comunicar liderança e NSP]
    C --> D{Atingiu o paciente?}
    D -->|Não| E[Near miss]
    D -->|Sim, sem dano| F[Incidente sem dano]
    D -->|Sim, com dano| G[Evento adverso]
    E --> H[Notificar e analisar conforme risco]
    F --> H
    G --> H
    H --> I[Causa raiz: fatores humanos, processo, tecnologia e ambiente]
    I --> J[Implantar barreiras fortes]
    J --> K[Medir recorrência e sustentar melhoria]
```

## Alvos, fórmulas e números

| Item | Número/fórmula | Observação TEME |
|---|---:|---|
| Takt time | tempo disponível / demanda | ritmo necessário, não duração real da tarefa |
| Etapa insuficiente para a demanda | ciclo efetivo > takt | restrição dominante exige comparação do fluxo inteiro |
| Lei de Little | L = lambda x W | censo = chegada x permanência, em sistema estável |
| Utilização | demanda / capacidade | perto de 100%, variabilidade aumenta fila |
| Manchester | 0/10/60/120/240 min | vermelho/laranja/amarelo/verde/azul |
| Coordenador de fluxo CFM 2.077 | > 50.000 atendimentos/ano | função médica administrativa |
| Permanência no DE | até 24 h | depois alta, internação ou transferência |
| Sala de reanimação | até 4 h | referência normativa |
| Primeiro atendimento | até 3 pacientes/h/médico | referência desejável de dimensionamento |
| Reanimação, redação do anexo CFM | mínimo de 2 leitos/médico, mantendo proporção | equipe exclusiva e dimensionamento seguro pela demanda |
| Observação | 1 médico/8 leitos | referência mínima do anexo |
| Óbito por evento adverso | notificação em até 72 h | RDC Anvisa 36/2013 |

## Pegadinhas TEME

- **Lean = cortar custo/pessoal:** falso. O foco é valor, fluxo e desperdício.
- **Takt time = tempo que o profissional leva:** falso. Isso é tempo de ciclo.
- **Tempo de ciclo menor que takt gera gargalo:** falso. Para recurso único, o problema é ciclo maior que takt; com recursos paralelos, use ciclo efetivo ou capacidade agregada.
- **Toda etapa lenta é o gargalo dominante:** falso; confirmar a restrição no fluxo completo e na demanda específica.
- **Lead time é só tempo de atendimento:** falso; inclui esperas no percurso definido.
- **Just-in-time significa não manter material de emergência:** falso; reposição exige prazo e reserva segura.
- **Andon é a mesma coisa que poka-yoke:** falso; um sinaliza anormalidade, o outro previne/detecta erro no processo.
- **Limite de controle é meta assistencial:** falso; descreve variação do processo, não o que é clinicamente aceitável.
- **Capacidade igual à demanda resolve a fila:** falso diante de variabilidade.
- **VSM é mapa de custos:** falso. Mapeia fluxo, informação, espera e valor.
- **5S é segurança, sobrecarga, satisfação, sistematização e sinalização:** falso; é acrônimo inventado.
- **Manchester prevê recursos como o ESI:** falso.
- **Distribuição por cores prova erro do protocolo:** falso sem auditoria e desfechos.
- **Superlotação se resolve acelerando triagem:** falso quando há boarding.
- **Desviar baixa complexidade sempre é a medida mais efetiva:** falso; depende do gargalo.
- **Acreditação é fiscalização obrigatória e definitiva:** falso; é externa, voluntária e periódica.
- **Paciente recuperado sem sequela sofreu near miss:** falso se houve dano e intervenção.
- **Cultura justa significa não responsabilizar ninguém:** falso.
- **Análise de causa raiz procura quem errou:** falso; procura fatores e barreiras, sem excluir conduta temerária quando existente.
- **Indicador melhorou, então qualidade melhorou:** falso sem indicador de equilíbrio e contexto.

## Erros fatais na prática

- Deixar paciente deteriorar na espera sem reclassificação.
- Manter internados no DE sem responsável, prescrição, reavaliação e plano de escalonamento.
- Tratar boarding como problema exclusivo da equipe da emergência.
- Aumentar entrada sem criar capacidade a jusante e piorar o congestionamento.
- Punir automaticamente quem notificou e destruir a cultura de segurança.
- Ocultar incidente, alterar registro ou atrasar cuidado para discutir responsabilidade.
- Usar painel com dados nominais expostos a pacientes e visitantes.
- Fazer passagem de plantão sem pendências, riscos e plano se houver piora.
- Criar protocolo sem treinamento, auditoria, responsável e data de revisão.
- Confundir velocidade com segurança e dar alta sem comunicação ou seguimento.

## Para prova vs. na prática

> **Para prova TEME:** takt é tempo disponível/demanda; ciclo efetivo maior que takt mostra capacidade insuficiente daquela etapa, e o gargalo dominante exige analisar o fluxo completo. Operação a 100% é vulnerável à variabilidade; Manchester prioriza por urgência/tempo e ESI conta recursos só após excluir níveis graves. Boarding exige gestão hospitalar; acreditação é externa e periódica; evento com dano não é near miss; causa raiz precisa produzir barreiras e acompanhamento.
>
> **Na prática clínica:** escolha indicadores, metas, escalas e gatilhos segundo população, contrato, protocolo local e maturidade de dados. A Resolução CFM 2.077/2014 traz referências normativas para serviços hospitalares; UPA, APH e outros cenários têm regulamentação própria. Mudanças de fluxo devem ser monitoradas quanto a segurança, equidade e efeitos indesejados.

## Referências

Revisão editorial: 04/10/2026. Exemplos numéricos e aplicação das ferramentas ao DE são adaptações autorais para estudo; não são metas universais nem substituem norma local.

**Prova e material local**

- Provas e gabaritos oficiais TEME22-26 disponíveis no projeto.
- Tratado de Medicina de Emergência ABRAMEDE, capítulos "Protocolos de classificação de risco", "Normatizações e resoluções aplicadas à medicina de emergência no Brasil" e "Acreditação no departamento de emergência".
- Medicina de Emergência HCFMUSP, 18ª ed., abordagem inicial/classificação de risco e comunicação/handoff.

**Normas e fontes oficiais**

- [Resolução CFM 2.077/2014: texto e anexo oficiais](https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2014/2077_2014.pdf).
- [RDC Anvisa 36/2013](https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2013/rdc0036_25_07_2013.html).
- [Segurança do paciente - Anvisa](https://www.gov.br/anvisa/pt-br/assuntos/servicosdesaude/seguranca-do-paciente/seguranca-do-paciente).
- [Lean nas Emergências - Ministério da Saúde](https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/l/lean-nas-emergencias).
- [Diagrama de Ishikawa - Ministério da Saúde](https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/l/lean-nas-emergencias/ferramentas/diagrama-causa-efeito-ishikawa-ou).
- [Manual das Organizações Prestadoras de Serviços de Saúde - ONA](https://www.ona.org.br/uploads/LIVRO_ONA_-_FINAL_16-03-2021.pdf).
- [ONA: conceito e níveis de acreditação, página consultada em 2026](https://ona.org.br/jornadas/acreditacao/sobre).
- [Anvisa: prazos e fluxo de notificação de incidentes](https://www.gov.br/anvisa/pt-br/acessoainformacao/perguntasfrequentes/servicos-de-saude/notificacao-de-incidentes-e-eventos-adversos-relacionados-a-assistencia-a-saude).

**Lean e melhoria: fontes de aprofundamento**

- [Ministério da Saúde: ferramentas do Lean nas Emergências](https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/l/lean-nas-emergencias/ferramentas).
- [Lean Enterprise Institute: takt time](https://www.lean.org/lexicon-terms/takt-time/), [tempo de ciclo](https://www.lean.org/lexicon-terms/cycle-time/) e [trabalho padronizado](https://www.lean.org/lexicon-terms/standardized-work/).
- [LEI: muda, mura e muri](https://www.lean.org/lexicon-terms/muda-mura-muri/), [gemba](https://www.lean.org/lexicon-terms/gemba/) e [heijunka](https://www.lean.org/lexicon-terms/heijunka/).
- [LEI: prevenção de erros/poka-yoke](https://www.lean.org/lexicon-terms/error-proofing/) e [jidoka](https://www.lean.org/lexicon-terms/jidoka/).
- [LEI: kanban](https://www.lean.org/lexicon-terms/kanban/) e [andon](https://www.lean.org/lexicon-terms/andon/).
- [ASQ: DMAIC](https://asq.org/quality-resources/dmaic) e [FMEA](https://asq.org/quality-resources/fmea).
- [IHI: modelo de melhoria](https://www.ihi.org/library/model-for-improvement) e [planilha PDSA](https://www.ihi.org/library/tools/plan-do-study-act-pdsa-worksheet).
- [IHI: gráfico de acompanhamento](https://www.ihi.org/library/tools/run-chart-tool) e [interpretação de variação e cartas de controle](https://www.ihi.org/learn/courses/open-school/catalog/qi-104).
- [ENA: ESI, 5ª edição, material oficial de treinamento](https://www.ena.org/education/emergency-nursing-triage-education-program/triage-portfolio).
- [ENA: manual ESI 5ª edição, cópia disponibilizada pelo EMSC](https://emscimprovement.center/documents/2177/Emergency_Severity_Index_Handbook.pdf).

**Atualização clínica e operacional**

- [Emergency Department Boarding and Crowding - ACEP](https://www.acep.org/administration/crowding--boarding).
- [Improving Patient Flow and Reducing Emergency Department Crowding - AHRQ](https://www.ahrq.gov/research/findings/final-reports/ptflow/index.html).
- Kelen GD, Wolfe R, D'Onofrio G, et al. Emergency department crowding: the canary in the health care system. *NEJM Catalyst*. 2021.
- Boudi Z, Lauque D, Alsabri M, et al. Association between boarding in the emergency department and in-hospital mortality: a systematic review. *PLoS One*. 2020;15:e0231253.
