# Método RV — Skills da Dra. Roselma Vilanova

Repositório de skills do **Método RV · Engenharia da Face** ("Estrutura antes da estética").

## Skills disponíveis

### `dossie-diagnostico-rv`
Monta o **Dossiê Diagnóstico** da paciente a partir das notas de uma Avaliação
Estrutural da Face — queixa, análise por terços faciais, pescoço, exames
(ultrassom cervical), diagnóstico, plano cirúrgico e segurança.

- **SKILL.md** — instruções, princípios editoriais, voz da marca e fluxo de trabalho.
- **assets/template-dossie.md** — template mestre com os campos `{{...}}` e os textos
  institucionais fixos.

Localização: `.claude/skills/dossie-diagnostico-rv/`

## Agents disponíveis

### `brenda-rv`
A **Brenda RV** — concierge virtual da prática de Engenharia da Face. Agente
**única e supervisionada** (por Sabrina) que acolhe o novo contato, responde
primeiro à pergunta feita, qualifica por temperatura (interna), conduz a jornada
de entrada (avaliação → reserva → Pix → agendamento) e transfere para Sabrina em
qualquer exceção, permanecendo em silêncio após a transferência. Nunca
diagnostica, promete resultado, inventa preço/horário/política nem confirma
pagamento por print. Só responde com o que está aprovado na Fonte Oficial.

- **`.claude/agents/brenda-rv.md`** — definição do agente (identidade, regras,
  guardrails, transferência, CRM e segurança transacional).
- **`brenda-rv/FONTE-OFICIAL.md`** — a **única** fonte de verdade (decisões
  vigentes × pendentes). A Brenda só informa o que estiver `VIGENTE`.
- **`brenda-rv/CRM.md`** — ledger operacional mínimo dos contatos.
- **`brenda-rv/TESTES.md`** — bateria de testes pré-piloto (21 casos) e critérios
  de aprovação antes de conectar ao WhatsApp.

- **`brenda-rv/server/`** — servidor Node.js do piloto: webhook da Meta
  (WhatsApp Cloud API), núcleo Claude 3.5 Sonnet (lê o `.md` + a Fonte Oficial),
  módulo mock da agenda e Pix estático. Sobe sem as chaves e liga cada
  integração conforme o `.env` é preenchido. Veja `brenda-rv/server/README.md`.

Estado: núcleo do MVP e servidor implementados. Valores, sinal, reserva (2h) e
SLA já consolidados na Fonte Oficial (v0.2). O **piloto conecta ao WhatsApp**
quando as chaves da Meta/Anthropic/Pix forem preenchidas no `.env` e os itens
`[ ]` restantes de `brenda-rv/FONTE-OFICIAL.md` forem fechados.

## Como usar

Em uma sessão do Claude Code neste repositório, a skill é acionada automaticamente
quando a Dra. Roselma menciona "dossiê", "avaliação estrutural", "diagnóstico da
[nome]" ou cola achados de uma avaliação facial.

## Onde os dossiês são salvos

Os dossiês gerados são salvos na pasta de casos da Dra. Roselma:

```
/Users/draroselmavilanova/Library/Mobile Documents/com~apple~CloudDocs/RV-EMPRESA/15-DOSSIES-DIAGNOSTICOS/CASOS/
```

Nome do arquivo: `Dossie_[NomePaciente].md` (e `.pdf`/`.html` quando gerado). Se
esse caminho do iCloud não estiver disponível (ex.: sessão web/cloud), o dossiê é
salvo em `/mnt/user-data/outputs/` e a Dra. Roselma é avisada para movê-lo para a
pasta CASOS.
