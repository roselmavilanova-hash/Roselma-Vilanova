import { config } from './config.js';

/**
 * Pix ESTÁTICO (chave copia-e-cola). Para o piloto, a Brenda apenas ENVIA a
 * chave; a confirmação do pagamento é SEMPRE humana (Sabrina).
 *
 * TRAVA DE SEGURANÇA (Resumo da Estrutura §6 e §12):
 *  - Print de comprovante NÃO confirma pagamento.
 *  - Chave estática não tem txid/webhook, então não há confirmação automática.
 *  - Ao dizer que pagou/enviar comprovante, a paciente deve ser transferida (P1).
 */

export function pixConfigurado() {
  return Boolean(config.pix.key);
}

/** Monta a mensagem de pagamento com a chave Pix estática. */
export function montarMensagemPix() {
  if (!pixConfigurado()) {
    return {
      ok: false,
      texto:
        'Vou confirmar os dados de pagamento com a equipe e já te retorno por aqui. 💛',
    };
  }
  const texto =
    `Perfeito! Para reservar sua avaliação, o pagamento é via Pix:\n\n` +
    `🔑 Chave Pix: ${config.pix.key}\n` +
    `👤 Recebedor: ${config.pix.recebedor}\n` +
    `📍 ${config.pix.cidade}\n\n` +
    `Assim que o pagamento for confirmado pela nossa equipe, eu concluo o seu agendamento e te envio a confirmação. ` +
    `Pode me avisar quando fizer o Pix. 💛`;
  return { ok: true, texto };
}

/**
 * Sinal recebido de "já paguei" / comprovante. Retorna a orientação: NÃO
 * confirma nada; encaminha para verificação humana.
 */
export function tratarComprovante() {
  return {
    confirmar: false,
    prioridade: 'P1',
    texto:
      'Recebi, obrigada! O pagamento é conferido pela nossa equipe (o comprovante sozinho ainda não confirma). ' +
      'Uma pessoa da RV vai validar e eu concluo seu agendamento em seguida. 💛',
  };
}
