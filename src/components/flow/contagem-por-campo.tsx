"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Contagem dos envios por resposta de uma pergunta de escolha.
 *
 * Um campo de cada vez, escolhido pela escola: "Vai ao passeio: Sim 23 / Não 4". Só aparece
 * quando a seleção tem alguma pergunta de escolha — em formulário sem nenhuma, o controle inteiro
 * some em vez de mostrar uma lista vazia.
 */
export function ContagemPorCampo({
  campos,
  escolhido,
  onEscolher,
  contagem,
}: {
  campos: { chave: string; rotulo: string }[];
  escolhido: string;
  onEscolher: (chave: string) => void;
  /** Pares opção/quantidade já somados — inclui "Sem resposta" quando houver. */
  contagem: [string, number][];
}) {
  if (campos.length === 0) return null;

  const rotuloDe = (chave: string) => campos.find((c) => c.chave === chave)?.rotulo ?? "";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold tracking-[.1em] text-muted-foreground uppercase">
          Contar por
        </span>
        <Select value={escolhido} onValueChange={(v) => v && onEscolher(String(v))}>
          <SelectTrigger className="w-full md:w-72">
            <SelectValue>{() => rotuloDe(escolhido)}</SelectValue>
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            {campos.map((c) => (
              <SelectItem key={c.chave} value={c.chave}>
                {c.rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {contagem.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          Ninguém respondeu esta pergunta nos envios em tela.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {contagem.map(([opcao, quantidade]) => (
            <span
              key={opcao}
              className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-2.5 py-1.5 text-[12.5px]"
            >
              {opcao}
              <strong className="font-mono font-semibold tabular-nums">{quantidade}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
