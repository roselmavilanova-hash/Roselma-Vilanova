import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');

/** Resolve um caminho de env relativo à pasta do servidor. */
function resolveFromServer(p, fallback) {
  const value = p || fallback;
  return path.isAbsolute(value) ? value : path.resolve(serverRoot, value);
}

export const config = {
  port: Number(process.env.PORT || 3000),
  adminToken: process.env.ADMIN_TOKEN || '',

  meta: {
    verifyToken: process.env.META_VERIFY_TOKEN || '',
    appSecret: process.env.META_APP_SECRET || '',
    whatsappToken: process.env.WHATSAPP_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    graphVersion: process.env.GRAPH_API_VERSION || 'v21.0',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
    maxTokens: Number(process.env.ANTHROPIC_MAX_TOKENS || 1024),
  },

  prompt: {
    agentMd: resolveFromServer(process.env.BRENDA_AGENT_MD, '../../.claude/agents/brenda-rv.md'),
    fonteOficialMd: resolveFromServer(process.env.BRENDA_FONTE_OFICIAL_MD, '../FONTE-OFICIAL.md'),
  },

  pix: {
    key: process.env.PIX_KEY || '',
    recebedor: process.env.PIX_RECEBEDOR || 'RV - Engenharia da Face',
    cidade: process.env.PIX_CIDADE || 'Fortaleza',
  },

  sabrina: {
    whatsapp: (process.env.SABRINA_WHATSAPP || '').replace(/\D/g, ''),
  },

  google: {
    calendarId: process.env.GOOGLE_CALENDAR_ID || '',
    serviceAccountKeyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || '',
    serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '',
  },
};

/**
 * Verifica quais integrações estão prontas. O servidor SOBE mesmo com chaves
 * faltando (o WhatsApp ainda não está conectado) — apenas registra o que falta.
 */
export function readiness() {
  return {
    webhook_verify: Boolean(config.meta.verifyToken),
    signature_check: Boolean(config.meta.appSecret),
    whatsapp_send: Boolean(config.meta.whatsappToken && config.meta.phoneNumberId),
    claude: Boolean(config.anthropic.apiKey),
    pix: Boolean(config.pix.key),
    sabrina_alert: Boolean(config.sabrina.whatsapp),
    agenda_gcal: Boolean(config.google.calendarId),
  };
}
