"use client";

import { useState } from "react";
import { Check, Copy, Monitor, Plus, QrCode, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { QrDesenhado } from "@/components/ponto/qr-desenhado";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarDataHora } from "@/lib/format/date";
import { useAgoraDaEscola } from "@/lib/rh/ponto-formatar";
import {
  MAXIMO_DE_TELAS,
  useCriarTelaDeRecepcao,
  useQrAtual,
  useRevogarTelaDeRecepcao,
  useTelasDeRecepcao,
  type TelaDeRecepcao,
  type TelaDeRecepcaoCriada,
} from "@/lib/rh/use-marcacoes";
import { usePodeEscreverNoRh } from "@/lib/rh/use-pode-escrever";

import { Campo, ErroDeCarga } from "./campo";
import { Confirmacao } from "./confirmacao";
import { CartaoDaLista } from "./lista-movel";

/** O endereço completo da tela, com a origem do sistema em que a gestão está agora. */
function linkDaTela(token: string): string {
  return `${window.location.origin}/ponto/qr?tela=${encodeURIComponent(token)}`;
}

/**
 * Telas de recepção: cada tablet (ou TV) na entrada da escola abre um link próprio e mostra um QR
 * que muda a cada poucos segundos. O funcionário lê esse QR ao bater o ponto e prova que está na
 * escola, mesmo sem GPS.
 *
 * O link só aparece uma vez, ao criar: o servidor não guarda como recuperá-lo. Perdeu? Desative a
 * tela e crie outra.
 */
export function PainelDeRecepcao() {
  const podeEscrever = usePodeEscreverNoRh();
  const { data: telas, isLoading, isError, refetch } = useTelasDeRecepcao();
  const [criando, setCriando] = useState(false);
  const [criada, setCriada] = useState<TelaDeRecepcaoCriada | null>(null);
  const [verQr, setVerQr] = useState(false);

  const noLimite = (telas?.length ?? 0) >= MAXIMO_DE_TELAS;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <p className="max-w-2xl text-sm leading-[1.55] text-muted-foreground">
          Deixe um tablet na recepção com o link de uma tela aberto. Ele mostra um QR que muda a cada poucos
          segundos; quem bate o ponto lê esse QR pelo celular e a batida vale como feita na escola, mesmo sem
          localização.
        </p>

        {podeEscrever && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setVerQr(true)}>
              <QrCode />
              Ver QR agora
            </Button>
            <Button variant="action" disabled={noLimite} onClick={() => setCriando(true)}>
              <Plus />
              Nova tela
            </Button>
          </div>
        )}
      </div>

      {noLimite && (
        <p className="text-[13px] text-muted-foreground">
          A escola já tem {MAXIMO_DE_TELAS} telas, que é o limite. Desative uma para criar outra.
        </p>
      )}

      {isError && <ErroDeCarga texto="Não foi possível carregar as telas." onTentar={() => refetch()} />}

      {isLoading && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {telas && telas.length === 0 && (
        <EstadoVazio
          icone={<Monitor />}
          titulo="Nenhuma tela de recepção ainda"
          texto="Crie uma tela, abra o link no tablet da recepção e pronto: a equipe já pode ler o QR ao bater o ponto."
        />
      )}

      {telas && telas.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {telas.map((t) => (
            <CartaoDaTela key={t.id} tela={t} podeEscrever={podeEscrever} />
          ))}
        </div>
      )}

      {criando && (
        <DialogNovaTela
          onFechar={() => setCriando(false)}
          onCriada={(tela) => {
            setCriando(false);
            setCriada(tela);
          }}
        />
      )}
      {criada && <DialogLinkDaTela tela={criada} onFechar={() => setCriada(null)} />}
      {verQr && <DialogQrAgora onFechar={() => setVerQr(false)} />}
    </div>
  );
}

function CartaoDaTela({ tela, podeEscrever }: { tela: TelaDeRecepcao; podeEscrever: boolean }) {
  const revogar = useRevogarTelaDeRecepcao();
  const [confirmando, setConfirmando] = useState(false);

  async function revogarAgora() {
    try {
      await revogar.mutateAsync(tela.id);
      toast.success("Tela desativada.");
      setConfirmando(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível desativar a tela.");
    }
  }

  return (
    <>
      <CartaoDaLista
        titulo={
          <span className="flex items-center gap-2">
            <Monitor className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            {tela.nome}
          </span>
        }
        detalhes={
          <>
            <span>Criada em {formatarDataHora(tela.criadaEm)}</span>
            <span>{tela.ultimoUsoEm ? `Usada pela última vez em ${formatarDataHora(tela.ultimoUsoEm)}` : "Ainda não foi aberta"}</span>
          </>
        }
        acoes={
          podeEscrever && (
            <Button variant="destructive" className="max-md:h-12" onClick={() => setConfirmando(true)}>
              Desativar
            </Button>
          )
        }
      />
      {confirmando && (
        <Confirmacao
          titulo={`Desativar a tela ${tela.nome}?`}
          descricao="O tablet que está com esse link aberto para de mostrar o QR na hora, e o link deixa de funcionar. Se precisar da tela de novo, crie outra."
          rotuloConfirmar="Desativar tela"
          perigosa
          pendente={revogar.isPending}
          onConfirmar={() => void revogarAgora()}
          onFechar={() => setConfirmando(false)}
        />
      )}
    </>
  );
}

function DialogNovaTela({
  onFechar,
  onCriada,
}: {
  onFechar: () => void;
  onCriada: (tela: TelaDeRecepcaoCriada) => void;
}) {
  const criar = useCriarTelaDeRecepcao();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (nome.trim().length < 2) return setErro("Dê um nome à tela, por exemplo: Recepção.");
    try {
      const tela = await criar.mutateAsync(nome);
      if (!tela.token) {
        toast.error("A tela foi criada, mas o servidor não devolveu o link. Desative-a e crie outra.");
        onFechar();
        return;
      }
      onCriada(tela);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível criar a tela.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !criar.isPending && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova tela de recepção</DialogTitle>
          <DialogDescription>
            O nome só serve para você reconhecer o tablet depois, por exemplo &quot;Recepção&quot; ou
            &quot;Portaria dos fundos&quot;.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} noValidate className="grid gap-4">
          <Campo id="tela-nome" rotulo="Nome da tela">
            <Input
              id="tela-nome"
              value={nome}
              maxLength={60}
              autoFocus
              placeholder="Recepção"
              onChange={(e) => {
                setNome(e.target.value);
                setErro(null);
              }}
            />
          </Campo>
          {erro && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {erro}
            </p>
          )}
          <DialogFooter className="-mx-4 -mb-4">
            <Button type="button" variant="outline" disabled={criar.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={criar.isPending}>
              {criar.isPending ? "Criando..." : "Criar tela"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** O link da tela recém-criada, mostrado uma única vez. */
function DialogLinkDaTela({ tela, onFechar }: { tela: TelaDeRecepcaoCriada; onFechar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const link = linkDaTela(tela.token);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não deu para copiar sozinho. Selecione o link e copie à mão.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tela &quot;{tela.nome}&quot; criada</DialogTitle>
          <DialogDescription>
            Abra este link no navegador do tablet da recepção. Ele mostra o QR do ponto em tela cheia.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2.5 text-[13px] leading-[1.5] text-warning-soft-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              <span className="font-semibold">Guarde agora, não é possível ver de novo.</span> Se perder o link,
              desative esta tela e crie outra.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              readOnly
              value={link}
              aria-label="Link da tela"
              onFocus={(e) => e.currentTarget.select()}
              className="font-mono text-xs"
            />
            <Button variant="action" className="sm:shrink-0" onClick={() => void copiar()}>
              {copiado ? <Check /> : <Copy />}
              {copiado ? "Copiado" : "Copiar"}
            </Button>
          </div>
        </div>

        <DialogFooter className="-mx-4 -mb-4">
          <Button variant="outline" onClick={onFechar}>
            Já guardei o link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** O QR de agora, para conferir (ou mostrar num celular) sem ter um tablet montado. */
function DialogQrAgora({ onFechar }: { onFechar: () => void }) {
  const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useQrAtual(true);
  const agora = useAgoraDaEscola(0);
  const restante = data ? Math.max(0, Math.ceil(data.segundos - (agora - dataUpdatedAt) / 1000)) : 0;

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR do ponto agora</DialogTitle>
          <DialogDescription>
            O código muda sozinho. Quem lê este QR ao bater o ponto prova que está perto de você.
          </DialogDescription>
        </DialogHeader>

        {isLoading && <Skeleton className="aspect-square w-full rounded-xl" />}

        {isError && (
          <ErroDeCarga
            texto={error instanceof Error ? error.message : "Não foi possível gerar o código agora."}
            onTentar={() => refetch()}
          />
        )}

        {data && (
          <div className="grid gap-2">
            <QrDesenhado texto={data.codigo} rotulo="QR para bater o ponto" className="border border-border" />
            <p className="text-center text-sm text-muted-foreground">
              {restante > 0 ? (
                <>
                  Novo código em <span className="font-mono font-medium tabular-nums">{restante}</span> s
                </>
              ) : (
                "Atualizando o código..."
              )}
            </p>
          </div>
        )}

        <DialogFooter className="-mx-4 -mb-4">
          <Button variant="outline" onClick={onFechar}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
