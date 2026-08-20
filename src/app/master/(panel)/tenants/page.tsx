"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTenants } from "@/lib/master/use-tenants";

export default function TenantsPage() {
  const { data: tenants, isLoading, isError } = useTenants();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Escolas (tenants)</h1>
          <p className="text-sm text-muted-foreground">
            {tenants ? `${tenants.length} escola${tenants.length === 1 ? "" : "s"}` : "—"}
          </p>
        </div>
        <Link href="/master/tenants/novo" className={buttonVariants({})}>
          + Nova escola
        </Link>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar as escolas.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Escola</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && tenants?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma escola cadastrada.
                </TableCell>
              </TableRow>
            )}

            {tenants?.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.nomeFantasia}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{t.cnpj}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.emailContato}</TableCell>
                <TableCell>
                  {t.isBlocked ? (
                    <Badge className="bg-destructive-soft text-destructive-soft-foreground">
                      Bloqueada
                    </Badge>
                  ) : t.ativo ? (
                    <Badge className="bg-success-soft text-success-soft-foreground">Ativa</Badge>
                  ) : (
                    <Badge variant="secondary">Inativa</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/master/tenants/${t.id}/modulos`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Módulos
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Subdomínio, plano e contagem de alunos do wireframe não existem no backend hoje
        (Tenant não tem esses campos) — não estão nesta tela.
      </p>
    </div>
  );
}
