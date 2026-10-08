"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Users } from "lucide-react";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { CartaoDaLista } from "@/components/rh/lista-movel";
import { EtiquetaDoTipoDePublicacao } from "@/components/relacionamento/etiquetas";
import { FormularioDePublicacao } from "@/components/relacionamento/formulario-de-publicacao";
import { RelacionamentoNav } from "@/components/relacionamento/relacionamento-nav";
import { Segmentado } from "@/components/relacionamento/segmentado";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarDataHora } from "@/lib/format/date";
import {
  useLeituras,
  usePublicacao,
  type Leitura,
  type PublicacaoDetalhe,
} from "@/lib/relacionamento/use-relacionamento";

type Aba = "publicacao" | "leituras";

export default function PublicacaoPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = usePublicacao(id);
  const [aba, setAba] = useState<Aba>("publicacao");

  return (
    <div className="flex flex-col gap-4">
      <RelacionamentoNav />

      <CabecalhoDaPagina
        eyebrow="Avisos e eventos"
        eyebrowHref="/relacionamento/avisos"
        titulo={data?.titulo || "Publicação"}
        tags={data && <EtiquetaDoTipoDePublicacao tipo={data.tipo} />}
      />

      {isError && <ErroDeCarga texto="Não foi possível carregar a publicação." onTentar={() => refetch()} />}
      {isLoading && <Skeleton className="h-96 w-full rounded-xl" />}

      {data && (
        <>
          {/* "Quem leu" só faz sentido depois de publicada. */}
          {data.status !== "Rascunho" && (
            <Segmentado
              rotulo="Seções da publicação"
              opcoes={[
                { id: "publicacao", rotulo: "Publicação" },
                { id: "leituras", rotulo: "Quem leu" },
              ]}
              valor={aba}
              onChange={setAba}
              className="max-md:w-full"
              cheio
            />
          )}

          {aba === "publicacao" || data.status === "Rascunho" ? (
            // A chave é o id: o formulário nasce da publicação e não é refeito a cada resposta do
            // servidor (isso apagaria o que a pessoa está digitando).
            <FormularioDePublicacao key={data.id} publicacao={data} />
          ) : (
            <QuemLeu publicacao={data} />
          )}
        </>
      )}
    </div>
  );
}

function QuemLeu({ publicacao }: { publicacao: PublicacaoDetalhe }) {
  const { data, isLoading, isError, refetch } = useLeituras(publicacao.id);

  if (isError) return <ErroDeCarga texto="Não foi possível carregar quem leu." onTentar={() => refetch()} />;
  if (isLoading || !data) return <Skeleton className="h-64 w-full rounded-xl" />;

  const total = data.length || publicacao.destinatarios;
  const lidas = data.filter((l) => l.lidaEm).length;
  const pct = total > 0 ? Math.round((lidas / total) * 100) : 0;
  const mostraPresenca = publicacao.permiteConfirmarPresenca;
  const sim = data.filter((l) => l.confirmacaoDePresenca === "Sim").length;
  const nao = data.filter((l) => l.confirmacaoDePresenca === "Nao").length;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-border bg-card p-4 md:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="font-heading text-[26px] font-semibold tracking-[-.03em] tabular-nums">
            {lidas}
            <span className="text-[18px] text-[#B5AEBF]"> / {total}</span>
            <span className="ml-2 text-sm font-medium text-muted-foreground">leram</span>
          </p>
          <p className="font-mono text-sm text-muted-foreground tabular-nums">{pct}%</p>
        </div>

        <div
          role="progressbar"
          aria-label="Famílias que já leram"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="mt-3 h-1.5 overflow-hidden rounded-[4px] bg-muted"
        >
          <div className="h-full rounded-[4px] bg-primary transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>

        {mostraPresenca && (
          <p className="mt-3 text-sm text-muted-foreground">
            Presença: <span className="font-semibold text-foreground tabular-nums">{sim}</span> confirmaram,{" "}
            <span className="font-semibold text-foreground tabular-nums">{nao}</span> não vão,{" "}
            <span className="font-semibold text-foreground tabular-nums">{Math.max(0, total - sim - nao)}</span> sem resposta.
          </p>
        )}
      </section>

      {data.length === 0 ? (
        <EstadoVazio
          icone={<Users />}
          titulo="Nenhuma família alcançada"
          texto="Quando houver responsáveis com acesso nas turmas escolhidas, eles aparecem aqui."
        />
      ) : (
        <>
          <div className="hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Alunos</TableHead>
                  <TableHead>Lida em</TableHead>
                  {mostraPresenca && <TableHead>Presença</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((l) => (
                  <TableRow key={l.guardianId}>
                    <TableCell className="font-medium">{l.nome}</TableCell>
                    <TableCell className="max-w-64 whitespace-normal text-muted-foreground">{l.alunos.join(", ") || "—"}</TableCell>
                    <TableCell className="tabular-nums">
                      {l.lidaEm ? formatarDataHora(l.lidaEm) : <span className="text-muted-foreground">Não leu</span>}
                    </TableCell>
                    {mostraPresenca && <TableCell>{textoDaPresenca(l)}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-2 md:hidden">
            {data.map((l) => (
              <li key={l.guardianId}>
                <CartaoDaLista
                  titulo={l.nome}
                  subtitulo={l.alunos.join(", ") || undefined}
                  detalhes={
                    <>
                      <span>{l.lidaEm ? `Leu em ${formatarDataHora(l.lidaEm)}` : "Ainda não leu"}</span>
                      {mostraPresenca && <span>Presença: {textoDaPresenca(l)}</span>}
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function textoDaPresenca(l: Leitura): string {
  if (l.confirmacaoDePresenca === "Sim") return "Confirmou";
  if (l.confirmacaoDePresenca === "Nao") return "Não vai";
  return "Sem resposta";
}
