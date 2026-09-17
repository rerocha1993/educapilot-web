"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { FileText } from "lucide-react";
import { formatarData } from "@/lib/format/date";

// Campo do tipo "contrato" (2026-09).
//
// O tipo existia no construtor de formulários e no backend desde o início, mas nenhuma das duas
// telas de preenchimento sabia desenhá-lo: caía no `default` do switch e virava uma caixinha de
// texto vazia, sem contrato nenhum à vista. Este componente é o que faltava.
//
// O valor gravado é a string "aceito" — é o que FormResponseService valida. O texto do contrato
// não vai na resposta: ele mora em Config.contratoTexto e é o módulo Contracts que o renderiza
// e envia para assinatura, garantindo que o PDF assinado venha do texto oficial e não de algo
// que trafegou pelo navegador de quem preencheu.

/**
 * Substitui os marcadores {{campo}} pelo que já foi respondido.
 *
 * Espelha ContractTemplateRenderer no backend, de propósito: a família precisa ler exatamente o
 * mesmo texto que vai para o PDF. A comparação ignora acento, caixa e espaços porque o marcador
 * é escrito à mão pela escola e quase nunca sai idêntico ao rótulo do campo.
 *
 * Marcador sem resposta fica visível como ____ em vez de sumir: um contrato com lacuna à vista é
 * melhor do que uma frase que parece completa e não está.
 */
export function preencherMarcadores(
  texto: string,
  valoresPorRotulo: Record<string, string>
): string {
  const normalizar = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const indice = new Map<string, string>();
  for (const [rotulo, valor] of Object.entries(valoresPorRotulo)) {
    if (valor && valor.trim() !== "") indice.set(normalizar(rotulo), valor);
  }

  // Dia no fuso da escola, não no do navegador de quem preenche.
  const hoje = formatarData(new Date(), {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  indice.set("data atual", hoje);

  return texto.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, marcador: string) => {
    return indice.get(normalizar(marcador)) ?? "__________";
  });
}

export function ContractField({
  titulo,
  texto,
  valoresPorRotulo,
  aceito,
  onAceitar,
}: {
  titulo?: string;
  texto: string;
  valoresPorRotulo: Record<string, string>;
  aceito: boolean;
  onAceitar: (aceito: boolean) => void;
}) {
  if (!texto.trim()) {
    // Campo de contrato criado sem texto: avisa em vez de mostrar uma caixa vazia, que era
    // justamente o sintoma do bug original.
    return (
      <p className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
        O contrato ainda não foi cadastrado neste formulário. Fale com a escola antes de enviar.
      </p>
    );
  }

  const preenchido = preencherMarcadores(texto, valoresPorRotulo);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30">
        {titulo && (
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <FileText className="size-4 shrink-0 text-primary" />
            <span className="min-w-0 font-heading text-sm font-semibold break-words">{titulo}</span>
          </div>
        )}

        {/* Altura fixa com rolagem própria: o contrato tem várias páginas e, solto na página,
            empurraria o botão de enviar para longe demais para alguém chegar nele no celular.
            No celular a caixa acompanha a altura da tela e a letra sobe para 14px: com 320px fixos
            e letra de 12px, cabiam poucas linhas e o contrato ficava ilegível. */}
        <div className="max-h-[55vh] overflow-y-auto px-3 py-2 md:max-h-80">
          <pre className="text-sm leading-relaxed break-words whitespace-pre-wrap font-sans text-foreground md:text-xs">
            {preenchido}
          </pre>
        </div>
      </div>

      <label className="flex items-start gap-3 py-1 text-sm md:gap-2 md:py-0">
        <Checkbox
          checked={aceito}
          onCheckedChange={(checked) => onAceitar(!!checked)}
          className="mt-0.5"
        />
        <span>
          Li o contrato acima e concordo com todas as suas cláusulas. Ao enviar, receberei o
          documento para assinatura eletrônica.
        </span>
      </label>
    </div>
  );
}
