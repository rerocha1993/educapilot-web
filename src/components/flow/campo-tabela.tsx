"use client";

import { cn } from "@/lib/utils";
import { decodeTabela, encodeTabela } from "@/lib/flow/use-form-fields";

/**
 * Campo "tabela": uma pergunta por linha, a mesma escala nas colunas, uma escolha por linha.
 *
 * Usado no preenchimento interno e no link público. No computador é a grade da anamnese em papel;
 * no celular vira uma lista — cinco colunas de bolinhas não cabem em 375px, e a família responde
 * pelo celular. Tocar de novo na escolha marcada desmarca, para quem clicou na linha errada.
 */
export function CampoTabela({
  linhas,
  colunas,
  value,
  onChange,
  disabled,
}: {
  linhas: string[];
  colunas: string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const respostas = decodeTabela(value);

  function escolher(linha: string, coluna: string) {
    const proximas = { ...respostas };
    if (proximas[linha] === coluna) delete proximas[linha];
    else proximas[linha] = coluna;
    onChange(encodeTabela(proximas));
  }

  if (linhas.length === 0 || colunas.length === 0) {
    return <p className="text-sm text-muted-foreground">Tabela sem linhas ou colunas configuradas.</p>;
  }

  return (
    <>
      {/* Celular: cada linha com a escala em botões. */}
      <div className="flex flex-col gap-3 md:hidden">
        {linhas.map((linha) => (
          <div key={linha} role="radiogroup" aria-label={linha} className="flex flex-col gap-1.5">
            <span className="text-sm font-medium break-words">{linha}</span>
            <div className="flex flex-wrap gap-1.5">
              {colunas.map((coluna) => {
                const marcada = respostas[linha] === coluna;
                return (
                  <button
                    key={coluna}
                    type="button"
                    role="radio"
                    aria-checked={marcada}
                    disabled={disabled}
                    onClick={() => escolher(linha, coluna)}
                    className={cn(
                      "min-h-10 rounded-lg border px-3 text-sm transition-colors",
                      marcada
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-card hover:bg-muted"
                    )}
                  >
                    {coluna}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Computador: a grade. */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="py-2" />
              {colunas.map((coluna) => (
                <th key={coluna} className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground">
                  {coluna}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha} role="radiogroup" aria-label={linha} className="border-t border-border">
                <td className="py-2 pr-3 break-words">{linha}</td>
                {colunas.map((coluna) => {
                  const marcada = respostas[linha] === coluna;
                  return (
                    <td key={coluna} className="px-2 py-2 text-center">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={marcada}
                        aria-label={`${linha}: ${coluna}`}
                        disabled={disabled}
                        onClick={() => escolher(linha, coluna)}
                        className={cn(
                          "inline-grid size-5 place-items-center rounded-full border transition-colors",
                          marcada ? "border-primary bg-primary" : "border-input bg-card hover:border-primary"
                        )}
                      >
                        {marcada && <span className="size-2 rounded-full bg-primary-foreground" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
