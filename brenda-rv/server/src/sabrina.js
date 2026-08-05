import { config } from './config.js';
import { sendText } from './whatsapp.js';
import { log, maskPhone, snippet } from './logger.js';

/**
 * Emite o ALERTA de transferência para Sabrina no formato oficial
 * (Resumo da Estrutura §14). Envia ao WhatsApp da Sabrina se configurado;
 * caso contrário, registra no log (fila humana persistente é trabalho futuro).
 */
export async function alertarSabrina({ contato, tipo, prioridade, ultimaMensagem, proximaAcao }) {
  const alerta =
    `ALERTA BRENDA RV — ${(tipo || 'EXCECAO').toUpperCase()}\n` +
    `Contato: ${contato.codigo || maskPhone(contato.id)}\n` +
    `Motivo: ${tipo || 'exceção'}\n` +
    `Estágio: ${contato.estagio}\n` +
    `Última mensagem: ${snippet(ultimaMensagem, 140)}\n` +
    `Próxima ação sugerida: ${proximaAcao || 'avaliar e assumir'}\n` +
    `Prazo: ${prioridade || 'P2'}\n` +
    `A Brenda está: PAUSADA`;

  log.warn('Transferência para Sabrina', {
    contato: contato.codigo,
    tipo,
    prioridade,
  });

  if (config.sabrina.whatsapp) {
    await sendText(config.sabrina.whatsapp, alerta);
  }
  return alerta;
}
