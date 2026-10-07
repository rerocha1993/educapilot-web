"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, CopyPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DialogAprovarEstudo } from "@/components/finance/precificacao/dialog-aprovar-estudo";
import { DialogNovoEstudo } from "@/components/finance/precificacao/dialog-novo-estudo";
import { PassoAlunos } from "@/components/finance/precificacao/passo-alunos";
import { PassoCustos } from "@/components/finance/precificacao/passo-custos";
import { PassoIndices } from "@/components/finance/precificacao/passo-indices";
import { PassoMargem } from "@/components/finance/precificacao/passo-margem";
import { PassoNivelamento } from "@/components/finance/precificacao/passo-nivelamento";
import {
  alvoEditavel,
  linhaEditavel,
  useRascunho,
  type EdicaoDoEstudo,
} from "@/components/finance/precificacao/rascunho";
import { FinanceNav } from "@/components/finance/finance-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { Estatistica } from "@/components/padroes/estatistica";
import { ErroDeCarga } from "@/components/rh/campo";
import { Confirmacao } from "@/components/rh/confirmacao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatarData } from "@/lib/format/date";
import { formatarAlunos, formatarPercentual, formatarReajuste } from "@/lib/finance/precificacao-formatar";
import {
  premissasDoEstudo,
  useEstudo,
  useExcluirEstudo,
  type EstudoDetalhe,
} from "@/lib/finance/use-precificacao";
import { formatarMoeda } from "@/lib/rh/formatar";

type Passo = "custos" | "indices" | "alunos" | "margem" | "nivelamento";

const PASSOS: { id: Passo; rotulo: string }[] = [
  { id: "custos", rotulo: "Custos" },
  { id: "indices", rotulo: "Próximo ano" },
  { id: "alunos", rotulo: "Alunos e capacidade" },
  { id: "margem", rotulo: "Margem e retorno" },
  { id: "nivelamento", rotulo: "Nivelamento" },
];

export default function EstudoPage() {
  const params = useParams<{ id: string }>();
  const { data: estudo, isLoading, isError, error, refetch } = useEstudo(params.id ?? null);

  return (
    <div className="flex flex-col gap-[18px]">
      <FinanceNav />

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : isError || !estudo ? (
        <ErroDeCarga
          texto={error instanceof Error ? error.message : "Não foi possível carregar o estudo."}
          onTentar={() => refetch()}
        />
      ) : (
        <EditorDoEstudo key={estudo.id} estudo={estudo} />
      )}
    </div>
  );
}

function EditorDoEstudo({ estudo }: { estudo: EstudoDetalhe }) {
  const router = useRouter();
  const excluir = useExcluirEstudo();
  const [passo, setPasso] = useState<Passo>("custos");
  const [aprovando, setAprovando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [derivando, setDerivando] = useState(false);

  const aprovado = estudo.status === "Aprovado";

  // Cada parte editável guarda a edição fora da aba: trocar de passo não perde o que foi digitado.
  const linhasBase = useMemo(() => estudo.linhas.map(linhaEditavel), [estudo.linhas]);
  const alvosBase = useMemo(() => estudo.alvos.map(alvoEditavel), [estudo.alvos]);
  const premissasBase = useMemo(() => premissasDoEstudo(estudo), [estudo]);

  const edicao: EdicaoDoEstudo = {
    linhas: useRascunho(linhasBase),
    premissas: useRascunho(premissasBase),
    alvos: useRascunho(alvosBase),
    somenteLeitura: aprovado,
    estudo,
  };
  const pendente = edicao.linhas.sujo || edicao.premissas.sujo || edicao.alvos.sujo;

  // Fechar a aba com edição não salva pede confirmação ao navegador.
  useEffect(() => {
    if (!pendente) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [pendente]);

  async function confirmarExclusao() {
    try {
      await excluir.mutateAsync(estudo.id);
      toast.success("Estudo excluído.");
      router.replace("/finance/precificacao");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o estudo.");
      setExcluindo(false);
    }
  }

  const r = estudo.resultado;

  return (
    <>
      <CabecalhoDaPagina
        eyebrow="Precificação"
        eyebrowHref="/finance/precificacao"
        titulo={estudo.nome}
        tags={
          <>
            <Badge variant="outline">{estudo.anoAlvo}</Badge>
            {aprovado ? <Badge variant="success">Aprovado</Badge> : <Badge variant="pending">Rascunho</Badge>}
          </>
        }
        apoio={`Mensalidades de ${estudo.anoAlvo}, formadas a partir dos custos que o financeiro já tem.`}
        acoesClassName="w-full md:w-auto"
        acoes={
          aprovado ? (
            <Button variant="outline" className="flex-1 md:flex-none" onClick={() => setDerivando(true)}>
              <CopyPlus />
              Novo estudo a partir deste
            </Button>
          ) : (
            <>
              <Button variant="destructive" className="flex-1 md:flex-none" onClick={() => setExcluindo(true)}>
                <Trash2 />
                Excluir
              </Button>
              <Button variant="action" className="flex-1 md:flex-none" onClick={() => setAprovando(true)}>
                <CheckCircle2 />
                Aprovar
              </Button>
            </>
          )
        }
      />

      {aprovado && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-success-border bg-success-soft px-4 py-3 text-sm text-success-soft-foreground"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>
            Aprovado em {formatarData(estudo.aprovadoEm)}
            {estudo.reajusteAprovadoPercentual !== undefined && estudo.reajusteAprovadoPercentual !== null
              ? `, reajuste gravado: ${formatarPercentual(estudo.reajusteAprovadoPercentual)}`
              : ", reajuste geral não gravado"}
            . O estudo está somente leitura.
          </span>
        </div>
      )}

      <section aria-label="Resultado do estudo" className="flex flex-col gap-1.5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Estatistica rotulo="Custo mensal projetado" valor={formatarMoeda(r.custoMensalProjetado)} />
          <Estatistica rotulo="Custo por aluno" valor={formatarMoeda(r.custoPorAlunoMes)} />
          <Estatistica rotulo="Mensalidade de equilíbrio" valor={formatarMoeda(r.mensalidadeEquilibrioMedia)} />
          <Estatistica rotulo="Mensalidade alvo média" valor={formatarMoeda(r.mensalidadeAlvoMedia)} />
          <Estatistica
            rotulo="Reajuste sugerido"
            valor={formatarReajuste(r.reajusteSugeridoGeral)}
            tom={r.reajusteSugeridoGeral < 0 ? "danger" : undefined}
          />
          <Estatistica
            rotulo="Ponto de equilíbrio"
            valor={formatarAlunos(r.pontoDeEquilibrioAlunos)}
            rodape={`alunos (previstos: ${formatarAlunos(r.alunosPrevistos)})`}
          />
        </div>
        {pendente && (
          <p className="text-xs text-muted-foreground">
            A faixa mostra o último cálculo salvo. Salve as alterações para recalcular.
          </p>
        )}
      </section>

      <Tabs value={passo} onValueChange={(v) => setPasso(v as Passo)} className="gap-4">
        {/* Pílulas como a navegação do Financeiro; no celular a faixa rola de lado. */}
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
          <TabsList className="group-data-horizontal/tabs:h-auto w-max gap-1 rounded-lg bg-muted p-1">
            {PASSOS.map((p, i) => (
              <TabsTrigger
                key={p.id}
                value={p.id}
                className="h-auto min-h-10 flex-none rounded-[9px] px-3.5 py-2 text-[13.5px] md:min-h-8 data-active:bg-card data-active:font-semibold"
              >
                <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
                {p.rotulo}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="custos" keepMounted>
          <PassoCustos edicao={edicao} />
        </TabsContent>
        <TabsContent value="indices" keepMounted>
          <PassoIndices edicao={edicao} />
        </TabsContent>
        <TabsContent value="alunos" keepMounted>
          <PassoAlunos edicao={edicao} />
        </TabsContent>
        <TabsContent value="margem" keepMounted>
          <PassoMargem edicao={edicao} />
        </TabsContent>
        <TabsContent value="nivelamento" keepMounted>
          <PassoNivelamento
            estudo={estudo}
            ativo={passo === "nivelamento"}
            alteracoesPendentes={pendente}
            onAprovar={() => setAprovando(true)}
          />
        </TabsContent>
      </Tabs>

      {aprovando && (
        <DialogAprovarEstudo estudo={estudo} alteracoesPendentes={pendente} onFechar={() => setAprovando(false)} />
      )}

      {excluindo && (
        <Confirmacao
          titulo="Excluir este estudo?"
          descricao={`O rascunho "${estudo.nome}" e todas as contas dele serão apagados. Isso não pode ser desfeito.`}
          rotuloConfirmar="Excluir"
          perigosa
          pendente={excluir.isPending}
          onConfirmar={confirmarExclusao}
          onFechar={() => setExcluindo(false)}
        />
      )}

      {derivando && (
        <DialogNovoEstudo baseInicial={estudo.id} anoInicial={estudo.anoAlvo + 1} onFechar={() => setDerivando(false)} />
      )}
    </>
  );
}
