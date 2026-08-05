import crypto from 'node:crypto';
import { config } from './config.js';

/**
 * Valida a assinatura X-Hub-Signature-256 enviada pela Meta.
 * Requer o corpo BRUTO (raw body) da requisição.
 *
 * Se o APP_SECRET não estiver configurado (piloto ainda sem chaves), a
 * validação é PULADA e retornamos `true` com um aviso — para que o servidor
 * funcione antes da conexão. Assim que META_APP_SECRET for preenchido, a
 * verificação passa a ser obrigatória.
 */
export function verifySignature(rawBody, headerSignature) {
  if (!config.meta.appSecret) {
    return { valid: true, skipped: true };
  }
  if (!headerSignature || !rawBody) {
    return { valid: false, skipped: false };
  }
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', config.meta.appSecret).update(rawBody).digest('hex');

  const a = Buffer.from(headerSignature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return { valid: false, skipped: false };
  return { valid: crypto.timingSafeEqual(a, b), skipped: false };
}
