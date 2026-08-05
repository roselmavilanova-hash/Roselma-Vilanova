/**
 * Política oficial apresentada ANTES do Pix (Especificação Executável §5).
 * Texto provisório, sujeito à validação jurídica. O backend registra a versão,
 * data/hora, telefone e o aceite (feito na resposta seguinte da paciente).
 */
export const POLICY_VERSION = 'politica-sinal-2026-08-04-v1-provisoria';

export const POLICY_TEXT =
  'Antes de gerar o Pix, um combinado rápido sobre a reserva:\n\n' +
  '• O sinal é 30% do valor da avaliação. O horário fica reservado por até 2 horas, aguardando a confirmação do pagamento.\n' +
  '• Uma remarcação sem custo é permitida com pelo menos 24h de antecedência. Cancelando dentro desse prazo, o sinal é devolvido integralmente.\n' +
  '• Cancelamentos com menos de 24h ou não comparecimento podem reter o sinal, pelo horário reservado. Saúde, força maior ou falha da RV são analisados caso a caso pela equipe.\n' +
  '• Tolerância de atraso: até 20 minutos.\n' +
  '• Reembolsos, retenções e exceções são sempre analisados pela equipe humana.\n\n' +
  'Posso seguir com o Pix do sinal? (responder "sim, concordo" registra seu aceite)';
