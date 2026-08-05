import crypto from 'node:crypto';
import { log } from './logger.js';

/**
 * Módulo MOCK da agenda — substitui o Google Calendar no piloto.
 *
 * Regras honradas (Resumo da Estrutura §12):
 *  - Oferece SOMENTE horários "autorizados" (aqui, gerados em memória).
 *  - "Horário escolhido não é horário confirmado": a reserva é TEMPORÁRIA e
 *    expira; só vira agendamento após confirmação de pagamento (humana no piloto).
 *  - Segunda verificação de conflito antes de gravar.
 *  - Identificador único (idempotência) por reserva/evento.
 *  - Fuso oficial: America/Fortaleza.
 *
 * Tudo em memória: reinício do processo zera o estado. Trocar por integração
 * real depois de validado manualmente.
 */

const TIMEZONE = 'America/Fortaleza';
const RESERVA_MINUTOS = 120; // Especificação Executável §4: reserva temporária dura 2 horas
const BUFFER_MINUTOS = 30; // intervalo de 30 min DEPOIS da avaliação em bloco reservado/confirmado

/** slotId -> { slotId, label, status: 'LIVRE'|'RESERVADO'|'AGENDADO', reserva? } */
const slots = new Map();
/** idempotencyKey -> reserva (evita reservar duas vezes o mesmo pedido) */
const reservasPorChave = new Map();

/**
 * Gera uma grade fictícia a partir dos BLOCOS OFICIAIS (Especificação §4).
 * "Espaço vazio no calendário não é disponibilidade": aqui, só existem slots
 * que representam blocos explicitamente autorizados.
 */
function seed() {
  if (slots.size) return;
  const base = ['09:00', '11:00', '14:00', '16:00'];
  const blocos = [
    { tipo: 'RV DISPONÍVEL | Presencial', modalidade: 'presencial' },
    { tipo: 'RV DISPONÍVEL | Online', modalidade: 'online' },
  ];
  for (let d = 1; d <= 3; d++) {
    for (const hora of base) {
      const bloco = blocos[(d + base.indexOf(hora)) % blocos.length];
      const slotId = `d${d}_${hora.replace(':', '')}_${bloco.modalidade}`;
      slots.set(slotId, {
        slotId,
        label: `Dia +${d} às ${hora} (${bloco.modalidade})`,
        bloco: bloco.tipo,
        modalidade: bloco.modalidade,
        status: 'LIVRE',
        reserva: null,
      });
    }
  }
}

/**
 * Lista horários realmente livres (após liberar reservas expiradas).
 * Padrão: 2 opções, conforme a Especificação Executável §4.
 */
export function listarHorariosLivres(limit = 2) {
  seed();
  liberarExpiradas();
  const livres = [];
  for (const s of slots.values()) {
    if (s.status === 'LIVRE') {
      livres.push({ slotId: s.slotId, label: s.label, modalidade: s.modalidade });
    }
    if (livres.length >= limit) break;
  }
  return { timezone: TIMEZONE, horarios: livres };
}

/**
 * Cria uma reserva temporária de um slot.
 * @param {string} slotId
 * @param {string} contatoId  código/identificador do contato (não expor PII)
 * @param {string} idempotencyKey  chave única do pedido (ex.: messageId)
 */
export function reservarHorario(slotId, contatoId, idempotencyKey) {
  seed();
  liberarExpiradas();

  // Idempotência: mesmo pedido não gera reserva duplicada.
  if (idempotencyKey && reservasPorChave.has(idempotencyKey)) {
    return { ok: true, duplicada: true, reserva: reservasPorChave.get(idempotencyKey) };
  }

  const slot = slots.get(slotId);
  if (!slot) return { ok: false, motivo: 'slot_inexistente' };
  if (slot.status !== 'LIVRE') return { ok: false, motivo: 'slot_indisponivel' };

  const reserva = {
    reservaId: crypto.randomUUID(),
    slotId,
    label: slot.label,
    contatoId,
    expiraEm: Date.now() + RESERVA_MINUTOS * 60_000,
    timezone: TIMEZONE,
  };
  slot.status = 'RESERVADO';
  slot.reserva = reserva;
  if (idempotencyKey) reservasPorChave.set(idempotencyKey, reserva);

  log.info('Reserva temporária criada', {
    reservaId: reserva.reservaId,
    slotId,
    expiraEm: new Date(reserva.expiraEm).toISOString(),
  });
  return { ok: true, duplicada: false, reserva };
}

/**
 * Confirma o agendamento (após pagamento confirmado — humano no piloto).
 * Faz a SEGUNDA verificação de conflito antes de gravar.
 */
export function confirmarAgendamento(reservaId) {
  liberarExpiradas();
  for (const slot of slots.values()) {
    if (slot.reserva?.reservaId === reservaId) {
      if (slot.status !== 'RESERVADO') {
        return { ok: false, motivo: 'reserva_nao_ativa' };
      }
      // Segunda verificação: o slot ainda é desta reserva e está reservado.
      slot.status = 'AGENDADO';
      const eventId = crypto.randomUUID();
      slot.eventId = eventId;
      log.info('Agendamento confirmado', { reservaId, slotId: slot.slotId, eventId });
      return { ok: true, eventId, slotId: slot.slotId, label: slot.label };
    }
  }
  return { ok: false, motivo: 'reserva_inexistente_ou_expirada' };
}

/** Libera reservas expiradas, devolvendo o horário à disponibilidade. */
export function liberarExpiradas() {
  const agora = Date.now();
  for (const slot of slots.values()) {
    if (slot.status === 'RESERVADO' && slot.reserva && slot.reserva.expiraEm <= agora) {
      log.info('Reserva expirada — horário devolvido', {
        reservaId: slot.reserva.reservaId,
        slotId: slot.slotId,
      });
      slot.status = 'LIVRE';
      slot.reserva = null;
    }
  }
}

export const _config = { TIMEZONE, RESERVA_MINUTOS, BUFFER_MINUTOS };
