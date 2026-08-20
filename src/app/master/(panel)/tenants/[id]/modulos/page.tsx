"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/lib/master/use-tenants";
import {
  useModuleCatalog,
  useTenantActiveModules,
  useUpdateTenantModules,
} from "@/lib/master/use-modules";

export default function TenantModulosPage() {
  const params = useParams<{ id: string }>();
  const tenantId = params.id;

  const { data: tenant } = useTenant(tenantId);
  const { data: catalog, isLoading: loadingCatalog } = useModuleCatalog();
  const { data: activeModules, isLoading: loadingActive } = useTenantActiveModules(tenantId);
  const updateModules = useUpdateTenantModules(tenantId);

  const activeSlugsSet = new Set((activeModules ?? []).map((m) => m.slug));
  const isLoading = loadingCatalog || loadingActive;

  async function handleToggle(slug: string, checked: boolean) {
    const current = new Set(activeSlugsSet);
    if (checked) current.add(slug);
    else current.delete(slug);
    try {
      await updateModules.mutateAsync(Array.from(current));
      toast.success(checked ? "Módulo contratado." : "Módulo removido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar módulos.");
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div>
        <Link href="/master/tenants" className="text-xs text-muted-foreground hover:underline">
          ← Escolas
        </Link>
        <h1 className="font-heading text-xl font-bold">
          Módulos {tenant ? `· ${tenant.nomeFantasia}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          O menu do tenant é montado a partir daqui.
        </p>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {catalog
          ?.filter((m) => m.isActive)
          .map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div>
                <p className="font-medium">{m.displayName}</p>
                {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
              </div>
              <Switch
                checked={activeSlugsSet.has(m.slug)}
                onCheckedChange={(checked) => handleToggle(m.slug, checked)}
                disabled={updateModules.isPending}
              />
            </div>
          ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Estado &quot;Roadmap&quot; (módulo ainda não disponível pra contratar, do
        wireframe) não existe no backend — só liga/desliga entre os módulos ativos do
        catálogo (A4).
      </p>
    </div>
  );
}
