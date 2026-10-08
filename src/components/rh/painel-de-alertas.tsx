"use client";

import { useState } from "react";
import { CircleCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { Badge } from "@/components/ui/badge";
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
import { formatarDataHora, formatarSoData } from "@/lib/format/date";
import { somarDias } from "@/lib/rh/ponto-formatar";
import {
  EXPLICACAO_DO_ALERTA,
  rotuloDoAlerta,
  useAlertasDePonto,
  useMarcacoes,
  useResolverAlerta,
  type AlertaDePonto,
  type TipoDeAlerta,
} from "@/lib/rh/use-marcacoes";
import { usePodeEscreverNoRh } from "@/lib/rh/use-pode-escrever";
import { cn } from "@/lib/utils";

import { Campo, ErroDeCarga } from "./campo";
import { CartaoDaMarcacao } from "./cartao-da-marcacao";
import { CartaoDaLista } from "./lista-movel";

/** Quantos dias para trás procurar as batidas de um alerta (o de "5 dias seguidos" espalha por vários). */
const JANELA_DAS_BATIDAS_EM_DIAS = 30;

/**
 * Alertas do ponto: padrões que parecem fraude (mesmo minuto vários dias, deslocamento impossível,
 * celular dividido entre pessoas, celular novo longe da escola). Não bloqueiam ninguém: servem para
 * a gestão olhar com calma e dar o caso por resolvido, com uma nota se quiser.
 */
export function PainelDeAlertas({
  onVerNoDia,
}: {
  /** Leva para a aba Batidas, no dia e na pessoa do alerta. */
  onVerNoDia: (data: string, funcionarioId: string) => void;
}) {
  const podeEscrever = usePodeEscreverNoRh();
  const [resolvidos, setResolvidos] = useState(false);
  const { data: alertas, isLoading, isError, refetch } = useAlertasDePonto(resolvidos);
  const [resolvendo, setResolvendo] = useState<AlertaDePonto | null>(null);
  const [verBatidas, setVerBatidas] = useState<AlertaDePonto | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="max-w-2xl text-sm leading-[1.55] text-muted-foreground">
          Situações que merecem uma olhada: nada foi bloqueado, mas pode ter alguém batendo ponto por outra pessoa
          ou de um lugar que não deveria.
        </p>
        <div role="group" aria-label="Mostrar alertas" className="flex gap-1">
          <Button
            type="button"
            variant={resolvidos ? "outline" : "default"}
            aria-pressed={!resolvidos}
            onClick={() => setResolvidos(false)}
          >
            Abertos
          </Button>
          <Button
            type="button"
            variant={resolvidos ? "default" : "outline"}
            aria-pressed={resolvidos}
            onClick={() => setResolvidos(true)}
          >
            Resolvidos
          </Button>
        </div>
      </div>

      {isError && <ErroDeCarga texto="Não foi possível carregar os alertas." onTentar={() => refetch()} />}

      {isLoading && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      )}

      {alertas && alertas.length === 0 && (
        <EstadoVazio
          icone={resolvidos ? <ShieldAlert /> : <CircleCheck />}
          titulo={resolvidos ? "Nenhum alerta resolvido ainda" : "Nenhum alerta aberto"}
          texto={
            resolvidos
              ? "Os alertas que você der por resolvidos ficam guardados aqui."
              : "Quando o sistema notar algo estranho nas batidas, avisa aqui."
          }
        />
      )}

      {alertas && alertas.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {alertas.map((a) => (
            <CartaoDoAlerta
              key={a.id}
              alerta={a}
              podeEscrever={podeEscrever}
              onResolver={() => setResolvendo(a)}
              onVerBatidas={() => setVerBatidas(a)}
              onVerNoDia={() => onVerNoDia(a.data, a.funcionarioId)}
            />
          ))}
        </div>
      )}

      {resolvendo && <DialogResolver alerta={resolvendo} onFechar={() => setResolvendo(null)} />}
      {verBatidas && (
        <DialogBatidasDoAlerta
          alerta={verBatidas}
          onFechar={() => setVerBatidas(null)}
          onVerNoDia={() => {
            const a = verBatidas;
            setVerBatidas(null);
            onVerNoDia(a.data, a.funcionarioId);
          }}
        />
      )}
    </div>
  );
}

function CartaoDoAlerta({
  alerta,
  podeEscrever,
  onResolver,
  onVerBatidas,
  onVerNoDia,
}: {
  alerta: AlertaDePonto;
  podeEscrever: boolean;
  onResolver: () => void;
  onVerBatidas: () => void;
  onVerNoDia: () => void;
}) {
  const explicacao = EXPLICACAO_DO_ALERTA[alerta.tipo as TipoDeAlerta];

  return (
    <CartaoDaLista
      className={cn(!alerta.resolvido && "border-warning-border")}
      titulo={alerta.funcionarioNome}
      subtitulo={`${rotuloDoAlerta(alerta.tipo)} · ${formatarSoData(alerta.data)}`}
      etiquetas={
        alerta.resolvido ? <Badge variant="success">Resolvido</Badge> : <Badge variant="pending">Aberto</Badge>
      }
      detalhes={
        <>
          {alerta.descricao && <p className="text-[13px] leading-[1.5] text-foreground">{alerta.descricao}</p>}
          {explicacao && <p className="text-xs leading-[1.5]">{explicacao}</p>}
          {alerta.resolvido && (
            <p className="rounded-lg bg-muted px-3 py-2 text-[13px] leading-[1.45] text-foreground">
              Resolvido{alerta.resolvidoEm ? ` em ${formatarDataHora(alerta.resolvidoEm)}` : ""}
              {alerta.nota ? `: ${alerta.nota}` : "."}
            </p>
          )}
        </>
      }
      acoes={
        <>
          {alerta.marcacoes.length > 0 && (
            <Button variant="ghost" className="max-md:h-12" onClick={onVerBatidas}>
              Ver as batidas ({alerta.marcacoes.length})
            </Button>
          )}
          <Button variant="ghost" className="max-md:h-12" onClick={onVerNoDia}>
            Abrir o dia
          </Button>
          {podeEscrever && !alerta.resolvido && (
            <Button className="max-md:h-12" onClick={onResolver}>
              Resolver
            </Button>
          )}
        </>
      }
    />
  );
}

function DialogResolver({ alerta, onFechar }: { alerta: AlertaDePonto; onFechar: () => void }) {
  const resolver = useResolverAlerta();
  const [nota, setNota] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    try {
      await resolver.mutateAsync({ id: alerta.id, nota });
      toast.success("Alerta resolvido.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível resolver o alerta.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !resolver.isPending && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolver alerta</DialogTitle>
          <DialogDescription>
            {alerta.funcionarioNome} · {rotuloDoAlerta(alerta.tipo)} · {formatarSoData(alerta.data)}. Ele sai da
            lista de abertos e fica guardado em Resolvidos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="grid gap-4">
          <Campo
            id="alerta-nota"
            rotulo="O que você concluiu? (opcional)"
            dica="Ex.: conversei com a pessoa, o celular é da família e já foi cadastrado."
          >
            <Textarea
              id="alerta-nota"
              value={nota}
              rows={3}
              maxLength={500}
              autoFocus
              onChange={(e) => setNota(e.target.value)}
            />
          </Campo>
          <DialogFooter className="-mx-4 -mb-4">
            <Button type="button" variant="outline" disabled={resolver.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={resolver.isPending}>
              {resolver.isPending ? "Salvando..." : "Marcar como resolvido"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * As batidas citadas pelo alerta. O servidor manda só os ids, então buscamos as batidas da pessoa
 * nos últimos dias e ficamos com as que o alerta cita.
 */
function DialogBatidasDoAlerta({
  alerta,
  onFechar,
  onVerNoDia,
}: {
  alerta: AlertaDePonto;
  onFechar: () => void;
  onVerNoDia: () => void;
}) {
  const { data, isLoading, isError, refetch } = useMarcacoes({
    funcionarioId: alerta.funcionarioId,
    de: somarDias(alerta.data, -JANELA_DAS_BATIDAS_EM_DIAS),
    ate: somarDias(alerta.data, 1),
  });
  const citadas = (data ?? []).filter((m) => alerta.marcacoes.includes(m.id));

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Batidas do alerta</DialogTitle>
          <DialogDescription>
            {alerta.funcionarioNome} · {rotuloDoAlerta(alerta.tipo)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60dvh] gap-3 overflow-y-auto">
          {isLoading && <Skeleton className="h-40 w-full rounded-xl" />}
          {isError && <ErroDeCarga texto="Não foi possível carregar as batidas." onTentar={() => refetch()} />}
          {data && citadas.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Não encontramos estas batidas nos últimos {JANELA_DAS_BATIDAS_EM_DIAS} dias. Use &quot;Abrir o
              dia&quot; para procurar.
            </p>
          )}
          {citadas.map((m) => (
            <CartaoDaMarcacao key={m.id} marcacao={m} podeEscrever={false} comData onAjustar={() => undefined} />
          ))}
        </div>

        <DialogFooter className="-mx-4 -mb-4">
          <Button variant="outline" onClick={onVerNoDia}>
            Abrir o dia
          </Button>
          <Button onClick={onFechar}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
