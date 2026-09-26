# Auditoria dos simulados EmTalks no simulador

Revisada em 2026-09-26. Fontes editoriais: imagens e casos locais em `EmTalks simulado/` (simulados 1 a 5), banco em `Intensivao/praticas/data/estacoes/`, manifesto de mídia e testes. As capturas do curso não são publicadas.

## Escopo e resultado

Os cinco simulados correspondem a 25 cenários online, cinco por simulado. Os 20 cenários dos simulados 1 a 4 foram rechecados contra as capturas e revisados: perguntas, ordem, granularidade e pesos dos itens do checklist foram alinhados à fonte. Os cinco cenários do simulado 5 já tinham comparação item a item. Cada checklist soma 100 pontos. Casos ausentes ou incompletos foram reconstruídos como situações clínicas autorais que permitem executar os critérios, sem copiar fotos do curso.

| Simulado | Cenários vinculados |
| --- | --- |
| 1 | `emt-1-trauma-dupla-ameaca`, `emt-1-bronquiolite-iot`, `emt-1-avci-pos-trombolise`, `emt-1-hda-varicosa`, `emt-1-gestao-fluxo` |
| 2 | `sim-obst-eclampsia-01`, `sim-trauma-pediatrico-01`, `emt-2-tep-choque`, `emt-2-tvp-compressao`, `emt-2-via-aerea-suja` |
| 3 | `sim-obst-pcr-materna-01`, `emt-3-queimadura-eletrica`, `emt-3-pocus-consolidacao`, `emt-3-sindrome-toracica-aguda`, `emt-3-via-aerea-obesidade` |
| 4 | `emt-4-ovace-lactente`, `emt-4-trauma-torax-penetrante`, `emt-4-pocus-pelve`, `emt-4-neuro-febre-convulsao`, `emt-4-cardio-iam-arritmias` |
| 5 | `emt-5-sepse-choque`, `emt-5-trauma-coluna`, `emt-5-pocus-valvulas`, `emt-5-obstrucao-intestinal`, `emt-5-metanol` |

As fases foram reduzidas ou reorganizadas onde havia progressão artificial. A descrição pélvica deixou de nomear a separação do anel antes da interpretação. AVC pós-trombólise apresenta ultrassom ocular na tarefa de medida e TC apenas após piora; TEP e TVP usam clipes dinâmicos reais de outros pacientes, com fonte e distinção explícita entre imagem-amostra e paciente fictício. A resposta editorial da TVP foi alinhada à veia poplítea do clipe. Os cenários inéditos foram inspecionados quanto à sequência clínica e aos vazamentos óbvios de diagnóstico, sem alterar seus checklists.

## Ressalvas clínicas

- Os pesos do curso foram mantidos mesmo quando a atualização clínica recomenda cautela. No Cardio 4, mudança de vetor/desfibrilação dupla são itens do checklist, mas a [AHA 2025](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-advanced-life-support) não estabelece sua utilidade na FV refratária. A revisão explica essa diferença.
- Em Queimadura 3, a fórmula clássica cobrada é 4 mL/kg/%SCQ; a [ABA](https://guidance.nattrauma.org/media/wetjtmrg/american-burn-association-clinical-practice-guidelines-on-burn-shock-resuscitation.pdf) sugere iniciar 2 mL/kg/%SCQ no adulto e titular conforme resposta. As duas aparecem diferenciadas na resposta editorial.
- No POCUS 3, um derrame parapneumônico é provavelmente exsudativo pelo contexto, mas a imagem isolada não o classifica; a resposta editorial exige análise do líquido quando indicada. A amostra de consolidação não deve ser interpretada como imagem do paciente fictício.
- Rubricas com alternativas ou itens duplicados (por exemplo, TC de corpo inteiro **ou** exames segmentares no Trauma 1; McConnell em duas perguntas do TEP 2) exigem interpretação humana cuidadosa na autoavaliação. A correção por IA deve contar apenas o que foi explicitamente verbalizado, sem inventar evidência e sem transformar itens alternativos em exigência cumulativa.

## Verificação

`Intensivao/tests/praticas-emtalks-fidelity.test.js` fixa quantidade e ordem dos pesos dos 20 cenários dos simulados 1 a 4; `praticas-stations.test.js` compara literalmente o checklist do simulado 5 e verifica contrato, mídia e vazamentos selecionados. Esses testes não substituem inspeção médica de todas as respostas possíveis nem validam o reconhecimento de fala em uma gravação real.
