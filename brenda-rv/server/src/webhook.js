import express from 'express';
import { config } from './config.js';
import { verifySignature } from './signature.js';
import { askBrenda } from './brenda.js';
import { sendText } from './whatsapp.js';
import { alertarSabrina } from './sabrina.js';
import * as crm from './crm.js';
import * as convo from './conversation.js';
import * as agenda from './agenda.js';
import { montarMensagemPix, tratarComprovante } from './pix.js';
import { POLICY_TEXT, POLICY_VERSION } from './policy.js';
import { log, maskPhone, snippet } from './logger.js';

export const router = express.Router();

// Deduplicação de mensagens já processadas (idempotência por message.id).
const processados = new Set();
function jaProcessado(id) {
  if (!id) return false;
  if (processados.has(id)) return true;
  processados.add(id);
  if (processados.size > 5000) {
    // limpeza simples para não crescer indefinidamente
    processados.clear();
  }
  return false;
}

// --- GET: verificação do webhook pela Meta ------------------------------------
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token && token === config.meta.verifyToken) {
    log.info('Webhook verificado pela Meta');
    return res.status(200).send(challenge);
  }
  log.warn('Falha na verificação do webhook', { mode });
  return res.sendStatus(403);
});

// --- POST: recebimento de mensagens -------------------------------------------
router.post('/webhook', async (req, res) => {
  const sig = req.get('x-hub-signature-256');
  const check = verifySignature(req.rawBody, sig);
  if (!check.valid) {
    log.warn('Assinatura inválida no webhook');
    return res.sendStatus(401);
  }
  // Responde 200 rápido; processa em seguida (evita retry/duplicação da Meta).
  res.sendStatus(200);

  try {
    await processarEntrada(req.body);
  } catch (e) {
    log.error('Erro ao processar webhook', { error: e.message });
  }
});

/** Extrai mensagens de texto do payload da Meta e processa cada uma. */
async function processarEntrada(body) {
  const entries = body?.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const messages = value.messages || [];
      for (const msg of messages) {
        if (jaProcessado(msg.id)) {
          log.info('Mensagem duplicada ignorada', { id: msg.id });
          continue;
        }
        await tratarMensagem(msg, value);
      }
    }
  }
}

async function tratarMensagem(msg, value) {
  const waId = msg.from;
  const contato = crm.getOrCreate(waId);

  // Nome do perfil (se vier) — dado mínimo, não clínico.
  const nome = value.contacts?.[0]?.profile?.name;
  if (nome && !contato.nome) crm.update(waId, { nome });

  // Se Sabrina assumiu, a Brenda permanece em silêncio.
  if (contato.pausada) {
    log.info('Contato em modo humano — Brenda em silêncio', { contato: contato.codigo });
    crm.update(waId, { ultimoMovimento: 'mensagem recebida (modo humano)' });
    return;
  }

  // Tipos não-texto (foto/áudio/documento): a Brenda NÃO interpreta → Sabrina.
  if (msg.type !== 'text') {
    await handoff(contato, {
      tipo: msg.type === 'image' ? 'imagem_recebida' : `midia_${msg.type}`,
      prioridade: 'P1',
      ultimaMensagem: `[${msg.type}]`,
      proximaAcao: 'Verificar mídia manualmente (não interpretar clinicamente)',
      replyParaPaciente:
        'Recebi seu envio! Para cuidar disso com atenção, vou te conectar com uma pessoa da nossa equipe. 💛',
    });
    return;
  }

  const texto = msg.text?.body || '';
  convo.append(waId, 'user', texto);
  log.info('Mensagem recebida', { contato: contato.codigo, texto: snippet(texto) });

  // Chama a Brenda (Claude 3.5 Sonnet) com o histórico.
  const control = await askBrenda(convo.getHistory(waId));

  // Atualiza CRM com a leitura do modelo.
  crm.update(waId, {
    estagio: control.estagio,
    temperatura: control.temperatura,
    proximoPasso: control.proximo_passo,
    ultimoMovimento: 'resposta da Brenda',
  });

  // Transferência para Sabrina (a decisão é do servidor, com base no controle).
  if (control.transferir || control.pausar) {
    await handoff(contato, {
      tipo: control.tipo_excecao || 'excecao',
      prioridade: control.prioridade || 'P2',
      ultimaMensagem: texto,
      proximaAcao: control.proximo_passo || 'Assumir atendimento',
      replyParaPaciente: control.reply,
    });
    return;
  }

  // Ação estruturada (agenda / Pix) — executada de forma determinística.
  let extra = '';
  if (control.acao === 'OFERECER_HORARIOS') {
    extra = '\n\n' + (await textoHorarios());
    crm.update(waId, { estagio: 'Horário oferecido', ultimoMovimento: 'horários oferecidos' });
  } else if (control.acao === 'ENVIAR_PIX') {
    // Apresenta a política (registra versão) e, em seguida, o Pix estático.
    crm.update(waId, {
      politicaVersao: POLICY_VERSION,
      statusPagamento: 'aguardando_sinal',
      estagio: 'Reserva temporária — aguardando Pix',
      ultimoMovimento: 'política apresentada + Pix enviado',
    });
    const pix = montarMensagemPix();
    extra = '\n\n' + POLICY_TEXT + '\n\n' + pix.texto;
  }

  // "Já paguei" / comprovante: NUNCA confirma automaticamente → Sabrina (P1).
  if (/\b(paguei|pago|comprovante|print|transferi)\b/i.test(texto)) {
    const c = tratarComprovante();
    await enviarResposta(waId, c.texto);
    await handoff(contato, {
      tipo: 'pagamento_para_validar',
      prioridade: c.prioridade,
      ultimaMensagem: texto,
      proximaAcao: 'Validar pagamento no banco e concluir agendamento',
      replyParaPaciente: null, // já respondemos acima
    });
    return;
  }

  const resposta = (control.reply || '') + extra;
  await enviarResposta(waId, resposta);
}

async function textoHorarios() {
  const { horarios, timezone } = await agenda.listarHorariosLivres(2);
  if (!horarios.length) {
    return 'No momento não tenho blocos autorizados livres para oferecer — vou confirmar a agenda com a equipe e já te retorno. 💛';
  }
  const linhas = horarios.map((h, i) => `${i + 1}) ${h.label}`).join('\n');
  return `Tenho estas opções (fuso ${timezone}):\n${linhas}\n\nQual delas fica melhor pra você?`;
}

async function enviarResposta(waId, texto) {
  if (!texto || !texto.trim()) return;
  convo.append(waId, 'assistant', texto);
  await sendText(waId, texto);
}

/** Executa a transferência: responde à paciente (se houver), alerta Sabrina, pausa. */
async function handoff(contato, { tipo, prioridade, ultimaMensagem, proximaAcao, replyParaPaciente }) {
  if (replyParaPaciente && replyParaPaciente.trim()) {
    await enviarResposta(contato.id, replyParaPaciente);
  }
  await alertarSabrina({ contato, tipo, prioridade, ultimaMensagem, proximaAcao });
  crm.pausar(contato.id, tipo);
}
