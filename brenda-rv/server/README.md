# Brenda RV — Servidor (piloto)

Servidor Node.js do piloto da Brenda RV: **WhatsApp Business Cloud API (Meta)** +
**Claude 3.5 Sonnet** + **agenda mock** + **Pix estático**. Sobe e funciona mesmo
sem as chaves — cada integração só liga quando a variável correspondente é
preenchida no `.env`.

> **Regra central:** a IA interpreta, as **regras oficiais decidem**, as
> integrações executam, a RV responde. O modelo lê o nosso agente
> (`.claude/agents/brenda-rv.md`) + a `FONTE-OFICIAL.md` e devolve um JSON de
> controle; **o servidor** decide transferência, pausa, agenda e Pix.

## Requisitos

- Node.js ≥ 20 (testado no 22).

## Instalação

```bash
cd brenda-rv/server
cp .env.example .env      # preencha as chaves
npm install
npm start                 # ou: npm run dev  (reinício automático)
```

Sem `.env` preenchido o servidor sobe assim mesmo e loga o que falta. A rota
`GET /` mostra a prontidão de cada integração.

## Variáveis de ambiente

Veja `.env.example`. Resumo:

| Grupo | Variáveis | Liga |
|---|---|---|
| Meta | `META_VERIFY_TOKEN`, `META_APP_SECRET`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `GRAPH_API_VERSION` | Webhook + envio |
| Claude | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_MAX_TOKENS` | Núcleo conversacional |
| Prompt | `BRENDA_AGENT_MD`, `BRENDA_FONTE_OFICIAL_MD` | System prompt |
| Pix | `PIX_KEY`, `PIX_RECEBEDOR`, `PIX_CIDADE` | Cobrança estática |
| Sabrina | `SABRINA_WHATSAPP` | Alerta de exceções |
| Admin | `ADMIN_TOKEN` | Rotas administrativas |

Nunca versione o `.env` real (já está no `.gitignore`).

## Rotas

| Método | Rota | Função |
|---|---|---|
| GET | `/` | Status + prontidão das integrações |
| GET | `/health` | Healthcheck |
| GET | `/webhook` | Verificação do webhook da Meta (`hub.challenge`) |
| POST | `/webhook` | Recebimento de mensagens (valida assinatura + dedup) |
| POST | `/admin/simular` | Testa a Brenda sem WhatsApp (requer `x-admin-token`) |
| POST | `/admin/retomar` | Reativa a Brenda após a Sabrina resolver |
| GET | `/admin/crm` | Lista o CRM mínimo |

## Testar sem WhatsApp

```bash
ADMIN_TOKEN=t ANTHROPIC_API_KEY=sua-chave npm start
# em outro terminal:
curl -s -X POST localhost:3000/admin/simular \
  -H 'content-type: application/json' -H 'x-admin-token: t' \
  -d '{"texto":"Oi, quanto custa a avaliação?"}'
```

Sem `ANTHROPIC_API_KEY`, a Brenda responde com um fallback seguro (acolhe e
transfere para Sabrina) — nunca inventa.

```bash
npm test    # bateria de fumaça (offline)
```

## Conectar o WhatsApp (quando estiver pronto)

1. Preencha `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `META_APP_SECRET` e
   escolha um `META_VERIFY_TOKEN`.
2. Suba o servidor atrás de HTTPS público (ex.: VPS + domínio, ou túnel para
   teste).
3. No painel da Meta (WhatsApp > Configuração), aponte o webhook para
   `https://SEU_DOMINIO/webhook` e informe o mesmo `META_VERIFY_TOKEN`.
4. Assine o campo **messages**.
5. A Meta chama `GET /webhook` para verificar; depois entrega mensagens em
   `POST /webhook` (assinadas — a validação passa a ser obrigatória).

> O backup do WhatsApp pode continuar no celular: só conecte o número à
> plataforma Business quando decidir migrar. O servidor está pronto para o
> momento da conexão.

## Segurança embutida

- Validação da assinatura `X-Hub-Signature-256` (obrigatória quando há `META_APP_SECRET`).
- Deduplicação por `message.id` (idempotência).
- Reserva com identificador único e expiração; segunda verificação de conflito.
- **Print não confirma pagamento** — confirmação é humana (Sabrina).
- Pausa obrigatória após handoff: quando a Sabrina assume, a Brenda silencia.
- Logs com dados mínimos (telefone mascarado, texto truncado); sem dado clínico.
- Credenciais só no `.env` (fora do código versionado).

## O que ainda é mock / pendente

- **Agenda:** módulo em memória (`src/agenda.mock.js`). Trocar por Google
  Calendar quando o calendário-fonte e a credencial forem definidos.
- **Pix:** estático. Alvo é BTG dinâmico com webhook (pendente de homologação).
- **CRM:** JSON em `data/crm.json`. Migrar para Postgres do VPS quando definido.
- **Feegow:** não integrado no piloto; cadastro assistencial fica como tarefa
  humana pós-confirmação.

## Divergências em relação à Especificação Executável v1.0 (decisões da Dra. Roselma)

- **Modelo:** Claude 3.5 Sonnet (a Especificação citava OpenAI). Trocável por
  variável de ambiente/módulo.
- **Pix:** estático no piloto (a Especificação prevê BTG dinâmico). Ponte segura
  até a homologação bancária.
