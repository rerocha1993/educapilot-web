"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateTenant } from "@/lib/master/use-tenants";

const EMPTY_FORM = {
  nomeFantasia: "",
  razaoSocial: "",
  cnpj: "",
  emailContato: "",
  telefone: "",
  monthlyFee: "",
  responsibleCpf: "",
  nomeAdministrador: "",
  emailAdministrador: "",
  senhaAdministrador: "",
};

export default function NovoTenantPage() {
  const router = useRouter();
  const createTenant = useCreateTenant();
  const [form, setForm] = useState(EMPTY_FORM);

  const canSubmit =
    form.nomeFantasia.trim() &&
    form.razaoSocial.trim() &&
    form.cnpj.trim() &&
    form.emailContato.trim() &&
    form.responsibleCpf.trim() &&
    form.nomeAdministrador.trim() &&
    form.emailAdministrador.trim() &&
    form.senhaAdministrador.trim();

  async function handleCreate() {
    if (!canSubmit) return;
    try {
      const result = await createTenant.mutateAsync({
        ...form,
        monthlyFee: Number(form.monthlyFee.replace(",", ".")) || 0,
      });
      toast.success("Escola criada.");
      router.push(`/master/tenants/${result.tenantId}/modulos`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar escola.");
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div>
        <Link href="/master/tenants" className="text-xs text-muted-foreground hover:underline">
          ← Escolas
        </Link>
        <h1 className="font-heading text-xl font-bold">Nova escola</h1>
        <p className="text-sm text-muted-foreground">
          Dados da escola e do administrador inicial (o backend cria os dois numa
          transação só).
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <h2 className="font-heading text-sm font-semibold">Dados da escola</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Nome fantasia</Label>
            <Input value={form.nomeFantasia} onChange={(e) => setForm((f) => ({ ...f, nomeFantasia: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Razão social</Label>
            <Input value={form.razaoSocial} onChange={(e) => setForm((f) => ({ ...f, razaoSocial: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">CNPJ</Label>
            <Input value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Mensalidade (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.monthlyFee}
              onChange={(e) => setForm((f) => ({ ...f, monthlyFee: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">E-mail de contato</Label>
            <Input
              type="email"
              value={form.emailContato}
              onChange={(e) => setForm((f) => ({ ...f, emailContato: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Telefone</Label>
            <Input value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">CPF do responsável (NF)</Label>
            <Input
              value={form.responsibleCpf}
              onChange={(e) => setForm((f) => ({ ...f, responsibleCpf: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <h2 className="font-heading text-sm font-semibold">Administrador inicial</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Nome</Label>
            <Input
              value={form.nomeAdministrador}
              onChange={(e) => setForm((f) => ({ ...f, nomeAdministrador: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">E-mail</Label>
            <Input
              type="email"
              value={form.emailAdministrador}
              onChange={(e) => setForm((f) => ({ ...f, emailAdministrador: e.target.value }))}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Senha inicial</Label>
            <Input
              type="password"
              value={form.senhaAdministrador}
              onChange={(e) => setForm((f) => ({ ...f, senhaAdministrador: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Subdomínio, etapas de ensino e seleção de módulos na criação (steps 1-2 do
        wireframe A2) não existem no backend — módulos são configurados depois, na
        tela de Módulos da escola.
      </p>

      <Button onClick={handleCreate} disabled={createTenant.isPending || !canSubmit} className="self-start">
        {createTenant.isPending ? "Criando..." : "Criar escola"}
      </Button>
    </div>
  );
}
