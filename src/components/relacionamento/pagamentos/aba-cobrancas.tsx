"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, ExternalLink, HandCoins, Link2, Plus, QrCode, Receipt, Search, X, Zap } from "lucide-react";

import { EtiquetaDaCobranca, Numero } from "@/components/finance/projetos/comum";
import { DialogQrDoPix, copiarTexto } from "@/components/relacionamento/dialog-qr-do-pix";
import { CancelarCobranca, DialogMarcarPaga } from "@/components/relacionamento/pagamentos/dialogs-de-cobranca";
import { DialogNovaCobranca } from "@/components/relacionamento/pagamentos/dialog-nova-cobranca";
import { SeletorDeCarteira } from "@/components/relacionamento/pagamentos/seletor-de-carteira";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { BotaoDeIcone, CartaoDaLista } from "@/components/rh/lista-movel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROTULO_DA_COBRANCA, type StatusDaCobranca } from "@/lib/finance/use-projetos";
import { rotuloDaForma } from "@/lib/finance/use-recibos";
import { competenciaDeIso, formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import { useClasses } from "@/lib/kernel/use-classes";
import { formatarMoeda } from "@/lib/rh/formatar";
import {
  STATUS_DA_COBRANCA,
  TAMANHOS_DA_PAGINA,
  useCobrancasDaEscola,
  useResumoDeCobrancas,
  type Cobranca,
  type OrigemDaCobranca,
  type TipoDaCobranca,
} from "@/lib/relacionamento/use-pagamentos";
import { cn } from "@/lib/utils";

const TODOS = "todos";
/** Tempo de espera depois da última tecla antes de buscar no servidor. */
const ESPERA_DA_BUSCA_MS = 300;

const ROTULO_DO_TIPO: Record<TipoDaCobranca, string> = { individual: "Individual", recorrente: "Recorrente" };

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

type Dialogo =
  | { tipo: "nova" }
  | { tipo: "qr"; cobranca: Cobranca }
  | { tipo: "paga"; cobranca: Cobranca }
  | { tipo: "cancelar"; cobranca: Cobranca };

/**
 * Cobranças da escola: o resumo, os filtros e, por cobrança, link, Pix, QR, baixa manual e
 * cancelamento. Filtro e paginação são do servidor. Cobrança de loja e de plano aparecem aqui
 * também, com a origem na linha; a carteira diz em qual conta o dinheiro cai.
 */
export function AbaCobrancas() {
  const [status, setStatus] = useState<string>(TODOS);
  const [turma, setTurma] = useState<string>(TODOS);
  const [origem, setOrigem] = useState<string>(TODOS);
  const [tipo, setTipo] = useState<string>(TODOS);
  const [carteira, setCarteira] = useState<string | null>(null);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  // `digitada` é o que está no campo; `busca` é o que já foi ao servidor (depois da espera).
  const [digitada, setDigitada] = useState("");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState<number>(50);
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const esperaDaBusca = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (esperaDaBusca.current) clearTimeout(esperaDaBusca.current);
    },
    []
  );

  const { mes, ano } = competenciaDeIso(hojeIsoBrasilia());

  const { data: classes } = useClasses();
  const turmas = useMemo(
    () =>
      (classes ?? [])
        .filter((c): c is typeof c & { id: number } => typeof c.id === "number")
        .map((c) => ({ id: c.id, nome: c.className ?? `Turma ${c.id}` }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [classes]
  );

  const periodoInvertido = de !== "" && ate !== "" && de > ate;
  const deValido = periodoInvertido ? "" : de;
  const ateValido = periodoInvertido ? "" : ate;
  const porPeriodo = deValido !== "" || ateValido !== "";

  const resumo = useResumoDeCobrancas(mes, ano, { de: deValido, ate: ateValido, contaId: carteira });
  const { data, isLoading, isError, isFetching, isPlaceholderData, refetch } = useCobrancasDaEscola(
    {
      status: status === TODOS ? null : (status as StatusDaCobranca),
      classId: turma === TODOS ? null : Number(turma),
      de: deValido,
      ate: ateValido,
      origem: origem === TODOS ? null : (origem as OrigemDaCobranca),
      contaId: carteira,
      busca,
      tipo: tipo === TODOS ? null : (tipo as TipoDaCobranca),
      planoId: null,
    },
    pagina,
    tamanho
  );

  const filtrando =
    status !== TODOS ||
    turma !== TODOS ||
    origem !== TODOS ||
    tipo !== TODOS ||
    carteira !== null ||
    busca !== "" ||
    de !== "" ||
    ate !== "";
  const lista = data?.itens ?? [];
  const total = data?.total ?? 0;
  const ultimaPagina = Math.max(1, Math.ceil(total / tamanho));
  const primeiroDaPagina = total === 0 ? 0 : (pagina - 1) * tamanho + 1;
  const ultimoDaPagina = Math.min(pagina * tamanho, total);
  const turmaEscolhida = turmas.find((t) => String(t.id) === turma);
  const atualizando = isFetching && isPlaceholderData;

  /** Todo filtro que muda volta para a primeira página. */
  function filtrar<T>(definir: (v: T) => void) {
    return (v: T) => {
      definir(v);
      setPagina(1);
    };
  }

  function digitar(texto: string) {
    setDigitada(texto);
    if (esperaDaBusca.current) clearTimeout(esperaDaBusca.current);
    esperaDaBusca.current = setTimeout(() => {
      setBusca(texto.trim());
      setPagina(1);
    }, ESPERA_DA_BUSCA_MS);
  }

  function limpar() {
    if (esperaDaBusca.current) clearTimeout(esperaDaBusca.current);
    setStatus(TODOS);
    setTurma(TODOS);
    setOrigem(TODOS);
    setTipo(TODOS);
    setCarteira(null);
    setDigitada("");
    setBusca("");
    setDe("");
    setAte("");
    setPagina(1);
  }

  const nomeDoPeriodo = porPeriodo ? "no período" : `em ${MESES[mes - 1]}`;

  return (
    <div className="grid gap-4">
      <section
        aria-label={porPeriodo ? "Resumo das cobranças do período filtrado" : `Resumo das cobranças de ${MESES[mes - 1]}`}
        className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-center"
      >
        {resumo.isError ? (
          <ErroDeCarga texto="Não foi possível carregar o resumo." onTentar={() => resumo.refetch()} />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
            <Numero rotulo="Em aberto" valor={resumo.data ? String(resumo.data.emAberto) : "—"} />
            <Numero
              rotulo="Vencidas"
              valor={resumo.data ? String(resumo.data.vencidas) : "—"}
              tom={resumo.data && resumo.data.vencidas > 0 ? "danger" : undefined}
            />
            <Numero
              rotulo={`Pagas ${nomeDoPeriodo}`}
              valor={resumo.data ? String(resumo.data.pagasNoMes) : "—"}
              tom={resumo.data && resumo.data.pagasNoMes > 0 ? "success" : undefined}
            />
            <Numero rotulo="A receber" valor={resumo.data ? formatarMoeda(resumo.data.valorEmAberto) : "—"} />
            <Numero
              rotulo={`Recebido ${nomeDoPeriodo}`}
              valor={resumo.data ? formatarMoeda(resumo.data.valorPagoNoMes) : "—"}
              tom={resumo.data && resumo.data.valorPagoNoMes > 0 ? "success" : undefined}
            />
          </div>
        )}

        <Button variant="action" className="w-full sm:w-auto" onClick={() => setDialogo({ tipo: "nova" })}>
          <Plus />
          Nova cobrança única
        </Button>
      </section>

      <div className="grid gap-2.5">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Buscar por responsável, aluno ou descrição"
            placeholder="Buscar por responsável, aluno ou descrição"
            value={digitada}
            className="pl-8"
            onChange={(e) => digitar(e.target.value)}
          />
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={status} onValueChange={(v) => v && filtrar(setStatus)(v)}>
            <SelectTrigger aria-label="Filtrar por situação" className="w-full">
              <SelectValue>{() => (status === TODOS ? "Todas as situações" : ROTULO_DA_COBRANCA[status as StatusDaCobranca])}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value={TODOS}>Todas as situações</SelectItem>
              {STATUS_DA_COBRANCA.map((s) => (
                <SelectItem key={s} value={s}>
                  {ROTULO_DA_COBRANCA[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={turma} onValueChange={(v) => v && filtrar(setTurma)(v)}>
            <SelectTrigger aria-label="Filtrar por turma" className="w-full">
              <SelectValue>{() => (turmaEscolhida ? turmaEscolhida.nome : "Todas as turmas")}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value={TODOS}>Todas as turmas</SelectItem>
              {turmas.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tipo} onValueChange={(v) => v && filtrar(setTipo)(v)}>
            <SelectTrigger aria-label="Filtrar por tipo" className="w-full">
              <SelectValue>{() => (tipo === TODOS ? "Todos os tipos" : ROTULO_DO_TIPO[tipo as TipoDaCobranca])}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value={TODOS}>Todos os tipos</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="recorrente">Recorrente</SelectItem>
            </SelectContent>
          </Select>

          <Select value={origem} onValueChange={(v) => v && filtrar(setOrigem)(v)}>
            <SelectTrigger aria-label="Filtrar por origem" className="w-full">
              <SelectValue>{() => (origem === TODOS ? "Toda origem" : origem)}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value={TODOS}>Toda origem</SelectItem>
              <SelectItem value="Asaas">Asaas</SelectItem>
              <SelectItem value="Manual">Manual</SelectItem>
            </SelectContent>
          </Select>

          <SeletorDeCarteira value={carteira} onChange={filtrar(setCarteira)} permitirVazio className="w-full" />

          <label className="grid gap-1 text-xs text-muted-foreground">
            Vencimento de
            <Input
              type="date"
              value={de}
              onChange={(e) => filtrar(setDe)(e.target.value)}
              aria-invalid={periodoInvertido || undefined}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            até
            <Input
              type="date"
              value={ate}
              min={de || undefined}
              onChange={(e) => filtrar(setAte)(e.target.value)}
              aria-invalid={periodoInvertido || undefined}
            />
          </label>
        </div>
      </div>
      {periodoInvertido && (
        <p role="alert" className="-mt-2 text-sm text-destructive">
          A data final vem antes da inicial; o período foi ignorado.
        </p>
      )}

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar as cobranças." onTentar={() => refetch()} />
      ) : isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : total > 0 && lista.length === 0 ? (
        <EstadoVazio
          icone={<Receipt />}
          titulo="Esta página ficou vazia"
          texto="As cobranças mudaram e a lista ficou menor."
          textoClassName="max-w-[380px]"
          acao={
            <Button variant="outline" onClick={() => setPagina(ultimaPagina)}>
              Ir para a última página
            </Button>
          }
        />
      ) : lista.length === 0 ? (
        <EstadoVazio
          icone={<Receipt />}
          titulo={filtrando ? "Nenhuma cobrança com esses filtros" : "Nenhuma cobrança ainda"}
          texto={
            filtrando
              ? undefined
              : "Crie uma cobrança única, um plano recorrente, ou aguarde o primeiro pedido da loja. Tudo aparece aqui."
          }
          textoClassName="max-w-[380px]"
          acao={
            filtrando ? (
              <Button variant="outline" onClick={limpar}>
                Limpar filtros
              </Button>
            ) : (
              <Button variant="action" onClick={() => setDialogo({ tipo: "nova" })}>
                <Plus />
                Nova cobrança única
              </Button>
            )
          }
        />
      ) : (
        <div className={cn("grid gap-3 transition-opacity", atualizando && "opacity-60")} aria-busy={atualizando}>
          <div className="flex flex-col gap-2 md:hidden">
            {lista.map((x) => (
              <CartaoDaLista
                key={x.id}
                titulo={x.nomeDoResponsavel}
                subtitulo={[x.alunoNome, x.descricao].filter(Boolean).join(" · ")}
                etiquetas={<EtiquetaDaCobranca status={x.status} />}
                detalhes={
                  <>
                    <Linha rotulo="Valor" valor={formatarMoeda(x.valor)} forte />
                    <Linha rotulo="Vencimento" valor={formatarSoData(x.vencimento)} />
                    {x.status === "Paga" && (
                      <Linha rotulo="Pagamento" valor={`${formatarSoData(x.pagaEm)} · ${rotuloDaForma(x.formaDePagamento ?? undefined)}`} />
                    )}
                    <span className="flex items-center justify-between gap-2">
                      <span>Carteira</span>
                      <CarteiraDaCobranca cobranca={x} />
                    </span>
                    <Linha rotulo="Origem" valor={x.plano ? `${x.origem} · ${x.plano}` : x.origem} />
                  </>
                }
                acoes={<Acoes cobranca={x} onDialogo={setDialogo} comTexto />}
              />
            ))}
          </div>

          <div className="hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Carteira</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell className="font-medium whitespace-normal">{x.nomeDoResponsavel}</TableCell>
                    <TableCell className="whitespace-normal">{x.alunoNome ?? "—"}</TableCell>
                    <TableCell className="max-w-56 whitespace-normal">{x.descricao || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">{formatarMoeda(x.valor)}</TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">{formatarSoData(x.vencimento)}</TableCell>
                    <TableCell>
                      <div className="grid gap-0.5">
                        <EtiquetaDaCobranca status={x.status} />
                        {x.status === "Paga" && (
                          <span className="text-xs text-muted-foreground">
                            {formatarSoData(x.pagaEm)} · {rotuloDaForma(x.formaDePagamento ?? undefined)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <CarteiraDaCobranca cobranca={x} />
                    </TableCell>
                    <TableCell className="text-sm whitespace-normal text-muted-foreground">
                      {x.origem}
                      {x.plano && <span className="block text-xs">{x.plano}</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-0.5">
                        <Acoes cobranca={x} onDialogo={setDialogo} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <nav
            aria-label="Páginas de cobranças"
            className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <p aria-live="polite" className="text-xs text-muted-foreground">
              Mostrando {primeiroDaPagina}–{ultimoDaPagina} de {total}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Por página
                <Select
                  value={String(tamanho)}
                  onValueChange={(v) => {
                    if (!v) return;
                    setTamanho(Number(v));
                    setPagina(1);
                  }}
                >
                  <SelectTrigger aria-label="Cobranças por página" size="sm" className="w-20">
                    <SelectValue>{() => String(tamanho)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {TAMANHOS_DA_PAGINA.map((t) => (
                      <SelectItem key={t} value={String(t)}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
                <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>
                  <ChevronLeft />
                  Anterior
                </Button>
                <span className="px-1 text-xs text-muted-foreground tabular-nums">
                  {pagina} / {ultimaPagina}
                </span>
                <Button variant="outline" size="sm" disabled={pagina >= ultimaPagina} onClick={() => setPagina(pagina + 1)}>
                  Próxima
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </nav>
        </div>
      )}

      {dialogo?.tipo === "nova" && <DialogNovaCobranca onFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === "qr" && (
        <DialogQrDoPix
          titulo={`Pix de ${dialogo.cobranca.nomeDoResponsavel}`}
          descricao={`${formatarMoeda(dialogo.cobranca.valor)} · vence em ${formatarSoData(dialogo.cobranca.vencimento)}. Aponte a câmera do banco para o QR.`}
          qrCodeBase64={dialogo.cobranca.pixQrCodeBase64}
          pixCopiaECola={dialogo.cobranca.pixCopiaECola}
          rotuloDaImagem={`QR code do Pix de ${dialogo.cobranca.nomeDoResponsavel}`}
          onFechar={() => setDialogo(null)}
        />
      )}
      {dialogo?.tipo === "paga" && <DialogMarcarPaga cobranca={dialogo.cobranca} onFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === "cancelar" && <CancelarCobranca cobranca={dialogo.cobranca} onFechar={() => setDialogo(null)} />}
    </div>
  );
}

function Linha({ rotulo, valor, forte = false }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <span className="flex justify-between gap-2">
      <span>{rotulo}</span>
      <span className={forte ? "font-mono font-semibold text-foreground tabular-nums" : "font-mono tabular-nums"}>{valor}</span>
    </span>
  );
}

/** A conta em que a cobrança cai, com o ícone de como ela recebe. Cobrança antiga não tem carteira. */
function CarteiraDaCobranca({ cobranca: x }: { cobranca: Cobranca }) {
  if (!x.contaNome) {
    return <span className="text-xs text-muted-foreground">Sem carteira</span>;
  }
  const Icone = x.origem === "Asaas" ? Zap : HandCoins;
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 text-sm text-foreground">
      <Icone aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 break-words">{x.contaNome}</span>
    </span>
  );
}

/** Ações de uma cobrança. No desktop são ícones; no cartão do celular, botões com texto. */
function Acoes({
  cobranca: x,
  onDialogo,
  comTexto = false,
}: {
  cobranca: Cobranca;
  onDialogo: (d: Dialogo) => void;
  comTexto?: boolean;
}) {
  const emAberto = x.status === "Pendente" || x.status === "Vencida";
  const botoes: { chave: string; rotulo: string; icone: React.ReactNode; perigo?: boolean; fazer: () => void }[] = [];

  if (emAberto && x.asaasInvoiceUrl) {
    const url = x.asaasInvoiceUrl;
    botoes.push({ chave: "link", rotulo: "Copiar link", icone: <Link2 />, fazer: () => copiarTexto(url, "Link copiado.") });
  }
  if (emAberto && x.pixCopiaECola) {
    const pix = x.pixCopiaECola;
    botoes.push({ chave: "pix", rotulo: "Copiar Pix", icone: <Copy />, fazer: () => copiarTexto(pix, "Pix copia e cola copiado.") });
  }
  if (emAberto && x.pixQrCodeBase64) {
    botoes.push({ chave: "qr", rotulo: "Ver QR", icone: <QrCode />, fazer: () => onDialogo({ tipo: "qr", cobranca: x }) });
  }
  if (emAberto && x.boletoUrl) {
    const url = x.boletoUrl;
    botoes.push({
      chave: "boleto",
      rotulo: "Abrir boleto",
      icone: <ExternalLink />,
      fazer: () => window.open(url, "_blank", "noopener,noreferrer"),
    });
  }
  if (emAberto) {
    botoes.push({ chave: "paga", rotulo: "Marcar paga", icone: <Check />, fazer: () => onDialogo({ tipo: "paga", cobranca: x }) });
    botoes.push({
      chave: "cancelar",
      rotulo: "Cancelar",
      icone: <X />,
      perigo: true,
      fazer: () => onDialogo({ tipo: "cancelar", cobranca: x }),
    });
  }

  if (botoes.length === 0) return comTexto ? <span className="text-xs text-muted-foreground">Sem ações</span> : null;

  return (
    <>
      {botoes.map((b) =>
        comTexto ? (
          <Button key={b.chave} variant={b.perigo ? "destructive" : "outline"} size="sm" onClick={b.fazer}>
            {b.icone}
            {b.rotulo}
          </Button>
        ) : (
          <BotaoDeIcone key={b.chave} rotulo={b.rotulo} icone={b.icone} perigo={b.perigo} onClick={b.fazer} />
        )
      )}
    </>
  );
}
