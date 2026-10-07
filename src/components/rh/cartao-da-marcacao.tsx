"use client";

import { useState } from "react";
import { Camera, MapPin, Smartphone, UserRound } from "lucide-react";
import { toast } from "sonner";

import { EtiquetaDaSituacao } from "@/components/ponto/pecas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatarSoData } from "@/lib/format/date";
import { formatarDistancia } from "@/lib/rh/ponto-do-aparelho";
import { caminhoDaFotoDaGestao, useFotoDoPonto } from "@/lib/rh/use-foto-do-ponto";
import { useAprovarMarcacao, useRecusarMarcacao, type Marcacao } from "@/lib/rh/use-marcacoes";
import { motivosEmPalavras, rotuloDoTipo } from "@/lib/rh/use-meu-ponto";
import { cn } from "@/lib/utils";

import { Campo } from "./campo";

const ROTULO_DA_ORIGEM: Record<string, string> = {
  Celular: "Pelo celular",
  Ajuste: "Ajuste da gestão",
  Manual: "Lançado à mão",
  Importado: "Importado",
};

/** "a 35 m da escola" / "fora: 1,2 km" / "sem localização". */
export function textoDaDistancia(m: Marcacao): { texto: string; fora: boolean } {
  if (m.distanciaDaEscolaMetros === null) return { texto: "Sem localização", fora: false };
  const dist = formatarDistancia(m.distanciaDaEscolaMetros);
  const precisao = m.precisaoMetros !== null ? ` (GPS ±${Math.round(m.precisaoMetros)} m)` : "";
  return m.dentroDaCerca === false
    ? { texto: `Fora: ${dist}${precisao}`, fora: true }
    : { texto: `A ${dist} da escola${precisao}`, fora: false };
}

/** Miniatura da foto (ou um marcador quando não há). Tocar abre a foto grande. */
function Miniatura({ marcacao, onAbrir }: { marcacao: Marcacao; onAbrir: () => void }) {
  const { data, isLoading, isError } = useFotoDoPonto(
    marcacao.temFoto ? caminhoDaFotoDaGestao(marcacao.id, true) : null
  );

  if (!marcacao.temFoto) {
    return (
      <span
        className="grid size-16 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"
        title="Sem foto"
      >
        <UserRound className="size-6" aria-hidden />
        <span className="sr-only">Sem foto</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label="Ver a foto"
      className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
    >
      {isLoading ? (
        <Skeleton className="size-full rounded-none" />
      ) : data && !isError ? (
        // eslint-disable-next-line @next/next/no-img-element -- miniatura autenticada, em data URL
        <img src={data} alt="" className="size-full object-cover" />
      ) : (
        <Camera className="mx-auto size-6 text-muted-foreground" aria-hidden />
      )}
    </button>
  );
}

/**
 * Uma batida no painel da gestão: foto, quem e quando, onde estava, o aparelho e a situação — e, se
 * ainda espera decisão, Aprovar e Recusar. Serve a lista de Batidas e a de Pendências.
 */
export function CartaoDaMarcacao({
  marcacao,
  podeEscrever,
  comData = false,
  onAjustar,
}: {
  marcacao: Marcacao;
  podeEscrever: boolean;
  /** Mostra o dia (a lista de Pendências mistura vários). */
  comData?: boolean;
  onAjustar: (marcacao: Marcacao) => void;
}) {
  const aprovar = useAprovarMarcacao();
  const [foto, setFoto] = useState(false);
  const [recusando, setRecusando] = useState(false);

  const m = marcacao;
  const pendente = m.situacao === "Pendente";
  const distancia = textoDaDistancia(m);

  async function aprovarAgora() {
    try {
      await aprovar.mutateAsync({ id: m.id });
      toast.success("Batida aprovada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível aprovar a batida.");
    }
  }

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-3",
        pendente ? "border-warning-border" : "border-border"
      )}
    >
      <div className="flex items-start gap-3">
        <Miniatura marcacao={m} onAbrir={() => setFoto(true)} />

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{m.funcionarioNome}</p>
          <p className="flex flex-wrap items-baseline gap-x-2 text-[13px] text-muted-foreground">
            <span className="font-mono text-base font-semibold text-foreground tabular-nums">{m.horaLocal}</span>
            <span>{rotuloDoTipo(m.tipo)}</span>
            {comData && <span>· {formatarSoData(m.data)}</span>}
          </p>
          <div className="mt-1.5">
            <EtiquetaDaSituacao situacao={m.situacao} />
          </div>
        </div>
      </div>

      <ul className="grid gap-1 text-[13px] text-muted-foreground">
        <li className={cn("flex items-center gap-2", distancia.fora && "font-medium text-destructive")}>
          <MapPin className="size-4 shrink-0" aria-hidden />
          {distancia.texto}
        </li>
        <li className="flex items-center gap-2">
          <Smartphone className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0 truncate">
            {m.aparelhoNome ?? ROTULO_DA_ORIGEM[m.origem] ?? (m.origem || "Sem aparelho")}
          </span>
          {m.nsr && <span className="ml-auto shrink-0 font-mono text-xs">NSR {m.nsr}</span>}
        </li>
      </ul>

      {m.motivos.length > 0 && (
        <p className="rounded-lg bg-warning-soft px-3 py-2 text-[13px] text-warning-soft-foreground">
          Motivo: {motivosEmPalavras(m.motivos)}.
        </p>
      )}
      {m.justificativa && (
        <p className="rounded-lg bg-muted px-3 py-2 text-[13px] leading-[1.45]">
          <span className="font-semibold">Justificativa: </span>
          {m.justificativa}
        </p>
      )}
      {m.observacaoDoGestor && (
        <p className="text-[13px] text-muted-foreground">
          <span className="font-semibold">Gestão: </span>
          {m.observacaoDoGestor}
        </p>
      )}

      {podeEscrever && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
          <Button variant="ghost" className="max-md:h-12" onClick={() => onAjustar(m)}>
            Ajustar
          </Button>
          {pendente && (
            <>
              <Button variant="outline" className="max-md:h-12" onClick={() => setRecusando(true)}>
                Recusar
              </Button>
              <Button className="max-md:h-12" disabled={aprovar.isPending} onClick={aprovarAgora}>
                {aprovar.isPending ? "Aprovando..." : "Aprovar"}
              </Button>
            </>
          )}
        </div>
      )}

      {foto && <DialogDaFoto marcacao={m} onFechar={() => setFoto(false)} />}
      {recusando && <DialogRecusar marcacao={m} onFechar={() => setRecusando(false)} />}
    </article>
  );
}

/** A foto em tamanho grande. */
export function DialogDaFoto({ marcacao, onFechar }: { marcacao: Marcacao; onFechar: () => void }) {
  const { data, isLoading, isError } = useFotoDoPonto(caminhoDaFotoDaGestao(marcacao.id));

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{marcacao.funcionarioNome}</DialogTitle>
          <DialogDescription>
            {rotuloDoTipo(marcacao.tipo)} às {marcacao.horaLocal} · {formatarSoData(marcacao.data)}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="aspect-[3/4] max-h-[70dvh] w-full" />
        ) : isError || !data ? (
          <p role="alert" className="text-sm text-destructive">
            Não foi possível carregar a foto.
          </p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- foto autenticada, em data URL
          <img
            src={data}
            alt={`Foto de ${marcacao.funcionarioNome} na batida das ${marcacao.horaLocal}`}
            className="max-h-[70dvh] w-full rounded-lg bg-muted object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DialogRecusar({ marcacao, onFechar }: { marcacao: Marcacao; onFechar: () => void }) {
  const recusar = useRecusarMarcacao();
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (motivo.trim().length < 3) {
      setErro("Diga o motivo da recusa.");
      return;
    }
    try {
      await recusar.mutateAsync({ id: marcacao.id, motivo });
      toast.success("Batida recusada.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível recusar a batida.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !recusar.isPending && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recusar batida</DialogTitle>
          <DialogDescription>
            {marcacao.funcionarioNome} · {rotuloDoTipo(marcacao.tipo)} às {marcacao.horaLocal}. A batida deixa de
            contar no ponto, e a pessoa vê que foi recusada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} noValidate className="grid gap-4">
          <Campo id="recusa-motivo" rotulo="Motivo da recusa">
            <Textarea
              id="recusa-motivo"
              value={motivo}
              rows={3}
              maxLength={300}
              autoFocus
              onChange={(e) => {
                setMotivo(e.target.value);
                setErro(null);
              }}
              aria-invalid={erro !== null}
            />
          </Campo>
          {erro && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {erro}
            </p>
          )}
          <DialogFooter className="-mx-4 -mb-4">
            <Button type="button" variant="outline" disabled={recusar.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={recusar.isPending}>
              {recusar.isPending ? "Recusando..." : "Recusar batida"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
