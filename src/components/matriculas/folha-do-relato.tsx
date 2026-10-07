"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { LeadResumo, RelatoParaEnviar, SinalDaFamilia } from "@/lib/matriculas/tipos";
import { ROTULO_DO_SINAL } from "@/lib/matriculas/rotulos";
import {
  ASSUNTOS,
  ESCALA_DE_INTERESSE,
  ORDEM_DOS_CAMPOS,
  PERGUNTAS,
  QUEM_VEIO,
  conferirRelato,
  type CampoDoRelato,
  type ErrosDoRelato,
} from "@/lib/matriculas/relato";

export interface ErroDoServidor {
  campo?: string;
  mensagem: string;
}

const SEM_SINAL = "-";

/**
 * "Como foi a visita": o relato que a equipe escreve ao levar o card para Visitou. O card só muda de
 * coluna quando o servidor aceita (quem decide é o `onConfirmar`, que devolve o erro se houver).
 */
export function FolhaDoRelato({
  lead,
  onConfirmar,
  onCancelar,
}: {
  lead: LeadResumo | null;
  /** Resolve sem valor quando o servidor aceitou; devolve o erro quando recusou. */
  onConfirmar: (relato: RelatoParaEnviar) => Promise<ErroDoServidor | void>;
  onCancelar: () => void;
}) {
  return (
    <Dialog open={!!lead} onOpenChange={(aberto) => !aberto && onCancelar()}>
      {lead && <Conteudo key={lead.id} lead={lead} onConfirmar={onConfirmar} onCancelar={onCancelar} />}
    </Dialog>
  );
}

function Conteudo({
  lead,
  onConfirmar,
  onCancelar,
}: {
  lead: LeadResumo;
  onConfirmar: (relato: RelatoParaEnviar) => Promise<ErroDoServidor | void>;
  onCancelar: () => void;
}) {
  const [quemVeio, setQuemVeio] = useState<string[]>([]);
  const [interesse, setInteresse] = useState<number | null>(null);
  const [assuntos, setAssuntos] = useState<string[]>([]);
  const [sinal, setSinal] = useState<SinalDaFamilia | null>(lead.sinal ?? null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [nadaPrometido, setNadaPrometido] = useState(false);
  const [erros, setErros] = useState<ErrosDoRelato>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Um clique só: o estado só muda na próxima renderização, e o envio dispara contatos agendados.
  const travado = useRef(false);
  const corpo = useRef<HTMLDivElement>(null);

  const nome = lead.nomeResponsavel.split(" ")[0];

  function limpar(campo: CampoDoRelato) {
    setErros((e) => {
      if (!e[campo]) return e;
      const resto = { ...e };
      delete resto[campo];
      return resto;
    });
    setErroGeral(null);
  }

  function irParaOPrimeiro(e: ErrosDoRelato) {
    const primeiro = ORDEM_DOS_CAMPOS.find((c) => e[c]);
    if (!primeiro) return;
    const alvo = corpo.current?.querySelector<HTMLElement>(`[data-campo="${primeiro}"]`);
    alvo?.scrollIntoView({ block: "center", behavior: "smooth" });
    alvo?.querySelector<HTMLElement>("textarea, button, [role=radio]")?.focus({ preventScroll: true });
  }

  async function enviar() {
    if (travado.current) return;
    const relato: RelatoParaEnviar = { quemVeio, interesse, assuntos, sinal, respostas, nadaPrometido };
    const achados = conferirRelato(relato);
    if (Object.keys(achados).length > 0) {
      setErros(achados);
      irParaOPrimeiro(achados);
      return;
    }
    travado.current = true;
    setEnviando(true);
    try {
      const erro = await onConfirmar(relato);
      if (erro) {
        const conhecido = ORDEM_DOS_CAMPOS.find((c) => c === erro.campo?.replace(/^respostas\./, ""));
        if (conhecido) {
          const novo: ErrosDoRelato = { [conhecido]: erro.mensagem };
          setErros(novo);
          irParaOPrimeiro(novo);
        } else {
          setErroGeral(erro.mensagem);
        }
      }
    } finally {
      travado.current = false;
      setEnviando(false);
    }
  }

  const alternar = (lista: string[], id: string) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);

  return (
    <DialogContent
      className="flex max-h-[calc(100dvh-1.5rem)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-2xl"
      initialFocus={false}
    >
      <DialogHeader className="gap-1.5 border-b border-foreground/[.07] px-5 pb-4 pt-5 pr-12 sm:px-7 sm:pt-6">
        <DialogTitle className="font-heading text-xl font-semibold tracking-[-.02em]">Como foi a visita de {nome}?</DialogTitle>
        <DialogDescription className="max-w-prose text-[13.5px] leading-relaxed">
          Escreva agora, enquanto está fresco. É isto que a coordenação lê, e é isto que vai estar aqui quando alguém falar com essa
          família daqui a duas semanas.
        </DialogDescription>
      </DialogHeader>

      <div ref={corpo} className="flex min-w-0 flex-1 flex-col gap-7 overflow-y-auto px-5 py-6 sm:px-7">
        <Bloco campo="quemVeio" titulo="Quem esteve na visita?" erro={erros.quemVeio}>
          <Chips
            rotulo="Quem esteve na visita"
            opcoes={QUEM_VEIO}
            marcados={quemVeio}
            onAlternar={(id) => {
              setQuemVeio((l) => alternar(l, id));
              limpar("quemVeio");
            }}
          />
        </Bloco>

        <Bloco
          campo="interesse"
          titulo="De 0 a 5, o quanto essa família saiu querendo a vaga?"
          ajuda="Não é se gostaram — todo mundo gosta, por educação. É o quanto querem a vaga."
          erro={erros.interesse}
        >
          <EscalaDeInteresse
            valor={interesse}
            onChange={(n) => {
              setInteresse(n);
              limpar("interesse");
            }}
          />
        </Bloco>

        <Bloco
          campo="assuntos"
          titulo="Do que eles mais quiseram saber?"
          ajuda="O que a família pergunta é o que ela teme. Marque tudo que puxaram."
          erro={erros.assuntos}
        >
          <Chips
            rotulo="Assuntos"
            opcoes={ASSUNTOS}
            marcados={assuntos}
            onAlternar={(id) => {
              setAssuntos((l) => alternar(l, id));
              limpar("assuntos");
            }}
          />
        </Bloco>

        <Bloco campo="sinal" titulo="Como a família saiu daqui?" erro={erros.sinal}>
          <Select
            value={sinal ?? SEM_SINAL}
            onValueChange={(v) => {
              setSinal(!v || v === SEM_SINAL ? null : (v as SinalDaFamilia));
              limpar("sinal");
            }}
          >
            <SelectTrigger id="relato-sinal" className="h-10 w-full" aria-invalid={!!erros.sinal} aria-label="Como a família saiu daqui">
              <SelectValue>{() => (sinal ? ROTULO_DO_SINAL[sinal] : "Escolha uma")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEM_SINAL}>Escolha uma</SelectItem>
              {(Object.keys(ROTULO_DO_SINAL) as SinalDaFamilia[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {ROTULO_DO_SINAL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Bloco>

        {PERGUNTAS.map((p) => {
          const escondida = p.id === "prometido" && nadaPrometido;
          return (
            <Bloco key={p.id} campo={p.id} titulo={p.rotulo} ajuda={p.ajuda} obrigatorio={p.obrigatoria} erro={erros[p.id]} htmlFor={`relato-${p.id}`}>
              {!escondida && (
                <Textarea
                  id={`relato-${p.id}`}
                  rows={3}
                  maxLength={1000}
                  placeholder={p.exemplo}
                  value={respostas[p.id] ?? ""}
                  aria-invalid={!!erros[p.id]}
                  aria-describedby={erros[p.id] ? `relato-${p.id}-erro` : undefined}
                  onChange={(e) => {
                    setRespostas((r) => ({ ...r, [p.id]: e.target.value }));
                    limpar(p.id);
                  }}
                  className="min-h-[88px] rounded-2xl px-3.5 py-3 text-[14.5px] leading-relaxed md:text-[14px]"
                />
              )}
              {p.id === "prometido" && (
                <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={nadaPrometido}
                    onChange={(e) => {
                      setNadaPrometido(e.target.checked);
                      limpar("prometido");
                    }}
                    className="size-4 rounded accent-[var(--primary)]"
                  />
                  Nada ficou pendente
                </label>
              )}
            </Bloco>
          );
        })}
      </div>

      <div className="flex flex-col gap-2.5 border-t border-foreground/[.07] bg-popover px-5 py-4 sm:px-7">
        {erroGeral && (
          <p role="alert" className="rounded-2xl bg-destructive-soft px-3.5 py-2.5 text-[13px] text-destructive-soft-foreground">
            {erroGeral}
          </p>
        )}
        {Object.keys(erros).length > 0 && !erroGeral && (
          <p className="text-[12.5px] text-muted-foreground">Falta preencher alguns campos acima.</p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="sm:min-w-28" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </Button>
          <Button variant="action" className="sm:min-w-56" onClick={enviar} disabled={enviando}>
            {enviando ? "Salvando…" : "Salvar e mover para Visitou"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function Bloco({
  campo,
  titulo,
  ajuda,
  obrigatorio,
  erro,
  htmlFor,
  children,
}: {
  campo: CampoDoRelato;
  titulo: string;
  ajuda?: string;
  obrigatorio?: boolean;
  erro?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div data-campo={campo} className="flex min-w-0 flex-col gap-2.5">
      <div className="flex flex-col gap-1">
        <label htmlFor={htmlFor} className="text-[15px] font-semibold leading-snug tracking-[-.01em]">
          {titulo}
          {obrigatorio && <span className="text-action" aria-label="obrigatória"> *</span>}
        </label>
        {ajuda && <p className="text-[13px] leading-relaxed text-muted-foreground">{ajuda}</p>}
      </div>
      {children}
      {erro && (
        <p id={`relato-${campo}-erro`} role="alert" className="text-[13px] font-medium text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}

function Chips({
  rotulo,
  opcoes,
  marcados,
  onAlternar,
}: {
  rotulo: string;
  opcoes: { id: string; rotulo: string }[];
  marcados: string[];
  onAlternar: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={rotulo}>
      {opcoes.map((o) => {
        const marcado = marcados.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={marcado}
            onClick={() => onAlternar(o.id)}
            className={cn(
              "min-h-10 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              marcado ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A escala de 0 a 5: seis degraus que esquentam do neutro ao laranja da marca. É um radiogroup, com
 * setas para mudar de degrau e um só tabindex ativo. A frase do degrau escolhido aparece embaixo,
 * porque a do celular não cabe dentro da célula.
 */
function EscalaDeInteresse({ valor, onChange }: { valor: number | null; onChange: (n: number) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function teclado(e: KeyboardEvent, nota: number) {
    let alvo: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") alvo = Math.min(5, nota + 1);
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") alvo = Math.max(0, nota - 1);
    if (e.key === "Home") alvo = 0;
    if (e.key === "End") alvo = 5;
    if (alvo == null) return;
    e.preventDefault();
    onChange(alvo);
    refs.current[alvo]?.focus();
  }

  const ativo = valor != null ? ESCALA_DE_INTERESSE[valor] : null;
  // Sem valor, o primeiro degrau recebe o foco do Tab.
  const focavel = valor ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="De 0 a 5, o quanto a família saiu querendo a vaga" className="grid min-w-0 grid-cols-6 gap-1.5 sm:gap-2">
        {ESCALA_DE_INTERESSE.map((d) => {
          const marcado = valor === d.nota;
          // Intensidade do degrau: de 6% a 36% de laranja sobre o cartão; o escolhido enche inteiro.
          const mistura = 6 + d.nota * 6;
          return (
            <button
              key={d.nota}
              ref={(el) => {
                refs.current[d.nota] = el;
              }}
              type="button"
              role="radio"
              aria-checked={marcado}
              aria-label={`${d.nota}: ${d.frase}`}
              title={d.frase}
              tabIndex={focavel === d.nota ? 0 : -1}
              onClick={() => onChange(d.nota)}
              onKeyDown={(e) => teclado(e, d.nota)}
              style={marcado ? undefined : { backgroundColor: `color-mix(in oklab, var(--action) ${mistura}%, var(--card))` }}
              className={cn(
                "flex min-h-[72px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl border px-1 py-2 transition-[transform,box-shadow,background-color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none",
                marcado
                  ? "scale-[1.04] border-action bg-action text-action-foreground shadow-[0_8px_20px_-8px_var(--action)]"
                  : "border-border text-foreground hover:border-action-border"
              )}
            >
              <span className="font-mono text-[26px] font-medium leading-none tabular-nums">{d.nota}</span>
              <span className={cn("hidden w-full truncate text-center text-[10.5px] font-medium leading-tight sm:block", marcado ? "opacity-90" : "text-muted-foreground")}>
                {d.curto}
              </span>
            </button>
          );
        })}
      </div>
      <p
        aria-live="polite"
        className={cn(
          "min-h-[2.75rem] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-snug",
          ativo ? "bg-action-soft text-action-soft-foreground" : "bg-muted/70 text-muted-foreground"
        )}
      >
        {ativo ? (
          <>
            <b className="font-mono tabular-nums">{ativo.nota}/5</b> — {ativo.frase}
          </>
        ) : (
          "Toque num número. Vazio não é zero: zero é “veio por educação, não quer a vaga”."
        )}
      </p>
    </div>
  );
}
