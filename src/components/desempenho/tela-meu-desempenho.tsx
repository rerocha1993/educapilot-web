"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Eye, MessageSquareWarning, Pencil, Play } from "lucide-react";
import { toast } from "sonner";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { BarrasDeComponentes, ComoChegamosNessaNota, ResumoDaNota } from "@/components/rh/desempenho/nota-explicada";
import { AvisoDeApoio } from "@/components/rh/desempenho/pecas";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarSoData } from "@/lib/format/date";
import { formatarNota } from "@/lib/rh/use-desempenho";
import { useIniciarAutoavaliacao, useMeuDesempenho } from "@/lib/rh/use-meu-desempenho";
import { useMinhasReunioes } from "@/lib/tasks/use-reunioes-e-atendimentos";

/**
 * "Meu desempenho": o que o funcionário vê de si. A nota e os componentes dela (com a explicação), as avaliações do gestor
 * que a gestão compartilhou, a autoavaliação do ciclo aberto e o caminho para contestar. Nunca dado de outra pessoa.
 * Fora de qualquer módulo de propósito (como o meu-ponto): quem decide se a tela serve é o servidor.
 */
export function TelaMeuDesempenho() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useMeuDesempenho();
  const iniciar = useIniciarAutoavaliacao();
  // Só pede depois de saber que há ficha; falha da lista não derruba a tela inteira.
  const reunioes = useMinhasReunioes(data?.status === "ok");

  async function fazerAutoavaliacao() {
    try {
      const a = await iniciar.mutateAsync();
      router.push(`/meu-desempenho/avaliacao/${a.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível abrir a autoavaliação.");
    }
  }

  if (isError) return <ErroDeCarga texto="Não foi possível carregar o seu desempenho." onTentar={() => refetch()} />;
  if (isLoading || !data)
    return (
      <div className="grid gap-3">
        <Skeleton className="h-16 w-full max-w-md" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );

  if (data.status === "sem-ficha") {
    return (
      <EstadoVazio icone={<ClipboardCheck />} titulo="Seu usuário não está ligado a uma ficha de funcionário" texto={data.mensagem} />
    );
  }

  const meu = data.dados;
  const auto = meu.minhaAutoavaliacao;
  const ciclo = meu.cicloAberto;

  return (
    <div className="flex flex-col gap-3">
      <CabecalhoDaPagina
        eyebrow="RH"
        titulo="Meu desempenho"
        apoio="A sua nota, como ela foi calculada, os feedbacks que a escola compartilhou com você e a sua autoavaliação."
      />

      <AvisoDeApoio texto={meu.apoioADecisao || undefined} />

      {ciclo && (
        <section className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-card px-4 py-3" aria-label="Autoavaliação">
          <div className="min-w-0 flex-1">
            <p className="font-heading font-semibold">Autoavaliação · {ciclo.nome}</p>
            <p className="text-[12.5px] text-muted-foreground">
              Ciclo de {formatarSoData(ciclo.inicio)} a {formatarSoData(ciclo.fim)}. Opcional: não entra na sua nota, serve de
              conversa com a gestão.
            </p>
          </div>
          {auto?.status === "Concluida" ? (
            <>
              <Badge variant="success">Concluída</Badge>
              <Link href={`/meu-desempenho/avaliacao/${auto.id}`} className={buttonVariants({ variant: "outline" })}>
                <Eye /> Ver
              </Link>
            </>
          ) : auto ? (
            <>
              <Badge variant="pending">Rascunho</Badge>
              <Link href={`/meu-desempenho/avaliacao/${auto.id}`} className={buttonVariants({ variant: "action" })}>
                <Pencil /> Continuar
              </Link>
            </>
          ) : (
            <Button variant="action" disabled={iniciar.isPending} onClick={fazerAutoavaliacao}>
              <Play /> {iniciar.isPending ? "Abrindo..." : "Fazer a autoavaliação"}
            </Button>
          )}
        </section>
      )}

      {meu.nota && (
        <>
          <ResumoDaNota nota={meu.nota} variacao={null} proprio />
          <div className="grid gap-3 lg:grid-cols-5">
            <section className="rounded-xl border border-border bg-card p-4 lg:col-span-2" aria-label="Nota por componente">
              <h3 className="mb-3 font-heading text-base font-semibold">Por componente</h3>
              <BarrasDeComponentes componentes={meu.nota.componentes} />
            </section>
            <ComoChegamosNessaNota nota={meu.nota} proprio className="lg:col-span-3" />
          </div>
        </>
      )}

      <section className="rounded-xl border border-border bg-card p-4" aria-label="Reuniões e atendimentos">
        <h3 className="font-heading text-base font-semibold">Reuniões e atendimentos</h3>
        <p className="text-[12.5px] text-muted-foreground">
          As reuniões já finalizadas em que você esteve. Aparecem só a data, o assunto, quem conduziu e as notas; a pauta e a ata ficam com a escola.
        </p>
        {reunioes.isError ? (
          <ErroDeCarga texto="Não foi possível carregar as suas reuniões." onTentar={() => reunioes.refetch()} />
        ) : reunioes.isLoading ? (
          <Skeleton className="mt-2 h-10 w-full" />
        ) : (reunioes.data ?? []).length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma reunião finalizada com você ainda.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {reunioes.data!.map((r, i) => (
              <li key={`${r.data}-${r.assunto}-${i}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 py-2 text-[13px] sm:grid-cols-[5.5rem_minmax(0,1fr)_auto]">
                <span className="font-numeric text-muted-foreground sm:row-auto">{formatarSoData(r.data)}</span>
                <span className="order-3 col-span-2 min-w-0 break-words sm:order-none sm:col-span-1">
                  <span className="font-medium">{r.assunto}</span>
                  {r.condutores.length > 0 && <span className="text-muted-foreground"> · conduzida por {r.condutores.join(", ")}</span>}
                </span>
                <span className="text-right font-numeric">
                  {r.notaDoAssunto == null && r.notaDoDesfecho == null ? (
                    <span className="text-muted-foreground">sem nota</span>
                  ) : (
                    <>
                      <span className="text-muted-foreground">assunto </span>
                      {r.notaDoAssunto ?? "—"}
                      <span className="text-muted-foreground"> · desfecho </span>
                      {r.notaDoDesfecho ?? "—"}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4" aria-label="Feedbacks">
        <h3 className="font-heading text-base font-semibold">Feedbacks compartilhados com você</h3>
        {meu.avaliacoes.filter((a) => a.tipo === "Gestor").length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Quando a gestão compartilhar um feedback seu, ele aparece aqui. Você poderá lê-lo e registrar a sua contestação ou observação.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {meu.avaliacoes
              .filter((a) => a.tipo === "Gestor")
              .map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-[13px]">
                  <span className="min-w-24 font-medium">{a.cicloNome}</span>
                  <span className="font-mono tabular-nums">{formatarNota(a.nota100)} / 100</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {a.avaliadorNome ?? ""}
                    {a.concluidaEm && ` · ${formatarSoData(a.concluidaEm)}`}
                  </span>
                  {a.temContestacao && (
                    <Badge variant="pending">
                      <MessageSquareWarning /> Contestação registrada
                    </Badge>
                  )}
                  <Link href={`/meu-desempenho/avaliacao/${a.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <Eye /> Ler e contestar
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
