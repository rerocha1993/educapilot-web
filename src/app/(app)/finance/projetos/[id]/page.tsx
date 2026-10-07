"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Flag, Lock, Pencil, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { FinanceNav } from "@/components/finance/finance-nav";
import { useRascunho } from "@/components/finance/precificacao/rascunho";
import { AbaCobrancas } from "@/components/finance/projetos/aba-cobrancas";
import { AbaComprovantes } from "@/components/finance/projetos/aba-comprovantes";
import { AbaExecucao } from "@/components/finance/projetos/aba-execucao";
import { AbaOrcamento } from "@/components/finance/projetos/aba-orcamento";
import { EtiquetaDoProjeto, FaixaDeAviso } from "@/components/finance/projetos/comum";
import { DialogProjeto } from "@/components/finance/projetos/dialog-projeto";
import {
  itemEditavel,
  parametrosDoProjeto,
  type EdicaoDoProjeto,
} from "@/components/finance/projetos/edicao";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { Estatistica } from "@/components/padroes/estatistica";
import { ErroDeCarga } from "@/components/rh/campo";
import { Confirmacao } from "@/components/rh/confirmacao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatarData, formatarSoData } from "@/lib/format/date";
import {
  useAprovarProjeto,
  useEncerrarProjeto,
  useExcluirProjeto,
  useProjeto,
  type ProjetoDetalhe,
} from "@/lib/finance/use-projetos";
import { formatarMoeda } from "@/lib/rh/formatar";

type Aba = "orcamento" | "execucao" | "comprovantes" | "cobrancas";
type Pergunta = "aprovar" | "encerrar" | "excluir";

export default function ProjetoPage() {
  const params = useParams<{ id: string }>();
  const { data: projeto, isLoading, isError, error, refetch } = useProjeto(params.id ?? null);

  return (
    <div className="flex flex-col gap-[18px]">
      <FinanceNav />

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : isError || !projeto ? (
        <ErroDeCarga
          texto={error instanceof Error ? error.message : "Não foi possível carregar o projeto."}
          onTentar={() => refetch()}
        />
      ) : (
        <PainelDoProjeto key={projeto.id} projeto={projeto} />
      )}
    </div>
  );
}

function PainelDoProjeto({ projeto }: { projeto: ProjetoDetalhe }) {
  const router = useRouter();
  const aprovar = useAprovarProjeto(projeto.id);
  const encerrar = useEncerrarProjeto(projeto.id);
  const excluir = useExcluirProjeto();

  const [aba, setAba] = useState<Aba>(projeto.status === "Orcamento" ? "orcamento" : "execucao");
  const [pergunta, setPergunta] = useState<Pergunta | null>(null);
  const [editando, setEditando] = useState(false);

  const encerrado = projeto.status === "Encerrado";

  // Cada parte editável guarda a edição fora da aba: trocar de aba não perde o que foi digitado.
  const itensBase = useMemo(() => projeto.itens.map(itemEditavel), [projeto.itens]);
  const parametrosBase = useMemo(() => parametrosDoProjeto(projeto), [projeto]);
  const edicao: EdicaoDoProjeto = {
    itens: useRascunho(itensBase),
    parametros: useRascunho(parametrosBase),
    somenteLeitura: encerrado,
    projeto,
  };
  const pendente = edicao.itens.sujo || edicao.parametros.sujo;

  // Fechar a aba com edição não salva pede confirmação ao navegador.
  useEffect(() => {
    if (!pendente) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [pendente]);

  /** Aprovar, encerrar e editar os dados usam o que o servidor tem: edição solta ficaria para trás. */
  function pedir(p: Pergunta | "editar") {
    if (pendente && p !== "excluir") {
      toast.error("Salve ou descarte as alterações do orçamento antes.");
      setAba("orcamento");
      return;
    }
    if (p === "editar") setEditando(true);
    else setPergunta(p);
  }

  async function confirmarAprovacao() {
    try {
      await aprovar.mutateAsync();
      toast.success("Orçamento aprovado. O projeto agora está em planejamento.");
      setPergunta(null);
      setAba("execucao");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível aprovar o projeto.");
    }
  }

  async function confirmarEncerramento() {
    try {
      await encerrar.mutateAsync();
      toast.success("Projeto encerrado.");
      setPergunta(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível encerrar o projeto.");
    }
  }

  async function confirmarExclusao() {
    try {
      await excluir.mutateAsync(projeto.id);
      toast.success("Projeto excluído.");
      router.replace("/finance/projetos");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o projeto.");
      setPergunta(null);
    }
  }

  const e = projeto.execucao;
  const o = projeto.orcamento;
  const turmas = projeto.turmas.map((t) => t.nome).join(", ");

  return (
    <>
      <CabecalhoDaPagina
        eyebrow="Projetos"
        eyebrowHref="/finance/projetos"
        titulo={projeto.nome}
        tags={
          <>
            <EtiquetaDoProjeto status={projeto.status} />
            {projeto.dataDoEvento && <Badge variant="outline">{formatarSoData(projeto.dataDoEvento)}</Badge>}
          </>
        }
        apoio={
          <>
            {turmas || "Escola toda"}
            {projeto.descricao ? ` · ${projeto.descricao}` : ""}
          </>
        }
        acoesClassName="w-full md:w-auto"
        acoes={
          <>
            {projeto.status === "Orcamento" && (
              <Button variant="destructive" className="flex-1 md:flex-none" onClick={() => pedir("excluir")}>
                <Trash2 />
                Excluir
              </Button>
            )}
            {!encerrado && (
              <Button variant="outline" className="flex-1 md:flex-none" onClick={() => pedir("editar")}>
                <Pencil />
                Editar dados
              </Button>
            )}
            {projeto.status === "Planejamento" && (
              <Button variant="default" className="flex-1 md:flex-none" onClick={() => pedir("encerrar")}>
                <Flag />
                Encerrar
              </Button>
            )}
            {projeto.status === "Orcamento" && (
              <Button variant="action" className="flex-1 md:flex-none" onClick={() => pedir("aprovar")}>
                <CheckCircle2 />
                Aprovar
              </Button>
            )}
          </>
        }
      />

      {encerrado && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
        >
          <Lock className="mt-0.5 size-4 shrink-0" />
          <span>
            Projeto encerrado{projeto.encerradoEm ? ` em ${formatarData(projeto.encerradoEm)}` : ""}. Fica somente leitura;
            só dá para marcar cobranças como pagas.
          </span>
        </div>
      )}

      <section aria-label="Resumo do projeto" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Estatistica rotulo="Orçamento total" valor={formatarMoeda(o.custoTotal)} />
        <Estatistica
          rotulo="Valor por família"
          valor={formatarMoeda(o.valorPorFamilia)}
          rodape={`${projeto.numeroDeFamilias} ${projeto.numeroDeFamilias === 1 ? "família" : "famílias"}`}
        />
        <Estatistica
          rotulo="Gasto"
          valor={formatarMoeda(e.gasto)}
          proporcao={o.custoTotal > 0 ? (e.gasto / o.custoTotal) * 100 : 0}
          rodape={`${Math.round(e.percentualDoOrcamento)}% do orçamento`}
        />
        <Estatistica
          rotulo="Arrecadado"
          valor={formatarMoeda(e.arrecadado)}
          proporcao={o.receitaPrevista > 0 ? (e.arrecadado / o.receitaPrevista) * 100 : 0}
          rodape={`A receber: ${formatarMoeda(e.aReceber)}`}
        />
        <Estatistica rotulo="Saldo" valor={formatarMoeda(e.saldo)} tom={e.saldo < 0 ? "danger" : undefined} />
      </section>

      {e.alertas.length > 0 && (
        <FaixaDeAviso>
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <ul className="grid gap-1">
            {e.alertas.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </FaixaDeAviso>
      )}

      <Tabs value={aba} onValueChange={(v) => setAba(v as Aba)} className="gap-4">
        {/* Pílulas como a navegação do Financeiro; no celular a faixa rola de lado. */}
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
          <TabsList className="group-data-horizontal/tabs:h-auto w-max gap-1 rounded-lg bg-muted p-1">
            {(
              [
                ["orcamento", "Orçamento", pendente ? "•" : null],
                ["execucao", "Execução", null],
                ["comprovantes", "Comprovantes", projeto.comprovantes.pendentes || null],
                ["cobrancas", "Cobranças", e.cobrancas.vencidas || null],
              ] as const
            ).map(([id, rotulo, marca]) => (
              <TabsTrigger
                key={id}
                value={id}
                className="h-auto min-h-10 flex-none rounded-[9px] px-3.5 py-2 text-[13.5px] md:min-h-8 data-active:bg-card data-active:font-semibold"
              >
                {rotulo}
                {marca !== null && (
                  <span className="rounded-md bg-action-soft px-1.5 font-mono text-[11px] text-action-soft-foreground tabular-nums">
                    {marca}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="orcamento" keepMounted>
          <AbaOrcamento edicao={edicao} onAprovar={() => pedir("aprovar")} />
        </TabsContent>
        <TabsContent value="execucao">
          <AbaExecucao
            projeto={projeto}
            edicaoPendente={edicao.itens.sujo}
            onIrParaComprovantes={() => setAba("comprovantes")}
          />
        </TabsContent>
        <TabsContent value="comprovantes">
          <AbaComprovantes projeto={projeto} />
        </TabsContent>
        <TabsContent value="cobrancas">
          <AbaCobrancas projeto={projeto} />
        </TabsContent>
      </Tabs>

      {editando && <DialogProjeto projeto={projeto} onFechar={() => setEditando(false)} />}

      {pergunta === "aprovar" && (
        <Confirmacao
          titulo="Aprovar e virar planejamento?"
          descricao={`Isso cria o centro de custo "${projeto.nome}" no Financeiro: as despesas lançadas com comprovante passam a ser ligadas a ele, e as cobranças das famílias saem a ${formatarMoeda(o.valorPorFamilia)} por família. A partir daí o projeto fica em planejamento e acompanha gasto e arrecadação.`}
          rotuloConfirmar="Aprovar"
          pendente={aprovar.isPending}
          onConfirmar={confirmarAprovacao}
          onFechar={() => setPergunta(null)}
        />
      )}

      {pergunta === "encerrar" && (
        <Confirmacao
          titulo="Encerrar este projeto?"
          descricao={`O orçamento, as despesas e os comprovantes ficam somente leitura. Só será possível marcar cobranças como pagas.${
            projeto.comprovantes.pendentes > 0
              ? ` Há ${projeto.comprovantes.pendentes} comprovante(s) ainda sem confirmar.`
              : ""
          }${e.cobrancas.pendentes + e.cobrancas.vencidas > 0 ? ` Há ${e.cobrancas.pendentes + e.cobrancas.vencidas} cobrança(s) em aberto.` : ""}`}
          rotuloConfirmar="Encerrar"
          pendente={encerrar.isPending}
          onConfirmar={confirmarEncerramento}
          onFechar={() => setPergunta(null)}
        />
      )}

      {pergunta === "excluir" && (
        <Confirmacao
          titulo="Excluir este projeto?"
          descricao={`O orçamento "${projeto.nome}" e os itens dele serão apagados. Isso não pode ser desfeito.`}
          rotuloConfirmar="Excluir"
          perigosa
          pendente={excluir.isPending}
          onConfirmar={confirmarExclusao}
          onFechar={() => setPergunta(null)}
        />
      )}
    </>
  );
}
