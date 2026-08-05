/**
 * Logger mínimo em JSON. Não registra conteúdo clínico nem credenciais.
 * Trunca corpos de mensagem para reduzir exposição de dados.
 */
function emit(level, msg, meta = {}) {
  const line = { ts: new Date().toISOString(), level, msg, ...meta };
  const out = level === 'error' ? console.error : console.log;
  out(JSON.stringify(line));
}

export const log = {
  info: (msg, meta) => emit('info', msg, meta),
  warn: (msg, meta) => emit('warn', msg, meta),
  error: (msg, meta) => emit('error', msg, meta),
};

/** Mascara um telefone para o log (mantém só os 4 últimos dígitos). */
export function maskPhone(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length < 4) return '****';
  return `***${d.slice(-4)}`;
}

/** Trunca texto para o log. */
export function snippet(text, n = 80) {
  const s = String(text || '');
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
