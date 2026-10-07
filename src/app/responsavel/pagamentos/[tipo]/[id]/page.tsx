"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { copiarTexto } from "@/components/relacionamento/dialog-qr-do-pix";
import {
  AcoesDoPagamento,
  ChipDoTipoDePagamento,
  VencimentoDoPagamento,
} from "@/components/relacionamento/portal/pagamentos";
import { ErroDoPortal } from "@/components/relacionamento/portal/comum";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarMoeda } from "@/lib/rh/formatar";
import { usePagamentoDoPortal, type ItemDePagamento } from "@/lib/relacionamento/use-portal-pagamentos";
import { cn } from "@/lib/utils";

export default function PagamentoDoResponsavelPage() {
  const { tipo, id } = useParams<{ tipo: string; id: string }>();
  const { data, isLoading, isError, refetch } = usePagamentoDoPortal(tipo, id);

  return (
    <>
      <Link
        href="/responsavel/pagamentos"
        className="-ml-2 inline-flex min-h-11 w-max items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ChevronLeft aria-hidden className="size-4" /> Pagamentos
      </Link>

      {isLoading && (
        <>
          <Skeleton className="h-10 w-3/4 rounded-lg" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </>
      )}

      {isError && <ErroDoPortal texto="Não foi possível abrir este pagamento." onTentar={() => refetch()} />}

      {data && <Conteudo item={data} />}
    </>
  );
}

function origemDoQr(base64: string): string {
  return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
}

function Conteudo({ item }: { item: ItemDePagamento }) {
  const paga = item.status === "Paga";
  const vencida = item.status === "Vencida";

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <ChipDoTipoDePagamento tipo={item.tipo} className="self-start" />
        <h1 className="font-heading text-[clamp(20px,5.5vw,24px)] leading-tight font-semibold tracking-[-.03em] break-words">
          {item.descricao}
        </h1>
        {item.alunoNome && <p className="text-sm text-muted-foreground">{item.alunoNome}</p>}
      </div>

      <section
        aria-label="Valor e situação"
        className={cn(
          "flex flex-col gap-1 rounded-xl border p-4",
          vencida ? "border-destructive-border bg-destructive-soft" : "border-border bg-card"
        )}
      >
        <p className="font-mono text-[28px] leading-tight font-semibold tabular-nums">{formatarMoeda(item.valor)}</p>
        <p className="text-sm font-semibold">{paga ? "Pago" : vencida ? "Vencido" : "Em aberto"}</p>
        <VencimentoDoPagamento item={item} />
      </section>

      {!paga && <AcoesDoPagamento item={item} />}

      {!paga && item.pixQrCodeBase64 && (
        <section aria-label="Pix" className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4">
          <Image
            src={origemDoQr(item.pixQrCodeBase64)}
            alt={`QR code do Pix de ${item.descricao}`}
            width={224}
            height={224}
            unoptimized
            className="size-56 rounded-lg border border-border bg-white p-2"
          />
          <p className="text-[13px] text-muted-foreground">Aponte a câmera do app do seu banco para o QR.</p>
        </section>
      )}

      {!paga && item.pixCopiaECola && (
        <section aria-label="Pix copia e cola" className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold tracking-[.1em] text-muted-foreground uppercase">Pix copia e cola</p>
          <p className="line-clamp-3 font-mono text-xs break-all text-muted-foreground">{item.pixCopiaECola}</p>
          <button
            type="button"
            onClick={() => copiarTexto(item.pixCopiaECola ?? "", "Pix copia e cola copiado.")}
            className="min-h-11 self-start text-sm font-semibold text-primary underline"
          >
            Copiar código
          </button>
        </section>
      )}
    </>
  );
}
