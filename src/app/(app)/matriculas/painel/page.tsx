"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { MatriculasNav } from "@/components/matriculas/matriculas-nav";
import { PainelDoLead } from "@/components/matriculas/painel-do-lead";
import { Skeleton } from "@/components/ui/skeleton";
import { CartaoDaComparacao } from "@/components/matriculas/metricas/comparacao";
import {
  Barras,
  Cartao,
  Destaque,
  ListaDaFila,
  ListaDeFamiliasAbertas,
  Tile,
  Variacao,
  Vazio,
  duracao,
  numero,
  percentual,
  real,
  type ItemDeBarra,
} from "@/components/matriculas/metricas/pecas";
import { CabecalhoDasMetricas, FiltroDoPeriodo, useFiltroDaUrl } from "@/components/matriculas/metricas/filtro-do-periodo";
import { useMeuAcesso } from "@/lib/access/use-acessos";
import { podeVerArea } from "@/lib/access/pode-ver";
import { formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import { diasEntre } from "@/lib/matriculas/periodo-das-metricas";
import { COR_DA_ETAPA } from "@/lib/matriculas/rotulos";
import { useResultadosDosAnuncios } from "@/lib/matriculas/use-anuncios";
import { useMetricas } from "@/lib/matriculas/use-metricas";
import { cn } from "@/lib/utils";
import type { IndicadorComparado, MetricasDoFunil, ResultadoDoAnuncio } from "@/lib/matriculas/tipos";

/** Na reunião cabe ler a lista, não percorrê-la: o resto está em Métricas. */
const FAMILIAS_POR_LISTA = 8;

export default function PainelPage() {
  // useSearchParams precisa de Suspense em volta: sem ele, o Next não consegue pré-renderizar a página.
  return (
    <Suspense fallback={null}>
      <Painel />
    </Suspense>
  );
}

function Painel() {
  const { filtro, mudar } = useFiltroDaUrl();
  const { data: m, isLoading, isError, error } = useMetricas(filtro);
  const [aberto, setAberto] = useState<string | null>(null);
  const emAndamento = !!filtro.ate && filtro.ate > hojeIsoBrasilia();

  return (
    <div className="flex flex-col gap-5">
      <MatriculasNav />
      <style>{"@page { size: A4 landscape; margin: 10mm; }"}</style>
      <CabecalhoDasMetricas
        titulo="Painel"
        texto="A visão de reunião: a meta, o ritmo, o funil, quem precisa de um telefonema agora e o que cada anúncio trouxe."
        filtro={filtro}
        outra={{ href: "/matriculas/metricas", rotulo: "Ver as métricas →" }}
        carregado={!!m}
      />
      <FiltroDoPeriodo filtro={filtro} mudar={mudar} />

      {isError && (
        <div role="alert" className="rounded-2xl border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          {error instanceof Error ? error.message : "Não foi possível carregar o painel."}
        </div>
      )}
      {isLoading && <Carregando />}
      {m && <Conteudo m={m} de={filtro.de} emAndamento={emAndamento} onAbrir={setAberto} />}

      {/* Só para ler: mudar de etapa e editar continuam no Funil. */}
      <PainelDoLead id={aberto} titulos={{}} onFechar={() => setAberto(null)} />
    </div>
  );
}

function Conteudo({ m, de, emAndamento, onAbrir }: { m: MetricasDoFunil; de: string | null; emAndamento: boolean; onAbrir: (id: string) => void }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      {emAndamento && (
        <p className="rounded-xl bg-muted/60 px-3 py-2 text-[13px] text-muted-foreground print:hidden">
          Período em andamento: a comparação é com o período anterior inteiro, e por isso os números de agora tendem a ficar abaixo dele.
        </p>
      )}
      <Indicadores m={m} />
      {m.comparacao.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 print:grid-cols-2">
          <CartaoDaComparacao m={m} />
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-12 print:grid-cols-12">
        <CartaoDoFunil m={m} className="lg:col-span-5 print:col-span-5" />
        <CartaoDaOrigem m={m} className="lg:col-span-3 print:col-span-3" />
        <CartaoDoSinal m={m} className="lg:col-span-4 print:col-span-4" />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 print:grid-cols-3">
        <Cartao titulo="Fila de atendimento" direita={`${numero(m.fila.total)} esperando`} texto="A assistente passou para a equipe e ninguém respondeu ainda.">
          <ListaDaFila itens={m.fila.itens} total={m.fila.total} limite={FAMILIAS_POR_LISTA} onAbrir={onAbrir} />
        </Cartao>
        <CartaoDeLista titulo="Quentes: ligar hoje" texto="Disseram que querem matricular." lista={m.quentes} vazio="Nenhuma família quente em aberto agora." onAbrir={onAbrir} />
        <CartaoDeLista titulo="Analisando o valor" texto="Esperam proposta ou bolsa." lista={m.analisandoValor} vazio="Nenhuma família analisando o valor agora." onAbrir={onAbrir} />
        <CartaoDeLista
          titulo="Retomadas esgotadas"
          texto="A assistente já retomou o máximo de vezes e a família não fechou."
          lista={m.retomadasEsgotadas}
          vazio="Nenhuma família nessa situação agora."
          onAbrir={onAbrir}
        />
        <CartaoDeLista
          titulo="3 contatos sem fechar"
          texto="Receberam os três contatos depois da visita e não disseram sim nem não."
          lista={m.toquesEsgotados}
          vazio="Nenhuma família nessa situação agora."
          onAbrir={onAbrir}
        />
        <CartaoDoComparecimento m={m} />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 print:grid-cols-2">
        <CartaoDoPeriodo m={m} />
        <CartaoDosMotivos m={m} />
      </div>

      <CartaoDosAnuncios de={de} />
    </div>
  );
}

// ------------------------------------------------------------------ indicadores

function Indicadores({ m }: { m: MetricasDoFunil }) {
  const i = m.indicadores;
  const mes = m.metaDoMes;
  const c = m.campanha;
  const comparado = (chave: string): IndicadorComparado | undefined => m.comparacao.find((x) => x.chave === chave);
  const quentes = m.porSinal.find((s) => s.chave === "QuerMatricular")?.total ?? 0;
  const noValor = m.porSinal.find((s) => s.chave === "AnalisandoValor")?.total ?? 0;
  const outros = Math.max(i.ativos - quentes - noValor, 0);

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 print:grid-cols-5">
      <Tile
        rotulo={`Matrículas de ${mes.mes}`}
        valor={`${numero(mes.feitas)}${mes.configurada ? ` / ${numero(mes.meta)}` : ""}`}
        progresso={mes.configurada ? mes.percentualAtingido : undefined}
        detalhe={
          mes.configurada ? (
            <>
              {percentual(mes.percentualAtingido)} · faltam <strong>{numero(mes.faltam)}</strong> em {mes.diasRestantes} {mes.diasRestantes === 1 ? "dia" : "dias"}
            </>
          ) : (
            <>
              Meta do mês não definida.{" "}
              <Link href="/matriculas/configuracao" className="underline underline-offset-2 print:hidden">
                Definir
              </Link>
            </>
          )
        }
      />
      <Tile
        rotulo={`Campanha ${c.anoLetivo}`}
        valor={`${numero(c.feitas)}${c.configurada ? ` / ${numero(c.metaTotal)}` : ""}`}
        progresso={c.configurada ? c.percentualAtingido : undefined}
        alerta={c.ritmoNoAlvo === false}
        detalhe={
          !c.configurada ? (
            <>Sem meta mensal, não há meta da campanha.</>
          ) : !c.iniciada ? (
            <>Começa em {formatarSoData(c.inicio)}.</>
          ) : (
            <>
              {percentual(c.percentualAtingido)} · {c.ritmoNoAlvo ? "ritmo em dia" : `ritmo abaixo do necessário · faltam ${numero(c.faltam)}`}
              <span className="block text-muted-foreground">
                {formatarSoData(c.inicio)} a {formatarSoData(c.fim)}, {numero(c.meses)} meses
              </span>
            </>
          )
        }
      />
      <Tile
        rotulo="Conversão geral"
        valor={percentual(i.taxaConversaoGeral, 1)}
        variacao={<Variacao item={comparado("conversao")} curto />}
        progresso={i.taxaConversaoGeral ?? 0}
        detalhe={`${numero(i.matricularam)} de ${numero(i.totalLeads)}${i.totalRuido > 0 ? ` · +${numero(i.totalRuido)} fora do funil` : ""}`}
      />
      <Tile
        rotulo="1ª resposta"
        valor={duracao(i.tempoMedioPrimeiraRespostaHoras)}
        variacao={<Variacao item={comparado("primeiraResposta")} curto />}
        alerta={m.fila.total > 0}
        detalhe={
          <>
            tempo médio até o 1º retorno
            {m.fila.total > 0 && (
              <>
                {" "}
                · <strong>{numero(m.fila.total)}</strong> esperando agora
              </>
            )}
          </>
        }
      />
      <Tile
        rotulo="Famílias em aberto"
        valor={numero(i.ativos)}
        detalhe={
          <>
            <strong className="text-success">{numero(quentes)} quentes</strong> · {numero(noValor)} no valor
            {outros > 0 && ` · ${numero(outros)} outras`}
          </>
        }
      />
    </div>
  );
}

// ------------------------------------------------------------------ funil, origem, sinal

function CartaoDoFunil({ m, className }: { m: MetricasDoFunil; className?: string }) {
  const topo = m.funil[0]?.total ?? 0;
  const perdidos = m.indicadores.totalPerdidos;
  const linhas = m.funil.map((f, n) => ({
    chave: f.etapa,
    titulo: f.titulo,
    total: f.total,
    cor: COR_DA_ETAPA[f.etapa],
    pct: percentual(f.percentualDoTopo),
    // Abaixo de 60% da etapa anterior é onde o funil estreita demais.
    queda: n > 0 && f.percentualDaAnterior < 60,
    destaque: f.etapa === "Matriculado",
  }));
  const larguraDe = (total: number) => (topo === 0 ? 0 : Math.max((total / topo) * 100, total > 0 ? 3 : 0));

  return (
    <Cartao titulo="Funil de matrículas" direita={`${numero(m.indicadores.totalLeads)} famílias · cumulativo`} className={className}>
      <div className="flex flex-col gap-2" role="list" aria-label="Funil de matrículas">
        {linhas.map((l) => (
          <LinhaDoFunil key={l.chave} titulo={l.titulo} total={l.total} largura={larguraDe(l.total)} cor={l.cor} pct={l.pct} alerta={l.queda} destaque={l.destaque} />
        ))}
        <div className="my-1 border-t border-dashed border-border" />
        <LinhaDoFunil
          titulo="Perdido"
          total={perdidos}
          largura={topo === 0 ? 0 : Math.max((perdidos / m.indicadores.totalLeads) * 100, perdidos > 0 ? 3 : 0)}
          cor="var(--etapa-perdido)"
          pct={percentual(m.indicadores.totalLeads === 0 ? 0 : (perdidos / m.indicadores.totalLeads) * 100)}
        />
      </div>
      {m.maiorQueda && (
        <Destaque alerta>
          <strong>Maior vazamento:</strong> {m.maiorQueda.deTitulo.toLowerCase()} → {m.maiorQueda.paraTitulo.toLowerCase()} (−{m.maiorQueda.quantidadePerdida}{" "}
          {m.maiorQueda.quantidadePerdida === 1 ? "família" : "famílias"}). É onde um ponto de melhora vale mais matrícula.
        </Destaque>
      )}
      <p className="mt-2 text-[12px] text-muted-foreground">Em laranja, a etapa que reteve menos de 60% de quem estava na anterior.</p>
    </Cartao>
  );
}

function LinhaDoFunil({
  titulo,
  total,
  largura,
  cor,
  pct,
  alerta,
  destaque,
}: {
  titulo: string;
  total: number;
  largura: number;
  cor: string;
  pct: string;
  alerta?: boolean;
  destaque?: boolean;
}) {
  return (
    <div role="listitem" className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-2 text-[13px]">
      <span className={cn("truncate", destaque && "font-semibold")}>{titulo}</span>
      <div className="h-6 rounded-md bg-muted" aria-hidden>
        <div className="flex h-full min-w-0 items-center rounded-md px-2 font-mono text-[12px] font-medium text-white" style={{ width: `${largura}%`, background: cor }}>
          {largura >= 8 ? total : ""}
        </div>
      </div>
      <span className={cn("text-right font-mono text-[12.5px] tabular-nums", alerta ? "font-semibold text-warning" : "text-muted-foreground")}>
        {largura < 8 && <span className="sr-only">{total} famílias, </span>}
        {pct}
      </span>
    </div>
  );
}

function CartaoDaOrigem({ m, className }: { m: MetricasDoFunil; className?: string }) {
  const itens: ItemDeBarra[] = m.porOrigem.map((o) => ({
    chave: o.chave,
    titulo: o.titulo,
    total: o.total,
    auxiliar: `${percentual(o.percentual)} · ${percentual(o.taxaConversao)} matric.`,
  }));
  return (
    <Cartao titulo="Famílias por origem" direita={numero(m.indicadores.totalLeads)} className={className}>
      <Barras itens={itens} rotulo="Famílias por origem" />
      {m.origemQueMaisConverte && (
        <Destaque>
          <strong>{m.origemQueMaisConverte.titulo}</strong> converte <strong className="text-success">{percentual(m.origemQueMaisConverte.taxaConversao)}</strong> de quem chega, a
          melhor taxa entre as origens.
        </Destaque>
      )}
    </Cartao>
  );
}

function CartaoDoSinal({ m, className }: { m: MetricasDoFunil; className?: string }) {
  const itens: ItemDeBarra[] = m.porSinal.map((s) => ({
    chave: s.chave,
    titulo: s.titulo,
    total: s.total,
    cor: s.chave === "QuerMatricular" ? "var(--success)" : s.chave === "AchouCaro" || s.chave === "AchouLonge" ? "var(--warning)" : undefined,
  }));
  if (m.semSinal > 0) itens.push({ chave: "sem-sinal", titulo: "Sem leitura ainda", total: m.semSinal, cor: "var(--chart-5)" });
  return (
    <Cartao titulo="Sinal das famílias em aberto" direita={`${numero(m.indicadores.ativos)} em aberto`} className={className}>
      <Barras itens={itens} rotulo="Sinal das famílias em aberto" vazio="Nenhum sinal registrado ainda." />
      {m.travadosEmPreco > 0 && (
        <Destaque>
          <strong>{numero(m.travadosEmPreco)} {m.travadosEmPreco === 1 ? "família travada" : "famílias travadas"} em preço</strong> (analisando o valor ou achou caro):{" "}
          {percentual(m.indicadores.ativos === 0 ? 0 : (m.travadosEmPreco / m.indicadores.ativos) * 100)} da carteira.
        </Destaque>
      )}
    </Cartao>
  );
}

// ------------------------------------------------------------------ listas, comparecimento, período, motivos

function CartaoDeLista({
  titulo,
  texto,
  lista,
  vazio,
  onAbrir,
}: {
  titulo: string;
  texto: string;
  lista: MetricasDoFunil["quentes"];
  vazio: string;
  onAbrir: (id: string) => void;
}) {
  return (
    <Cartao titulo={titulo} texto={texto} direita={numero(lista.total)}>
      <ListaDeFamiliasAbertas itens={lista.itens} total={lista.total} limite={FAMILIAS_POR_LISTA} vazio={vazio} onAbrir={onAbrir} />
    </Cartao>
  );
}

function CartaoDoComparecimento({ m }: { m: MetricasDoFunil }) {
  const c = m.comparecimento;
  const itens: ItemDeBarra[] = [
    { chave: "vieram", titulo: "Vieram", total: c.compareceram, cor: "var(--success)" },
    { chave: "faltaram", titulo: "Faltaram", total: c.faltaram, cor: "var(--warning)" },
    { chave: "por-vir", titulo: "Ainda por vir", total: c.pendentes, cor: "var(--chart-5)" },
  ];
  return (
    <Cartao titulo="Comparecimento à visita" direita={percentual(c.taxa)} texto="Lido do histórico de etapas: visita marcada que virou Visitou ou foi para Reagendar.">
      {c.compareceram + c.faltaram + c.pendentes === 0 ? <Vazio>Nenhuma visita marcada no período.</Vazio> : <Barras itens={itens} rotulo="Comparecimento à visita" />}
    </Cartao>
  );
}

function CartaoDoPeriodo({ m }: { m: MetricasDoFunil }) {
  const itens: ItemDeBarra[] = m.porPeriodo.map((p) => ({ chave: p.chave, titulo: p.titulo, total: p.total }));
  return (
    <Cartao titulo="Período pretendido" direita={`${numero(m.porPeriodo.reduce((s, p) => s + p.total, 0))} em aberto`}>
      <Barras itens={itens} rotulo="Período pretendido" vazio="Nenhum período informado ainda." />
    </Cartao>
  );
}

function CartaoDosMotivos({ m }: { m: MetricasDoFunil }) {
  const itens: ItemDeBarra[] = m.motivosPerda.map((p) => ({ chave: p.chave, titulo: p.titulo, total: p.total, auxiliar: percentual(p.percentual) }));
  return (
    <Cartao titulo="Motivos de perda" direita={`${numero(m.indicadores.totalPerdidos)} perdas · sem currículo e propaganda`}>
      <Barras itens={itens} rotulo="Motivos de perda" vazio="Nenhuma perda registrada." />
    </Cartao>
  );
}

// ------------------------------------------------------------------ anúncios

/**
 * Reaproveita o resultado da tela Anúncios (gasto, famílias, visitas, matrículas), e não refaz a conta. Aquela tela
 * conta "os últimos N dias", então o período daqui vira "do primeiro dia até hoje".
 */
function CartaoDosAnuncios({ de }: { de: string | null }) {
  const hoje = hojeIsoBrasilia();
  // Mais de um ano é "todo o período" (0): o limite do servidor para os dias é 365.
  const dias = de && de <= hoje ? (diasEntre(de, hoje) > 365 ? 0 : diasEntre(de, hoje)) : de ? 1 : 0;
  const { data: r, isLoading, isError } = useResultadosDosAnuncios(dias);
  const { data: acesso } = useMeuAcesso();
  const veAnuncios = podeVerArea(acesso, "matriculas", "configuracao");

  const anuncios: ResultadoDoAnuncio[] = r ? r.campanhas.flatMap((c) => c.conjuntos.flatMap((j) => j.anuncios)) : [];
  const visiveis = anuncios.slice(0, 12);

  return (
    <Cartao
      titulo="Famílias por anúncio"
      texto={
        dias === 0
          ? "Todo o período: as famílias de desde sempre e o gasto dos últimos meses que a Meta mostra."
          : `Dos últimos ${dias} ${dias === 1 ? "dia" : "dias"} (a tela de Anúncios conta até hoje, e não por intervalo).`
      }
      direita={
        veAnuncios ? (
          <Link href="/matriculas/anuncios" className="text-primary underline-offset-4 hover:underline print:hidden">
            ver tudo em Anúncios →
          </Link>
        ) : undefined
      }
    >
      {isLoading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : isError || !r ? (
        <Vazio>Não foi possível carregar os resultados dos anúncios.</Vazio>
      ) : anuncios.length === 0 ? (
        <Vazio>Nenhuma família veio de anúncio neste período.</Vazio>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-[.1em] text-muted-foreground">
                <th scope="col" className="py-1.5 pr-3 font-bold">
                  Anúncio › conjunto
                </th>
                {["Famílias", "Visitas", "Matrículas", "Gasto", "Por matrícula"].map((c) => (
                  <th key={c} scope="col" className="py-1.5 pl-3 text-right font-bold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiveis.map((a) => (
                <tr key={a.anuncioId} className="border-b border-border/60 last:border-0">
                  <td className="max-w-[22rem] py-1.5 pr-3">
                    <span className="font-medium">{a.anuncio ?? `Anúncio ${a.anuncioId} (sem dados da Meta)`}</span>
                    {a.conjunto && <span className="text-muted-foreground"> › {a.conjunto}</span>}
                  </td>
                  <td className="py-1.5 pl-3 text-right font-mono tabular-nums">{a.familias}</td>
                  <td className="py-1.5 pl-3 text-right font-mono tabular-nums">{a.visitas}</td>
                  <td className="py-1.5 pl-3 text-right font-mono font-semibold tabular-nums">{a.matriculas}</td>
                  <td className="py-1.5 pl-3 text-right font-mono tabular-nums">{a.gasto > 0 ? real.format(a.gasto) : "—"}</td>
                  <td className="py-1.5 pl-3 text-right font-mono tabular-nums">{a.custoPorMatricula != null ? real.format(a.custoPorMatricula) : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border text-[13px] font-semibold">
                <td className="py-1.5 pr-3">Total{anuncios.length > visiveis.length ? ` (inclui mais ${anuncios.length - visiveis.length} anúncios)` : ""}</td>
                <td className="py-1.5 pl-3 text-right font-mono tabular-nums">{r.familias}</td>
                <td className="py-1.5 pl-3 text-right font-mono tabular-nums">{r.visitas}</td>
                <td className="py-1.5 pl-3 text-right font-mono tabular-nums">{r.matriculas}</td>
                <td className="py-1.5 pl-3 text-right font-mono tabular-nums">{real.format(r.gasto)}</td>
                <td className="py-1.5 pl-3 text-right font-mono tabular-nums">{r.custoPorMatricula != null ? real.format(r.custoPorMatricula) : "—"}</td>
              </tr>
            </tfoot>
          </table>
          {r.aviso && <p className="mt-2 text-[12.5px] text-muted-foreground">{r.aviso}</p>}
        </div>
      )}
    </Cartao>
  );
}

function Carregando() {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4" aria-busy>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((n) => (
          <Skeleton key={n} className="h-28 rounded-[24px]" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-[24px]" />
      <Skeleton className="h-64 rounded-[24px]" />
    </div>
  );
}
