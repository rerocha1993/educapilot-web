"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, RefreshCw, TriangleAlert, XCircle } from "lucide-react";
import { toast } from "sonner";

import { CampoDeDinheiro, emCentavos, emReais } from "@/components/finance/campo-de-dinheiro";
import { BarraDeProgresso, EtiquetaDoComprovante } from "@/components/finance/projetos/comum";
import { Campo } from "@/components/rh/campo";
import { Confirmacao } from "@/components/rh/confirmacao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatarData, formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import { abrirArquivoDoComprovante } from "@/lib/finance/projetos-api";
import {
  confiancaEmPercentual,
  useConfirmarComprovante,
  useReler,
  useRejeitarComprovante,
  type Comprovante,
  type DespesaDoProjeto,
  type ItemLido,
  type ProjetoDetalhe,
} from "@/lib/finance/use-projetos";
import { formatarMoeda } from "@/lib/rh/formatar";
import { cn } from "@/lib/utils";

const SEM_ITEM = "__sem_item__";

/**
 * Um comprovante enviado: o que o sistema leu (ou o espaço para digitar, quando a leitura não
 * veio), com tudo editável até a pessoa confirmar. Confirmado vira somente leitura.
 *
 * A leitura é sugestão: nada vira despesa sem o clique em "Confirmar como despesa".
 */
export function CartaoDoComprovante({
  comprovante: c,
  projeto,
  despesa,
  somenteLeitura,
}: {
  comprovante: Comprovante;
  projeto: ProjetoDetalhe;
  /** A despesa que este comprovante gerou, quando já foi confirmado. */
  despesa?: DespesaDoProjeto;
  somenteLeitura: boolean;
}) {
  const reler = useReler(projeto.id);
  const rejeitar = useRejeitarComprovante(projeto.id);
  const [rejeitando, setRejeitando] = useState(false);
  const [abrindo, setAbrindo] = useState(false);

  const aberto = c.status === "Lido" || c.status === "LeituraIndisponivel" || c.status === "Pendente";
  const podeAgir = !somenteLeitura && aberto;

  async function abrirArquivo() {
    // A aba abre agora, no clique: depois da espera da rede o navegador a bloquearia.
    const aba = window.open("", "_blank");
    setAbrindo(true);
    try {
      await abrirArquivoDoComprovante(c.id, c.arquivoNome, aba);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível abrir o arquivo.");
    } finally {
      setAbrindo(false);
    }
  }

  async function relerComprovante() {
    try {
      await reler.mutateAsync(c.id);
      toast.success("Comprovante enviado para nova leitura.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível reler o comprovante.");
    }
  }

  async function confirmarRejeicao() {
    try {
      await rejeitar.mutateAsync(c.id);
      toast.success("Comprovante rejeitado.");
      setRejeitando(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível rejeitar o comprovante.");
    }
  }

  return (
    <article
      className={cn(
        "grid gap-3.5 rounded-xl border border-border bg-card p-4",
        c.status === "Rejeitado" && "opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium break-all">{c.arquivoNome}</p>
          <p className="text-[13px] text-muted-foreground">Enviado em {formatarData(c.enviadoEm)}</p>
        </div>
        <EtiquetaDoComprovante status={c.status} />
      </div>

      {c.status === "Pendente" && (
        <p role="status" className="text-sm text-muted-foreground">
          Lendo o comprovante. Isso leva alguns segundos; a tela atualiza sozinha.
        </p>
      )}

      {c.status === "Confirmado" && (
        <DespesaConfirmada despesa={despesa} comprovante={c} />
      )}

      {(c.status === "Lido" || c.status === "LeituraIndisponivel") &&
        (somenteLeitura ? (
          <p className="text-sm text-muted-foreground">Projeto encerrado: este comprovante não foi confirmado.</p>
        ) : (
          // Chave com a leitura: uma releitura traz valores novos e o formulário recomeça deles.
          <FormularioDeConfirmacao
            key={`${c.status}-${c.valorLido ?? ""}-${c.dataLida ?? ""}-${c.fornecedorLido ?? ""}`}
            comprovante={c}
            projeto={projeto}
          />
        ))}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button variant="outline" size="sm" disabled={abrindo} onClick={abrirArquivo}>
          <ExternalLink />
          Abrir arquivo
        </Button>
        {podeAgir && (
          <>
            <Button variant="outline" size="sm" disabled={reler.isPending} onClick={relerComprovante}>
              <RefreshCw />
              {reler.isPending ? "Relendo..." : "Reler"}
            </Button>
            <Button variant="destructive" size="sm" className="ml-auto" onClick={() => setRejeitando(true)}>
              <XCircle />
              Rejeitar
            </Button>
          </>
        )}
      </div>

      {rejeitando && (
        <Confirmacao
          titulo="Rejeitar este comprovante?"
          descricao="Ele deixa de contar como pendente e não vira despesa. O arquivo continua guardado."
          rotuloConfirmar="Rejeitar"
          perigosa
          pendente={rejeitar.isPending}
          onConfirmar={confirmarRejeicao}
          onFechar={() => setRejeitando(false)}
        />
      )}
    </article>
  );
}

/** Total do item lido: o que veio, ou quantidade × unitário quando só isso veio. */
function valorDoItemLido(i: ItemLido): number | undefined {
  if (i.valorTotal !== undefined) return i.valorTotal;
  if (i.valorUnitario === undefined) return undefined;
  return i.quantidade !== undefined ? i.quantidade * i.valorUnitario : i.valorUnitario;
}

function FormularioDeConfirmacao({ comprovante: c, projeto }: { comprovante: Comprovante; projeto: ProjetoDetalhe }) {
  const confirmar = useConfirmarComprovante(projeto.id);
  const indisponivel = c.status === "LeituraIndisponivel";
  const confianca = confiancaEmPercentual(c.confiancaLida);
  const aprovado = projeto.status === "Planejamento";

  const [valor, setValor] = useState<number | null>(c.valorLido !== undefined ? c.valorLido : null);
  const [data, setData] = useState(c.dataLida?.slice(0, 10) ?? hojeIsoBrasilia());
  const [descricao, setDescricao] = useState(
    c.fornecedorLido ? `${c.fornecedorLido} - ${projeto.nome}` : `Compra - ${projeto.nome}`
  );
  const [itemId, setItemId] = useState<string>(SEM_ITEM);
  const [erro, setErro] = useState<string | null>(null);

  const itemEscolhido = projeto.itens.find((i) => i.id === itemId);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (valor === null || valor <= 0) return setErro("Informe o valor da compra.");
    if (!data) return setErro("Informe a data da compra.");
    if (!descricao.trim()) return setErro("Dê uma descrição à despesa.");

    try {
      await confirmar.mutateAsync({
        comprovanteId: c.id,
        dados: {
          valor,
          data,
          descricao: descricao.trim(),
          itemDoOrcamentoId: itemId === SEM_ITEM ? undefined : itemId,
        },
      });
      toast.success("Despesa lançada no projeto.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível confirmar o comprovante.");
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-3.5">
      {indisponivel && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-destructive-border bg-destructive-soft px-3 py-2.5 text-sm text-destructive-soft-foreground"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            {c.erroDaLeitura ?? "Não foi possível ler este comprovante."} Preencha os dados à mão ou tente reler.
          </span>
        </div>
      )}

      {!indisponivel && confianca !== null && (
        <div className="grid gap-1">
          <div className="flex items-baseline justify-between gap-2 text-[13px]">
            <span className="text-muted-foreground">Confiança da leitura</span>
            <span className="font-mono tabular-nums">{Math.round(confianca)}%</span>
          </div>
          <BarraDeProgresso valor={confianca} total={100} rotulo="Confiança da leitura" inverso />
          {confianca < 70 && (
            <p className="text-xs text-muted-foreground">Leitura incerta: confira cada campo com o comprovante.</p>
          )}
        </div>
      )}

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Campo id={`valor-${c.id}`} rotulo="Valor">
          <CampoDeDinheiro
            id={`valor-${c.id}`}
            valorEmCentavos={emCentavos(valor)}
            onChange={(cent) => {
              setValor(cent === null ? null : emReais(cent));
              setErro(null);
            }}
          />
        </Campo>
        <Campo id={`data-${c.id}`} rotulo="Data da compra">
          <Input id={`data-${c.id}`} type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </Campo>
      </div>

      {c.fornecedorLido && (
        <p className="text-[13px] text-muted-foreground">
          Fornecedor lido: <span className="font-medium text-foreground">{c.fornecedorLido}</span>
        </p>
      )}

      <Campo id={`descricao-${c.id}`} rotulo="Descrição da despesa">
        <Input
          id={`descricao-${c.id}`}
          value={descricao}
          maxLength={160}
          onChange={(e) => {
            setDescricao(e.target.value);
            setErro(null);
          }}
        />
      </Campo>

      <Campo
        id={`item-${c.id}`}
        rotulo="Item do orçamento (opcional)"
        dica="Ligue a compra a um item da lista para ele contar como comprado."
      >
        <Select value={itemId} onValueChange={(v) => v && setItemId(v)}>
          <SelectTrigger id={`item-${c.id}`} className="w-full">
            <SelectValue>{() => itemEscolhido?.descricao ?? "Nenhum"}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value={SEM_ITEM}>Nenhum</SelectItem>
            {projeto.itens.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {i.descricao}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Campo>

      {!!c.itensLidos?.length && (
        <div className="rounded-lg bg-muted/60 px-3 py-2.5">
          <p className="text-xs font-medium text-muted-foreground">Itens lidos no comprovante</p>
          <ul className="mt-1.5 grid gap-1 text-[13px]">
            {c.itensLidos.map((i, n) => (
              <li key={`${i.descricao}-${n}`} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 break-words">
                  {i.quantidade !== undefined ? `${i.quantidade.toLocaleString("pt-BR")} × ` : ""}
                  {i.descricao}
                </span>
                <span className="font-mono tabular-nums">
                  {formatarMoeda(valorDoItemLido(i))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
      {!aprovado && (
        <p className="text-xs text-muted-foreground">
          Aprove o orçamento (isso cria o centro de custo) para confirmar comprovantes como despesa.
        </p>
      )}

      <div>
        <Button type="submit" variant="action" className="w-full sm:w-auto" disabled={confirmar.isPending || !aprovado}>
          {confirmar.isPending ? "Confirmando..." : "Confirmar como despesa"}
        </Button>
      </div>
    </form>
  );
}

/** Comprovante já confirmado: o que virou despesa, só para ler. */
function DespesaConfirmada({ despesa, comprovante }: { despesa?: DespesaDoProjeto; comprovante: Comprovante }) {
  const valor = despesa?.valor ?? comprovante.valorLido;
  const data = despesa?.data ?? comprovante.dataLida;
  return (
    <div className="grid gap-1 rounded-lg bg-success-soft px-3 py-2.5 text-sm text-success-soft-foreground">
      <p className="font-medium">{despesa?.descricao ?? "Despesa lançada no projeto"}</p>
      <p className="text-[13px]">
        {formatarMoeda(valor)}
        {data ? ` · ${formatarSoData(data)}` : ""}
        {despesa?.fornecedor ? ` · ${despesa.fornecedor}` : ""}
      </p>
      <p className="text-[13px]">
        A despesa aparece em &ldquo;Despesas vinculadas&rdquo; na aba Execução e no
        {" "}
        <Link href="/finance/despesas" className="font-semibold underline">
          Financeiro, em Despesas
        </Link>
        .
      </p>
    </div>
  );
}
