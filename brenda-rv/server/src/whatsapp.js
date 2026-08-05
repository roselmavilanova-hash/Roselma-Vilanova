import { config } from './config.js';
import { log, maskPhone, snippet } from './logger.js';

/**
 * Envia uma mensagem de texto pela WhatsApp Business Cloud API (Meta).
 * Se as credenciais ainda não estiverem configuradas (WhatsApp não conectado),
 * a mensagem é apenas registrada no log — o servidor não quebra.
 */
export async function sendText(to, text) {
  const digits = String(to || '').replace(/\D/g, '');
  if (!config.meta.whatsappToken || !config.meta.phoneNumberId) {
    log.warn('WhatsApp não configurado — mensagem só registrada', {
      to: maskPhone(digits),
      text: snippet(text),
    });
    return { ok: false, simulated: true };
  }
  if (!text || !text.trim()) return { ok: true, skipped: true };

  const url = `https://graph.facebook.com/${config.meta.graphVersion}/${config.meta.phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to: digits,
    type: 'text',
    text: { preview_url: false, body: text.slice(0, 4096) },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.meta.whatsappToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log.error('Falha ao enviar WhatsApp', { status: res.status, body: body.slice(0, 300) });
      return { ok: false, status: res.status };
    }
    const data = await res.json();
    return { ok: true, id: data.messages?.[0]?.id };
  } catch (e) {
    log.error('Erro de rede ao enviar WhatsApp', { error: e.message });
    return { ok: false, error: e.message };
  }
}
