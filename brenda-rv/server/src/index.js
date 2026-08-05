import express from 'express';
import { config, readiness } from './config.js';
import { router as webhookRouter } from './webhook.js';
import * as crm from './crm.js';
import * as convo from './conversation.js';
import { askBrenda } from './brenda.js';
import { log } from './logger.js';

const app = express();

// Captura o corpo BRUTO (necessário para validar a assinatura da Meta).
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Healthcheck e prontidão das integrações.
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/', (_req, res) =>
  res.json({ service: 'brenda-rv-server', status: 'up', readiness: readiness() })
);

// Rotas do webhook da Meta.
app.use('/', webhookRouter);

// --- Rotas administrativas (protegidas por ADMIN_TOKEN) -----------------------
function requireAdmin(req, res, next) {
  if (!config.adminToken || req.get('x-admin-token') !== config.adminToken) {
    return res.sendStatus(401);
  }
  next();
}

// Retoma um contato após a Sabrina resolver (Brenda volta a responder).
app.post('/admin/retomar', requireAdmin, (req, res) => {
  const { waId } = req.body || {};
  if (!waId) return res.status(400).json({ error: 'waId obrigatório' });
  const c = crm.retomar(waId);
  convo.reset(waId);
  res.json({ ok: true, contato: c.codigo });
});

// Lista o CRM (dados mínimos) para conferência.
app.get('/admin/crm', requireAdmin, (_req, res) => res.json(crm.all()));

// Simulação local: envia uma mensagem como se fosse a paciente, retorna o
// controle da Brenda — permite rodar a bateria de testes SEM o WhatsApp.
app.post('/admin/simular', requireAdmin, async (req, res) => {
  const { waId = 'sim-0001', texto = '' } = req.body || {};
  crm.getOrCreate(waId);
  convo.append(waId, 'user', texto);
  const control = await askBrenda(convo.getHistory(waId));
  if (control.reply) convo.append(waId, 'assistant', control.reply);
  res.json({ control });
});

app.listen(config.port, () => {
  const r = readiness();
  log.info('Brenda RV no ar', { port: config.port });
  log.info('Prontidão das integrações', r);
  const faltando = Object.entries(r)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);
  if (faltando.length) {
    log.warn('Aguardando configuração (preencha o .env)', { faltando });
  }
});

export { app };
