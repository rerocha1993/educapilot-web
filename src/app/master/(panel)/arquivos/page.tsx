"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CloudUpload, RefreshCw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  migracaoEmAndamento,
  useConferirMigracao,
  useIniciarMigracao,
  useProgressoDaMigracao,
  useStatusDoStorage,
} from "@/lib/master/use-storage";

function tamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Painel Master › Arquivos: tira os arquivos do disco do servidor e põe no Azure Blob sem parar o
 * site. Três passos, sempre nesta ordem: migrar (quantas vezes precisar, é idempotente), conferir
 * até não faltar nada, e só então trocar o provider no App Service (feito fora daqui).
 */
export default function ArquivosPage() {
  const status = useStatusDoStorage();
  const iniciar = useIniciarMigracao();
  const conferir = useConferirMigracao();
  const [migracaoId, setMigracaoId] = useState<string | null>(null);
  const progresso = useProgressoDaMigracao(migracaoId);

  const s = status.data;
  const emAndamento = migracaoEmAndamento(progresso.data);

  async function migrar(sobrescrever: boolean) {
    try {
      const r = await iniciar.mutateAsync(sobrescrever);
      setMigracaoId(r.id);
      toast.success("Migração iniciada. Acompanhe os números abaixo.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível iniciar a migração.");
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Arquivos</h1>
        <p className="text-sm text-muted-foreground">
          Fotos, anexos do RH, recibos e comprovantes saem do disco do servidor e vão para o Azure Blob, sem
          parar o site. Migre, confira e, quando não faltar nada, troque o provider no App Service.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Situação atual</h2>
          <Button variant="ghost" size="sm" onClick={() => void status.refetch()} disabled={status.isFetching}>
            <RefreshCw className="size-4" /> Atualizar
          </Button>
        </div>
        {status.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : status.isError || !s ? (
          <p className="text-sm text-destructive">Não foi possível ler a situação do armazenamento.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Provider</dt>
              <dd className="font-medium">
                <Badge variant={s.provider === "AzureBlob" ? "default" : "secondary"}>{s.provider}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Blob configurado</dt>
              <dd className="font-medium">{s.blobConfigurado ? `Sim · ${s.container}` : `Não${s.avisoDoBlob ? ` · ${s.avisoDoBlob}` : ""}`}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Arquivos no disco</dt>
              <dd className="font-medium tabular-nums">{s.arquivosNoDisco}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tamanho</dt>
              <dd className="font-medium tabular-nums">{tamanho(s.bytesNoDisco)}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-1 font-semibold">1. Migrar para o Blob</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Copia o que ainda não está no Blob. Pode rodar quantas vezes quiser: o que já foi copiado com o mesmo
          tamanho é ignorado.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void migrar(false)} disabled={iniciar.isPending || emAndamento || !s?.blobConfigurado}>
            <CloudUpload className="size-4" /> Migrar agora
          </Button>
          <Button variant="outline" onClick={() => void migrar(true)} disabled={iniciar.isPending || emAndamento || !s?.blobConfigurado}>
            Migrar sobrescrevendo tudo
          </Button>
        </div>
        {progresso.data && (
          <div className="mt-4 rounded-lg border border-border bg-muted px-4 py-3 text-sm">
            <div className="mb-1 font-medium">{emAndamento ? "Migrando…" : "Migração concluída"}</div>
            <div className="grid grid-cols-2 gap-2 tabular-nums sm:grid-cols-4">
              <span>Total: {progresso.data.total}</span>
              <span>Copiados: {progresso.data.copiados}</span>
              <span>Ignorados: {progresso.data.ignorados}</span>
              <span>Erros: {progresso.data.comErro}</span>
            </div>
            {(progresso.data.erro || progresso.data.resultado?.erroGeral) && (
              <p className="mt-2 text-destructive">{progresso.data.erro ?? progresso.data.resultado?.erroGeral}</p>
            )}
            {progresso.data.resultado && progresso.data.resultado.erros.length > 0 && (
              <ul className="mt-2 max-h-40 overflow-auto font-mono text-xs">
                {progresso.data.resultado.erros.slice(0, 50).map((e) => (
                  <li key={e.caminho}>
                    {e.caminho}: {e.erro}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-1 font-semibold">2. Conferir</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Compara disco e Blob. Repita migrar e conferir até &ldquo;faltando&rdquo; e &ldquo;diferentes&rdquo; ficarem em zero.
        </p>
        <Button variant="outline" onClick={() => conferir.mutate()} disabled={conferir.isPending || emAndamento}>
          <ShieldCheck className="size-4" /> Conferir agora
        </Button>
        {conferir.isError && (
          <p className="mt-2 text-sm text-destructive">
            {conferir.error instanceof Error ? conferir.error.message : "Não foi possível conferir."}
          </p>
        )}
        {conferir.data && (
          <div className="mt-4 rounded-lg border border-border bg-muted px-4 py-3 text-sm">
            <div className="grid grid-cols-2 gap-2 tabular-nums sm:grid-cols-4">
              <span>No disco: {conferir.data.noDisco}</span>
              <span>No Blob: {conferir.data.noBlob}</span>
              <span>Faltando: {conferir.data.faltando.length}</span>
              <span>Diferentes: {conferir.data.diferentes.length}</span>
            </div>
            {conferir.data.erroGeral && <p className="mt-2 text-destructive">{conferir.data.erroGeral}</p>}
            {conferir.data.faltando.length === 0 && conferir.data.diferentes.length === 0 && !conferir.data.erroGeral && (
              <p className="mt-2 font-medium text-success">
                Tudo copiado. Pode trocar o provider para AzureBlob no App Service e reiniciar a API.
              </p>
            )}
            {(conferir.data.faltando.length > 0 || conferir.data.diferentes.length > 0) && (
              <ul className="mt-2 max-h-40 overflow-auto font-mono text-xs">
                {[...conferir.data.faltando, ...conferir.data.diferentes].slice(0, 50).map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
        <h2 className="mb-1 font-semibold text-foreground">3. Trocar o provider</h2>
        Feito no App Service da API: <code>Storage__Provider=AzureBlob</code> e reiniciar. Depois, abra uma foto do
        mural e um documento do RH para conferir. Mantenha o disco por duas semanas antes de apagar.
      </section>
    </div>
  );
}
