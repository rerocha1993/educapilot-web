"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Copy, Mail, MessageCircle, Phone, Search, ShieldCheck } from "lucide-react";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import {
  AcoesDaCobranca,
  CarteiraDaCobranca,
  DialogosDaCobranca,
  EtiquetaDaFonte,
  type DialogoDeCobranca,
} from "@/components/relacionamento/pagamentos/acoes-da-cobranca";
import { SecaoEduPay } from "@/components/relacionamento/pagamentos/secao-edupay";
import { SeletorDeCarteira } from "@/components/relacionamento/pagamentos/seletor-de-carteira";
import { RelacionamentoNav } from "@/components/relacionamento/relacionamento-nav";
import { copiarTexto } from "@/components/relacionamento/dialog-qr-do-pix";
import { ErroDeCarga } from "@/components/rh/campo";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import { useClasses } from "@/lib/kernel/use-classes";
import {
  ATALHOS_DE_PERIODO,
  atalhoDoPeriodo,
  diasDeAtraso,
  linkDoWhatsApp,
  periodoDoAtalho,
  type AtalhoDePeriodo,
} from "@/lib/relacionamento/pagamentos-util";
import {
  ROTULO_DA_FONTE,
  useInadimplenciaUnificada,
  type FamiliaInadimplente,
  type FonteDaCobranca,
} from "@/lib/relacionamento/use-pagamentos";
import { formatarMoeda } from "@/lib/rh/formatar";
import { cn } from "@/lib/utils";

const TODOS = "todos";
const ESPERA_DA_BUSCA_MS = 300;
const FONTES: readonly FonteDaCobranca[] = ["mensalidade", "plano", "escola", "loja", "projeto"];
/** Atalhos que fazem sentido para o que já venceu: "próximos 30 dias" não. */
const ATALHOS = ATALHOS_DE_PERIODO.filter((a) => a.id !== "proximos-30");

// Atraso é situação do dado: as três faixas viram as etiquetas do guia.
function atrasoBadge(dias: number): "overdue" | "pending" | "waiting" {
  if (dias > 30) return "overdue";
  if (dias > 7) return "pending";
  return "waiting";
}

export default function InadimplenciaPage() {
  const hoje = hojeIsoBrasilia();
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [carteira, setCarteira] = useState<string | null>(null);
  const [fonte, setFonte] = useState<string>(TODOS);
  const [turma, setTurma] = useState<string>(TODOS);
  // `digitada` é o que está no campo; `busca` é o que já foi ao servidor (depois da espera).
  const [digitada, setDigitada] = useState("");
  const [busca, setBusca] = useState("");
  const [abertas, setAbertas] = useState<string[]>([]);
  const [dialogo, setDialogo] = useState<DialogoDeCobranca | null>(null);
  const esperaDaBusca = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (esperaDaBusca.current) clearTimeout(esperaDaBusca.current);
    },
    []
  );

  const { data: classes } = useClasses();
  const turmas = useMemo(
    () =>
      (classes ?? [])
        .filter((c): c is typeof c & { id: number } => typeof c.id === "number")
        .map((c) => ({ id: c.id, nome: c.className ?? `Turma ${c.id}` }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [classes]
  );
  const turmaEscolhida = turmas.find((t) => String(t.id) === turma);

  const periodoInvertido = de !== "" && ate !== "" && de > ate;
  const filtrando = de !== "" || ate !== "" || carteira !== null || fonte !== TODOS || turma !== TODOS || busca !== "";

  const { data, isLoading, isError, isFetching, isPlaceholderData, refetch } = useInadimplenciaUnificada({
    contaId: carteira,
    fonte: fonte === TODOS ? null : (fonte as FonteDaCobranca),
    classId: turma === TODOS ? null : Number(turma),
    busca,
    de: periodoInvertido ? "" : de,
    ate: periodoInvertido ? "" : ate,
  });
  const familias = data?.familias ?? [];
  const atualizando = isFetching && isPlaceholderData;

  function digitar(texto: string) {
    setDigitada(texto);
    if (esperaDaBusca.current) clearTimeout(esperaDaBusca.current);
    esperaDaBusca.current = setTimeout(() => setBusca(texto.trim()), ESPERA_DA_BUSCA_MS);
  }

  function escolherAtalho(atalho: AtalhoDePeriodo) {
    const p = periodoDoAtalho(atalho, hoje);
    setDe(p.de);
    setAte(p.ate);
  }

  function limpar() {
    if (esperaDaBusca.current) clearTimeout(esperaDaBusca.current);
    setDe("");
    setAte("");
    setCarteira(null);
    setFonte(TODOS);
    setTurma(TODOS);
    setDigitada("");
    setBusca("");
  }

  function alternar(guardianId: string) {
    setAbertas((atual) => (atual.includes(guardianId) ? atual.filter((g) => g !== guardianId) : [...atual, guardianId]));
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <RelacionamentoNav />

      <CabecalhoDaPagina
        eyebrow="Relacionamento · Pagamentos"
        titulo="Inadimplência"
        apoio="Quem está devendo, família por família: o contato para cobrar e o que cada uma deve (mensalidades, planos, loja e eventos)."
      />

      {!isLoading && !isError && data && (
        <div className="rounded-xl border border-border bg-card p-[18px]">
          <p className="text-[12.5px] font-medium text-muted-foreground">Total vencido{filtrando ? " (com os filtros)" : ""}</p>
          <p className="mt-2 font-heading font-mono text-[clamp(22px,2.4vw,30px)] leading-none font-semibold tracking-[-.03em] whitespace-nowrap tabular-nums text-destructive-soft-foreground">
            {formatarMoeda(data.totalVencido)}
          </p>
          <p className="mt-2 text-[11.5px] text-muted-foreground">
            <span className="font-mono tabular-nums">{familias.length}</span> {familias.length === 1 ? "família" : "famílias"} ·{" "}
            <span className="font-mono tabular-nums">{data.quantidade}</span> {data.quantidade === 1 ? "cobrança vencida" : "cobranças vencidas"}
          </p>
        </div>
      )}

      <div className="grid gap-3">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Buscar por responsável ou aluno"
            placeholder="Buscar por responsável ou aluno"
            value={digitada}
            className="pl-8"
            onChange={(e) => digitar(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <span className="text-xs font-medium text-muted-foreground">Venceu entre</span>
          <div role="group" aria-label="Atalhos de período" className="flex flex-wrap items-center gap-1.5">
            {ATALHOS.map((a) => {
              const ativo = atalhoDoPeriodo(de, ate, hoje) === a.id;
              return (
                <Button
                  key={a.id}
                  type="button"
                  size="sm"
                  variant={ativo ? "default" : "outline"}
                  aria-pressed={ativo}
                  onClick={() => escolherAtalho(a.id)}
                >
                  {a.rotulo}
                </Button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:max-w-md">
            <label className="grid gap-1 text-xs text-muted-foreground">
              De
              <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} aria-invalid={periodoInvertido || undefined} />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Até
              <Input
                type="date"
                value={ate}
                min={de || undefined}
                onChange={(e) => setAte(e.target.value)}
                aria-invalid={periodoInvertido || undefined}
              />
            </label>
          </div>
          {periodoInvertido && (
            <p role="alert" className="text-sm text-destructive">
              A data final vem antes da inicial; o período foi ignorado.
            </p>
          )}
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <SeletorDeCarteira value={carteira} onChange={setCarteira} permitirVazio className="w-full" />

          <Select value={fonte} onValueChange={(v) => v && setFonte(v)}>
            <SelectTrigger aria-label="Filtrar por fonte" className="w-full">
              <SelectValue>{() => (fonte === TODOS ? "Todas as fontes" : ROTULO_DA_FONTE[fonte as FonteDaCobranca])}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value={TODOS}>Todas as fontes</SelectItem>
              {FONTES.map((f) => (
                <SelectItem key={f} value={f}>
                  {ROTULO_DA_FONTE[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={turma} onValueChange={(v) => v && setTurma(v)}>
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
        </div>
      </div>

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar a inadimplência." onTentar={() => refetch()} />
      ) : isLoading ? (
        <div className="grid gap-2" aria-busy>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : familias.length === 0 ? (
        <EstadoVazio
          icone={<ShieldCheck />}
          titulo={filtrando ? "Nenhuma família com esses filtros" : "Nenhuma cobrança vencida"}
          texto={filtrando ? "Mude o período ou tire algum filtro para ver mais." : "Todas as famílias estão em dia."}
          textoClassName="max-w-[380px]"
          acao={
            filtrando ? (
              <Button variant="outline" onClick={limpar}>
                Limpar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul aria-label="Famílias em atraso" aria-busy={atualizando} className={cn("grid gap-2.5 transition-opacity", atualizando && "opacity-60")}>
          {familias.map((f) => (
            <li key={f.guardianId || f.nome}>
              <CartaoDaFamilia
                familia={f}
                aberta={abertas.includes(f.guardianId)}
                onAlternar={() => alternar(f.guardianId)}
                onDialogo={setDialogo}
              />
            </li>
          ))}
        </ul>
      )}

      <SecaoEduPay />

      <DialogosDaCobranca dialogo={dialogo} onFechar={() => setDialogo(null)} />
    </div>
  );
}

/** Uma família em atraso: nome, total, contato com atalhos e, ao abrir, as cobranças vencidas. */
function CartaoDaFamilia({
  familia: f,
  aberta,
  onAlternar,
  onDialogo,
}: {
  familia: FamiliaInadimplente;
  aberta: boolean;
  onAlternar: () => void;
  onDialogo: (d: DialogoDeCobranca) => void;
}) {
  const painel = `familia-${f.guardianId}`;
  const whatsapp = linkDoWhatsApp(f.telefone);
  const maiorAtraso = f.itens.reduce((maior, i) => Math.max(maior, i.diasAtraso), 0);

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        aria-expanded={aberta}
        aria-controls={painel}
        onClick={onAlternar}
        className="flex min-h-16 w-full items-center gap-3 rounded-xl p-3 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-medium break-words">{f.nome || "Responsável sem nome"}</span>
          <span className="mt-0.5 block text-[13px] text-muted-foreground">
            {f.quantidade} {f.quantidade === 1 ? "cobrança vencida" : "cobranças vencidas"}
            {maiorAtraso > 0 && ` · a mais antiga há ${diasDeAtraso(maiorAtraso)}`}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-mono font-semibold whitespace-nowrap tabular-nums text-destructive-soft-foreground">
            {formatarMoeda(f.totalVencido)}
          </span>
          <span className="block text-[11.5px] text-muted-foreground">{aberta ? "Esconder" : "Ver cobranças"}</span>
        </span>
        <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-muted-foreground transition-transform", aberta && "rotate-180")} />
      </button>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border px-3 py-2 text-[13px]">
        {f.email && (
          <span className="flex min-w-0 items-center gap-1.5">
            <Mail aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 break-all">{f.email}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Copiar e-mail de ${f.nome}`}
              title="Copiar e-mail"
              onClick={() => copiarTexto(f.email ?? "", "E-mail copiado.")}
            >
              <Copy />
            </Button>
          </span>
        )}
        {f.telefone && (
          <span className="flex min-w-0 items-center gap-1.5">
            <Phone aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 break-all">{f.telefone}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Copiar telefone de ${f.nome}`}
              title="Copiar telefone"
              onClick={() => copiarTexto(f.telefone ?? "", "Telefone copiado.")}
            >
              <Copy />
            </Button>
          </span>
        )}
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <MessageCircle />
            Chamar no WhatsApp
          </a>
        )}
        {!f.email && !f.telefone && (
          <span className="text-muted-foreground">Sem e-mail nem telefone no cadastro deste responsável.</span>
        )}
      </div>

      {aberta && (
        <ul id={painel} aria-label={`Cobranças vencidas de ${f.nome}`} className="grid gap-2 border-t border-border p-3">
          {f.itens.map((i) => (
            <li key={i.id} className="grid gap-2 rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium break-words">{i.descricao || "Cobrança"}</p>
                  <p className="text-xs break-words text-muted-foreground">
                    {[i.alunoNome, i.fonte === "projeto" ? i.projetoNome : i.fonte === "plano" ? i.plano : null]
                      .filter(Boolean)
                      .join(" · ") || "Sem aluno"}
                  </p>
                </div>
                <span className="shrink-0 font-mono font-semibold whitespace-nowrap tabular-nums">{formatarMoeda(i.valor)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                <EtiquetaDaFonte cobranca={i} />
                <span>
                  Venceu em <span className="font-mono tabular-nums">{formatarSoData(i.vencimento)}</span>
                </span>
                <Badge variant={atrasoBadge(i.diasAtraso)}>{diasDeAtraso(i.diasAtraso)} de atraso</Badge>
                <CarteiraDaCobranca cobranca={i} />
              </div>
              <div className="flex flex-wrap justify-end gap-1 border-t border-border pt-2">
                <AcoesDaCobranca cobranca={i} onDialogo={onDialogo} comTexto enxuta />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
