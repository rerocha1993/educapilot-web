"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Ban, FileText, Mail, Plus, ReceiptText, Search } from "lucide-react";
import { toast } from "sonner";

import { DialogCancelarRecibo, DialogEnviarRecibo } from "@/components/finance/dialogs-de-recibo";
import { FinanceNav } from "@/components/finance/finance-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { BotaoDeIcone, CartaoDaLista } from "@/components/rh/lista-movel";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarData, formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import { abrirPdfDoRecibo } from "@/lib/finance/recibos-api";
import { rotuloDaForma, useAnosComRecibo, useRecibos, type ReciboResumo } from "@/lib/finance/use-recibos";
import { formatarCpf, formatarMoeda, soDigitos } from "@/lib/rh/formatar";
import { cn } from "@/lib/utils";

type Dialogo = { tipo: "email" | "cancelar"; recibo: ReciboResumo };

/** Minúsculas e sem acento, para a busca achar "Jose" em "José". */
const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function bate(recibo: ReciboResumo, busca: string): boolean {
  const termo = normalizar(busca.trim());
  if (!termo) return true;

  const campos = [recibo.nomeDoPagador, recibo.alunoNome ?? "", recibo.numeroFormatado, recibo.referenteA];
  if (campos.some((c) => normalizar(c).includes(termo))) return true;

  const digitos = soDigitos(busca);
  return digitos.length > 0 && soDigitos(recibo.cpfDoPagador ?? "").includes(digitos);
}

export default function RecibosPage() {
  // useSearchParams pede um Suspense em volta para a página poder ser pré-renderizada.
  return (
    <Suspense fallback={null}>
      <Recibos />
    </Suspense>
  );
}

function SituacaoDoRecibo({ recibo }: { recibo: ReciboResumo }) {
  if (recibo.cancelado) return <Badge variant="waiting">Cancelado</Badge>;
  if (recibo.enviadoPorEmailEm) {
    return (
      <Badge variant="success">
        Enviado em {formatarData(recibo.enviadoPorEmailEm, { day: "2-digit", month: "2-digit" })}
      </Badge>
    );
  }
  return <Badge variant="pending">Emitido</Badge>;
}

function Recibos() {
  const destaque = useSearchParams().get("destaque");

  const anoAtual = Number(hojeIsoBrasilia().slice(0, 4));
  const [ano, setAno] = useState(anoAtual);
  const [busca, setBusca] = useState("");
  const [incluirCancelados, setIncluirCancelados] = useState(false);
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [abrindo, setAbrindo] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useRecibos({ ano, incluirCancelados });
  const { data: anosComRecibo } = useAnosComRecibo();

  const anos = useMemo(
    () => [...new Set([anoAtual, ano, ...(anosComRecibo ?? [])])].sort((a, b) => b - a),
    [anoAtual, ano, anosComRecibo]
  );

  const lista = useMemo(() => (data ?? []).filter((r) => bate(r, busca)), [data, busca]);
  const temFiltro = busca.trim() !== "";

  async function abrirPdf(recibo: ReciboResumo) {
    // A aba abre agora, no clique: depois da espera da rede o navegador a bloquearia.
    const aba = window.open("", "_blank");
    setAbrindo(recibo.id);
    try {
      await abrirPdfDoRecibo(recibo.id, recibo.numeroFormatado, aba);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível abrir o PDF do recibo.");
    } finally {
      setAbrindo(null);
    }
  }

  const acoes = (r: ReciboResumo) => (
    <>
      <BotaoDeIcone
        rotulo="Abrir PDF"
        icone={<FileText />}
        disabled={abrindo === r.id}
        onClick={() => abrirPdf(r)}
      />
      {!r.cancelado && (
        <>
          <BotaoDeIcone rotulo="Enviar por e-mail" icone={<Mail />} onClick={() => setDialogo({ tipo: "email", recibo: r })} />
          <BotaoDeIcone
            rotulo="Cancelar recibo"
            icone={<Ban />}
            perigo
            onClick={() => setDialogo({ tipo: "cancelar", recibo: r })}
          />
        </>
      )}
    </>
  );

  // Rola até o recibo recém-emitido quando a lista o mostra.
  const destacar = (id: string) => (el: HTMLElement | null) => {
    if (el && id === destaque) el.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-[18px]">
      <FinanceNav />

      <CabecalhoDaPagina
        eyebrow="Financeiro"
        titulo="Recibos"
        apoio="Recibo de pagamento para o responsável, numerado por ano, em PDF"
        acoes={
          <Link href="/finance/recibos/novo" className={cn(buttonVariants({ variant: "action" }), "w-full md:w-auto")}>
            <Plus />
            Novo recibo
          </Link>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Select value={String(ano)} onValueChange={(v) => v && setAno(Number(v))}>
          <SelectTrigger aria-label="Ano" className="w-full md:w-28">
            <SelectValue>{() => String(ano)}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {anos.map((a) => (
              <SelectItem key={a} value={String(a)}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative md:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar recibo"
            placeholder="Buscar por responsável, CPF ou aluno"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex min-h-10 items-center gap-2.5 md:min-h-0">
          <Switch id="recibos-cancelados" checked={incluirCancelados} onCheckedChange={setIncluirCancelados} />
          <Label htmlFor="recibos-cancelados" className="cursor-pointer">
            Mostrar cancelados
          </Label>
        </div>
      </div>

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar os recibos." onTentar={() => refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <EstadoVazio
          icone={<ReceiptText />}
          titulo={temFiltro ? "Nenhum recibo encontrado" : `Nenhum recibo em ${ano}`}
          texto={
            temFiltro
              ? "Confira o nome ou o CPF, ou limpe a busca."
              : "Emita um recibo e ele aparece aqui, com o PDF para abrir e enviar."
          }
          acao={
            !temFiltro && (
              <Link href="/finance/recibos/novo" className={buttonVariants({ variant: "outline" })}>
                <Plus />
                Novo recibo
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 md:hidden">
            {lista.map((r) => (
              <div key={r.id} ref={destacar(r.id)}>
                <CartaoDaLista
                  className={cn(r.id === destaque && "border-action bg-action-soft/40", r.cancelado && "opacity-75")}
                  titulo={r.nomeDoPagador}
                  subtitulo={`Recibo ${r.numeroFormatado}${r.alunoNome ? ` · ${r.alunoNome}` : ""}`}
                  etiquetas={<SituacaoDoRecibo recibo={r} />}
                  detalhes={
                    <>
                      <span>{r.referenteA}</span>
                      <span className="flex justify-between gap-2">
                        <span className="font-mono tabular-nums">
                          {formatarSoData(r.dataDoPagamento)} · {rotuloDaForma(r.formaDePagamento)}
                        </span>
                        <span className="font-mono font-semibold whitespace-nowrap text-foreground tabular-nums">
                          {formatarMoeda(r.valor)}
                        </span>
                      </span>
                    </>
                  }
                  acoes={acoes(r)}
                />
              </div>
            ))}
          </div>

          <div className="hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Pagador</TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Referente a</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((r) => (
                  <TableRow
                    key={r.id}
                    ref={destacar(r.id)}
                    className={cn(r.id === destaque && "bg-action-soft/40", r.cancelado && "text-muted-foreground")}
                  >
                    <TableCell className="font-mono text-sm tabular-nums">{r.numeroFormatado}</TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">{formatarSoData(r.dataDoPagamento)}</TableCell>
                    <TableCell>
                      <p className="font-medium">{r.nomeDoPagador}</p>
                      {r.cpfDoPagador && (
                        <p className="font-mono text-xs text-muted-foreground tabular-nums">
                          {formatarCpf(r.cpfDoPagador)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{r.alunoNome ?? "—"}</TableCell>
                    <TableCell className="max-w-56 truncate" title={r.referenteA}>
                      {r.referenteA}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono text-sm font-semibold tabular-nums",
                        r.cancelado && "line-through"
                      )}
                    >
                      {formatarMoeda(r.valor)}
                    </TableCell>
                    <TableCell>{rotuloDaForma(r.formaDePagamento)}</TableCell>
                    <TableCell>
                      <SituacaoDoRecibo recibo={r} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">{acoes(r)}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {dialogo?.tipo === "email" && <DialogEnviarRecibo recibo={dialogo.recibo} onFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === "cancelar" && (
        <DialogCancelarRecibo recibo={dialogo.recibo} onFechar={() => setDialogo(null)} />
      )}
    </div>
  );
}
