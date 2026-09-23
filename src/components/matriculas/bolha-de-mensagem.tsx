"use client";

import { AlertCircle, Check, CheckCheck, Clock, FileText, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Mensagem } from "@/lib/matriculas/tipos";
import { useArquivoDaMensagem } from "@/lib/matriculas/use-conversas";

const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

const AUTOR: Partial<Record<Mensagem["autor"], string>> = {
  Assistente: "Assistente",
  Automacao: "Automático",
};

/** Um balão da conversa: da família à esquerda, da escola à direita, como no celular. */
export function BolhaDeMensagem({ mensagem }: { mensagem: Mensagem }) {
  const daEscola = mensagem.direcao === "Enviada";
  const falhou = mensagem.situacao === "Falhou";

  return (
    <div className={cn("flex flex-col gap-1", daEscola ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[min(78%,480px)] rounded-[20px] px-3.5 py-2 text-[14px] leading-[1.45] shadow-[0_1px_1px_rgba(42,37,48,.06)]",
          daEscola
            ? "rounded-br-[6px] bg-primary text-primary-foreground"
            : "rounded-bl-[6px] bg-card text-card-foreground ring-1 ring-foreground/[.06]",
          falhou && "bg-destructive-soft text-destructive-soft-foreground ring-1 ring-destructive-border"
        )}
      >
        {(mensagem.tipo === "Modelo" || AUTOR[mensagem.autor]) && (
          <p className={cn("mb-0.5 text-[11px] font-semibold opacity-75")}>
            {mensagem.tipo === "Modelo" ? `Modelo · ${mensagem.modeloNome ?? ""}` : AUTOR[mensagem.autor]}
          </p>
        )}

        <Midia mensagem={mensagem} />

        {mensagem.texto && <p className="whitespace-pre-wrap break-words">{mensagem.texto}</p>}

        <p className={cn("mt-0.5 flex items-center justify-end gap-1 text-[10.5px] tabular-nums", daEscola && !falhou ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {hora.format(new Date(mensagem.ocorridaEm))}
          {daEscola && <Entrega situacao={mensagem.situacao} />}
        </p>
      </div>
      {falhou && mensagem.erro && (
        <p className="flex max-w-[min(78%,480px)] items-start gap-1 text-right text-[11.5px] text-destructive">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          Não chegou: {mensagem.erro}
        </p>
      )}
    </div>
  );
}

function Entrega({ situacao }: { situacao: Mensagem["situacao"] }) {
  if (situacao === "Lida") return <CheckCheck className="size-3.5 text-sky-200" aria-label="Lida" />;
  if (situacao === "Entregue") return <CheckCheck className="size-3.5" aria-label="Entregue" />;
  if (situacao === "Enviada") return <Check className="size-3.5" aria-label="Enviada" />;
  if (situacao === "Falhou") return <AlertCircle className="size-3.5" aria-label="Falhou" />;
  return <Clock className="size-3" aria-label="Enviando" />;
}

function Midia({ mensagem }: { mensagem: Mensagem }) {
  if (mensagem.arquivoIndisponivel) {
    return (
      <p className="mb-1 rounded-xl bg-foreground/[.06] px-2.5 py-2 text-[12.5px]">
        O arquivo não veio da Meta. Se precisar dele, peça para a família mandar de novo.
      </p>
    );
  }
  if (mensagem.tipo === "Localizacao") {
    return (
      <p className="mb-1 flex items-center gap-1.5 text-[12.5px] font-semibold">
        <MapPin className="size-3.5" aria-hidden /> Localização
      </p>
    );
  }
  if (!mensagem.temArquivo) return null;
  return <ArquivoCarregado mensagem={mensagem} />;
}

function ArquivoCarregado({ mensagem }: { mensagem: Mensagem }) {
  const { url, falhou } = useArquivoDaMensagem(mensagem.id);

  if (falhou) return <p className="mb-1 text-[12.5px] opacity-80">Não foi possível abrir o arquivo.</p>;
  if (!url) return <div className="mb-1 h-24 w-48 animate-pulse rounded-2xl bg-foreground/[.08]" aria-label="Carregando arquivo" />;

  switch (mensagem.tipo) {
    case "Imagem":
    case "Figurinha":
      return (
        <a href={url} target="_blank" rel="noreferrer" className="mb-1 block">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob local, sem otimização possível */}
          <img
            src={url}
            alt={mensagem.texto ?? "Foto enviada pela família"}
            className={cn("rounded-2xl object-cover", mensagem.tipo === "Figurinha" ? "size-28" : "max-h-72 w-full max-w-72")}
          />
        </a>
      );
    case "Audio":
      return <audio controls src={url} className="mb-1 h-10 w-64 max-w-full" />;
    case "Video":
      return <video controls src={url} className="mb-1 max-h-72 w-full max-w-72 rounded-2xl" />;
    default:
      return (
        <a
          href={url}
          download={mensagem.midiaNomeArquivo ?? "arquivo"}
          className="mb-1 flex items-center gap-2 rounded-xl bg-foreground/[.06] px-2.5 py-2 text-[13px] font-medium hover:bg-foreground/[.1]"
        >
          <FileText className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{mensagem.midiaNomeArquivo ?? "Documento"}</span>
        </a>
      );
  }
}
