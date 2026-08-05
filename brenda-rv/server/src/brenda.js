import { config } from './config.js';
import { buildSystemPrompt } from './prompt.js';
import { log } from './logger.js';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Chama o Claude 3.5 Sonnet com o system prompt da Brenda e o histórico da
 * conversa. Retorna o objeto de controle já parseado (ver CONTRATO DE SAÍDA).
 *
 * `history` é um array de { role: 'user' | 'assistant', content: string }.
 */
export async function askBrenda(history) {
  if (!config.anthropic.apiKey) {
    // Sem chave ainda: resposta segura de fallback (não inventa nada).
    return {
      reply:
        'Oi! Sou a Brenda, assistente virtual da RV. Estou concluindo minha configuração e uma pessoa da equipe já vai te atender por aqui. 💛',
      transferir: true,
      prioridade: 'P2',
      tipo_excecao: 'claude_sem_chave',
      pausar: true,
      estagio: 'Atendimento Sabrina',
      temperatura: 'Frio',
      proximo_passo: 'Configurar ANTHROPIC_API_KEY e retomar atendimento automático',
      acao: null,
      _fallback: true,
    };
  }

  const body = {
    model: config.anthropic.model,
    max_tokens: config.anthropic.maxTokens,
    system: buildSystemPrompt(),
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  };

  let res;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.anthropic.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    log.error('Falha de rede ao chamar Claude', { error: e.message });
    return transferFallback('erro_rede_claude');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    log.error('Claude retornou erro', { status: res.status, body: text.slice(0, 300) });
    return transferFallback('erro_api_claude');
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  return parseControl(text);
}

/** Extrai e valida o JSON de controle da resposta do modelo. */
export function parseControl(text) {
  const json = extractJson(text);
  if (!json) {
    log.warn('Resposta da Brenda sem JSON válido; transferindo por segurança', {
      preview: String(text).slice(0, 120),
    });
    return transferFallback('saida_invalida');
  }

  // Normalização defensiva (o servidor é quem decide, não o modelo).
  return {
    reply: typeof json.reply === 'string' ? json.reply : '',
    transferir: json.transferir === true,
    prioridade: normalizePrioridade(json.prioridade),
    tipo_excecao: json.tipo_excecao ?? null,
    pausar: json.pausar === true || json.transferir === true,
    estagio: typeof json.estagio === 'string' ? json.estagio : 'Em qualificação',
    temperatura: normalizeTemperatura(json.temperatura),
    proximo_passo: typeof json.proximo_passo === 'string' ? json.proximo_passo : '',
    acao: normalizeAcao(json.acao),
  };
}

function extractJson(text) {
  if (!text) return null;
  // Tenta o texto inteiro; senão, o primeiro bloco { ... }.
  const candidates = [];
  const trimmed = text.trim();
  candidates.push(trimmed);
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) candidates.push(trimmed.slice(start, end + 1));
  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      /* tenta o próximo */
    }
  }
  return null;
}

function normalizePrioridade(p) {
  return ['P0', 'P1', 'P2', 'P3'].includes(p) ? p : null;
}

function normalizeTemperatura(t) {
  const valid = ['Quente', 'Morno', 'Frio', 'Inadequado/Assistencial'];
  return valid.includes(t) ? t : 'Frio';
}

function normalizeAcao(a) {
  const valid = ['ENVIAR_PIX', 'OFERECER_HORARIOS', 'RESERVAR_HORARIO'];
  return valid.includes(a) ? a : null;
}

function transferFallback(tipo) {
  return {
    reply:
      'Deixa eu te conectar com uma pessoa da nossa equipe para te ajudar melhor com isso, tá? 💛',
    transferir: true,
    prioridade: 'P2',
    tipo_excecao: tipo,
    pausar: true,
    estagio: 'Atendimento Sabrina',
    temperatura: 'Inadequado/Assistencial',
    proximo_passo: 'Sabrina assume o atendimento',
    acao: null,
  };
}
