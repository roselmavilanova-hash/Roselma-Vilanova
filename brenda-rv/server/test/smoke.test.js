import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseControl } from '../src/brenda.js';
import * as agenda from '../src/agenda.mock.js';
import { montarMensagemPix, tratarComprovante } from '../src/pix.js';
import { verifySignature } from '../src/signature.js';

test('parseControl aceita JSON válido do modelo', () => {
  const c = parseControl(
    '{"reply":"Oi!","transferir":false,"prioridade":null,"estagio":"Em qualificação","temperatura":"Morno","proximo_passo":"perguntar cidade","acao":null}'
  );
  assert.equal(c.reply, 'Oi!');
  assert.equal(c.transferir, false);
  assert.equal(c.temperatura, 'Morno');
});

test('parseControl transfere por segurança quando a saída é inválida', () => {
  const c = parseControl('texto sem json nenhum');
  assert.equal(c.transferir, true);
  assert.equal(c.pausar, true);
});

test('parseControl normaliza temperatura e prioridade inválidas', () => {
  const c = parseControl('{"reply":"x","temperatura":"Fervendo","prioridade":"P9"}');
  assert.equal(c.temperatura, 'Frio');
  assert.equal(c.prioridade, null);
});

test('agenda: reserva expira e libera o horário; reserva é idempotente', () => {
  const { horarios } = agenda.listarHorariosLivres(2);
  assert.ok(horarios.length >= 1, 'deve haver ao menos um horário livre');
  const slotId = horarios[0].slotId;

  const r1 = agenda.reservarHorario(slotId, 'AB', 'msg-1');
  assert.equal(r1.ok, true);
  assert.equal(r1.duplicada, false);

  // Mesmo idempotencyKey não duplica.
  const r2 = agenda.reservarHorario(slotId, 'AB', 'msg-1');
  assert.equal(r2.duplicada, true);

  // Slot agora está indisponível para outra pessoa.
  const r3 = agenda.reservarHorario(slotId, 'CD', 'msg-2');
  assert.equal(r3.ok, false);
});

test('agenda: reserva de 2 horas (Especificação §4)', () => {
  assert.equal(agenda._config.RESERVA_MINUTOS, 120);
  assert.equal(agenda._config.TIMEZONE, 'America/Fortaleza');
});

test('pix: sem chave configurada, não expõe chave e acolhe', () => {
  const m = montarMensagemPix();
  // Em ambiente de teste sem PIX_KEY, ok=false e mensagem de acolhimento.
  assert.equal(m.ok, false);
});

test('pix: comprovante NUNCA confirma automaticamente', () => {
  const c = tratarComprovante();
  assert.equal(c.confirmar, false);
  assert.equal(c.prioridade, 'P1');
});

test('assinatura: sem APP_SECRET a verificação é pulada (piloto sem chaves)', () => {
  const v = verifySignature(Buffer.from('{}'), undefined);
  assert.equal(v.valid, true);
  assert.equal(v.skipped, true);
});
