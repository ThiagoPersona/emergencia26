# Auditoria do simulador e dos quatro simulados EmTalks

Data: 2026-09-25. Fontes: capturas locais em `EmTalks simulado/`, 52 JSONs em `Intensivao/praticas/data/estacoes/`, manifesto de mídia e testes do simulador. As fotos do curso não foram publicadas.

## Conclusão

**Os checklists online não são, em geral, iguais aos do curso.** O Trauma 4 foi conferido item a item: duas tarefas e 19 critérios com os mesmos pesos. Nos demais, o projeto preserva temas e parte da sequência, mas agrupa, redistribui ou atualiza critérios. Contagem igual não demonstra equivalência de redação e pontuação. A bolinha vermelha indica origem semelhante, não checklist literal.

| Simulado | Situação do curso | Cenário online correspondente | Checklist |
|---|---|---|---|
| 1 | Trauma | `emt-1-trauma-dupla-ameaca` | Adaptado: compressão, torniquete e confirmação agrupados; TC de corpo inteiro **ou** exames segmentados não cabem na soma simples atual. |
| 1 | Clínico/HDA | `emt-1-hda-varicosa` | Adaptado: exames e passos do balão foram agrupados. |
| 1 | Neuro/AVC | `emt-1-avci-pos-trombolise` | Adaptado: trombólise, contraindicações e reversão agrupadas; medida da bainha do nervo óptico do curso não está na estação. |
| 1 | Via aérea/bronquiolite | `emt-1-bronquiolite-iot` | Adaptado: tamanhos, doses e técnica do manequim agrupados. |
| 1 | Gestão | `emt-1-gestao-fluxo` | Adaptado: medidas de leitos, contrarreferência e fluxo agrupadas. |
| 2 | Obstetrícia/eclâmpsia | `sim-obst-eclampsia-01` | Correspondência temática, sem vínculo explícito ao simulado; pesos diferentes e condutas atualizadas. |
| 2 | POCUS/TVP | `emt-2-tvp-compressao` | Adaptado: técnica de compressão em três pontos condensada; imagem estática não prova compressibilidade, que é informada no caso. |
| 2 | Reanimação/TEP | `emt-2-tep-choque` | Adaptado: marcadores ecográficos e regra de citar quatro achados agrupados; achados são descritos em texto, sem eco. |
| 2 | Trauma pediátrico | `sim-trauma-pediatrico-01` | Correspondência temática, sem vínculo explícito; critérios e pesos diferentes. |
| 2 | Via aérea contaminada | `emt-2-via-aerea-suja` | Adaptado: passos individuais da aspiração e videolaringoscopia agrupados. |
| 3 | Clínico pediátrico/síndrome torácica | `emt-3-sindrome-toracica-aguda` | Adaptado: terapias, transfusão e limites de Hb agrupados. |
| 3 | POCUS pulmonar | `emt-3-pocus-consolidacao` | Adaptado: descrição de janelas, achados e diagnósticos alternativos agrupados. O curso pede exsudato provável pelo conjunto apresentado; a estação online diferencia probabilidade clínica de classificação definitiva pelo líquido pleural. |
| 3 | Reanimação materna | `sim-obst-pcr-materna-01` | Correspondência temática, sem vínculo explícito; passos da histerotomia de ressuscitação agrupados. |
| 3 | Trauma elétrico/queimaduras | `emt-3-queimadura-eletrica` | Adaptado: indução, volume e complicações agrupados; fórmula fixa do curso exige ressalva clínica. |
| 3 | Via aérea na obesidade | `emt-3-via-aerea-obesidade` | Adaptado: demonstração de rampa, fármacos, videolaringoscópio e bougie agrupada. |
| 4 | Cardio/IAM e arritmias | `emt-4-cardio-iam-arritmias` | Adaptado: ECG recebeu item próprio, pesos redistribuídos e mudança de vetor/desfibrilação dupla não são pontuadas como rotina. |
| 4 | Neuro/convulsão febril | `emt-4-neuro-febre-convulsao` | Adaptado: investigação, punção e terapias têm pesos e condicionantes diferentes. |
| 4 | POCUS/eFAST e pelve | `emt-4-pocus-pelve` | Treze itens em ambos, mas critérios finais e pesos não são idênticos. |
| 4 | Trauma torácico penetrante | `emt-4-trauma-torax-penetrante` | **Conferido: 19 itens, redação, ordem e pesos iguais ao checklist fornecido.** Caso e imagem foram adaptados. |
| 4 | Via aérea/OVACE lactente | `emt-4-ovace-lactente` | Adaptado: parte dos gestos manuais foi agrupada e pesos redistribuídos. |

## Fluxo e mídia

- Os 52 cenários somam 189 fases. Todos os JSONs atendem ao contrato visual, seus checklists totalizam 100 pontos e nenhuma referência de mídia aponta para ID ou arquivo inexistente. Isso verifica estrutura, **não** equivalência clínica integral.
- O modo prova oculta o título diagnóstico e os itens antes do início. As mídias do manifesto usam descrição neutra durante a resolução e interpretação detalhada na revisão.
- Corrigida nesta auditoria: a última fase do AVC pós-trombólise pedia interpretar TC sem apresentá-la. Agora libera TC de domínio público, identificada como amostra de outro paciente, e não antecipa a leitura no estado clínico.
- Pendente para maior fidelidade: no TEP do simulado 2, a fase de POCUS descreve os achados sem exibir ecocardiograma; no AVC do simulado 1, a tarefa original de medir bainha do nervo óptico não está reproduzida; na TVP, a compressibilidade é descrita porque a imagem disponível é estática. Não substituir esses exames por mídia que não demonstre o achado cobrado.
- A progressão é, em geral, coerente nos exemplos revisados: apresentação, intervenção/resultado e reavaliação. Ainda há diferenças entre as perguntas originais e as fases adaptadas, registradas na tabela. Uma auditoria semântica manual de cada fala possível não é coberta pelos testes automatizados.

## Decisões clínicas antes de igualar notas

- A diretriz [AHA 2025 para suporte avançado](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-advanced-life-support) afirma que a utilidade da mudança de vetor e da dupla desfibrilação na FV refratária ainda não está estabelecida; o checklist do Cardio 4 as pontua de modo afirmativo.
- A [diretriz pleural BTS 2023](https://thorax.bmj.com/content/78/Suppl_3/s1) usa análise do líquido (critérios de Light) para distinguir exsudato e transudato. No POCUS 3, pneumonia com derrame pode tornar exsudato provável clinicamente, mas a imagem isolada não o confirma.
- A [NICE NG39 de trauma maior](https://www.nice.org.uk/guidance/ng39/chapter/recommendations) prioriza hemocomponentes em sangramento ativo e limita cristaloides; limites fixos e fórmulas de cursos devem ser lidos no contexto do protocolo e da disponibilidade.
- Para pontuação literalmente idêntica, a rubrica precisa suportar alternativas e limites por grupo (por exemplo, TC de corpo inteiro **ou** exames segmentados; citar quatro de oito achados). A soma atual de itens independentes não reproduz esses casos sem distorção.

Nenhum checklist foi reponderado nesta auditoria. Antes de alterar notas históricas, decidir se a correção online deve seguir literalmente o curso ou a conduta atual, exibindo as diferenças na revisão.
