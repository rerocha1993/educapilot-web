"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Smartphone } from "lucide-react";

import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { hojeIsoBrasilia } from "@/lib/format/date";
import { somarDias } from "@/lib/rh/ponto-formatar";
import { useMarcacoes, type Marcacao } from "@/lib/rh/use-marcacoes";
import { ROTULO_DA_SITUACAO, SITUACOES_DA_BATIDA, type SituacaoDaBatida } from "@/lib/rh/use-meu-ponto";
import { usePodeEscreverNoRh } from "@/lib/rh/use-pode-escrever";

import { CartaoDaMarcacao } from "./cartao-da-marcacao";
import { ErroDeCarga } from "./campo";
import { DialogAjusteDeBatida } from "./dialog-ajuste-de-batida";
import { SeletorDeFuncionario, TODOS_OS_FUNCIONARIOS } from "./seletor-de-funcionario";

const TODAS = "todas";

/**
 * Batidas do dia (hoje por padrão), com filtro de dia, funcionário e situação. Cada batida é um
 * cartão com foto, distância da escola e aparelho; as que esperam decisão ganham Aprovar e Recusar.
 */
export function PainelDeBatidas() {
  const podeEscrever = usePodeEscreverNoRh();
  const hoje = hojeIsoBrasilia();
  const [data, setData] = useState(hoje);
  const [funcionario, setFuncionario] = useState(TODOS_OS_FUNCIONARIOS);
  const [situacao, setSituacao] = useState<SituacaoDaBatida | typeof TODAS>(TODAS);
  const [ajustando, setAjustando] = useState<{ original: Marcacao | null } | null>(null);

  const { data: marcacoes, isLoading, isError, refetch } = useMarcacoes({
    data,
    funcionarioId: funcionario === TODOS_OS_FUNCIONARIOS ? null : funcionario,
    situacao: situacao === TODAS ? null : situacao,
  });

  const aguardando = (marcacoes ?? []).filter((m) => m.situacao === "Pendente").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
          {/* Dia: setas e o campo de data. */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Dia anterior"
              onClick={() => setData(somarDias(data, -1))}
            >
              <ChevronLeft />
            </Button>
            <Input
              type="date"
              aria-label="Dia"
              value={data}
              max={hoje}
              onChange={(e) => e.target.value && setData(e.target.value)}
              className="w-full md:w-40"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Próximo dia"
              disabled={data >= hoje}
              onClick={() => setData(somarDias(data, 1))}
            >
              <ChevronRight />
            </Button>
            {data !== hoje && (
              <Button type="button" variant="ghost" onClick={() => setData(hoje)}>
                Hoje
              </Button>
            )}
          </div>

          <SeletorDeFuncionario
            valor={funcionario}
            onChange={setFuncionario}
            apenasAtivos={false}
            rotuloDeTodos="Todos os funcionários"
          />

          <Select value={situacao} onValueChange={(v) => v && setSituacao(v as SituacaoDaBatida | typeof TODAS)}>
            <SelectTrigger aria-label="Situação" className="w-full md:w-52">
              <SelectValue>{() => (situacao === TODAS ? "Todas as situações" : ROTULO_DA_SITUACAO[situacao])}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value={TODAS}>Todas as situações</SelectItem>
              {SITUACOES_DA_BATIDA.map((s) => (
                <SelectItem key={s} value={s}>
                  {ROTULO_DA_SITUACAO[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {podeEscrever && (
          <Button variant="outline" onClick={() => setAjustando({ original: null })}>
            <Plus />
            Lançar ajuste
          </Button>
        )}
      </div>

      {isError && <ErroDeCarga texto="Não foi possível carregar as batidas." onTentar={() => refetch()} />}

      {isLoading && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      )}

      {marcacoes && marcacoes.length === 0 && (
        <EstadoVazio
          icone={<Smartphone />}
          titulo="Nenhuma batida neste filtro"
          texto={
            data === hoje
              ? "Quando a equipe bater o ponto pelo celular, as batidas aparecem aqui."
              : "Não há batidas neste dia com esse filtro."
          }
        />
      )}

      {marcacoes && marcacoes.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            {marcacoes.length} {marcacoes.length === 1 ? "batida" : "batidas"}
            {aguardando > 0 && ` · ${aguardando} aguardando aprovação`}
          </p>
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {marcacoes.map((m) => (
              <CartaoDaMarcacao
                key={m.id}
                marcacao={m}
                podeEscrever={podeEscrever}
                onAjustar={(original) => setAjustando({ original })}
              />
            ))}
          </div>
        </>
      )}

      {ajustando && (
        <DialogAjusteDeBatida original={ajustando.original} dataInicial={data} onFechar={() => setAjustando(null)} />
      )}
    </div>
  );
}
