"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { VisualizadorDoComprovante } from "@/components/finance/comprovantes/arquivo-do-comprovante";
import { CampoDeDinheiro, emCentavos, emReais } from "@/components/finance/campo-de-dinheiro";
import { ClassificacaoDoLancamento } from "@/components/finance/classificacao-do-lancamento";
import { Campo } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { confiancaBaixa, useLancarDespesaDoComprovante, type ComprovanteRecebido } from "@/lib/finance/use-comprovantes";
import { FORMAS_DE_PAGAMENTO, ROTULO_DA_FORMA, type FormaDePagamento } from "@/lib/finance/use-recibos";
import { hojeIsoBrasilia } from "@/lib/format/date";
import { soDigitos } from "@/lib/rh/formatar";

const SEM_FORMA = "__sem_forma__";

/** Campo lido com pouca certeza: borda e fundo amarelos, para a pessoa olhar o comprovante. */
const DESTAQUE = "border-warning-border bg-warning-soft dark:bg-warning-soft";

/** CPF (até 11 dígitos) ou CNPJ (14), com a máscara aparecendo enquanto a pessoa digita. */
function mascararDocumento(texto: string): string {
  const d = soDigitos(texto).slice(0, 14);
  if (d.length <= 11) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** A descrição que a despesa vai ter: o fornecedor e, se a pessoa escreveu, a legenda do WhatsApp. */
function descricaoInicial(c: ComprovanteRecebido): string {
  const partes = [c.fornecedorLido?.trim(), c.legenda?.trim()].filter(Boolean);
  return partes.length > 0 ? partes.join(" - ") : "Compra";
}

/**
 * Lançar o comprovante como despesa paga: o arquivo ao lado (ou em cima, no celular) e o
 * formulário já preenchido com o que o sistema leu e sugeriu. A leitura é sugestão; os campos
 * lidos com pouca certeza vêm marcados em amarelo.
 *
 * Quem abre monta o diálogo só enquanto ele está aberto: o formulário nasce sempre do que está
 * gravado, sem efeito para ressincronizar estado.
 */
export function DialogLancarDespesa({
  comprovante: c,
  onFechar,
}: {
  comprovante: ComprovanteRecebido;
  onFechar: () => void;
}) {
  const router = useRouter();
  const lancar = useLancarDespesaDoComprovante();

  const [valor, setValor] = useState<number | null>(c.valorLido ?? null);
  const [data, setData] = useState(c.dataLida?.slice(0, 10) || hojeIsoBrasilia());
  const [descricao, setDescricao] = useState(() => descricaoInicial(c));
  const [fornecedor, setFornecedor] = useState(c.fornecedorLido ?? "");
  const [documento, setDocumento] = useState(() => mascararDocumento(c.documentoLido ?? ""));
  const [contaId, setContaId] = useState(c.contaSugeridaId ?? "");
  const [categoriaId, setCategoriaId] = useState(c.categoriaSugeridaId ?? "");
  const [centroId, setCentroId] = useState("");
  const [forma, setForma] = useState<FormaDePagamento | "">("");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const baixaValor = confiancaBaixa(c.confianca?.valor);
  const baixaData = confiancaBaixa(c.confianca?.data);
  const baixaFornecedor = confiancaBaixa(c.confianca?.fornecedor);
  const semLeitura = c.status === "SemLeitura";

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (valor === null || valor <= 0) return setErro("Informe o valor da despesa.");
    if (!data) return setErro("Informe a data da compra.");
    if (!descricao.trim()) return setErro("Dê uma descrição à despesa.");

    try {
      await lancar.mutateAsync({
        id: c.id,
        dados: {
          valor,
          data,
          descricao: descricao.trim(),
          fornecedorNome: fornecedor.trim() || undefined,
          fornecedorDocumento: soDigitos(documento) || undefined,
          categoriaFinanceiraId: categoriaId || undefined,
          contaFinanceiraId: contaId || undefined,
          centroDeCustoId: centroId || undefined,
          formaDePagamento: forma || undefined,
          observacao: observacao.trim() || undefined,
        },
      });
      toast.success("Despesa lançada como paga.", {
        action: { label: "Ver em Despesas", onClick: () => router.push("/finance/despesas") },
      });
      onFechar();
    } catch (err) {
      // 409 (mês fechado) e os demais erros trazem a frase do servidor; fica no formulário
      // para a pessoa ler sem perder o que digitou.
      setErro(err instanceof Error ? err.message : "Não foi possível lançar a despesa.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !lancar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Lançar despesa</DialogTitle>
          <DialogDescription>
            Confira os dados com o comprovante. Ao lançar, a despesa fica como paga e o comprovante vai junto.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2 md:items-start">
          <VisualizadorDoComprovante comprovante={c} className="min-w-0" />

          <form id="form-lancar-despesa" onSubmit={enviar} noValidate className="grid min-w-0 gap-3.5">
            {semLeitura && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-lg border border-action-border bg-action-soft px-3 py-2.5 text-sm text-action-soft-foreground"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>Não deu para ler este comprovante. Preencha os dados olhando o arquivo.</span>
              </div>
            )}
            {(baixaValor || baixaData || baixaFornecedor) && (
              <p className="flex items-start gap-2 text-[13px] text-warning-soft-foreground">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>Os campos em amarelo foram lidos com pouca certeza. Confira com o comprovante.</span>
              </p>
            )}

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Campo id="lanc-valor" rotulo="Valor" dica={baixaValor ? "Confira este valor" : undefined}>
                <CampoDeDinheiro
                  id="lanc-valor"
                  valorEmCentavos={emCentavos(valor)}
                  className={baixaValor ? DESTAQUE : undefined}
                  onChange={(cent) => {
                    setValor(cent === null ? null : emReais(cent));
                    setErro(null);
                  }}
                />
              </Campo>
              <Campo id="lanc-data" rotulo="Data da compra" dica={baixaData ? "Confira esta data" : undefined}>
                <Input
                  id="lanc-data"
                  type="date"
                  value={data}
                  className={baixaData ? DESTAQUE : undefined}
                  onChange={(e) => {
                    setData(e.target.value);
                    setErro(null);
                  }}
                />
              </Campo>
            </div>

            <Campo id="lanc-descricao" rotulo="Descrição">
              <Input
                id="lanc-descricao"
                value={descricao}
                maxLength={160}
                onChange={(e) => {
                  setDescricao(e.target.value);
                  setErro(null);
                }}
              />
            </Campo>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Campo
                id="lanc-fornecedor"
                rotulo="Fornecedor"
                dica={baixaFornecedor ? "Confira este nome" : undefined}
              >
                <Input
                  id="lanc-fornecedor"
                  value={fornecedor}
                  maxLength={120}
                  className={baixaFornecedor ? DESTAQUE : undefined}
                  onChange={(e) => setFornecedor(e.target.value)}
                />
              </Campo>
              <Campo id="lanc-documento" rotulo="CNPJ ou CPF (opcional)">
                <Input
                  id="lanc-documento"
                  inputMode="numeric"
                  value={documento}
                  placeholder="00.000.000/0000-00"
                  onChange={(e) => setDocumento(mascararDocumento(e.target.value))}
                />
              </Campo>
            </div>

            <ClassificacaoDoLancamento
              tipo="Despesa"
              contaId={contaId}
              categoriaId={categoriaId}
              centroId={centroId}
              onContaId={setContaId}
              onCategoriaId={setCategoriaId}
              onCentroId={setCentroId}
            />

            <Campo id="lanc-forma" rotulo="Forma de pagamento (opcional)">
              <Select
                value={forma || SEM_FORMA}
                onValueChange={(v) => v && setForma(v === SEM_FORMA ? "" : (v as FormaDePagamento))}
              >
                <SelectTrigger id="lanc-forma" className="w-full">
                  <SelectValue>{() => (forma ? ROTULO_DA_FORMA[forma] : "Não informar")}</SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value={SEM_FORMA}>Não informar</SelectItem>
                  {FORMAS_DE_PAGAMENTO.map((f) => (
                    <SelectItem key={f} value={f}>
                      {ROTULO_DA_FORMA[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <Campo id="lanc-observacao" rotulo="Observação (opcional)">
              <Textarea
                id="lanc-observacao"
                rows={2}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </Campo>

            {erro && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {erro}
              </p>
            )}
          </form>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={lancar.isPending} onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-lancar-despesa" variant="action" disabled={lancar.isPending}>
            {lancar.isPending ? "Lançando..." : "Lançar como paga"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
