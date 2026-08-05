/**
 * Router da agenda — escolhe automaticamente entre Google Calendar (produção)
 * e o módulo mock (piloto sem credenciais).
 *
 * Quando GOOGLE_CALENDAR_ID e a credencial da conta de serviço estiverem
 * configurados no .env, o Google Calendar é usado. Enquanto não estiverem,
 * o mock em memória garante que o servidor sobe e funciona normalmente.
 */

import { config } from './config.js';
import * as mock from './agenda.mock.js';

function usarGcal() {
  // Ativa GCal quando o ID da agenda estiver configurado.
  // Credencial: chave inline (base64), arquivo explícito, GOOGLE_APPLICATION_CREDENTIALS
  // ou ADC (gcloud auth application-default login) — o SDK Google resolve na ordem.
  return Boolean(config.google?.calendarId);
}

async function backend() {
  if (usarGcal()) {
    // Importação dinâmica para não carregar googleapis quando não necessário.
    return await import('./agenda.gcal.js');
  }
  return mock;
}

export async function listarHorariosLivres(limit = 2) {
  return (await backend()).listarHorariosLivres(limit);
}

export async function reservarHorario(slotId, contatoId, idempotencyKey) {
  return (await backend()).reservarHorario(slotId, contatoId, idempotencyKey);
}

export async function confirmarAgendamento(reservaId) {
  return (await backend()).confirmarAgendamento(reservaId);
}

export async function liberarExpiradas() {
  return (await backend()).liberarExpiradas();
}

/** Expõe a config do mock para os testes de fumaça (não muda com o backend). */
export const _config = mock._config;
