"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CabecalhoDaAssistente, Campo, erro } from "@/components/matriculas/assistente/partes";
import { getSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import type { PerguntaSemResposta } from "@/lib/matriculas/tipos";
import { dataHoraCurta } from "@/lib/matriculas/rotulos";
import { useDescartarPergunta, usePerguntasSemResposta, useResponderPergunta } from "@/lib/matriculas/use-assistente";

export default function PerguntasPage() {
  const [todas, setTodas] = useState(false);
  const { data, isLoading, isError } = usePerguntasSemResposta(todas);

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoDaAssistente
        titulo="Perguntas que ela não soube"
        descricao="Quando uma família pergunta algo que não está na ficha, a assistente passa para a equipe e anota aqui. Responda uma vez e ela passa a saber."
      />

      <div className="flex max-w-3xl items-center justify-end gap-2">
        <Switch id="p-todas" checked={todas} onCheckedChange={setTodas} />
        <Label htmlFor="p-todas" className="text-[13px] text-muted-foreground">
          Mostrar as já resolvidas
        </Label>
      </div>

      {isError && (
        <div className="max-w-3xl rounded-2xl border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar as perguntas.
        </div>
      )}
      {isLoading && <Skeleton className="h-48 w-full max-w-3xl rounded-[24px]" />}

      {data && data.length === 0 && (
        <div className="flex max-w-3xl flex-col items-center gap-2 rounded-[24px] border border-dashed border-border px-6 py-12 text-center">
          <CheckCircle2 className="size-8 text-success" aria-hidden />
          <p className="font-heading font-semibold">Nenhuma pergunta esperando</p>
          <p className="max-w-sm text-[13.5px] text-muted-foreground">
            Tudo o que as famílias perguntaram, a assistente soube responder com a ficha.
          </p>
        </div>
      )}

      <ul className="grid max-w-3xl gap-3">
        {data?.map((p) => (
          <Pergunta key={p.id} p={p} />
        ))}
      </ul>
    </div>
  );
}

function Pergunta({ p }: { p: PerguntaSemResposta }) {
  const ehGestao = getSession()?.role === "Admin";
  const responder = useResponderPergunta();
  const descartar = useDescartarPergunta();
  const [resposta, setResposta] = useState("");
  const [titulo, setTitulo] = useState("");
  const resolvida = p.resposta != null || p.descartada;

  async function ensinar() {
    try {
      await responder.mutateAsync({ id: p.id, resposta, titulo });
      toast.success("Pronto. A resposta entrou nos fatos da ficha.");
    } catch (e) {
      toast.error(erro(e, "Não foi possível responder."));
    }
  }

  async function tirar() {
    try {
      await descartar.mutateAsync(p.id);
    } catch (e) {
      toast.error(erro(e, "Não foi possível descartar."));
    }
  }

  return (
    <li className={cn("rounded-[24px] border border-border bg-card p-5", resolvida && "opacity-75")}>
      <div className="flex items-start gap-3">
        <MessageCircleQuestion className="mt-0.5 size-5 shrink-0 text-action" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{p.pergunta}</p>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            {dataHoraCurta(p.criadaEm)}
            {p.nomeDaFamilia && (
              <>
                {" · "}
                <Link href={`/matriculas/conversas?lead=${p.leadId}`} className="underline-offset-2 hover:underline">
                  {p.nomeDaFamilia}
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      {p.resposta != null && <p className="mt-3 rounded-2xl bg-success-soft px-3.5 py-2.5 text-[13.5px] text-success-soft-foreground">{p.resposta}</p>}
      {p.descartada && <p className="mt-3 text-[13px] text-muted-foreground">Descartada.</p>}

      {!resolvida && ehGestao && (
        <div className="mt-4 grid gap-3">
          <Campo id={`r-${p.id}`} rotulo="Resposta da escola" dica="Escreva como um fato: a assistente vai repetir isto para as próximas famílias.">
            <Textarea id={`r-${p.id}`} rows={3} maxLength={2000} value={resposta} onChange={(e) => setResposta(e.target.value)} />
          </Campo>
          <Campo id={`t-${p.id}`} rotulo="Assunto (opcional)" dica="Como o fato aparece na ficha. Vazio: a própria pergunta.">
            <Input id={`t-${p.id}`} maxLength={120} placeholder="Transporte escolar" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </Campo>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={!resposta.trim() || responder.isPending} onClick={ensinar}>
              Responder e ensinar
            </Button>
            <Button size="sm" variant="ghost" disabled={descartar.isPending} onClick={tirar}>
              Descartar
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
