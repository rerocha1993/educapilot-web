"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ReceiptText, UploadCloud } from "lucide-react";

import { CartaoDoComprovanteRecebido } from "@/components/finance/comprovantes/cartao-do-comprovante-recebido";
import { DialogEnviarComprovante } from "@/components/finance/comprovantes/dialog-enviar-comprovante";
import { FinanceNav } from "@/components/finance/finance-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  destinoDe,
  ROTULO_DA_ORIGEM,
  useComprovantesRecebidos,
  useResumoDosComprovantes,
  type FiltroDeDestino,
  type FiltroDeSituacao,
  type FiltrosDosComprovantes,
  type OrigemDoComprovante,
} from "@/lib/finance/use-comprovantes";
import { useRemetentesDeWhatsApp } from "@/lib/finance/use-whatsapp-remetentes";

const TAMANHO_DA_PAGINA = 20;
const TODOS = "__todos__";

const SITUACOES: { valor: FiltroDeSituacao; rotulo: string }[] = [
  { valor: "ALancar", rotulo: "A lançar" },
  { valor: "Lancado", rotulo: "Lançados" },
  { valor: "Descartado", rotulo: "Descartados" },
  { valor: "Todos", rotulo: "Todos" },
];

const DESTINOS: { valor: FiltroDeDestino; rotulo: string }[] = [
  { valor: "", rotulo: "Todos" },
  { valor: "Despesas", rotulo: "Despesa" },
  { valor: "Projeto", rotulo: "Projeto" },
  { valor: "Conciliar", rotulo: "Conciliar" },
];

const FILTROS_INICIAIS: FiltrosDosComprovantes = {
  situacao: "ALancar",
  de: "",
  ate: "",
  remetenteId: "",
  origem: "",
  pagina: 1,
  tamanho: TAMANHO_DA_PAGINA,
};

function Numero({
  rotulo,
  valor,
  carregando,
  tom,
}: {
  rotulo: string;
  valor: number | undefined;
  carregando: boolean;
  tom?: "alerta" | "sucesso";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 md:p-[18px]">
      <p className="text-[12.5px] font-medium text-muted-foreground">{rotulo}</p>
      {carregando ? (
        <Skeleton className="mt-2 h-7 w-12" />
      ) : (
        <p
          className={
            "mt-2 font-heading font-mono text-[clamp(22px,2.4vw,30px)] leading-none font-semibold tracking-[-.03em] tabular-nums " +
            (tom === "alerta" && (valor ?? 0) > 0
              ? "text-action-soft-foreground"
              : tom === "sucesso"
                ? "text-success-soft-foreground"
                : "")
          }
        >
          {valor ?? 0}
        </p>
      )}
    </div>
  );
}

export default function CaixaDeComprovantesPage() {
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [enviando, setEnviando] = useState(false);
  // O servidor não filtra pelo destino sugerido: este filtro vale para os comprovantes da página aberta.
  const [destino, setDestino] = useState<FiltroDeDestino>("");

  const { data, isLoading, isError, refetch } = useComprovantesRecebidos(filtros);
  const { data: resumo, isLoading: carregandoResumo } = useResumoDosComprovantes();
  const { data: remetentes } = useRemetentesDeWhatsApp();

  function mudar(parte: Partial<FiltrosDosComprovantes>) {
    // Filtro novo recomeça da primeira página.
    setFiltros((f) => ({ ...f, pagina: 1, ...parte }));
  }

  const daPagina = data?.itens ?? [];
  const itens = destino ? daPagina.filter((c) => destinoDe(c) === destino) : daPagina;
  const total = data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / filtros.tamanho));
  const comFiltro =
    filtros.de !== "" || filtros.ate !== "" || filtros.remetenteId !== "" || filtros.origem !== "" || destino !== "";
  const aLancar = resumo?.aLancar ?? 0;

  const nomeDoRemetente = (remetentes ?? []).find((r) => r.id === filtros.remetenteId)?.nome;

  return (
    <div className="flex flex-col gap-[18px]">
      <FinanceNav />

      <CabecalhoDaPagina
        eyebrow="Financeiro"
        titulo="Comprovantes"
        apoio="Fotos e PDFs de comprovantes que chegam pelo WhatsApp ou pela tela. Confira e lance como despesa, no projeto ou na conciliação do extrato."
        tags={
          aLancar > 0 ? (
            <Badge variant="pending">
              {aLancar} a lançar
            </Badge>
          ) : undefined
        }
        acoes={
          <Button variant="action" className="w-full md:w-auto" onClick={() => setEnviando(true)}>
            <UploadCloud />
            Enviar comprovante
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        <Numero rotulo="A lançar" valor={resumo?.aLancar} carregando={carregandoResumo} tom="alerta" />
        <Numero rotulo="Sem leitura" valor={resumo?.semLeitura} carregando={carregandoResumo} />
        <Numero rotulo="Lançados no mês" valor={resumo?.lancadosNoMes} carregando={carregandoResumo} tom="sucesso" />
      </div>

      <section aria-label="Filtros" className="grid gap-3 rounded-xl border border-border bg-card p-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="grid content-start gap-1.5">
          <Label htmlFor="fil-situacao">Situação</Label>
          <Select value={filtros.situacao} onValueChange={(v) => v && mudar({ situacao: v as FiltroDeSituacao })}>
            <SelectTrigger id="fil-situacao" className="w-full">
              <SelectValue>{() => SITUACOES.find((s) => s.valor === filtros.situacao)?.rotulo}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {SITUACOES.map((s) => (
                <SelectItem key={s.valor} value={s.valor}>
                  {s.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid content-start gap-1.5">
          <Label htmlFor="fil-de">De</Label>
          <Input id="fil-de" type="date" value={filtros.de} max={filtros.ate || undefined} onChange={(e) => mudar({ de: e.target.value })} />
        </div>
        <div className="grid content-start gap-1.5">
          <Label htmlFor="fil-ate">Até</Label>
          <Input id="fil-ate" type="date" value={filtros.ate} min={filtros.de || undefined} onChange={(e) => mudar({ ate: e.target.value })} />
        </div>

        <div className="grid content-start gap-1.5">
          <Label htmlFor="fil-remetente">Quem mandou</Label>
          <Select
            value={filtros.remetenteId || TODOS}
            onValueChange={(v) => v && mudar({ remetenteId: v === TODOS ? "" : v })}
          >
            <SelectTrigger id="fil-remetente" className="w-full">
              <SelectValue>{() => nomeDoRemetente ?? "Todos"}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {(remetentes ?? []).map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid content-start gap-1.5">
          <Label htmlFor="fil-origem">De onde veio</Label>
          <Select
            value={filtros.origem || TODOS}
            onValueChange={(v) => v && mudar({ origem: v === TODOS ? "" : (v as OrigemDoComprovante) })}
          >
            <SelectTrigger id="fil-origem" className="w-full">
              <SelectValue>{() => (filtros.origem ? ROTULO_DA_ORIGEM[filtros.origem] : "Todas")}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value={TODOS}>Todas</SelectItem>
              <SelectItem value="WhatsApp">WhatsApp</SelectItem>
              <SelectItem value="Tela">{ROTULO_DA_ORIGEM.Tela}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid content-start gap-1.5">
          <Label htmlFor="fil-destino">Sugestão de destino</Label>
          <Select value={destino || TODOS} onValueChange={(v) => v && setDestino(v === TODOS ? "" : (v as FiltroDeDestino))}>
            <SelectTrigger id="fil-destino" className="w-full">
              <SelectValue>{() => DESTINOS.find((d) => d.valor === destino)?.rotulo ?? "Todos"}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {DESTINOS.map((d) => (
                <SelectItem key={d.valor || TODOS} value={d.valor || TODOS}>
                  {d.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {destino && daPagina.length > 0 && (
        <p className="text-[13px] text-muted-foreground">
          {itens.length} de {daPagina.length} comprovantes desta página têm essa sugestão.
        </p>
      )}

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar os comprovantes." onTentar={() => refetch()} />
      ) : isLoading ? (
        <div className="grid gap-3 xl:grid-cols-2">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      ) : itens.length === 0 ? (
        filtros.situacao === "ALancar" && !comFiltro ? (
          <EstadoVazio
            icone={<ReceiptText />}
            titulo="Nenhum comprovante a lançar."
            texto="Mande uma foto pelo WhatsApp ou envie aqui."
            textoClassName="max-w-[360px]"
            acao={
              <>
                <Button variant="action" onClick={() => setEnviando(true)}>
                  <UploadCloud />
                  Enviar comprovante
                </Button>
                <Link href="/finance/configuracao" className={buttonVariants({ variant: "outline" })}>
                  Como mandar pelo WhatsApp
                </Link>
              </>
            }
          />
        ) : (
          <EstadoVazio
            icone={<ReceiptText />}
            titulo="Nenhum comprovante encontrado."
            texto="Tente outra situação ou mude o período."
            acao={
              <Button
                variant="outline"
                onClick={() => {
                  setFiltros(FILTROS_INICIAIS);
                  setDestino("");
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        )
      ) : (
        <>
          <div className="grid gap-3 xl:grid-cols-2 xl:items-start">
            {itens.map((c) => (
              <CartaoDoComprovanteRecebido key={c.id} comprovante={c} />
            ))}
          </div>

          {paginas > 1 && (
            <nav aria-label="Páginas" className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                disabled={filtros.pagina <= 1}
                onClick={() => setFiltros((f) => ({ ...f, pagina: f.pagina - 1 }))}
              >
                <ChevronLeft />
                Anterior
              </Button>
              <span className="text-[13px] text-muted-foreground">
                Página {filtros.pagina} de {paginas} · {total} comprovantes
              </span>
              <Button
                variant="outline"
                disabled={filtros.pagina >= paginas}
                onClick={() => setFiltros((f) => ({ ...f, pagina: f.pagina + 1 }))}
              >
                Próxima
                <ChevronRight />
              </Button>
            </nav>
          )}
        </>
      )}

      {enviando && <DialogEnviarComprovante onFechar={() => setEnviando(false)} />}
    </div>
  );
}
