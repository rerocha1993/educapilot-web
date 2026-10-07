import { moedaDeCentavos, paraCentavos, rotuloCurtoDaSituacao, textosDaDiferenca, type SituacaoDoPagamento } from "@/lib/finance/diferenca-do-pagamento";
import { cn } from "@/lib/utils";

/**
 * O que foi pago de fato, em letra pequena, abaixo da situação de um lançamento já pago:
 * "Pago R$ 112,00 · + R$ 12,00 juros/multa · 5 dias de atraso". O valor pago e a diferença só
 * aparecem quando o pago não é igual ao valor; a situação (no dia, antecipado, atrasado) aparece
 * sempre que se sabe.
 *
 * Serve a despesa, receita e cobrança, para os três mostrarem a divisão do mesmo jeito.
 */
export function ResumoDoPagamento({
  valor,
  valorPago,
  juros,
  multa,
  desconto,
  situacao,
  sempreComValorPago = false,
  className,
}: {
  valor: number;
  valorPago?: number | null;
  juros?: number | null;
  multa?: number | null;
  desconto?: number | null;
  situacao?: SituacaoDoPagamento | null;
  /** Mostra o valor pago mesmo quando é igual ao valor (a lista de despesas faz isso). */
  sempreComValorPago?: boolean;
  className?: string;
}) {
  const diferente = valorPago != null && paraCentavos(valorPago) !== paraCentavos(valor);
  const textos = textosDaDiferenca(juros, multa, desconto);
  const partes: { chave: string; texto: string; destaque?: boolean }[] = [];

  if (valorPago != null && (diferente || sempreComValorPago)) {
    partes.push({ chave: "pago", texto: `Pago ${moedaDeCentavos(paraCentavos(valorPago))}`, destaque: true });
  }
  if (diferente && textos.acrescimo) partes.push({ chave: "acrescimo", texto: textos.acrescimo });
  if (diferente && textos.desconto) partes.push({ chave: "desconto", texto: textos.desconto });
  if (situacao) partes.push({ chave: "situacao", texto: rotuloCurtoDaSituacao(situacao) });

  if (partes.length === 0) return null;

  return (
    <span className={cn("flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground", className)}>
      {partes.map((p, i) => (
        <span key={p.chave} className={cn(p.destaque && "font-mono font-medium text-foreground tabular-nums")}>
          {i > 0 && <span aria-hidden> · </span>}
          {p.texto}
        </span>
      ))}
    </span>
  );
}
