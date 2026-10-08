"use client";

import { AlertCircle, Check, CheckCheck, Clock, FileText, Paperclip } from "lucide-react";

import { FotoAutenticada } from "@/components/relacionamento/foto-autenticada";
import {
  baixarAnexoDoChatDaEscola,
  baixarAnexoDoChatDaFamilia,
  type BaixarFoto,
} from "@/lib/relacionamento/api";
import { AUTOR_DO_LADO, type LadoDoChat, type MensagemNaTela } from "@/lib/relacionamento/chat-comum";
import { formatarHora } from "@/lib/format/date";
import { cn } from "@/lib/utils";

const BAIXAR: Record<LadoDoChat, BaixarFoto> = {
  escola: baixarAnexoDoChatDaEscola,
  familia: baixarAnexoDoChatDaFamilia,
};

/**
 * Uma mensagem do chat. A do próprio lado fica à direita, na cor primária, e a do outro à
 * esquerda, no cartão; o nome do autor e a hora vão sempre escritos, e o estado ("Enviando", "Lida") também
 * é texto, nunca só ícone ou cor.
 */
export function BolhaDaMensagem({
  mensagem,
  lado,
  aoAbrirAnexo,
  aoReenviar,
  aoDescartar,
}: {
  mensagem: MensagemNaTela;
  lado: LadoDoChat;
  aoAbrirAnexo: (mensagem: MensagemNaTela) => void;
  aoReenviar: (tmpId: string) => void;
  aoDescartar: (tmpId: string) => void;
}) {
  const propria = mensagem.autor === AUTOR_DO_LADO[lado];
  const anexo = mensagem.anexo;
  const ehImagem = !!anexo && anexo.contentType.startsWith("image/");
  const emTransito = mensagem.situacao !== undefined;

  return (
    <li className={cn("flex flex-col gap-0.5", propria ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-[14.5px] leading-snug md:max-w-[70%]",
          propria ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-card",
          mensagem.situacao === "falhou" && "ring-2 ring-destructive-border"
        )}
      >
        <p className={cn("mb-0.5 text-[11.5px] font-semibold", propria ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {propria ? "Você" : mensagem.autorNome || (mensagem.autor === "Escola" ? "Escola" : "Família")}
          {propria && mensagem.autorNome && <span className="font-medium"> ({mensagem.autorNome})</span>}
        </p>

        {anexo &&
          (ehImagem && anexo.temMiniatura && !emTransito ? (
            <button
              type="button"
              onClick={() => aoAbrirAnexo(mensagem)}
              aria-label={`Abrir a foto ${anexo.nome}`}
              className="mb-1 block overflow-hidden rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <FotoAutenticada
                baixar={BAIXAR[lado]}
                fotoId={mensagem.id}
                variante="thumb"
                rotulo={anexo.nome}
                className="size-40 max-w-full"
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => aoAbrirAnexo(mensagem)}
              disabled={emTransito}
              className={cn(
                "mb-1 flex min-h-11 max-w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-default",
                propria ? "bg-primary-foreground/15" : "bg-muted"
              )}
            >
              {ehImagem ? <Paperclip aria-hidden className="size-4 shrink-0" /> : <FileText aria-hidden className="size-4 shrink-0" />}
              <span className="min-w-0 truncate">{anexo.nome}</span>
              {!emTransito && <span className="shrink-0 underline">Abrir</span>}
            </button>
          ))}

        {mensagem.texto && <p className="break-words whitespace-pre-wrap">{mensagem.texto}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-x-2 px-1 text-[11px] text-muted-foreground">
        <span className="tabular-nums">{formatarHora(mensagem.enviadaEm)}</span>

        {mensagem.situacao === "enviando" && (
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden className="size-3" /> Enviando…
          </span>
        )}

        {mensagem.situacao === "falhou" && mensagem.tmpId && (
          <span role="alert" className="inline-flex flex-wrap items-center gap-x-2 text-destructive">
            <span className="inline-flex items-center gap-1 font-medium">
              <AlertCircle aria-hidden className="size-3" /> {mensagem.erro || "Não enviada."}
            </span>
            <button
              type="button"
              onClick={() => aoReenviar(mensagem.tmpId!)}
              className="inline-flex min-h-11 items-center font-semibold underline md:min-h-6"
            >
              Tentar de novo
            </button>
            <button
              type="button"
              onClick={() => aoDescartar(mensagem.tmpId!)}
              className="inline-flex min-h-11 items-center font-semibold underline md:min-h-6"
            >
              Descartar
            </button>
          </span>
        )}

        {propria && !emTransito && (
          <span className="inline-flex items-center gap-1">
            {mensagem.lida ? <CheckCheck aria-hidden className="size-3 text-success" /> : <Check aria-hidden className="size-3" />}
            {mensagem.lida ? "Lida" : "Enviada"}
          </span>
        )}
      </div>
    </li>
  );
}
