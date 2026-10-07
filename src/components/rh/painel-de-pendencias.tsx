"use client";

import { useState } from "react";
import { CircleCheck } from "lucide-react";
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
import { formatarDataHora } from "@/lib/format/date";
import {
  useAparelhosDoPonto,
  useAprovarAparelho,
  useDesativarAparelho,
  useMarcacoes,
  type AparelhoDaGestao,
  type Marcacao,
} from "@/lib/rh/use-marcacoes";
import { usePodeEscreverNoRh } from "@/lib/rh/use-pode-escrever";

import { CartaoDaMarcacao } from "./cartao-da-marcacao";
import { Campo, ErroDeCarga } from "./campo";
import { DialogAjusteDeBatida } from "./dialog-ajuste-de-batida";
import { CartaoDaLista } from "./lista-movel";

/**
 * O que espera a gestão: celulares novos para aprovar (sem eles, as batidas da pessoa ficam todas
 * pendentes) e batidas pendentes de qualquer dia.
 */
export function PainelDePendencias() {
  const podeEscrever = usePodeEscreverNoRh();
  const aparelhos = useAparelhosDoPonto({ pendentes: true });
  const marcacoes = useMarcacoes({ situacao: "Pendente" });
  const [ajustando, setAjustando] = useState<Marcacao | null>(null);

  const carregando = aparelhos.isLoading || marcacoes.isLoading;
  const semNada = !carregando && !aparelhos.isError && !marcacoes.isError && !aparelhos.data?.length && !marcacoes.data?.length;

  return (
    <div className="flex flex-col gap-6">
      {carregando && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {semNada && (
        <EstadoVazio
          icone={<CircleCheck />}
          titulo="Nada esperando você"
          texto="Celulares novos e batidas fora das regras aparecem aqui para aprovar."
        />
      )}

      {aparelhos.isError && (
        <ErroDeCarga texto="Não foi possível carregar os celulares." onTentar={() => aparelhos.refetch()} />
      )}

      {aparelhos.data && aparelhos.data.length > 0 && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-heading text-[15.5px] font-semibold">Celulares para aprovar</h2>
            <p className="text-[13px] text-muted-foreground">
              Enquanto o celular não for aprovado, as batidas feitas nele ficam pendentes.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {aparelhos.data.map((a) => (
              <CartaoDoAparelho key={a.id} aparelho={a} podeEscrever={podeEscrever} />
            ))}
          </div>
        </section>
      )}

      {marcacoes.isError && (
        <ErroDeCarga texto="Não foi possível carregar as batidas pendentes." onTentar={() => marcacoes.refetch()} />
      )}

      {marcacoes.data && marcacoes.data.length > 0 && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-heading text-[15.5px] font-semibold">Batidas para aprovar</h2>
            <p className="text-[13px] text-muted-foreground">
              Fora da cerca, sem foto, sem localização ou fora da ordem. Veja a foto e o local antes de decidir.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {marcacoes.data.map((m) => (
              <CartaoDaMarcacao key={m.id} marcacao={m} podeEscrever={podeEscrever} comData onAjustar={setAjustando} />
            ))}
          </div>
        </section>
      )}

      {ajustando && (
        <DialogAjusteDeBatida original={ajustando} dataInicial={ajustando.data} onFechar={() => setAjustando(null)} />
      )}
    </div>
  );
}

function CartaoDoAparelho({ aparelho, podeEscrever }: { aparelho: AparelhoDaGestao; podeEscrever: boolean }) {
  const aprovar = useAprovarAparelho();
  const [desativando, setDesativando] = useState(false);

  async function aprovarAgora() {
    try {
      await aprovar.mutateAsync(aparelho.id);
      toast.success("Celular aprovado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível aprovar o celular.");
    }
  }

  return (
    <>
      <CartaoDaLista
        titulo={aparelho.funcionarioNome}
        subtitulo={aparelho.nome}
        etiquetas={<Badge variant="pending">Aguardando</Badge>}
        detalhes={
          <>
            {aparelho.primeiroUsoEm && <span>Cadastrado em {formatarDataHora(aparelho.primeiroUsoEm)}</span>}
            {aparelho.ultimoUsoEm && <span>Último uso em {formatarDataHora(aparelho.ultimoUsoEm)}</span>}
          </>
        }
        acoes={
          podeEscrever && (
            <>
              <Button variant="outline" className="max-md:h-12" onClick={() => setDesativando(true)}>
                Desativar
              </Button>
              <Button className="max-md:h-12" disabled={aprovar.isPending} onClick={aprovarAgora}>
                {aprovar.isPending ? "Aprovando..." : "Aprovar"}
              </Button>
            </>
          )
        }
      />
      {desativando && <DialogDesativarAparelho aparelho={aparelho} onFechar={() => setDesativando(false)} />}
    </>
  );
}

function DialogDesativarAparelho({ aparelho, onFechar }: { aparelho: AparelhoDaGestao; onFechar: () => void }) {
  const desativar = useDesativarAparelho();
  const [motivo, setMotivo] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    try {
      await desativar.mutateAsync({ id: aparelho.id, motivo });
      toast.success("Celular desativado.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível desativar o celular.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !desativar.isPending && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desativar celular</DialogTitle>
          <DialogDescription>
            {aparelho.nome}, de {aparelho.funcionarioNome}. Ele deixa de bater o ponto, e a pessoa precisa cadastrar
            um celular de novo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="grid gap-4">
          <Campo id="desativar-motivo" rotulo="Motivo (opcional)">
            <Textarea
              id="desativar-motivo"
              value={motivo}
              rows={2}
              maxLength={300}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </Campo>
          <DialogFooter className="-mx-4 -mb-4">
            <Button type="button" variant="outline" disabled={desativar.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={desativar.isPending}>
              {desativar.isPending ? "Desativando..." : "Desativar celular"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
