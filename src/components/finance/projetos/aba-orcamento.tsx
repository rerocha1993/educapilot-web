"use client";

import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CampoDeDinheiro, emCentavos, emReais } from "@/components/finance/campo-de-dinheiro";
import { CampoNumerico } from "@/components/finance/precificacao/campo-numerico";
import { BarraDeSalvar } from "@/components/finance/precificacao/rascunho";
import {
  GRUPOS_DO_ORCAMENTO,
  novaChave,
  totalDoItem,
  type EdicaoDoProjeto,
  type ItemEditavel,
} from "@/components/finance/projetos/edicao";
import { BotaoDeIcone } from "@/components/rh/lista-movel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatarPercentual } from "@/lib/finance/precificacao-formatar";
import { dadosDoProjeto, useSalvarDados, useSalvarItens } from "@/lib/finance/use-projetos";
import { formatarMoeda } from "@/lib/rh/formatar";
import { cn } from "@/lib/utils";

const SEM_GRUPO = "__sem_grupo__";

/** Descrição | grupo | qtd | unitário | total | comprado | remover — a observação fica sob a descrição. */
const COLUNAS = "lg:grid-cols-[minmax(0,1fr)_9rem_5.5rem_8rem_6.5rem_4.5rem_2.25rem] lg:items-start";

/**
 * Orçamento do projeto: itens editáveis e, ao lado, o que o servidor calcula a partir deles
 * (valor sugerido por família, receita e resultado previstos).
 *
 * Os números do painel são os do último cálculo salvo: mudar item, margem ou famílias só
 * recalcula ao salvar, e a tela avisa quando o que se vê está defasado.
 */
export function AbaOrcamento({ edicao, onAprovar }: { edicao: EdicaoDoProjeto; onAprovar: () => void }) {
  const { projeto, itens, parametros, somenteLeitura } = edicao;
  const salvarDados = useSalvarDados(projeto.id);
  const salvarItens = useSalvarItens(projeto.id);
  const o = projeto.orcamento;

  const lista = itens.valor;
  const totalDosItens = lista.reduce((s, i) => s + totalDoItem(i), 0);
  const sujo = itens.sujo || parametros.sujo;
  // Comprado só faz sentido depois da aprovação: antes, nada foi comprado.
  const podeMarcarComprado = !somenteLeitura && projeto.status === "Planejamento";

  function mudar(chave: string, parte: Partial<ItemEditavel>) {
    itens.editar((atual) => atual.map((i) => (i.chave === chave ? { ...i, ...parte } : i)));
  }

  function adicionar() {
    itens.editar((atual) => [
      ...atual,
      {
        chave: novaChave(),
        descricao: "",
        grupo: "",
        quantidade: 1,
        valorUnitario: null,
        comprado: false,
        observacao: "",
      },
    ]);
  }

  async function salvar() {
    const p = parametros.valor;
    if (parametros.sujo) {
      if (p.familias === null || p.familias < 1) return void toast.error("Informe o número de famílias (pelo menos 1).");
      if (p.margem !== null && p.margem < 0) return void toast.error("A margem não pode ser negativa.");
    }
    if (itens.sujo) {
      const semNome = lista.findIndex((i) => !i.descricao.trim());
      if (semNome >= 0) return void toast.error(`O item ${semNome + 1} está sem descrição.`);
      if (lista.some((i) => (i.quantidade ?? 0) < 0 || (i.valorUnitario ?? 0) < 0)) {
        return void toast.error("Quantidade e valor não podem ser negativos.");
      }
    }

    try {
      if (parametros.sujo) {
        await salvarDados.mutateAsync({
          ...dadosDoProjeto(projeto),
          margemDesejadaPercentual: p.margem ?? 0,
          numeroDeFamilias: Math.round(p.familias ?? projeto.numeroDeFamilias),
          valorPorFamiliaDefinido: p.valorDefinido ?? undefined,
        });
        parametros.descartar();
      }
      if (itens.sujo) {
        await salvarItens.mutateAsync(
          lista.map((i, ordem) => ({
            id: i.id,
            descricao: i.descricao.trim(),
            grupo: i.grupo || undefined,
            quantidade: i.quantidade ?? 0,
            valorUnitario: i.valorUnitario ?? 0,
            comprado: i.comprado,
            ordem,
            observacao: i.observacao.trim() || undefined,
          }))
        );
        itens.descartar();
      }
      toast.success("Orçamento salvo.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o orçamento.");
    }
  }

  const resultadoNegativo = o.resultadoPrevisto < 0;

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_340px] 2xl:items-start">
      <aside
        aria-label="Valor por família"
        className="order-first grid content-start gap-4 rounded-xl border border-border bg-card p-4 2xl:sticky 2xl:top-4 2xl:order-last"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-1">
          <div className="grid gap-1.5">
            <label htmlFor="orc-margem" className="text-sm leading-none font-medium">
              Margem desejada
            </label>
            <CampoNumerico
              id="orc-margem"
              valor={parametros.valor.margem}
              onChange={(v) => parametros.editar((a) => ({ ...a, margem: v }))}
              sufixo="%"
              min={0}
              disabled={somenteLeitura}
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="orc-familias" className="text-sm leading-none font-medium">
              Número de famílias
            </label>
            <CampoNumerico
              id="orc-familias"
              valor={parametros.valor.familias}
              onChange={(v) => parametros.editar((a) => ({ ...a, familias: v }))}
              min={0}
              disabled={somenteLeitura}
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="orc-definido" className="text-sm leading-none font-medium">
              Valor por família definido
            </label>
            <CampoDeDinheiro
              id="orc-definido"
              valorEmCentavos={emCentavos(parametros.valor.valorDefinido)}
              onChange={(c) => parametros.editar((a) => ({ ...a, valorDefinido: c === null ? null : emReais(c) }))}
              placeholder="usar o sugerido"
              disabled={somenteLeitura}
            />
            <p className="text-xs text-muted-foreground">Em branco, cobra o valor sugerido.</p>
          </div>
        </div>

        <div className="rounded-lg bg-action-soft px-3.5 py-3">
          <p className="text-[12.5px] font-medium text-action-soft-foreground">Valor sugerido por família</p>
          <p className="mt-1 font-heading text-[28px] font-semibold tracking-[-.03em] tabular-nums">
            {formatarMoeda(o.valorSugeridoPorFamilia)}
          </p>
          {o.valorPorFamilia !== o.valorSugeridoPorFamilia && (
            <p className="mt-0.5 text-[13px] text-action-soft-foreground">
              Cobrando {formatarMoeda(o.valorPorFamilia)} por família
            </p>
          )}
        </div>

        <dl className="grid gap-2 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">Custo do orçamento</dt>
            <dd className="font-mono font-semibold tabular-nums">{formatarMoeda(o.custoTotal)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">Receita prevista</dt>
            <dd className="font-mono font-semibold tabular-nums">{formatarMoeda(o.receitaPrevista)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">Resultado previsto</dt>
            <dd
              className={cn(
                "font-mono font-semibold tabular-nums",
                resultadoNegativo && "text-destructive"
              )}
            >
              {formatarMoeda(o.resultadoPrevisto)}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                ({formatarPercentual(o.margemPrevistaPercentual)})
              </span>
            </dd>
          </div>
        </dl>

        {sujo && (
          <p className="text-xs text-muted-foreground">
            Os números do painel são do último cálculo salvo. Salve para recalcular.
          </p>
        )}
      </aside>

      <div className="grid min-w-0 gap-3">
        {lista.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border-dashed bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhum item ainda. Use &ldquo;Adicionar item&rdquo; para listar o que a festa vai custar.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div
              className={cn(
                "hidden gap-2 border-b border-border bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground lg:grid",
                COLUNAS
              )}
            >
              <span>Item</span>
              <span>Grupo</span>
              <span className="text-right">Quantidade</span>
              <span className="text-right">Unitário</span>
              <span className="text-right">Total</span>
              <span className="text-center">Comprado</span>
              <span />
            </div>

            {lista.map((item) => (
              <LinhaDoItem
                key={item.chave}
                item={item}
                somenteLeitura={somenteLeitura}
                podeMarcarComprado={podeMarcarComprado}
                onMudar={(parte) => mudar(item.chave, parte)}
                onRemover={() => itens.editar((atual) => atual.filter((x) => x.chave !== item.chave))}
              />
            ))}

            <div className="flex items-center justify-between gap-3 bg-muted/40 px-3 py-3">
              <span className="font-heading text-sm font-semibold">Total dos itens</span>
              <span className="font-mono text-sm font-semibold tabular-nums">{formatarMoeda(totalDosItens)}</span>
            </div>
          </div>
        )}

        {!somenteLeitura && (
          <div>
            <Button variant="outline" className="w-full sm:w-auto" onClick={adicionar}>
              <Plus />
              Adicionar item
            </Button>
          </div>
        )}

        {!somenteLeitura && (
          <BarraDeSalvar
            sujo={sujo}
            salvando={salvarDados.isPending || salvarItens.isPending}
            onSalvar={salvar}
            onDescartar={() => {
              itens.descartar();
              parametros.descartar();
            }}
            extra={
              projeto.status === "Orcamento" && (
                <Button variant="default" onClick={onAprovar}>
                  <CheckCircle2 />
                  Aprovar e virar planejamento
                </Button>
              )
            }
          />
        )}
      </div>
    </div>
  );
}

function LinhaDoItem({
  item,
  somenteLeitura,
  podeMarcarComprado,
  onMudar,
  onRemover,
}: {
  item: ItemEditavel;
  somenteLeitura: boolean;
  podeMarcarComprado: boolean;
  onMudar: (parte: Partial<ItemEditavel>) => void;
  onRemover: () => void;
}) {
  const nome = item.descricao.trim() || "item";
  // Grupo que a lista fixa não tem (veio do servidor) continua escolhível.
  const grupos = item.grupo && !(GRUPOS_DO_ORCAMENTO as readonly string[]).includes(item.grupo)
    ? [...GRUPOS_DO_ORCAMENTO, item.grupo]
    : GRUPOS_DO_ORCAMENTO;

  return (
    <div className={cn("grid gap-2.5 border-b border-border px-3 py-3 lg:gap-2", COLUNAS)}>
      <div className="grid min-w-0 gap-1.5">
        {somenteLeitura ? (
          <>
            <span className="text-sm font-medium break-words">{item.descricao}</span>
            {item.observacao && <span className="text-[13px] text-muted-foreground">{item.observacao}</span>}
          </>
        ) : (
          <>
            <Input
              aria-label="Descrição do item"
              placeholder="Descrição"
              value={item.descricao}
              maxLength={160}
              onChange={(e) => onMudar({ descricao: e.target.value })}
            />
            <Input
              aria-label={`Observação de ${nome}`}
              placeholder="Observação"
              value={item.observacao}
              maxLength={300}
              onChange={(e) => onMudar({ observacao: e.target.value })}
              className="h-8 text-[13px] max-md:h-9"
            />
          </>
        )}
      </div>

      <Linha rotulo="Grupo">
        {somenteLeitura ? (
          <span className="text-sm">{item.grupo || "—"}</span>
        ) : (
          <Select
            value={item.grupo || SEM_GRUPO}
            onValueChange={(v) => v && onMudar({ grupo: v === SEM_GRUPO ? "" : v })}
          >
            <SelectTrigger aria-label={`Grupo de ${nome}`} className="w-40 lg:w-full">
              <SelectValue>{() => item.grupo || "Sem grupo"}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value={SEM_GRUPO}>Sem grupo</SelectItem>
              {grupos.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Linha>

      <Linha rotulo="Quantidade">
        {somenteLeitura ? (
          <span className="font-mono text-sm tabular-nums">{item.quantidade ?? 0}</span>
        ) : (
          <CampoNumerico
            valor={item.quantidade}
            onChange={(v) => onMudar({ quantidade: v })}
            min={0}
            ariaLabel={`Quantidade de ${nome}`}
            className="w-24 lg:w-full"
          />
        )}
      </Linha>

      <Linha rotulo="Unitário">
        {somenteLeitura ? (
          <span className="font-mono text-sm tabular-nums">{formatarMoeda(item.valorUnitario ?? 0)}</span>
        ) : (
          <CampoDeDinheiro
            valorEmCentavos={emCentavos(item.valorUnitario)}
            onChange={(c) => onMudar({ valorUnitario: c === null ? null : emReais(c) })}
            ariaLabel={`Valor unitário de ${nome}`}
            className="w-36 lg:w-full"
          />
        )}
      </Linha>

      <Linha rotulo="Total">
        <span className="font-mono text-sm font-semibold tabular-nums lg:pt-1.5">
          {formatarMoeda(totalDoItem(item))}
        </span>
      </Linha>

      <Linha rotulo="Comprado" centro>
        <Switch
          checked={item.comprado}
          disabled={!podeMarcarComprado}
          onCheckedChange={(v) => onMudar({ comprado: v === true })}
          aria-label={`${nome} comprado`}
          title={podeMarcarComprado ? undefined : "Só depois de aprovar o orçamento"}
          className="lg:mt-2"
        />
      </Linha>

      <div className="flex justify-end">
        {!somenteLeitura && (
          <BotaoDeIcone rotulo={`Remover ${nome}`} icone={<Trash2 />} perigo onClick={onRemover} />
        )}
      </div>
    </div>
  );
}

/** Célula com o rótulo à esquerda no celular (a linha vira bloco) e sem rótulo no desktop. */
function Linha({ rotulo, children, centro = false }: { rotulo: string; children: React.ReactNode; centro?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 lg:block", centro ? "lg:text-center" : "lg:text-right")}>
      <span className="text-xs text-muted-foreground lg:hidden">{rotulo}</span>
      {children}
    </div>
  );
}
