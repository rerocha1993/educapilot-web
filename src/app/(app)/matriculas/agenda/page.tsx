"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { MatriculasNav } from "@/components/matriculas/matriculas-nav";
import { getSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import type { AgendaDeVisitas, DiaSemVisita, JanelaDeVisita } from "@/lib/matriculas/tipos";
import { dataHoraCurta } from "@/lib/matriculas/rotulos";
import { useAgendaDeVisitas, useSalvarAgenda } from "@/lib/matriculas/use-agenda";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function AgendaPage() {
  const { data, isLoading, isError } = useAgendaDeVisitas();

  return (
    <div className="flex flex-col gap-5">
      <MatriculasNav />
      <div>
        <p className="text-[11.5px] font-bold uppercase tracking-[.16em] text-action">Matrículas</p>
        <h1 className="mt-1 font-heading text-[clamp(24px,3vw,32px)] font-semibold leading-[1.1] tracking-[-.03em]">Agenda de visitas</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Quando a escola recebe famílias para conhecer. É desta agenda que a assistente oferece horários e marca a visita
          sozinha, sem marcar dois no mesmo horário.
        </p>
      </div>
      {isError && (
        <div className="rounded-2xl border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar a agenda.
        </div>
      )}
      {isLoading && <Skeleton className="h-96 w-full max-w-5xl rounded-[24px]" />}
      {data && <Formulario key={JSON.stringify([data.dias, data.janelas, data.diasSemVisita, data.antecedenciaHoras])} agenda={data} />}
    </div>
  );
}

function Formulario({ agenda }: { agenda: AgendaDeVisitas }) {
  const ehGestao = getSession()?.role === "Admin";
  const salvar = useSalvarAgenda();
  const [dias, setDias] = useState<number[]>(agenda.dias);
  const [janelas, setJanelas] = useState<JanelaDeVisita[]>(agenda.janelas);
  const [semVisita, setSemVisita] = useState<DiaSemVisita[]>(agenda.diasSemVisita);
  const [antecedencia, setAntecedencia] = useState(String(agenda.antecedenciaHoras));
  const [horizonte, setHorizonte] = useState(String(agenda.horizonteDias));

  const trocarJanela = (i: number, j: Partial<JanelaDeVisita>) => setJanelas(janelas.map((x, k) => (k === i ? { ...x, ...j } : x)));
  const trocarDia = (i: number, d: Partial<DiaSemVisita>) => setSemVisita(semVisita.map((x, k) => (k === i ? { ...x, ...d } : x)));

  async function gravar() {
    try {
      await salvar.mutateAsync({
        dias,
        janelas,
        diasSemVisita: semVisita.map((d) => ({ ...d, data: paraApi(d.data) })),
        antecedenciaHoras: Number(antecedencia),
        horizonteDias: Number(horizonte),
      });
      toast.success("Agenda salva. A assistente já oferece os horários novos.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar a agenda.");
    }
  }

  return (
    <div className="grid max-w-5xl gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="flex flex-col gap-4">
        {!agenda.configurada && (
          <p className="rounded-2xl bg-action-soft px-4 py-3 text-[13.5px]">
            Ainda não salva. Enquanto isso, a assistente convida para a visita mas não marca sozinha: a equipe combina o horário.
            Confira a sugestão abaixo e salve.
          </p>
        )}

        <Bloco titulo="Quando a escola recebe">
          <div role="group" aria-label="Dias da semana" className="flex flex-wrap gap-1.5">
            {DIAS.map((d, i) => {
              const ligado = dias.includes(i);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={ligado}
                  disabled={!ehGestao}
                  onClick={() => setDias(ligado ? dias.filter((x) => x !== i) : [...dias, i].sort())}
                  className={cn(
                    "min-h-9 min-w-12 rounded-xl px-3 text-sm font-medium transition-colors",
                    ligado ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <ul className="mt-4 flex flex-col gap-2">
            {janelas.map((j, i) => (
              <li key={i} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-end gap-2 rounded-2xl border border-border p-3">
                <Campo id={`j-nome-${i}`} rotulo="Período">
                  <Input id={`j-nome-${i}`} value={j.nome} maxLength={30} disabled={!ehGestao} onChange={(e) => trocarJanela(i, { nome: e.target.value })} />
                </Campo>
                <Campo id={`j-ini-${i}`} rotulo="Das">
                  <Hora id={`j-ini-${i}`} valor={j.inicio} max={23} disabled={!ehGestao} mudar={(v) => trocarJanela(i, { inicio: v })} />
                </Campo>
                <Campo id={`j-fim-${i}`} rotulo="Às">
                  <Hora id={`j-fim-${i}`} valor={j.fim} max={24} disabled={!ehGestao} mudar={(v) => trocarJanela(i, { fim: v })} />
                </Campo>
                <Campo id={`j-vagas-${i}`} rotulo="Visitas">
                  <Input
                    id={`j-vagas-${i}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={50}
                    className="w-20 font-mono tabular-nums"
                    value={j.vagas}
                    disabled={!ehGestao}
                    onChange={(e) => trocarJanela(i, { vagas: Number(e.target.value) })}
                  />
                </Campo>
                {ehGestao ? (
                  <Button variant="ghost" size="icon" aria-label={`Remover o período ${j.nome}`} onClick={() => setJanelas(janelas.filter((_, k) => k !== i))}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                ) : (
                  <span />
                )}
              </li>
            ))}
          </ul>
          {ehGestao && (
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setJanelas([...janelas, { nome: "", inicio: 14, fim: 17, vagas: 2 }])}>
              <Plus className="size-4" aria-hidden /> Período
            </Button>
          )}
          <p className="mt-3 text-[12.5px] text-muted-foreground">
            As visitas de cada período se espalham por ele: das 9h às 13h com 3 visitas dá um horário a cada uma hora e meia.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Campo id="ag-antecedencia" rotulo="Antecedência mínima" dica="Horas entre marcar e a visita.">
              <Input id="ag-antecedencia" type="number" inputMode="numeric" min={0} max={168} className="w-24 font-mono tabular-nums" value={antecedencia} disabled={!ehGestao} onChange={(e) => setAntecedencia(e.target.value)} />
            </Campo>
            <Campo id="ag-horizonte" rotulo="Oferecer até" dica="Dias à frente que a assistente olha.">
              <Input id="ag-horizonte" type="number" inputMode="numeric" min={1} max={120} className="w-24 font-mono tabular-nums" value={horizonte} disabled={!ehGestao} onChange={(e) => setHorizonte(e.target.value)} />
            </Campo>
          </div>
        </Bloco>

        <Bloco titulo="Dias sem visita">
          <p className="-mt-2 mb-3 text-[13px] text-muted-foreground">
            Os feriados nacionais, o Carnaval, a Sexta-feira Santa e o Corpus Christi o EducaPilot já sabe. Aqui entram os da sua
            cidade e os dias em que a escola fecha. Dia/mês repete todo ano; com o ano, vale só naquele dia.
          </p>
          <ul className="flex flex-col gap-2">
            {semVisita.map((d, i) => (
              <li key={i} className="grid grid-cols-[8rem_1fr_auto] items-center gap-2">
                <Input aria-label="Data" placeholder="19/02" value={paraTela(d.data)} disabled={!ehGestao} onChange={(e) => trocarDia(i, { data: e.target.value })} />
                <Input aria-label="Nome" placeholder="Aniversário da cidade" value={d.nome} maxLength={60} disabled={!ehGestao} onChange={(e) => trocarDia(i, { nome: e.target.value })} />
                {ehGestao && (
                  <Button variant="ghost" size="icon" aria-label={`Remover ${d.nome}`} onClick={() => setSemVisita(semVisita.filter((_, k) => k !== i))}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {ehGestao && (
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setSemVisita([...semVisita, { data: "", nome: "" }])}>
              <Plus className="size-4" aria-hidden /> Dia
            </Button>
          )}
        </Bloco>

        {ehGestao && (
          <div>
            <Button variant="action" onClick={gravar} disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : "Salvar agenda"}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Bloco titulo="Próximas visitas">
          {agenda.proximasVisitas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma visita marcada.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {agenda.proximasVisitas.map((v) => (
                <li key={v.leadId} className="flex items-center gap-3 py-2.5 first:pt-0">
                  <CalendarClock className="size-4 shrink-0 text-action" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <Link href={`/matriculas/conversas?lead=${v.leadId}`} className="block truncate text-sm font-semibold hover:underline">
                      {v.nomeResponsavel}
                    </Link>
                    <p className="truncate text-[12.5px] text-muted-foreground">{[v.nomeCrianca, v.turmaNome].filter(Boolean).join(" · ") || "—"}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[12.5px] tabular-nums">{dataHoraCurta(v.visitaEm)}</span>
                </li>
              ))}
            </ul>
          )}
        </Bloco>

        <Bloco titulo="O que ela ofereceria agora">
          {agenda.horariosLivres.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum horário livre nos próximos dias.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {agenda.horariosLivres.map((h) => (
                <li key={h} className="first-letter:uppercase">
                  {h}
                </li>
              ))}
            </ul>
          )}
        </Bloco>
      </div>
    </div>
  );
}

/** "02-19" ou "2026-12-24" da API viram "19/02" e "24/12/2026" na tela, e o contrário ao salvar. */
function paraTela(data: string) {
  const anual = /^(\d{2})-(\d{2})$/.exec(data);
  if (anual) return `${anual[2]}/${anual[1]}`;
  const unica = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (unica) return `${unica[3]}/${unica[2]}/${unica[1]}`;
  return data;
}

function paraApi(texto: string) {
  const t = texto.trim();
  const anual = /^(\d{1,2})\/(\d{1,2})$/.exec(t);
  if (anual) return `${anual[2].padStart(2, "0")}-${anual[1].padStart(2, "0")}`;
  const unica = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (unica) return `${unica[3]}-${unica[2].padStart(2, "0")}-${unica[1].padStart(2, "0")}`;
  return t;
}

function Hora({ id, valor, max, disabled, mudar }: { id: string; valor: number; max: number; disabled: boolean; mudar: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <Input id={id} type="number" inputMode="numeric" min={0} max={max} className="w-16 font-mono tabular-nums" value={valor} disabled={disabled} onChange={(e) => mudar(Number(e.target.value))} />
      <span className="text-sm text-muted-foreground">h</span>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-[24px] border border-border bg-card p-5">
      <h2 className="mb-4 font-heading text-base font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

function Campo({ id, rotulo, dica, children }: { id: string; rotulo: string; dica?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <Label htmlFor={id} className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
        {rotulo}
      </Label>
      {children}
      {dica && <p className="text-[12px] text-muted-foreground">{dica}</p>}
    </div>
  );
}
