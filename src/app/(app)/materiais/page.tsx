"use client";

import { useState } from "react";
import { Search, Package, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { useMaterials } from "@/lib/tasks/use-materials";

export default function MateriaisPage() {
  const { data: materials, isLoading, isError } = useMaterials();
  const [search, setSearch] = useState("");

  const filtered = (materials ?? []).filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      <RotinaNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Materiais</h1>
          <p className="text-sm text-muted-foreground">Catálogo de materiais da escola.</p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Eye className="size-3" />
          Somente leitura
        </Badge>
      </div>

      <div className="relative w-72">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou categoria"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 pl-8"
        />
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os materiais.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-b border-border px-4 py-3 last:border-0">
              <Skeleton className="h-5 w-full" />
            </div>
          ))}

        {!isLoading && filtered.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nenhum material encontrado.
          </p>
        )}

        {filtered.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Package className="size-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{m.name}</p>
              <p className="text-xs text-muted-foreground">{m.type}</p>
            </div>
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              {m.availableQuantity}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
