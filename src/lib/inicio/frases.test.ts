// Rodar: node --test src/lib/inicio/frases.test.ts   (Node 22.6+ / 24)
import assert from "node:assert/strict";
import { test } from "node:test";

import { fraseDoDia } from "./frase-do-dia.ts";
import { FRASES } from "./frases.ts";

// Instantes com offset explícito; Brasília é UTC-3 o ano todo (sem horário de verão desde 2019).
const em = (iso: string) => new Date(iso);

test("a lista tem pelo menos 90 frases, sem repetição, vazia ou longa demais", () => {
  assert.ok(FRASES.length >= 90, `só ${FRASES.length} frases`);
  assert.equal(new Set(FRASES.map((f) => f.toLowerCase())).size, FRASES.length);
  for (const f of FRASES) {
    assert.ok(f.trim().length > 0, "frase vazia");
    assert.equal(f, f.trim());
    assert.ok(f.length <= 140, `longa demais (${f.length}): ${f}`);
  }
});

test("nenhuma frase soa cobrança nem usa 'acredite'", () => {
  for (const f of FRASES) {
    assert.ok(!/acredit/i.test(f), f);
    assert.ok(!/você precisa|produzir mais/i.test(f), f);
  }
});

test("mesma data, mesma frase, a qualquer hora do dia", () => {
  const manha = fraseDoDia(em("2026-10-20T09:00:00-03:00"));
  assert.equal(fraseDoDia(em("2026-10-20T00:00:00-03:00")), manha);
  assert.equal(fraseDoDia(em("2026-10-20T23:59:59-03:00")), manha);
});

test("dias consecutivos dão frases diferentes (inclusive virada de mês e de ano)", () => {
  const pares: [string, string][] = [
    ["2026-10-20", "2026-10-21"],
    ["2026-10-31", "2026-11-01"],
    ["2026-02-28", "2026-03-01"],
    ["2026-12-31", "2027-01-01"],
    ["2028-02-28", "2028-02-29"],
  ];
  for (const [a, b] of pares) {
    assert.notEqual(
      fraseDoDia(em(`${a}T12:00:00-03:00`)),
      fraseDoDia(em(`${b}T12:00:00-03:00`)),
      `${a} e ${b}`
    );
  }
});

test("o fuso é o de Brasília: 23h59 e 00h01 caem em dias diferentes", () => {
  const as2359 = fraseDoDia(em("2026-10-20T23:59:00-03:00"));
  const as0001 = fraseDoDia(em("2026-10-21T00:01:00-03:00"));
  assert.notEqual(as2359, as0001);
  // 02h30 UTC do dia 21 ainda é 23h30 do dia 20 em Brasília.
  assert.equal(fraseDoDia(em("2026-10-21T02:30:00Z")), as2359);
  // 03h01 UTC do dia 21 já é 00h01 do dia 21 em Brasília.
  assert.equal(fraseDoDia(em("2026-10-21T03:01:00Z")), as0001);
});

test("depois de percorrer a lista inteira a sequência recomeça", () => {
  const dia = em("2026-10-20T12:00:00-03:00");
  const depois = new Date(dia.getTime() + FRASES.length * 86_400_000);
  assert.equal(fraseDoDia(depois), fraseDoDia(dia));
});

test("lista vazia não quebra", () => {
  assert.equal(fraseDoDia(new Date(), []), "");
});
