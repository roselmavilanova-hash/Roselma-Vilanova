/**
 * Histórico de conversa por contato (em memória). Guarda apenas os últimos N
 * turnos para dar contexto ao modelo, sem acumular dados indefinidamente.
 */
const MAX_TURNS = 20;
const store = new Map(); // waId -> [{ role, content }]

export function getHistory(waId) {
  return store.get(waId) || [];
}

export function append(waId, role, content) {
  const hist = store.get(waId) || [];
  hist.push({ role, content });
  while (hist.length > MAX_TURNS) hist.shift();
  store.set(waId, hist);
  return hist;
}

export function reset(waId) {
  store.delete(waId);
}
