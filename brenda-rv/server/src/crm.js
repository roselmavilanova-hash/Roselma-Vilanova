import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { maskPhone } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const CRM_FILE = path.join(DATA_DIR, 'crm.json');

/**
 * CRM mínimo em memória com persistência em JSON. NÃO é prontuário: não guarde
 * dado clínico. O identificador é derivado do telefone (mascarado no display).
 */
const contatos = new Map();

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function load() {
  try {
    const raw = fs.readFileSync(CRM_FILE, 'utf8');
    const arr = JSON.parse(raw);
    for (const c of arr) contatos.set(c.id, c);
  } catch {
    /* primeira execução: sem arquivo ainda */
  }
}
load();

function persist() {
  ensureDir();
  fs.writeFileSync(CRM_FILE, JSON.stringify([...contatos.values()], null, 2));
}

/** Busca (ou cria) um contato pelo wa_id (telefone). */
export function getOrCreate(waId) {
  if (contatos.has(waId)) return contatos.get(waId);
  const novo = {
    id: waId,
    codigo: maskPhone(waId),
    cidade: null,
    origem: 'whatsapp',
    interesse: null,
    modalidade: null,
    estagio: 'Novo contato',
    temperatura: 'Frio',
    responsavel: 'Brenda',
    pausada: false, // true = Sabrina assumiu; Brenda silencia
    ultimoMovimento: null,
    proximoPasso: null,
    prazoProximoPasso: null,
    horarioReservado: null,
    expiracaoReserva: null,
    reservaId: null,
    idCobranca: null,
    statusPagamento: null,
    barreira: null,
    motivoPausaPerda: null,
    consentimento: null,
    ultimaInteracao: null,
    criadoEm: new Date().toISOString(),
  };
  contatos.set(waId, novo);
  persist();
  return novo;
}

export function update(waId, patch) {
  const c = getOrCreate(waId);
  Object.assign(c, patch, { ultimaInteracao: new Date().toISOString() });
  persist();
  return c;
}

export function pausar(waId, motivo) {
  return update(waId, {
    pausada: true,
    responsavel: 'Sabrina',
    estagio: 'Atendimento Sabrina',
    motivoPausaPerda: motivo || null,
  });
}

export function retomar(waId) {
  return update(waId, { pausada: false, responsavel: 'Brenda' });
}

export function all() {
  return [...contatos.values()];
}
