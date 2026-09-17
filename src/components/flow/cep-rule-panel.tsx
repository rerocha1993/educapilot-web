"use client";

import { MapPin, TriangleAlert } from "lucide-react";
import { CEP_PARTE_OPTIONS } from "@/lib/flow/cep";
import { decodeFieldConfig } from "@/lib/flow/use-form-fields";
import type { FormFieldDto } from "@/lib/flow/use-forms";

/**
 * Mostra, em Automações, o que o CEP preenche.
 *
 * Só leitura: a escolha vive em cada campo que recebe uma parte do endereço, e é lá que se muda.
 * Duplicar a edição aqui daria dois caminhos para o mesmo dado; o que faltava era enxergar a regra
 * inteira de uma vez, sem abrir campo por campo para descobrir quem recebe o quê.
 */
export function CepRulePanel({ campos }: { campos: FormFieldDto[] }) {
  const campoCep = campos.find((c) => c.tipo === "cep");

  const destinos = campos
    .map((campo) => ({ campo, parte: decodeFieldConfig(campo.config).preenchidoPeloCep }))
    .filter((d) => !!d.parte);

  // Nem campo de CEP, nem destino: o formulário não trata endereço, e um painel vazio só ocuparia
  // espaço.
  if (!campoCep && destinos.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <MapPin className="size-4 shrink-0 text-primary" />
        <h3 className="font-heading text-sm font-semibold">Endereço pelo CEP</h3>
      </div>

      {!campoCep && (
        <p className="mt-2 flex items-start gap-2 rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          Há campos esperando o endereço, mas o formulário não tem nenhum campo do tipo
          &quot;CEP&quot; — sem ele nada é preenchido. Crie um em Campos.
        </p>
      )}

      {campoCep && destinos.length === 0 && (
        <p className="mt-2 flex items-start gap-2 rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          O campo <strong>{campoCep.label}</strong> busca o endereço, mas nenhum campo está marcado
          para receber. Abra o campo de endereço e escolha &quot;Preencher pelo CEP&quot;.
        </p>
      )}

      {campoCep && destinos.length > 0 && (
        <>
          <p className="mt-1 text-xs text-muted-foreground">
            Ao preencher <strong>{campoCep.label}</strong>, estes campos são preenchidos sozinhos:
          </p>

          <ul className="mt-2 flex flex-col gap-1.5">
            {destinos.map(({ campo, parte }) => (
              <li key={campo.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 break-words">{campo.label}</span>
                <span className="text-xs text-muted-foreground">
                  {CEP_PARTE_OPTIONS.find((o) => o.value === parte)?.label ?? parte}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs text-muted-foreground">
            Para mudar, abra o campo em <strong>Campos</strong> e altere &quot;Preencher pelo
            CEP&quot;.
          </p>
        </>
      )}
    </div>
  );
}
