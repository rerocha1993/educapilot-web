"use client";

import { Database, TriangleAlert } from "lucide-react";
import { rotuloDoDestino } from "@/lib/registry/campos-do-cadastro";
import { decodeFieldConfig } from "@/lib/flow/use-form-fields";
import type { FormFieldDto } from "@/lib/flow/use-forms";

/**
 * Mostra, em Automações, o que volta para o cadastro.
 *
 * Antes disto, uma resposta de formulário ficava só na resposta: para saber o endereço de uma
 * família alguém abria o formulário preenchido. Agora as respostas marcadas entram na ficha, e
 * esta lista é o único lugar onde dá para ver a regra inteira sem abrir campo por campo.
 *
 * Só leitura: a marcação vive em cada campo, e é lá que se muda. Editar aqui também criaria dois
 * caminhos para o mesmo dado.
 */
export function RegistryRulePanel({ campos }: { campos: FormFieldDto[] }) {
  const destinos = campos
    .map((campo) => ({ campo, destino: decodeFieldConfig(campo.config).gravarEm }))
    .filter((d) => !!d.destino);

  const temContrato = campos.some((c) => c.tipo === "contrato");

  if (destinos.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Database className="size-4 shrink-0 text-primary" />
        <h3 className="font-heading text-sm font-semibold">Gravar no cadastro</h3>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        Quando a gestão <strong>aprova</strong>, estas respostas atualizam a ficha do responsável:
      </p>

      <ul className="mt-2 flex flex-col gap-1.5">
        {destinos.map(({ campo, destino }) => (
          <li key={campo.id} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 break-words">{campo.label}</span>
            <span className="text-xs text-muted-foreground">{rotuloDoDestino(destino)}</span>
          </li>
        ))}
      </ul>

      {/* Sem contrato não há aprovação, e é a aprovação que dispara a gravação — a marcação
          ficaria decorativa. */}
      {!temContrato && (
        <p className="mt-3 flex items-start gap-2 rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          Este formulário não tem contrato, e a gravação acontece na aprovação do contrato. Nada
          será gravado no cadastro.
        </p>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        A resposta original nunca muda — ela é o registro do que a família declarou e assinou. Para
        alterar o que grava, abra o campo em <strong>Campos</strong>.
      </p>
    </div>
  );
}
