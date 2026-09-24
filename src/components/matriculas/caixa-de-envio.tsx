"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUp, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Conversa, ModeloDeMensagem } from "@/lib/matriculas/tipos";
import { useEnviarModelo, useEnviarTexto } from "@/lib/matriculas/use-conversas";

const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });

/** "hoje às 15:05" ou "amanhã às 15:05": a janela quase sempre fecha no dia seguinte. */
function quando(fecha: Date, agora: number) {
  const mesmoDia = dia.format(fecha) === dia.format(new Date(agora));
  return `${mesmoDia ? "hoje" : "amanhã"} às ${hora.format(fecha)}`;
}

function mensagem(erro: unknown, padrao: string) {
  return erro instanceof Error ? erro.message : padrao;
}

/**
 * Onde a equipe escreve. Dentro das 24 horas, texto livre. Fora delas, o WhatsApp só aceita modelo
 * aprovado, e a caixa diz isso em vez de deixar escrever uma mensagem que a Meta vai recusar.
 */
export function CaixaDeEnvio({ conversa, agora }: { conversa: Conversa; agora: number }) {
  if (!conversa.whatsAppConectado) {
    return (
      <Aviso>
        O WhatsApp da escola não está conectado.{" "}
        <Link href="/matriculas/whatsapp" className="font-semibold underline">
          Conectar
        </Link>
      </Aviso>
    );
  }

  return conversa.janelaAberta ? <TextoLivre conversa={conversa} agora={agora} /> : <SoModelo conversa={conversa} />;
}

function TextoLivre({ conversa, agora }: { conversa: Conversa; agora: number }) {
  const [texto, setTexto] = useState("");
  const enviar = useEnviarTexto(conversa.lead.id);
  const fecha = conversa.janelaFechaEm ? new Date(conversa.janelaFechaEm) : null;
  // Faltando menos de 2 horas, a janela vira aviso: foi assim que uma resposta do Colégio saiu com quatro
  // minutos de sobra e a conversa do dia seguinte já não pôde acontecer.
  const acabando = fecha ? fecha.getTime() - agora < 2 * 60 * 60_000 : false;

  // Trava na hora, e não pelo isPending: o estado da mutação só muda na próxima renderização, e dois Enter
  // rápidos mandavam a mesma mensagem duas vezes para a família.
  const enviando = useRef(false);

  async function mandar() {
    const t = texto.trim();
    if (!t || enviando.current) return;
    enviando.current = true;
    try {
      await enviar.mutateAsync(t);
      setTexto("");
    } catch (erro) {
      toast.error(mensagem(erro, "Não foi possível enviar."));
    } finally {
      enviando.current = false;
    }
  }

  function tecla(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      mandar();
    }
  }

  return (
    <div className="flex flex-col gap-1.5 border-t border-foreground/[.07] bg-background/60 px-3 pb-3 pt-2.5 backdrop-blur-xl">
      {fecha && (
        <p className={cn("flex items-center gap-1 px-1 text-[11.5px]", acabando ? "font-semibold text-action" : "text-muted-foreground")}>
          <Clock3 className="size-3" aria-hidden />
          Pode escrever livre até {quando(fecha, agora)}
          {acabando && " · depois disso, só modelo aprovado"}
        </p>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          id="mensagem-whatsapp"
          aria-label="Mensagem"
          rows={1}
          maxLength={4096}
          placeholder="Mensagem"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={tecla}
          className="max-h-40 min-h-10 resize-none rounded-[20px] bg-card px-4 py-2.5 text-[14px] [field-sizing:content]"
        />
        <Button
          type="button"
          variant="action"
          size="icon"
          aria-label="Enviar"
          disabled={!texto.trim() || enviar.isPending}
          onClick={mandar}
          className="size-10 shrink-0 rounded-full"
        >
          <ArrowUp />
        </Button>
      </div>
    </div>
  );
}

function SoModelo({ conversa }: { conversa: Conversa }) {
  const [escolhido, setEscolhido] = useState<ModeloDeMensagem | null>(null);
  const [textoLivre, setTextoLivre] = useState("");
  const enviar = useEnviarModelo(conversa.lead.id);
  const pedeTexto = escolhido?.variaveis.includes("texto") ?? false;

  async function mandar() {
    if (!escolhido) return;
    try {
      await enviar.mutateAsync({ modeloId: escolhido.id, textoLivre: pedeTexto ? textoLivre : null });
      setEscolhido(null);
      setTextoLivre("");
      toast.success("Modelo enviado.");
    } catch (erro) {
      toast.error(mensagem(erro, "Não foi possível enviar o modelo."));
    }
  }

  return (
    <div className="flex flex-col gap-2.5 border-t border-foreground/[.07] bg-background/60 px-3 pb-3 pt-3 backdrop-blur-xl">
      <p className="px-1 text-[13px] text-muted-foreground">
        {conversa.janelaFechaEm || conversa.mensagens.some((m) => m.direcao === "Recebida")
          ? "Passaram 24 horas da última mensagem da família. Pelo WhatsApp, agora só sai modelo aprovado pela Meta."
          : "A família ainda não escreveu. Pelo WhatsApp, a escola só começa a conversa com um modelo aprovado."}
      </p>

      {conversa.modelos.length === 0 ? (
        <Aviso>
          Nenhum modelo aprovado ainda.{" "}
          <Link href="/matriculas/whatsapp" className="font-semibold underline">
            Ver modelos
          </Link>
        </Aviso>
      ) : (
        <div className="-mx-3 overflow-x-auto px-3 [scrollbar-width:none]">
          <div className="flex w-max gap-2" role="radiogroup" aria-label="Modelos aprovados">
            {conversa.modelos.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={escolhido?.id === m.id}
                onClick={() => setEscolhido(m)}
                className={cn(
                  "flex w-60 flex-col gap-1 rounded-2xl border bg-card p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  escolhido?.id === m.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-foreground/20"
                )}
              >
                <span className="text-[12px] font-semibold">{m.uso ?? m.nome}</span>
                <span className="line-clamp-3 text-[12px] leading-snug text-muted-foreground">{m.previa}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {escolhido && (
        <div className="flex flex-col gap-2">
          {pedeTexto && (
            <Textarea
              id="texto-do-modelo"
              aria-label="Texto que entra no modelo"
              rows={2}
              maxLength={900}
              placeholder="A resposta que ficou pendente"
              value={textoLivre}
              onChange={(e) => setTextoLivre(e.target.value)}
              className="rounded-2xl bg-card"
            />
          )}
          <div className="flex justify-end">
            <Button variant="action" disabled={enviar.isPending || (pedeTexto && !textoLivre.trim())} onClick={mandar}>
              {enviar.isPending ? "Enviando..." : "Enviar modelo"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-foreground/[.07] px-4 py-3 text-[13px] text-muted-foreground">{children}</div>
  );
}
