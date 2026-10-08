"use client";

import { useMemo, useState } from "react";
import { Search, Users, X } from "lucide-react";

import { Numero } from "@/components/finance/projetos/comum";
import { CartaoDePagamento } from "@/components/relacionamento/portal/pagamentos";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGuardians, type GuardianDto } from "@/lib/finance/use-guardians";
import { formatarMoeda } from "@/lib/rh/formatar";
import { usePagamentosDaFamiliaNaEscola } from "@/lib/relacionamento/use-pagamentos";

const MAXIMO_DE_RESULTADOS = 8;

const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

function alunosDe(g: GuardianDto): string {
  return (g.vinculos ?? [])
    .map((v) => v.studentName)
    .filter((n): n is string => !!n)
    .join(", ");
}

/** Escolhe um responsável e mostra o que a família dele vê no portal: em aberto e pagos. */
export function AbaPorFamilia() {
  const { data: responsaveis, isLoading, isError, refetch } = useGuardians();
  const [busca, setBusca] = useState("");
  const [escolhido, setEscolhido] = useState<GuardianDto | null>(null);

  const resultados = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (termo.length < 2) return [];
    return (responsaveis ?? [])
      .filter((g) => normalizar(g.fullName ?? "").includes(termo) || normalizar(alunosDe(g)).includes(termo))
      .slice(0, MAXIMO_DE_RESULTADOS);
  }, [responsaveis, busca]);

  return (
    <div className="grid gap-4">
      <p className="max-w-[620px] text-sm text-muted-foreground">
        Escolha um responsável para ver o que a família dele vê no portal: o que está em aberto, o que foi pago e os links
        de pagamento. Serve para atender quem liga perguntando.
      </p>

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar os responsáveis." onTentar={() => refetch()} />
      ) : (
        <div className="grid max-w-xl gap-2">
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Buscar responsável pelo nome ou pelo aluno"
              className="pl-8"
              placeholder={isLoading ? "Carregando responsáveis..." : "Buscar responsável ou aluno"}
              value={busca}
              disabled={isLoading}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          {busca.trim().length >= 2 && (
            <ul aria-label="Responsáveis encontrados" className="grid gap-0.5 rounded-lg border border-border bg-card p-1.5">
              {resultados.length === 0 ? (
                <li className="px-2 py-2 text-[13px] text-muted-foreground">Nenhum responsável encontrado.</li>
              ) : (
                resultados.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      aria-pressed={escolhido?.id === g.id}
                      onClick={() => {
                        setEscolhido(g);
                        setBusca("");
                      }}
                      className="flex min-h-11 w-full flex-col items-start rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:min-h-9"
                    >
                      <span className="font-medium break-words">{g.fullName}</span>
                      {alunosDe(g) && <span className="text-xs break-words text-muted-foreground">{alunosDe(g)}</span>}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}

      {escolhido ? (
        <Familia responsavel={escolhido} onLimpar={() => setEscolhido(null)} />
      ) : (
        !isError && (
          <EstadoVazio
            icone={<Users />}
            titulo="Nenhuma família escolhida"
            texto="Digite o nome do responsável ou do aluno para ver os pagamentos."
            textoClassName="max-w-[340px]"
          />
        )
      )}
    </div>
  );
}

function Familia({ responsavel, onLimpar }: { responsavel: GuardianDto; onLimpar: () => void }) {
  const { data, isLoading, isError, refetch } = usePagamentosDaFamiliaNaEscola(responsavel.id);

  return (
    <section aria-label={`Pagamentos de ${responsavel.fullName}`} className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-[17px] font-semibold break-words">{responsavel.fullName}</h2>
          {alunosDe(responsavel) && <p className="text-[13px] break-words text-muted-foreground">{alunosDe(responsavel)}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={onLimpar}>
          <X />
          Trocar
        </Button>
      </div>

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar os pagamentos desta família." onTentar={() => refetch()} />
      ) : isLoading || !data ? (
        <div className="grid gap-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <div className="grid max-w-xl grid-cols-3 gap-4 rounded-xl border border-border bg-card p-4">
            <Numero rotulo="Em aberto" valor={formatarMoeda(data.resumo.totalEmAberto)} />
            <Numero rotulo="Cobranças abertas" valor={String(data.resumo.quantidadeEmAberto)} />
            <Numero rotulo="Vencidas" valor={String(data.resumo.vencidas)} tom={data.resumo.vencidas > 0 ? "danger" : undefined} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid content-start gap-2">
              <h3 className="font-heading text-sm font-semibold">Em aberto</h3>
              {data.emAberto.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border-dashed bg-card px-4 py-5 text-center text-[13px] text-muted-foreground">
                  Nada em aberto. A família está em dia.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {data.emAberto.map((i) => (
                    <li key={`${i.tipo}-${i.id}`}>
                      <CartaoDePagamento item={i} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid content-start gap-2">
              <h3 className="font-heading text-sm font-semibold">Pagos</h3>
              {data.pagos.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border-dashed bg-card px-4 py-5 text-center text-[13px] text-muted-foreground">
                  Nenhum pagamento recente.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {data.pagos.map((i) => (
                    <li key={`${i.tipo}-${i.id}`}>
                      <CartaoDePagamento item={i} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
