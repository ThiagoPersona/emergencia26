# Calibração Do Simulador De Estações Práticas

## Objetivo

Comparar a classificação da IA com o checklist oficial e impedir dois erros: conceder ponto por conhecimento não verbalizado e negar ponto quando a ação foi explicitamente dita.

## Estados Esperados

| Estado | Critério operacional |
|---|---|
| Cumprido | Todos os componentes verbais do item aparecem corretamente na transcrição |
| Parcial | Há ação relevante correta, mas falta dose, alvo, sequência ou componente obrigatório |
| Ausente | Não há menção identificável |
| Incorreto | A fala contradiz o item ou propõe conduta clinicamente inadequada |
| Não verificável | O item depende de gesto/imagem que o áudio não demonstra |

## Casos De Calibração

### VM e auto-PEEP

- **Completo:** gasometria, VCV, auto-PEEP na curva fluxo-tempo, redução do volume-minuto, redução de FR e aumento do tempo expiratório. Esperado: 100%.
- **Parcial:** reconhece aprisionamento e diz apenas "ajusto o ventilador". Esperado: diagnóstico cumprido; correção parcial/ausente conforme fala.
- **Incorreto:** interpreta como vazamento e aumenta FR. Esperado: diagnóstico incorreto e erro crítico.
- **Silencioso:** nenhuma fala útil. Esperado: todos os itens verbais ausentes.

### Trauma hemorrágico

- **Completo:** XABCDE, controle imediato, torniquete com horário, choque, E-FAST, ressuscitação hemostática, TXA/cálcio/aquecimento e cirurgia.
- **Omissão crítica:** faz ABC antes de controlar sangramento exsanguinante. Esperado: erro crítico de hemorragia.
- **Manual:** diz que aplicará o torniquete, mas áudio não prova aplicação. Esperado: componentes verbais avaliados; técnica manual pendente.

### POCUS/AAA

- **Completo verbal:** identifica janelas, AAA/trombo, coração hipercinético, cava pequena, líquido livre e integra ruptura de AAA.
- **Manual:** sucesso da punção e visualização real da ponta ficam não verificáveis até confirmação.
- **Contraditório:** chama estrutura de veia cava e conclui choque cardiogênico. Esperado: itens correspondentes incorretos, não ausentes.

### Pediatria/toxicologia

- **Completo:** síndrome colinérgica, ABC/glicemia/temperatura/acesso, carbamato e atropina titulada a secreções/ventilação.
- **Parcial:** diz apenas "faço atropina". Esperado: antídoto reconhecido, dose/via/escalonamento incompletos.
- **Incorreto:** usa pupila como único alvo e não repete atropina. Esperado: tratamento incorreto.

### TCE/HIC

- **Completo:** via aérea, sedoanalgesia, normoxia/normocapnia, hemodinâmica, posição, hiperosmolar, reversão e neurocirurgia.
- **Parcial:** cita manitol sem indicação, dose ou reavaliação. Esperado: terapia hiperosmolar parcial.
- **Incorreto:** hiperventilação profilática prolongada ou hipotensão permissiva. Esperado: itens críticos incorretos.

## Auditoria

1. Rodar cada fixture pelo menos três vezes após mudança de modelo ou prompt.
2. Comparar item a item, não somente a nota final.
3. Exigir evidência literal curta para qualquer item cumprido/parcial/incorreto.
4. Rebaixar para ausente quando a justificativa depender de inferência sem fala.
5. Manter manual como não verificável até confirmação humana.
6. Registrar modelo, versão da estação e data em toda tentativa persistida.
