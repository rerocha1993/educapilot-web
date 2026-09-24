"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { AlertTriangle, RotateCcw, SendHorizontal, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CabecalhoDaAssistente, Campo, erro } from "@/components/matriculas/assistente/partes";
import { cn } from "@/lib/utils";
import type { RespostaDeTeste } from "@/lib/matriculas/tipos";
import { useAssistente, useTestarAssistente } from "@/lib/matriculas/use-assistente";

/** Nome técnico da ferramenta, em palavras de escola. */
const FERRAMENTA: Record<string, string> = {
  determinar_turma: "calculou a turma",
  registrar_dados: "anotou os dados da família",
  combinar_retomada: "combinou de retomar depois",
  encerrar_conversa: "encerrou a conversa",
  chamar_equipe: "chamou a equipe",
};

type Linha =
  | { tipo: "familia"; texto: string }
  | { tipo: "assistente"; resposta: RespostaDeTeste };

export default function ConversarPage() {
  const { data: assistente } = useAssistente();
  const testar = useTestarAssistente();
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [texto, setTexto] = useState("");
  const [nome, setNome] = useState("");
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [linhas, testar.isPending]);

  async function enviar(e?: FormEvent) {
    e?.preventDefault();
    const mensagem = texto.trim();
    if (!mensagem || testar.isPending) return;

    const conversa: Linha[] = [...linhas, { tipo: "familia", texto: mensagem }];
    setLinhas(conversa);
    setTexto("");

    // Cada balão da assistente vira um turno dela; a família, um por mensagem. O servidor junta os seguidos.
    const mensagens = conversa.flatMap((l) =>
      l.tipo === "familia" ? [{ daFamilia: true, texto: l.texto }] : l.resposta.baloes.map((b) => ({ daFamilia: false, texto: b }))
    );
    try {
      const resposta = await testar.mutateAsync({ mensagens, nomeDoContato: nome.trim() || null });
      setLinhas((atual) => [...atual, { tipo: "assistente", resposta }]);
    } catch (err) {
      toast.error(erro(err, "A assistente não respondeu."));
      setLinhas(linhas);
      setTexto(mensagem);
    }
  }

  const indisponivel = assistente && (!assistente.servicoDisponivel || !assistente.fichaPreenchida);

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoDaAssistente
        titulo="Conversar com ela"
        descricao="Faça o papel de uma família. Nada vai para o WhatsApp e nada entra no funil: é só para ver como ela responde com a ficha de hoje."
      />

      {indisponivel && (
        <p className="flex max-w-4xl items-start gap-2 rounded-2xl bg-warning-soft px-4 py-3 text-[13.5px] text-warning-soft-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {!assistente.fichaPreenchida ? "Salve a ficha da escola antes de conversar com ela." : "A IA ainda não foi ativada para a sua escola pelo EducaPilot."}
        </p>
      )}

      <div className="grid max-w-5xl gap-4 lg:grid-cols-[1fr_17rem]">
        {/* o celular */}
        <section className="flex h-[min(600px,calc(100dvh-19rem))] min-h-[400px] flex-col overflow-hidden rounded-[28px] border border-border bg-muted/40">
          <div className="flex-1 overflow-y-auto px-4 py-5">
            {linhas.length === 0 && (
              <div className="mx-auto mt-10 max-w-xs text-center text-[13.5px] text-muted-foreground">
                <p className="font-heading text-base font-semibold text-foreground">Escreva como uma mãe escreveria</p>
                <p className="mt-1">
                  &ldquo;oi, vocês têm vaga pro ano que vem? minha filha nasceu em maio de 2023&rdquo;
                </p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {linhas.map((l, i) =>
                l.tipo === "familia" ? (
                  <Balao key={i} daEscola={false}>
                    {l.texto}
                  </Balao>
                ) : (
                  <RespostaNaConversa key={i} r={l.resposta} />
                )
              )}
              {testar.isPending && (
                <div className="flex justify-end" aria-live="polite">
                  <span className="rounded-[20px] rounded-br-[6px] bg-primary/80 px-4 py-3" aria-label="A assistente está escrevendo">
                    <span className="flex gap-1">
                      {[0, 1, 2].map((d) => (
                        <span key={d} className="size-1.5 animate-bounce rounded-full bg-primary-foreground/80" style={{ animationDelay: `${d * 120}ms` }} />
                      ))}
                    </span>
                  </span>
                </div>
              )}
              <div ref={fim} />
            </div>
          </div>

          <form onSubmit={enviar} className="flex items-end gap-2 border-t border-border bg-card p-3">
            <Textarea
              aria-label="Mensagem da família"
              rows={1}
              value={texto}
              placeholder="Mensagem da família"
              className="max-h-32 min-h-10 resize-none"
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void enviar();
                }
              }}
            />
            <Button type="submit" size="icon" aria-label="Enviar" disabled={!texto.trim() || testar.isPending || !!indisponivel}>
              <SendHorizontal className="size-4" aria-hidden />
            </Button>
          </form>
        </section>

        {/* ao lado */}
        <aside className="flex flex-col gap-3">
          <div className="rounded-[24px] border border-border bg-card p-4">
            <Campo id="c-nome" rotulo="Nome no WhatsApp" dica="Vazio: um contato sem nome, como chega muitas vezes.">
              <Input id="c-nome" placeholder="Mariana Costa" value={nome} onChange={(e) => setNome(e.target.value)} />
            </Campo>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              disabled={linhas.length === 0 || testar.isPending}
              onClick={() => setLinhas([])}
            >
              <RotateCcw className="size-4" aria-hidden /> Começar de novo
            </Button>
          </div>
          <p className="px-1 text-[12.5px] text-muted-foreground">
            Por baixo de cada resposta aparece o que ela faria de verdade: a turma que anotaria, se chamaria a equipe. Se algo
            estiver errado, o conserto quase sempre é na ficha.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Balao({ daEscola, children }: { daEscola: boolean; children: ReactNode }) {
  return (
    <div className={cn("flex", daEscola ? "justify-end" : "justify-start")}>
      <p
        className={cn(
          "max-w-[min(80%,460px)] rounded-[20px] px-3.5 py-2 text-[14px] leading-[1.45] whitespace-pre-wrap break-words shadow-[0_1px_1px_rgba(42,37,48,.06)]",
          daEscola ? "rounded-br-[6px] bg-primary text-primary-foreground" : "rounded-bl-[6px] bg-card text-card-foreground ring-1 ring-foreground/[.06]"
        )}
      >
        {children}
      </p>
    </div>
  );
}

function RespostaNaConversa({ r }: { r: RespostaDeTeste }) {
  const acoes = r.ferramentas.map((f) => FERRAMENTA[f] ?? f);

  return (
    <div className="flex flex-col gap-1.5">
      {r.baloes.map((b, i) => (
        <Balao key={i} daEscola>
          {b}
        </Balao>
      ))}
      {!r.ok && r.erro && (
        <p className="ml-auto flex max-w-[min(80%,460px)] items-start gap-1.5 rounded-2xl bg-destructive-soft px-3 py-2 text-[12.5px] text-destructive-soft-foreground">
          <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden /> {r.erro}
        </p>
      )}
      {(r.efeitos.length > 0 || acoes.length > 0) && (
        <div className="ml-auto max-w-[min(80%,460px)] rounded-2xl border border-dashed border-border bg-card/70 px-3 py-2 text-[12.5px] text-muted-foreground">
          {acoes.length > 0 && (
            <p className="flex items-center gap-1.5">
              <Wrench className="size-3.5 shrink-0" aria-hidden /> Ela {acoes.join(", ")}.
            </p>
          )}
          {r.efeitos.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {r.efeitos.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
