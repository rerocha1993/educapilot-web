"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

import { SeletorDeCarteira } from "@/components/relacionamento/pagamentos/seletor-de-carteira";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROTULO_DA_COBRANCA, type StatusDaCobranca } from "@/lib/finance/use-projetos";
import { hojeIsoBrasilia } from "@/lib/format/date";
import { useClasses } from "@/lib/kernel/use-classes";
import {
  ATALHOS_DE_PERIODO,
  atalhoDoPeriodo,
  periodoDoAtalho,
  type AtalhoDePeriodo,
} from "@/lib/relacionamento/pagamentos-util";
import {
  ROTULO_DA_FONTE,
  STATUS_DA_COBRANCA,
  usePlanos,
  type FiltroDeCobrancas,
  type FonteDaCobranca,
  type TipoDaCobranca,
} from "@/lib/relacionamento/use-pagamentos";

const TODOS = "todos";
/** Tempo de espera depois da última tecla antes de buscar no servidor. */
const ESPERA_DA_BUSCA_MS = 300;

/** Fontes que cada visão oferece: Individual = escola, loja e projeto; Recorrente = mensalidade e planos. */
const FONTES_DA_VISAO: Record<TipoDaCobranca, readonly FonteDaCobranca[]> = {
  individual: ["escola", "loja", "projeto"],
  recorrente: ["mensalidade", "plano"],
};

const TODAS_AS_FONTES: Record<TipoDaCobranca, string> = {
  individual: "Todas as origens",
  recorrente: "Todas as fontes",
};

const ROTULO_DA_FONTE_NO_FILTRO: Record<FonteDaCobranca, string> = {
  ...ROTULO_DA_FONTE,
  plano: "Outros planos",
};

/**
 * Filtros compartilhados entre as visões Individual e Recorrente: período, carteira, turma,
 * situação e busca valem para as duas; a fonte (e o plano) e a página são de cada visão, para
 * trocar de visão não deixar uma fonte que não existe nela.
 */
export function useFiltrosDeCobranca(tipo: TipoDaCobranca) {
  const hoje = hojeIsoBrasilia();
  const [de, setDe] = useState(() => periodoDoAtalho("este-mes", hoje).de);
  const [ate, setAte] = useState(() => periodoDoAtalho("este-mes", hoje).ate);
  const [situacao, setSituacao] = useState<string>(TODOS);
  const [turma, setTurma] = useState<string>(TODOS);
  const [carteira, setCarteira] = useState<string | null>(null);
  const [fontes, setFontes] = useState<Record<TipoDaCobranca, string>>({ individual: TODOS, recorrente: TODOS });
  const [planoId, setPlanoId] = useState<string>(TODOS);
  // `digitada` é o que está no campo; `busca` é o que já foi ao servidor (depois da espera).
  const [digitada, setDigitada] = useState("");
  const [busca, setBusca] = useState("");
  const [paginas, setPaginas] = useState<Record<TipoDaCobranca, number>>({ individual: 1, recorrente: 1 });
  const [tamanho, setTamanhoDaPagina] = useState<number>(50);
  const esperaDaBusca = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (esperaDaBusca.current) clearTimeout(esperaDaBusca.current);
    },
    []
  );

  const periodoInvertido = de !== "" && ate !== "" && de > ate;
  const deValido = periodoInvertido ? "" : de;
  const ateValido = periodoInvertido ? "" : ate;
  const fonte = fontes[tipo];
  const pagina = paginas[tipo];

  /** Todo filtro que muda volta para a primeira página, nas duas visões. */
  function voltarParaAPrimeira() {
    setPaginas({ individual: 1, recorrente: 1 });
  }

  const filtrando =
    situacao !== TODOS ||
    turma !== TODOS ||
    carteira !== null ||
    fonte !== TODOS ||
    planoId !== TODOS ||
    busca !== "" ||
    de !== "" ||
    ate !== "";

  const filtroDoServidor: FiltroDeCobrancas = useMemo(
    () => ({
      status: situacao === TODOS ? null : (situacao as StatusDaCobranca),
      classId: turma === TODOS ? null : Number(turma),
      de: deValido,
      ate: ateValido,
      origem: null,
      contaId: carteira,
      busca,
      tipo,
      fonte: fonte === TODOS ? null : (fonte as FonteDaCobranca),
      planoId: tipo === "recorrente" && fonte !== "mensalidade" && planoId !== TODOS ? planoId : null,
    }),
    [situacao, turma, deValido, ateValido, carteira, busca, tipo, fonte, planoId]
  );

  return {
    tipo,
    hoje,
    de,
    ate,
    deValido,
    ateValido,
    periodoInvertido,
    atalho: atalhoDoPeriodo(de, ate, hoje),
    situacao,
    turma,
    carteira,
    fonte,
    planoId,
    digitada,
    pagina,
    tamanho,
    filtrando,
    filtroDoServidor,
    escolherAtalho(atalho: AtalhoDePeriodo) {
      const p = periodoDoAtalho(atalho, hoje);
      setDe(p.de);
      setAte(p.ate);
      voltarParaAPrimeira();
    },
    definirDe(valor: string) {
      setDe(valor);
      voltarParaAPrimeira();
    },
    definirAte(valor: string) {
      setAte(valor);
      voltarParaAPrimeira();
    },
    definirSituacao(valor: string) {
      setSituacao(valor);
      voltarParaAPrimeira();
    },
    definirTurma(valor: string) {
      setTurma(valor);
      voltarParaAPrimeira();
    },
    definirCarteira(valor: string | null) {
      setCarteira(valor);
      voltarParaAPrimeira();
    },
    definirFonte(valor: string) {
      setFontes((atual) => ({ ...atual, [tipo]: valor }));
      if (valor === "mensalidade") setPlanoId(TODOS);
      voltarParaAPrimeira();
    },
    definirPlano(valor: string) {
      setPlanoId(valor);
      voltarParaAPrimeira();
    },
    digitar(texto: string) {
      setDigitada(texto);
      if (esperaDaBusca.current) clearTimeout(esperaDaBusca.current);
      esperaDaBusca.current = setTimeout(() => {
        setBusca(texto.trim());
        voltarParaAPrimeira();
      }, ESPERA_DA_BUSCA_MS);
    },
    irParaPagina(n: number) {
      setPaginas((atual) => ({ ...atual, [tipo]: n }));
    },
    definirTamanho(n: number) {
      setTamanhoDaPagina(n);
      voltarParaAPrimeira();
    },
    /** Tira todo filtro, inclusive o período: mostra tudo que existe. */
    limpar() {
      if (esperaDaBusca.current) clearTimeout(esperaDaBusca.current);
      setSituacao(TODOS);
      setTurma(TODOS);
      setCarteira(null);
      setFontes({ individual: TODOS, recorrente: TODOS });
      setPlanoId(TODOS);
      setDigitada("");
      setBusca("");
      setDe("");
      setAte("");
      voltarParaAPrimeira();
    },
  };
}

export type FiltrosDeCobranca = ReturnType<typeof useFiltrosDeCobranca>;

/** Busca, período (com atalhos), carteira, turma, situação e, na Recorrente, fonte e plano. */
export function BarraDeFiltros({ f }: { f: FiltrosDeCobranca }) {
  const { data: classes } = useClasses();
  const recorrente = f.tipo === "recorrente";
  const planos = usePlanos();

  const turmas = useMemo(
    () =>
      (classes ?? [])
        .filter((c): c is typeof c & { id: number } => typeof c.id === "number")
        .map((c) => ({ id: c.id, nome: c.className ?? `Turma ${c.id}` }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [classes]
  );
  const turmaEscolhida = turmas.find((t) => String(t.id) === f.turma);
  const planoEscolhido = (planos.data ?? []).find((p) => p.id === f.planoId);
  const mostrarPlano = recorrente && f.fonte !== "mensalidade" && (planos.data ?? []).length > 0;

  return (
    <div className="grid gap-3">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Buscar por responsável, aluno ou descrição"
          placeholder="Buscar por responsável, aluno ou descrição"
          value={f.digitada}
          className="pl-8"
          onChange={(e) => f.digitar(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <span className="text-xs font-medium text-muted-foreground">Vencimento</span>
        <div role="group" aria-label="Atalhos de período" className="flex flex-wrap items-center gap-1.5">
          {ATALHOS_DE_PERIODO.map((a) => (
            <Button
              key={a.id}
              type="button"
              size="sm"
              variant={f.atalho === a.id ? "default" : "outline"}
              aria-pressed={f.atalho === a.id}
              onClick={() => f.escolherAtalho(a.id)}
            >
              {a.rotulo}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:max-w-md">
          <label className="grid gap-1 text-xs text-muted-foreground">
            De
            <Input
              type="date"
              value={f.de}
              onChange={(e) => f.definirDe(e.target.value)}
              aria-invalid={f.periodoInvertido || undefined}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Até
            <Input
              type="date"
              value={f.ate}
              min={f.de || undefined}
              onChange={(e) => f.definirAte(e.target.value)}
              aria-invalid={f.periodoInvertido || undefined}
            />
          </label>
        </div>
        {f.periodoInvertido && (
          <p role="alert" className="text-sm text-destructive">
            A data final vem antes da inicial; o período foi ignorado.
          </p>
        )}
      </div>

      <div className="grid max-w-4xl gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <SeletorDeCarteira value={f.carteira} onChange={f.definirCarteira} permitirVazio className="w-full" />

        <Select value={f.turma} onValueChange={(v) => v && f.definirTurma(v)}>
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

        <Select value={f.situacao} onValueChange={(v) => v && f.definirSituacao(v)}>
          <SelectTrigger aria-label="Filtrar por situação" className="w-full">
            <SelectValue>
              {() => (f.situacao === TODOS ? "Todas as situações" : ROTULO_DA_COBRANCA[f.situacao as StatusDaCobranca])}
            </SelectValue>
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

        <Select value={f.fonte} onValueChange={(v) => v && f.definirFonte(v)}>
          <SelectTrigger aria-label={recorrente ? "Filtrar por fonte" : "Filtrar por origem"} className="w-full">
            <SelectValue>
              {() =>
                f.fonte === TODOS ? TODAS_AS_FONTES[f.tipo] : ROTULO_DA_FONTE_NO_FILTRO[f.fonte as FonteDaCobranca]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value={TODOS}>{TODAS_AS_FONTES[f.tipo]}</SelectItem>
            {FONTES_DA_VISAO[f.tipo].map((fonte) => (
              <SelectItem key={fonte} value={fonte}>
                {ROTULO_DA_FONTE_NO_FILTRO[fonte]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {mostrarPlano && (
          <Select value={f.planoId} onValueChange={(v) => v && f.definirPlano(v)}>
            <SelectTrigger aria-label="Filtrar por plano" className="w-full">
              <SelectValue>{() => (planoEscolhido ? planoEscolhido.nome : "Todos os planos")}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value={TODOS}>Todos os planos</SelectItem>
              {(planos.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
