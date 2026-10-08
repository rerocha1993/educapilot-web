"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ComoElaEscreve } from "@/lib/matriculas/tipos";
import { BotaoCopiar, irPara, Recolhivel, Vazio } from "./partes";

const numero = new Intl.NumberFormat("pt-BR");

export function Manual({ m }: { m: ComoElaEscreve }) {
  const [abertas, setAbertas] = useState<Set<string>>(new Set());

  if (!m.texto || m.secoes.length === 0) {
    return (
      <Vazio acao={{ href: "/matriculas/assistente/ficha", rotulo: "Preencher a ficha" }}>
        O manual é montado com a ficha da escola. Preencha a ficha para ver aqui exatamente o que a assistente lê.
      </Vazio>
    );
  }

  const todas = abertas.size === m.secoes.length;

  function alternar(id: string) {
    setAbertas((a) => {
      const n = new Set(a);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function abrirEIr(id: string) {
    setAbertas((a) => new Set(a).add(id));
    // O item só tem o tamanho final depois de abrir: espera o próximo quadro para rolar até ele.
    requestAnimationFrame(() => irPara(`manual-${id}`));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{m.secoes.length}</span> seções,{" "}
          <span className="tabular-nums">{numero.format(m.totalDeCaracteres)}</span> caracteres. O texto abaixo é o que o modelo recebe, sem edição.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAbertas(todas ? new Set() : new Set(m.secoes.map((s) => s.id)))}
          >
            {todas ? "Recolher tudo" : "Abrir tudo"}
          </Button>
          <BotaoCopiar texto={m.texto} rotulo="Copiar o manual" />
        </div>
      </div>

      <nav aria-label="Seções do manual">
        <ol className="flex flex-wrap gap-2">
          {m.secoes.map((s, i) => (
            <li key={s.id} className="max-w-full">
              <button
                type="button"
                onClick={() => abrirEIr(s.id)}
                className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-border bg-card px-3 text-left text-[12.5px] font-medium transition-colors hover:bg-muted max-md:min-h-10"
              >
                <span className="tabular-nums text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 truncate">{s.titulo}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex flex-col gap-2">
        {m.secoes.map((s, i) => (
          <Recolhivel
            key={s.id}
            id={`manual-${s.id}`}
            aberto={abertas.has(s.id)}
            aoAlternar={() => alternar(s.id)}
            titulo={
              <>
                <span className="mr-2 tabular-nums text-muted-foreground">{i + 1}.</span>
                {s.titulo}
              </>
            }
            resumo={`${numero.format(s.texto.length)} caracteres`}
            acao={<BotaoCopiar texto={s.texto} />}
          >
            <pre className="max-w-full overflow-hidden rounded-xl bg-muted/60 p-3.5 font-mono text-[12.5px] leading-6 break-words whitespace-pre-wrap">
              {s.texto || "(seção sem texto)"}
            </pre>
          </Recolhivel>
        ))}
      </div>
    </div>
  );
}
