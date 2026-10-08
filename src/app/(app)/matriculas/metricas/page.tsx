"use client";

import { Suspense, useState } from "react";
import { MatriculasNav } from "@/components/matriculas/matriculas-nav";
import { PainelDoLead } from "@/components/matriculas/painel-do-lead";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Barras,
  Cartao,
  Destaque,
  ListaDeFamiliasAbertas,
  TabelaAlternativa,
  Tile,
  Variacao,
  duracao,
  numero,
  percentual,
  type ItemDeBarra,
} from "@/components/matriculas/metricas/pecas";
import { CartaoDaComparacao } from "@/components/matriculas/metricas/comparacao";
import { CabecalhoDasMetricas, FiltroDoPeriodo, useFiltroDaUrl } from "@/components/matriculas/metricas/filtro-do-periodo";
import { hojeIsoBrasilia } from "@/lib/format/date";
import { COR_DA_ETAPA } from "@/lib/matriculas/rotulos";
import { useMetricas } from "@/lib/matriculas/use-metricas";
import type { IndicadorComparado, MetricasDoFunil } from "@/lib/matriculas/tipos";

export default function MetricasPage() {
  // useSearchParams precisa de Suspense em volta: sem ele, o Next não consegue pré-renderizar a página.
  return (
    <Suspense fallback={null}>
      <Metricas />
    </Suspense>
  );
}

function Metricas() {
  const { filtro, mudar } = useFiltroDaUrl();
  const { data: m, isLoading, isError, error } = useMetricas(filtro);
  const [aberto, setAberto] = useState<string | null>(null);
  const emAndamento = !!filtro.ate && filtro.ate > hojeIsoBrasilia();

  return (
    <div className="flex flex-col gap-5">
      <MatriculasNav />
      <style>{"@page { size: A4 portrait; margin: 12mm; }"}</style>
      <CabecalhoDasMetricas
        titulo="Métricas"
        texto="Como o funil de matrículas está indo: de onde vêm as famílias, onde elas ficam pelo caminho e por quê."
        filtro={filtro}
        outra={{ href: "/matriculas/painel", rotulo: "Ver o painel →" }}
        carregado={!!m}
      />
      <FiltroDoPeriodo filtro={filtro} mudar={mudar} />

      {isError && (
        <div role="alert" className="rounded-2xl border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          {error instanceof Error ? error.message : "Não foi possível carregar as métricas."}
        </div>
      )}
      {isLoading && <Carregando />}
      {m && <Conteudo m={m} emAndamento={emAndamento} onAbrir={setAberto} />}

      {/* Só para ler: mudar de etapa e editar continuam no Funil. */}
      <PainelDoLead id={aberto} titulos={{}} onFechar={() => setAberto(null)} />
    </div>
  );
}

function Conteudo({ m, emAndamento, onAbrir }: { m: MetricasDoFunil; emAndamento: boolean; onAbrir: (id: string) => void }) {
  const i = m.indicadores;
  const comparado = (chave: string): IndicadorComparado | undefined => m.comparacao.find((c) => c.chave === chave);
  const topo = m.funil[0]?.total ?? 0;

  const itensFunil: ItemDeBarra[] = m.funil.map((f, n) => ({
    chave: f.etapa,
    titulo: f.titulo,
    total: f.total,
    cor: COR_DA_ETAPA[f.etapa],
    auxiliar: n === 0 ? undefined : `${percentual(f.percentualDoTopo)} do topo · ${percentual(f.percentualDaAnterior)} da anterior`,
  }));
  const comoBarras = (itens: MetricasDoFunil["porOrigem"], plural: string): ItemDeBarra[] =>
    itens.map((o) => ({ chave: o.chave, titulo: o.titulo, total: o.total, auxiliar: `${percentual(o.percentual)} ${plural}`.trim() }));
  const itensOrigem: ItemDeBarra[] = m.porOrigem.map((o) => ({
    chave: o.chave,
    titulo: o.titulo,
    total: o.total,
    auxiliar: `${percentual(o.percentual)} · matricula ${percentual(o.taxaConversao)}`,
  }));
  const itensSinal = comoBarras(m.porSinal, "");
  const itensPeriodo = comoBarras(m.porPeriodo, "");
  const itensPerda = comoBarras(m.motivosPerda, "");

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      {emAndamento && (
        <p className="rounded-xl bg-muted/60 px-3 py-2 text-[13px] text-muted-foreground print:hidden">
          Período em andamento: a comparação é com o período anterior inteiro, e por isso os números de agora tendem a ficar abaixo dele.
        </p>
      )}

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
        <Tile
          rotulo="Famílias novas"
          valor={numero(i.totalLeads)}
          variacao={<Variacao item={comparado("leads")} />}
          detalhe={i.totalRuido > 0 ? `+ ${numero(i.totalRuido)} fora do funil (currículo, propaganda): não contam aqui` : "que chegaram no período"}
        />
        <Tile
          rotulo="Matrículas feitas"
          valor={numero(i.matriculasNoPeriodo)}
          variacao={<Variacao item={comparado("matriculas")} />}
          detalhe="pela data em que o card virou Matriculado"
        />
        <Tile
          rotulo="Tempo até a 1ª resposta"
          valor={duracao(i.tempoMedioPrimeiraRespostaHoras)}
          variacao={<Variacao item={comparado("primeiraResposta")} />}
          detalhe="da chegada da família ao primeiro retorno"
        />
        <Tile
          rotulo="Visita → matrícula"
          valor={percentual(i.taxaVisitaMatricula)}
          variacao={<Variacao item={comparado("visitaMatricula")} />}
          detalhe="inclui quem visitou e depois se perdeu"
        />
        <Tile
          rotulo="Conversão geral"
          valor={percentual(i.taxaConversaoGeral, 1)}
          variacao={<Variacao item={comparado("conversao")} />}
          detalhe="de todas as famílias recebidas"
        />
        <Tile
          rotulo="Comparecimento à visita"
          valor={percentual(i.taxaComparecimento)}
          variacao={<Variacao item={comparado("comparecimento")} />}
          detalhe={
            m.comparecimento.compareceram + m.comparecimento.faltaram === 0
              ? "nenhuma visita marcada chegou a um desfecho"
              : `${m.comparecimento.compareceram} vieram, ${m.comparecimento.faltaram} faltaram${m.comparecimento.pendentes > 0 ? `, ${m.comparecimento.pendentes} ainda por vir` : ""}`
          }
        />
      </div>

      <Cartao
        titulo="Famílias quentes precisando de atenção"
        texto="Quem já disse que quer matricular e segue em aberto, da que espera contato há mais tempo para a mais recente. É a lista de ligar hoje da reunião. Vale agora, não depende do período."
        direita={`${numero(m.quentes.total)} ${m.quentes.total === 1 ? "família" : "famílias"}`}
      >
        <ListaDeFamiliasAbertas itens={m.quentes.itens} total={m.quentes.total} vazio="Nenhuma família quente em aberto agora." onAbrir={onAbrir} />
      </Cartao>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 print:grid-cols-2">
        <Cartao
          className="lg:col-span-2 print:col-span-2"
          titulo="Funil de matrículas"
          texto="Quantas famílias já alcançaram cada etapa. Quem se perdeu continua contando nas etapas até onde chegou."
        >
          <Barras itens={itensFunil} maximo={topo} rotulo="Funil de matrículas" vazio="Nenhuma família chegou no período." />
          {m.maiorQueda && (
            <Destaque alerta>
              <strong>Maior vazamento:</strong> {m.maiorQueda.deTitulo.toLowerCase()} → {m.maiorQueda.paraTitulo.toLowerCase()} (−
              {m.maiorQueda.quantidadePerdida} {m.maiorQueda.quantidadePerdida === 1 ? "família" : "famílias"}). É onde um ponto de melhora vale mais matrícula.
            </Destaque>
          )}
          <TabelaAlternativa
            colunas={["Etapa", "Famílias", "% do topo", "% da anterior"]}
            linhas={m.funil.map((f) => ({ chave: f.etapa, celulas: [f.titulo, numero(f.total), percentual(f.percentualDoTopo, 1), percentual(f.percentualDaAnterior, 1)] }))}
          />
        </Cartao>

        <Cartao titulo="Famílias por origem" texto={`De onde vieram as ${numero(i.totalLeads)} famílias, e quantas de cada origem matricularam.`}>
          <Barras itens={itensOrigem} rotulo="Famílias por origem" />
          {m.origemQueMaisConverte && (
            <Destaque>
              <strong>{m.origemQueMaisConverte.titulo}</strong> converte <strong className="text-success">{percentual(m.origemQueMaisConverte.taxaConversao)}</strong> de quem
              chega, a melhor taxa entre as origens com pelo menos 3 famílias.
            </Destaque>
          )}
          <TabelaAlternativa
            colunas={["Origem", "Famílias", "%", "Matricularam"]}
            linhas={m.porOrigem.map((o) => ({ chave: o.chave, celulas: [o.titulo, numero(o.total), percentual(o.percentual, 1), percentual(o.taxaConversao, 1)] }))}
          />
        </Cartao>

        <Cartao
          titulo="Sinal das famílias em aberto"
          texto={`A leitura de agora, registrada pela equipe.${m.semSinal > 0 ? ` ${numero(m.semSinal)} em aberto ainda sem leitura.` : ""}`}
        >
          <Barras itens={itensSinal} rotulo="Sinal das famílias em aberto" vazio="Nenhum sinal registrado ainda." />
          {m.travadosEmPreco > 0 && (
            <Destaque>
              <strong>{numero(m.travadosEmPreco)} {m.travadosEmPreco === 1 ? "família travada" : "famílias travadas"} em preço</strong> (analisando o valor ou achou caro):{" "}
              {percentual(i.ativos === 0 ? 0 : (m.travadosEmPreco / i.ativos) * 100)} dos {numero(i.ativos)} em aberto.
            </Destaque>
          )}
          <TabelaAlternativa
            colunas={["Sinal", "Famílias", "%"]}
            linhas={m.porSinal.map((s) => ({ chave: s.chave, celulas: [s.titulo, numero(s.total), percentual(s.percentual, 1)] }))}
          />
        </Cartao>

        <Cartao titulo="Período pretendido" texto="O período que as famílias em aberto pedem, para planejar vaga por turno.">
          <Barras itens={itensPeriodo} rotulo="Período pretendido" vazio="Nenhum período informado ainda." />
          <TabelaAlternativa
            colunas={["Período", "Famílias", "%"]}
            linhas={m.porPeriodo.map((p) => ({ chave: p.chave, celulas: [p.titulo, numero(p.total), percentual(p.percentual, 1)] }))}
          />
        </Cartao>

        <Cartao
          titulo="Motivos de perda"
          texto={
            i.totalPerdidos === 0
              ? "Nenhuma família perdida no período."
              : `${numero(i.totalPerdidos)} ${i.totalPerdidos === 1 ? "família perdida" : "famílias perdidas"}, sem contar currículo e propaganda.`
          }
        >
          <Barras itens={itensPerda} rotulo="Motivos de perda" vazio="Nenhuma perda registrada." />
          <TabelaAlternativa
            colunas={["Motivo", "Famílias", "%"]}
            linhas={m.motivosPerda.map((p) => ({ chave: p.chave, celulas: [p.titulo, numero(p.total), percentual(p.percentual, 1)] }))}
          />
        </Cartao>

        {m.comparacao.length > 0 && <CartaoDaComparacao m={m} />}
      </div>
    </div>
  );
}

function Carregando() {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4" aria-busy>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <Skeleton key={n} className="h-28 rounded-[24px]" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-[24px]" />
      <Skeleton className="h-72 rounded-[24px]" />
    </div>
  );
}
