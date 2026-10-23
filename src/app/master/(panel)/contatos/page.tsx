"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Download, Mail, MessageCircle, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatarDataHora } from "@/lib/format/date";
import {
  SITUACOES,
  baixarPlanilhaDeContatos,
  useContatosDoSite,
  useExcluirContato,
  useMarcarContatoComoVisto,
  useSalvarContato,
  type ContatoDoSite,
  type SituacaoDoContato,
} from "@/lib/master/use-contatos-do-site";

const TAMANHO_DA_PAGINA = 50;
const inteiro = new Intl.NumberFormat("pt-BR");

function erroDe(err: unknown, padrao: string) {
  return err instanceof Error ? err.message : padrao;
}

function rotuloDaSituacao(situacao: string) {
  return SITUACOES.find((s) => s.valor === situacao)?.rotulo ?? situacao;
}

const VARIANTE_DA_SITUACAO: Record<SituacaoDoContato, "pending" | "waiting" | "secondary" | "success" | "outline"> = {
  novo: "pending",
  contatado: "waiting",
  demonstracao: "secondary",
  cliente: "success",
  descartado: "outline",
};

/** "(11) 91234-5678" para celular ou fixo brasileiro, com ou sem o 55 na frente; outro formato volta como veio. */
function formatarWhatsApp(valor: string | null): string {
  if (!valor) return "—";
  let digitos = valor.replace(/\D/g, "");
  if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) digitos = digitos.slice(2);
  if (digitos.length === 11) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  if (digitos.length === 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return valor;
}

/** https://wa.me/55DDDNÚMERO. Não duplica o 55 quando o número já o traz (12 ou 13 dígitos). */
function linkDoWhatsApp(valor: string | null): string | null {
  const digitos = (valor ?? "").replace(/\D/g, "");
  if (digitos.length < 8) return null;
  const completo = digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13) ? digitos : `55${digitos}`;
  return `https://wa.me/${completo}`;
}

function ChipDoDiagnostico({ nota }: { nota: number | null }) {
  if (nota == null) return <span className="text-muted-foreground">—</span>;
  const variante = nota <= 8 ? "overdue" : nota <= 15 ? "pending" : "success";
  return (
    <Badge variant={variante} className="tabular-nums" title="Pontuação no diagnóstico do guia, de 0 a 20">
      {nota}/20
    </Badge>
  );
}

function ChipDaSituacao({ situacao }: { situacao: SituacaoDoContato }) {
  return <Badge variant={VARIANTE_DA_SITUACAO[situacao] ?? "outline"}>{rotuloDaSituacao(situacao)}</Badge>;
}

function Progresso({ c }: { c: ContatoDoSite }) {
  if (c.totalLicoes <= 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="tabular-nums">
      {c.licoesConcluidas}/{c.totalLicoes} lições
    </span>
  );
}

function PontoDeNovo({ visto }: { visto: boolean }) {
  if (visto) return null;
  return <span className="inline-block size-2 shrink-0 rounded-full bg-action" title="Ainda não visto" aria-label="Contato novo, ainda não visto" />;
}

/**
 * Painel Master › Contatos do site: quem se cadastrou para receber o guia gratuito em educa-pilot.com/ebook. A equipe
 * abre cada contato, fala com a pessoa (WhatsApp ou e-mail), registra a situação e a observação, e exclui quando a
 * pessoa pede para apagar os dados dela (LGPD). O ponto laranja marca o que ainda ninguém abriu.
 */
export default function ContatosDoSitePage() {
  const [buscaDigitada, setBuscaDigitada] = useState("");
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<SituacaoDoContato | "">("");
  const [pagina, setPagina] = useState(1);
  const [aberto, setAberto] = useState<ContatoDoSite | null>(null);
  const [baixando, setBaixando] = useState(false);

  // A busca só vai para a API depois de 350 ms sem digitar.
  useEffect(() => {
    const t = setTimeout(() => {
      setBusca(buscaDigitada.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(t);
  }, [buscaDigitada]);

  const lista = useContatosDoSite({ busca, situacao, pagina, tamanho: TAMANHO_DA_PAGINA });
  const itens = lista.data?.itens ?? [];
  const total = lista.data?.total ?? 0;
  const totalDePaginas = Math.max(1, Math.ceil(total / TAMANHO_DA_PAGINA));
  const carregandoPelaPrimeiraVez = lista.isLoading;
  const filtrando = busca !== "" || situacao !== "";

  async function exportar() {
    setBaixando(true);
    try {
      await baixarPlanilhaDeContatos();
    } catch (err) {
      toast.error(erroDe(err, "Não foi possível exportar a planilha."));
    } finally {
      setBaixando(false);
    }
  }

  // O painel mostra a versão mais recente do contato (a lista é refeita depois de salvar ou marcar como visto).
  const atual = aberto ? (itens.find((i) => i.id === aberto.id) ?? aberto) : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold">Contatos do site</h1>
          <p className="text-sm text-muted-foreground">
            Pessoas que se cadastraram para receber o guia gratuito em educa-pilot.com/ebook.
          </p>
        </div>
        <Button variant="outline" onClick={() => void exportar()} disabled={baixando}>
          <Download className="size-4" /> {baixando ? "Gerando…" : "Exportar planilha"}
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            aria-label="Buscar contato"
            placeholder="Buscar nome, e-mail ou escola"
            value={buscaDigitada}
            onChange={(e) => setBuscaDigitada(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={situacao || "todas"}
          onValueChange={(v) => {
            if (!v) return;
            setSituacao(v === "todas" ? "" : (v as SituacaoDoContato));
            setPagina(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-56" aria-label="Filtrar por situação">
            <SelectValue>{(v: string) => (v === "todas" ? "Todas as situações" : rotuloDaSituacao(v))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as situações</SelectItem>
            {SITUACOES.map((s) => (
              <SelectItem key={s.valor} value={s.valor}>
                {s.rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {lista.isError && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          <span>{erroDe(lista.error, "Não foi possível carregar os contatos.")}</span>
          <Button variant="outline" size="sm" onClick={() => void lista.refetch()} disabled={lista.isFetching}>
            Tentar de novo
          </Button>
        </div>
      )}

      {/* telas médias e grandes: tabela */}
      <div className="hidden rounded-lg border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contato</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>WhatsApp e e-mail</TableHead>
              <TableHead>Diagnóstico</TableHead>
              <TableHead>Guia</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Cadastro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregandoPelaPrimeiraVez &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!carregandoPelaPrimeiraVez && !lista.isError && itens.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  {filtrando ? "Nenhum contato com esse filtro." : "Nenhum contato ainda. Os cadastros do guia gratuito aparecem aqui."}
                </TableCell>
              </TableRow>
            )}
            {itens.map((c) => (
              <TableRow
                key={c.id}
                className={cn("cursor-pointer hover:bg-muted/50", lista.isFetching && "opacity-70")}
                onClick={() => setAberto(c)}
              >
                <TableCell className="max-w-64">
                  <div className="flex items-center gap-2">
                    <PontoDeNovo visto={c.vistoEm != null} />
                    <button
                      type="button"
                      className={cn("truncate text-left underline-offset-2 hover:underline", c.vistoEm == null ? "font-semibold" : "font-medium")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setAberto(c);
                      }}
                    >
                      {c.nome}
                    </button>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{c.escola || "Escola não informada"}</div>
                </TableCell>
                <TableCell className="text-sm">
                  {c.cargo || "—"}
                  {c.faixaDeAlunos && <div className="text-xs text-muted-foreground">{c.faixaDeAlunos} alunos</div>}
                </TableCell>
                <TableCell className="max-w-56 text-sm">
                  <div className="tabular-nums">{formatarWhatsApp(c.whatsApp)}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.email}</div>
                </TableCell>
                <TableCell>
                  <ChipDoDiagnostico nota={c.notaDiagnostico} />
                </TableCell>
                <TableCell className="text-sm">
                  <Progresso c={c} />
                </TableCell>
                <TableCell>
                  <ChipDaSituacao situacao={c.situacao} />
                </TableCell>
                <TableCell className="text-sm tabular-nums text-muted-foreground">{formatarDataHora(c.criadoEm)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* celular: um cartão por contato */}
      <div className="flex flex-col gap-3 md:hidden">
        {carregandoPelaPrimeiraVez && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        {!carregandoPelaPrimeiraVez && !lista.isError && itens.length === 0 && (
          <div className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            {filtrando ? "Nenhum contato com esse filtro." : "Nenhum contato ainda. Os cadastros do guia gratuito aparecem aqui."}
          </div>
        )}
        {itens.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setAberto(c)}
            className={cn(
              "flex w-full min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left text-sm hover:bg-muted/50",
              lista.isFetching && "opacity-70"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <PontoDeNovo visto={c.vistoEm != null} />
                  <span className={cn("truncate", c.vistoEm == null ? "font-semibold" : "font-medium")}>{c.nome}</span>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {c.escola || "Escola não informada"}
                  {c.cargo ? ` · ${c.cargo}` : ""}
                </div>
              </div>
              <ChipDaSituacao situacao={c.situacao} />
            </div>
            <div className="min-w-0 text-xs text-muted-foreground">
              <div className="tabular-nums">{formatarWhatsApp(c.whatsApp)}</div>
              <div className="truncate">{c.email}</div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="flex items-center gap-1.5">
                Diagnóstico <ChipDoDiagnostico nota={c.notaDiagnostico} />
              </span>
              <Progresso c={c} />
              <span className="ml-auto tabular-nums text-muted-foreground">{formatarDataHora(c.criadoEm)}</span>
            </div>
          </button>
        ))}
      </div>

      {/* paginação */}
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {inteiro.format(total)} {total === 1 ? "contato" : "contatos"} · página {pagina} de {totalDePaginas}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagina <= 1 || lista.isFetching} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="size-4" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagina >= totalDePaginas || lista.isFetching}
              onClick={() => setPagina((p) => Math.min(totalDePaginas, p + 1))}
            >
              Próxima <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {atual && <DetalheDoContato key={atual.id} contato={atual} onFechar={() => setAberto(null)} />}
    </div>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="break-words font-medium">{children || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

function DetalheDoContato({ contato: c, onFechar }: { contato: ContatoDoSite; onFechar: () => void }) {
  const marcarVisto = useMarcarContatoComoVisto();
  const salvar = useSalvarContato();
  const excluir = useExcluirContato();
  const [situacao, setSituacao] = useState<SituacaoDoContato>(c.situacao);
  const [observacao, setObservacao] = useState(c.observacao ?? "");
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const jaMarcado = useRef(false);

  // Abrir o contato é vê-lo: marca uma vez e a lista e o selo do menu se atualizam sozinhos.
  const { mutate: marcar } = marcarVisto;
  useEffect(() => {
    if (c.vistoEm == null && !jaMarcado.current) {
      jaMarcado.current = true;
      marcar(c.id, { onError: () => (jaMarcado.current = false) });
    }
  }, [c.id, c.vistoEm, marcar]);

  const alterado = situacao !== c.situacao || observacao.trim() !== (c.observacao ?? "").trim();
  const whats = linkDoWhatsApp(c.whatsApp);

  async function gravar(ev: React.FormEvent) {
    ev.preventDefault();
    try {
      await salvar.mutateAsync({ id: c.id, situacao, observacao: observacao.trim() });
      toast.success("Contato atualizado.");
    } catch (err) {
      toast.error(erroDe(err, "Não foi possível salvar o contato."));
    }
  }

  async function apagar() {
    try {
      await excluir.mutateAsync(c.id);
      toast.success("Contato excluído.");
      onFechar();
    } catch (err) {
      toast.error(erroDe(err, "Não foi possível excluir o contato."));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="break-words pr-8">{c.nome}</DialogTitle>
          <DialogDescription>
            {c.escola || "Escola não informada"} · cadastrado em {formatarDataHora(c.criadoEm)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {whats && (
            <a href={whats} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <MessageCircle className="size-4" /> Abrir WhatsApp
            </a>
          )}
          <a href={`mailto:${c.email}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Mail className="size-4" /> Enviar e-mail
          </a>
        </div>

        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Campo rotulo="E-mail">{c.email}</Campo>
          <Campo rotulo="WhatsApp">{c.whatsApp ? formatarWhatsApp(c.whatsApp) : ""}</Campo>
          <Campo rotulo="Escola">{c.escola}</Campo>
          <Campo rotulo="Cargo">{c.cargo}</Campo>
          <Campo rotulo="Faixa de alunos">{c.faixaDeAlunos}</Campo>
          <Campo rotulo="Origem">{c.origem}</Campo>
          <Campo rotulo="Diagnóstico">
            <ChipDoDiagnostico nota={c.notaDiagnostico} />
          </Campo>
          <Campo rotulo="Progresso no guia">
            {c.totalLicoes > 0 ? `${c.licoesConcluidas} de ${c.totalLicoes} lições` : ""}
          </Campo>
          <Campo rotulo="Último acesso ao guia">{c.ultimoAcessoEm ? formatarDataHora(c.ultimoAcessoEm) : ""}</Campo>
          <Campo rotulo="Visto pela equipe em">{c.vistoEm ? formatarDataHora(c.vistoEm) : "Ainda não"}</Campo>
          <Campo rotulo="Consentimento">
            {c.consentimentoEm ? `${formatarDataHora(c.consentimentoEm)}${c.versaoPolitica ? ` · política ${c.versaoPolitica}` : ""}` : ""}
          </Campo>
        </dl>

        <section>
          <h3 className="mb-1.5 text-xs text-muted-foreground">Áreas que mais precisam de atenção</h3>
          {c.areasFracas.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {c.areasFracas.map((a) => (
                <li key={a}>
                  <Badge variant="pending">{a}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {c.notaDiagnostico == null ? "Ainda não fez o diagnóstico." : "Nenhuma área em destaque."}
            </p>
          )}
        </section>

        <form onSubmit={gravar} className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Situação
            <Select value={situacao} onValueChange={(v) => v && setSituacao(v as SituacaoDoContato)}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue>{(v: string) => rotuloDaSituacao(v)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SITUACOES.map((s) => (
                  <SelectItem key={s.valor} value={s.valor}>
                    {s.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Observação
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              maxLength={1000}
              placeholder="Anote o que foi combinado com a pessoa, o melhor horário para ligar…"
              className="text-foreground"
            />
          </label>
          <div>
            <Button type="submit" disabled={salvar.isPending || !alterado}>
              {salvar.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </form>

        <section className="rounded-lg border border-destructive-border p-4">
          {confirmandoExclusao ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm">
                Excluir os dados de <strong>{c.nome}</strong>? Isso apaga o cadastro, o progresso e as respostas dela no guia, e não dá
                para desfazer.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="destructive" onClick={() => void apagar()} disabled={excluir.isPending}>
                  <Trash2 className="size-4" /> {excluir.isPending ? "Excluindo…" : "Excluir definitivamente"}
                </Button>
                <Button variant="outline" onClick={() => setConfirmandoExclusao(false)} disabled={excluir.isPending}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 flex-1 text-sm text-muted-foreground">Use quando a pessoa pedir para apagar os dados dela.</p>
              <Button variant="destructive" size="sm" onClick={() => setConfirmandoExclusao(true)}>
                <Trash2 className="size-4" /> Excluir contato
              </Button>
            </div>
          )}
        </section>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
