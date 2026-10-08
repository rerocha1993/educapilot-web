"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUpRight, Check, ChevronDown, Copy, type LucideIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Uma seção da tela: ícone, título, o que é, e (quando existe) onde se edita. */
export function Secao({
  id,
  icone: Icone,
  titulo,
  descricao,
  editar,
  children,
}: {
  id: string;
  icone: LucideIcon;
  titulo: string;
  descricao: ReactNode;
  editar?: { href: string; rotulo: string };
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="scroll-mt-20 min-w-0">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-action-soft text-action-soft-foreground">
            <Icone className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id={`${id}-titulo`} className="font-heading text-xl font-semibold leading-tight tracking-[-.02em]">
              {titulo}
            </h2>
            <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">{descricao}</p>
          </div>
        </div>
        {editar && <LinkDeEdicao href={editar.href}>{editar.rotulo}</LinkDeEdicao>}
      </header>
      {children}
    </section>
  );
}

export function LinkDeEdicao({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}>
      {children}
      <ArrowUpRight aria-hidden />
    </Link>
  );
}

/** Cartão neutro, o mesmo raio e a mesma borda dos blocos da assistente. */
export function Cartao({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("min-w-0 rounded-[20px] border border-border bg-card p-4 sm:p-5", className)}>{children}</div>;
}

export function Rotulo({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground", className)}>{children}</p>
  );
}

/** Estado vazio, com a borda tracejada do guia e o caminho para resolver. */
export function Vazio({ children, acao }: { children: ReactNode; acao?: { href: string; rotulo: string } }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[20px] border border-dashed border-border-dashed bg-muted/40 p-5 text-[13.5px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <p className="min-w-0">{children}</p>
      {acao && <LinkDeEdicao href={acao.href}>{acao.rotulo}</LinkDeEdicao>}
    </div>
  );
}

/** Texto longo recolhido em poucas linhas, com "ver tudo". */
export function TextoRecolhivel({ texto, linhas = 3, className }: { texto: string; linhas?: 2 | 3 | 4; className?: string }) {
  const [aberto, setAberto] = useState(false);
  const longo = texto.length > linhas * 70;
  const clamp = linhas === 2 ? "line-clamp-2" : linhas === 3 ? "line-clamp-3" : "line-clamp-4";
  return (
    <div className={className}>
      <p className={cn("whitespace-pre-line break-words text-[13.5px] leading-relaxed", !aberto && clamp)}>{texto}</p>
      {longo && (
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          className="mt-1 text-[12.5px] font-medium text-action-soft-foreground hover:underline"
        >
          {aberto ? "Ver menos" : "Ver tudo"}
        </button>
      )}
    </div>
  );
}

/** Um item que abre e fecha. O estado vem de fora para a tela poder abrir tudo de uma vez. */
export function Recolhivel({
  id,
  aberto,
  aoAlternar,
  titulo,
  resumo,
  acao,
  children,
}: {
  id?: string;
  aberto: boolean;
  aoAlternar: () => void;
  titulo: ReactNode;
  resumo?: ReactNode;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div id={id} className="min-w-0 scroll-mt-20 rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 pr-2">
        <button
          type="button"
          aria-expanded={aberto}
          onClick={aoAlternar}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-2xl px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
        >
          <ChevronDown
            className={cn("size-4 shrink-0 text-muted-foreground transition-transform", aberto && "rotate-180")}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block break-words text-sm font-semibold">{titulo}</span>
            {resumo && <span className="mt-0.5 block text-[12px] text-muted-foreground">{resumo}</span>}
          </span>
        </button>
        {acao}
      </div>
      {aberto && <div className="border-t border-border px-4 py-3.5">{children}</div>}
    </div>
  );
}

/** Copia um texto e avisa. */
export function BotaoCopiar({ texto, rotulo, className }: { texto: string; rotulo?: string; className?: string }) {
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 1800);
    return () => clearTimeout(t);
  }, [copiado]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      toast.success("Copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto e copie com o teclado.");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={rotulo ? "sm" : "icon-sm"}
      onClick={copiar}
      aria-label={rotulo ?? "Copiar"}
      className={className}
    >
      {copiado ? <Check className="text-success" aria-hidden /> : <Copy aria-hidden />}
      {rotulo}
    </Button>
  );
}

/** Rola até uma âncora da tela, sem mexer na URL. */
export function irPara(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Qual das seções está na tela agora, para o índice acompanhar a leitura. */
export function useSecaoAtiva(ids: readonly string[]): string {
  const [ativa, setAtiva] = useState(ids[0] ?? "");
  const chave = ids.join("|");

  useEffect(() => {
    const alvos = chave
      .split("|")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (alvos.length === 0 || typeof IntersectionObserver === "undefined") return;

    const visiveis = new Map<string, number>();
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) visiveis.set(e.target.id, e.boundingClientRect.top);
          else visiveis.delete(e.target.id);
        }
        const primeira = alvos.find((a) => visiveis.has(a.id));
        if (primeira) setAtiva(primeira.id);
      },
      { rootMargin: "-12% 0px -65% 0px" }
    );
    alvos.forEach((a) => obs.observe(a));
    return () => obs.disconnect();
  }, [chave]);

  return ativa;
}
