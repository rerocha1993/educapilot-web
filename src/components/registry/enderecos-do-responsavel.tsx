"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CepInput } from "@/components/flow/cep-input";
import type { EnderecoCep } from "@/lib/flow/cep";
import {
  useEnderecosDoResponsavel,
  useRemoverEndereco,
  useSalvarEndereco,
  type Endereco,
} from "@/lib/registry/use-enderecos";

const VAZIO = {
  id: undefined as string | undefined,
  tipo: "Residencial",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

/**
 * Endereços de um responsável.
 *
 * Endereço passou a existir no cadastro em 2026-09: antes ele só vivia dentro da resposta do
 * formulário, o que servia como registro do que a família declarou mas não para emitir cobrança,
 * nem para a próxima rematrícula já vir preenchida.
 *
 * O CEP busca aqui pelo mesmo componente do formulário público — quem cadastra à mão na secretaria
 * merece o mesmo atalho que a família tem.
 */
export function EnderecosDoResponsavel({ guardianId }: { guardianId: string }) {
  const { data: enderecos, isLoading } = useEnderecosDoResponsavel(guardianId);
  const salvar = useSalvarEndereco();
  const remover = useRemoverEndereco();

  const [form, setForm] = useState<typeof VAZIO | null>(null);

  function abrir(endereco?: Endereco) {
    setForm(
      endereco
        ? {
            id: endereco.id,
            tipo: endereco.tipo,
            cep: endereco.cep ?? "",
            logradouro: endereco.logradouro ?? "",
            numero: endereco.numero ?? "",
            complemento: endereco.complemento ?? "",
            bairro: endereco.bairro ?? "",
            cidade: endereco.cidade ?? "",
            uf: endereco.uf ?? "",
          }
        : { ...VAZIO }
    );
  }

  function aplicarCep(endereco: EnderecoCep) {
    // Número e complemento ficam como estão: não vêm do CEP, e apagá-los faria a pessoa
    // redigitar o que já tinha preenchido.
    setForm((atual) =>
      atual
        ? {
            ...atual,
            logradouro: endereco.logradouro || atual.logradouro,
            bairro: endereco.bairro || atual.bairro,
            cidade: endereco.cidade || atual.cidade,
            uf: endereco.uf || atual.uf,
          }
        : atual
    );
  }

  async function handleSalvar() {
    if (!form) return;
    try {
      await salvar.mutateAsync({ ...form, guardianId });
      toast.success("Endereço salvo.");
      setForm(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar o endereço.");
    }
  }

  async function handleRemover(id: string) {
    try {
      await remover.mutateAsync(id);
      toast.success("Endereço removido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover.");
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <MapPin className="size-4 text-primary" />
          Endereços
        </p>
        {!form && (
          <Button variant="outline" size="sm" onClick={() => abrir()}>
            + Novo
          </Button>
        )}
      </div>

      {isLoading && <Skeleton className="h-10 w-full" />}

      {!isLoading && !form && (enderecos ?? []).length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhum endereço cadastrado. Ele também é preenchido sozinho quando a gestão aprova uma
          matrícula com endereço no formulário.
        </p>
      )}

      {!form &&
        (enderecos ?? []).map((e) => (
          <div
            key={e.id}
            className="flex items-start justify-between gap-2 rounded-md border border-border px-3 py-2"
          >
            <button
              type="button"
              onClick={() => abrir(e)}
              className="min-w-0 flex-1 text-left text-sm break-words hover:underline"
            >
              <span className="text-xs text-muted-foreground">{e.tipo}</span>
              <br />
              {e.resumo || "Endereço em branco"}
            </button>
            <Button variant="ghost" size="icon-sm" className="shrink-0" onClick={() => handleRemover(e.id)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}

      {form && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">CEP</Label>
            <CepInput
              value={form.cep}
              onChange={(v) => setForm((a) => (a ? { ...a, cep: v } : a))}
              onEndereco={aplicarCep}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex min-w-0 flex-[3] flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Rua</Label>
              <Input
                value={form.logradouro}
                onChange={(e) => setForm((a) => (a ? { ...a, logradouro: e.target.value } : a))}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Número</Label>
              <Input
                value={form.numero}
                onChange={(e) => setForm((a) => (a ? { ...a, numero: e.target.value } : a))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Complemento</Label>
              <Input
                value={form.complemento}
                onChange={(e) => setForm((a) => (a ? { ...a, complemento: e.target.value } : a))}
              />
            </div>
            <div className="flex flex-1 flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Bairro</Label>
              <Input
                value={form.bairro}
                onChange={(e) => setForm((a) => (a ? { ...a, bairro: e.target.value } : a))}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex min-w-0 flex-[3] flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Cidade</Label>
              <Input
                value={form.cidade}
                onChange={(e) => setForm((a) => (a ? { ...a, cidade: e.target.value } : a))}
              />
            </div>
            <div className="flex w-20 flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">UF</Label>
              <Input
                maxLength={2}
                value={form.uf}
                onChange={(e) => setForm((a) => (a ? { ...a, uf: e.target.value } : a))}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSalvar} disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : "Salvar endereço"}
            </Button>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
