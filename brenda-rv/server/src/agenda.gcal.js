/**
 * Módulo de agenda — Google Calendar (produção).
 *
 * Fonte de horários disponíveis: eventos da agenda "RV | Avaliações" cujo
 * título começa com um dos BLOCOS_AUTORIZADOS. Espaço vazio no calendário
 * NÃO é disponibilidade (Especificação §4).
 *
 * Reserva (2 horas): cria um evento RESERVA TEMP que bloqueia o horário.
 * Confirmação: atualiza o evento para CONFIRMADO (permanente).
 * Expiração: deleta eventos RESERVA TEMP com mais de 2 horas.
 *
 * Auth: conta de serviço Google. Forneça uma das variáveis:
 *   GOOGLE_SERVICE_ACCOUNT_KEY_FILE — caminho para o JSON da conta de serviço.
 *   GOOGLE_SERVICE_ACCOUNT_KEY      — JSON da conta de serviço em base64.
 * A conta de serviço precisa ter permissão de edição na agenda.
 */

import crypto from 'node:crypto';
import { google } from 'googleapis';
import { config } from './config.js';
import { log } from './logger.js';

const TIMEZONE = 'America/Fortaleza';
const RESERVA_MINUTOS = 120;
const BUFFER_MINUTOS = 30;

// Prefixos exatos dos blocos autorizados na agenda do Google.
const BLOCOS_AUTORIZADOS = [
  'RV DISPONÍVEL | Presencial',
  'RV DISPONÍVEL | Online',
  'RV VIP | Presencial',
  'RV VIP | Online',
];

// Duração da avaliação em minutos por modalidade.
const DURACAO = { presencial: 90, online: 60, vip_presencial: 90, vip_online: 60 };

/** Derivar modalidade a partir do título do bloco autorizado. */
function modalidadeDoTitulo(titulo) {
  const t = titulo.toLowerCase();
  if (t.includes('online')) return 'online';
  return 'presencial';
}

/** Duração em minutos para o bloqueio (avaliação + buffer). */
function duracaoTotal(modalidade) {
  return (DURACAO[modalidade] ?? 90) + BUFFER_MINUTOS;
}

let _auth = null;
async function getAuth() {
  if (_auth) return _auth;

  const SCOPES = ['https://www.googleapis.com/auth/calendar'];

  // Opção 1: JSON da conta de serviço em base64 (GOOGLE_SERVICE_ACCOUNT_KEY).
  if (config.google.serviceAccountKey) {
    const keyJson = JSON.parse(
      Buffer.from(config.google.serviceAccountKey, 'base64').toString('utf8')
    );
    _auth = new google.auth.GoogleAuth({ credentials: keyJson, scopes: SCOPES });
    return _auth;
  }

  // Opção 2: arquivo JSON da conta de serviço (GOOGLE_SERVICE_ACCOUNT_KEY_FILE
  //           ou GOOGLE_APPLICATION_CREDENTIALS — padrão do SDK Google).
  if (config.google.serviceAccountKeyFile) {
    _auth = new google.auth.GoogleAuth({
      keyFile: config.google.serviceAccountKeyFile,
      scopes: SCOPES,
    });
    return _auth;
  }

  // Opção 3: Application Default Credentials (ADC).
  //   • Local: gcloud auth application-default login
  //   • VPS/Cloud Run: GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/chave.json
  //   • GCE/Cloud Run managed: metadata service automático
  _auth = new google.auth.GoogleAuth({ scopes: SCOPES });
  return _auth;
}

async function getCalendar() {
  const auth = await getAuth();
  return google.calendar({ version: 'v3', auth });
}

/**
 * Verifica se um intervalo [start, end) colide com algum evento existente
 * que não seja um bloco autorizado (para detectar conflito antes de reservar).
 */
async function temConflito(cal, start, end, excluirEventoId = null) {
  const res = await cal.events.list({
    calendarId: config.google.calendarId,
    timeMin: start,
    timeMax: end,
    singleEvents: true,
    orderBy: 'startTime',
  });
  const eventos = res.data.items || [];
  return eventos.some((ev) => {
    if (excluirEventoId && ev.id === excluirEventoId) return false;
    const titulo = ev.summary || '';
    const ehBloco = BLOCOS_AUTORIZADOS.some((b) => titulo.startsWith(b));
    return !ehBloco; // colide com evento que não é bloco autorizado
  });
}

/**
 * Lista horários livres baseados nos blocos autorizados da agenda.
 * Oferece no máximo `limit` opções (padrão 2 — Especificação §4).
 */
export async function listarHorariosLivres(limit = 2) {
  const cal = await getCalendar();
  const agora = new Date();
  const em14dias = new Date(agora.getTime() + 14 * 24 * 60 * 60 * 1000);

  const res = await cal.events.list({
    calendarId: config.google.calendarId,
    timeMin: agora.toISOString(),
    timeMax: em14dias.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    q: 'RV', // filtro amplo; refinamos abaixo
  });

  const todos = res.data.items || [];
  const livres = [];

  for (const ev of todos) {
    if (livres.length >= limit) break;
    const titulo = ev.summary || '';
    const eBloco = BLOCOS_AUTORIZADOS.some((b) => titulo.startsWith(b));
    if (!eBloco) continue;

    const modalidade = modalidadeDoTitulo(titulo);
    const startStr = ev.start?.dateTime || ev.start?.date;
    const endBloqueio = new Date(
      new Date(startStr).getTime() + duracaoTotal(modalidade) * 60_000
    ).toISOString();

    // Segunda verificação: há conflito neste horário?
    const conflito = await temConflito(cal, startStr, endBloqueio, ev.id);
    if (conflito) continue;

    livres.push({
      slotId: ev.id,
      label: formatarLabel(titulo, startStr),
      modalidade,
      start: startStr,
      bloco: titulo,
    });
  }

  return { timezone: TIMEZONE, horarios: livres };
}

function formatarLabel(bloco, startIso) {
  const d = new Date(startIso);
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  });
  return `${fmt.format(d)} (${bloco.includes('Online') ? 'online' : 'presencial'})`;
}

// Mapa em memória: reservaId → { gcalEventId, slotStart, expiraEm, modalidade, contatoId }
const reservas = new Map();
// Idempotência: idempotencyKey → reservaId
const reservasPorChave = new Map();

/**
 * Cria uma reserva temporária de 2 horas no Google Calendar.
 * @param {string} slotId — ID do evento de bloco autorizado no GCal.
 * @param {string} contatoId — código do contato (não expõe PII).
 * @param {string} idempotencyKey — chave única (ex.: messageId).
 */
export async function reservarHorario(slotId, contatoId, idempotencyKey) {
  if (idempotencyKey && reservasPorChave.has(idempotencyKey)) {
    const reservaId = reservasPorChave.get(idempotencyKey);
    return { ok: true, duplicada: true, reserva: reservas.get(reservaId) };
  }

  const cal = await getCalendar();

  // Busca o bloco autorizado para obter start/end/modalidade.
  let blocoEvento;
  try {
    const r = await cal.events.get({ calendarId: config.google.calendarId, eventId: slotId });
    blocoEvento = r.data;
  } catch {
    return { ok: false, motivo: 'slot_inexistente' };
  }

  const titulo = blocoEvento.summary || '';
  const eBloco = BLOCOS_AUTORIZADOS.some((b) => titulo.startsWith(b));
  if (!eBloco) return { ok: false, motivo: 'slot_nao_autorizado' };

  const modalidade = modalidadeDoTitulo(titulo);
  const startStr = blocoEvento.start?.dateTime || blocoEvento.start?.date;
  const endBloqueio = new Date(
    new Date(startStr).getTime() + duracaoTotal(modalidade) * 60_000
  ).toISOString();

  // Segunda verificação de conflito antes de gravar (Especificação §4).
  const conflito = await temConflito(cal, startStr, endBloqueio, slotId);
  if (conflito) return { ok: false, motivo: 'slot_indisponivel' };

  const reservaId = crypto.randomUUID();
  const expiraEm = Date.now() + RESERVA_MINUTOS * 60_000;

  // Cria evento de bloqueio no Google Calendar.
  const novoEvento = await cal.events.insert({
    calendarId: config.google.calendarId,
    requestBody: {
      summary: `RESERVA TEMP | ${contatoId} | ${reservaId}`,
      start: { dateTime: startStr, timeZone: TIMEZONE },
      end: { dateTime: endBloqueio, timeZone: TIMEZONE },
      description: `Reserva temporária gerada automaticamente pela Brenda RV.\nExpira: ${new Date(expiraEm).toISOString()}\nContato: ${contatoId}`,
      colorId: '5', // amarelo
    },
  });

  const reserva = {
    reservaId,
    gcalEventId: novoEvento.data.id,
    slotId,
    label: formatarLabel(titulo, startStr),
    contatoId,
    expiraEm,
    timezone: TIMEZONE,
  };
  reservas.set(reservaId, reserva);
  if (idempotencyKey) reservasPorChave.set(idempotencyKey, reservaId);

  log.info('Reserva temporária criada no GCal', {
    reservaId,
    gcalEventId: novoEvento.data.id,
    expiraEm: new Date(expiraEm).toISOString(),
  });
  return { ok: true, duplicada: false, reserva };
}

/**
 * Confirma o agendamento após pagamento validado pela Sabrina.
 * Atualiza o evento GCal de RESERVA TEMP para CONFIRMADO.
 */
export async function confirmarAgendamento(reservaId) {
  const reserva = reservas.get(reservaId);
  if (!reserva) return { ok: false, motivo: 'reserva_inexistente_ou_expirada' };

  const cal = await getCalendar();

  // Segunda verificação: evento ainda existe e é RESERVA TEMP?
  let evAtual;
  try {
    const r = await cal.events.get({ calendarId: config.google.calendarId, eventId: reserva.gcalEventId });
    evAtual = r.data;
  } catch {
    return { ok: false, motivo: 'evento_nao_encontrado' };
  }

  if (!evAtual.summary?.startsWith('RESERVA TEMP')) {
    return { ok: false, motivo: 'reserva_nao_ativa' };
  }

  await cal.events.patch({
    calendarId: config.google.calendarId,
    eventId: reserva.gcalEventId,
    requestBody: {
      summary: `CONFIRMADO | ${reserva.contatoId} | ${reservaId}`,
      colorId: '2', // verde
      description: `Agendamento confirmado.\nContato: ${reserva.contatoId}`,
    },
  });

  reservas.delete(reservaId);
  log.info('Agendamento confirmado no GCal', { reservaId, gcalEventId: reserva.gcalEventId });
  return { ok: true, eventId: reserva.gcalEventId, label: reserva.label };
}

/**
 * Libera reservas expiradas: deleta eventos RESERVA TEMP com mais de 2 horas.
 */
export async function liberarExpiradas() {
  const agora = Date.now();
  const cal = await getCalendar();

  for (const [reservaId, reserva] of reservas.entries()) {
    if (reserva.expiraEm > agora) continue;

    try {
      await cal.events.delete({ calendarId: config.google.calendarId, eventId: reserva.gcalEventId });
      log.info('Reserva expirada deletada do GCal', { reservaId, gcalEventId: reserva.gcalEventId });
    } catch (e) {
      log.warn('Falha ao deletar reserva expirada do GCal', { reservaId, error: e.message });
    }
    reservas.delete(reservaId);
  }
}

export const _config = { TIMEZONE, RESERVA_MINUTOS, BUFFER_MINUTOS };
