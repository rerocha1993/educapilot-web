"use client";

import { CheckCircle2, FileSignature, Loader2 } from "lucide-react";
import { useAssinaturaPendente } from "@/lib/flow/use-assinatura-pendente";

/**
 * O que a família vê depois de enviar o formulário.
 *
 * Existe porque a primeira rematrícula real revelou o buraco: a mãe marcou "li o contrato",
 * enviou, viu "Resposta enviada!" e foi embora — sem ter assinado nada. O contrato ia para o
 * provedor num job e o link de assinatura ficava guardado no banco, sem nunca ser mostrado a
 * ninguém.
 *
 * A assinatura acontece aqui, na mesma sessão, porque é o único contato que o responsável tem com
 * o sistema: ele preenche o link uma vez e não volta.
 */
export function AssinaturaPendente({
  token,
  responseId,
}: {
  token: string;
  responseId: string;
}) {
  const { data } = useAssinaturaPendente(token, responseId);
  const estado = data?.estado ?? "preparando";

  if (estado === "assinado") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-4 py-10 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-success-soft text-success-soft-foreground">
          <CheckCircle2 className="size-6" />
        </span>
        <p className="font-heading text-lg font-semibold tracking-[-.03em]">Tudo certo!</p>
        <p className="text-sm text-muted-foreground">
          Formulário enviado e contrato assinado. A escola vai analisar e você receberá a via
          assinada por e-mail.
        </p>
      </div>
    );
  }

  // Formulário sem contrato: a confirmação simples de sempre.
  if (estado === "indisponivel" && !data?.mensagem) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-4 py-10 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-success-soft text-success-soft-foreground">
          <CheckCircle2 className="size-6" />
        </span>
        <p className="font-heading text-lg font-semibold tracking-[-.03em]">Resposta enviada!</p>
        <p className="text-sm text-muted-foreground">Obrigado por preencher.</p>
      </div>
    );
  }

  if (estado === "indisponivel") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-warning-border bg-warning-soft px-4 py-8 text-center text-warning-soft-foreground">
        <CheckCircle2 className="size-8" />
        <p className="font-heading text-base font-semibold tracking-[-.03em]">Respostas enviadas</p>
        <p className="text-sm">{data?.mensagem}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-2 py-6 text-center md:px-4 md:py-8">
      {/* Laranja: é a decisão que falta tomar agora (guia). */}
      <span className="grid size-12 place-items-center rounded-xl bg-action-soft text-action-soft-foreground">
        <FileSignature className="size-6" />
      </span>

      <div className="px-2 md:px-0">
        <p className="font-heading text-lg font-semibold tracking-[-.03em]">Falta assinar</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Suas respostas já foram enviadas. A matrícula só é concluída depois da assinatura do
          contrato.
        </p>
      </div>

      {estado === "pronto" && data?.link ? (
        <div className="w-full">
          {/* A assinatura acontece dentro da pagina, e nao numa aba do provedor.

              O ato continua sendo do Autentique de proposito: e a trilha independente deles (IP,
              horario, hash, certificado) que sustenta o contrato como titulo executivo. Uma
              assinatura desenhada e carimbada por nos seria a escola atestando a propria
              cobranca — mais simples de fazer e muito mais fraca de provar.

              O que muda aqui e so onde isso acontece: embutido, a familia nao sai do formulario
              nem precisa entender que foi para outro site.

              No celular o cartao quase nao tem margem lateral: cada pixel de largura conta para a
              tela do provedor caber sem rolagem horizontal. */}
          <iframe
            src={data.link}
            title="Assinatura do contrato"
            className="h-[75vh] min-h-125 w-full rounded-lg border border-border bg-background md:h-[70vh]"
            allow="camera; geolocation"
          />

          <p className="mt-3 px-2 text-sm text-muted-foreground md:mt-2 md:px-0 md:text-xs">
            Não conseguiu assinar aqui?{" "}
            <a
              href={data.link}
              target="_blank"
              rel="noreferrer"
              className="inline-block py-1 font-medium text-primary underline md:inline md:py-0"
            >
              Abrir em uma nova aba
            </a>
            .
          </p>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Preparando o contrato para assinatura...
        </p>
      )}
    </div>
  );
}
