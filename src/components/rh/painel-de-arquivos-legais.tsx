"use client";

import { useState } from "react";
import { Download, FileCheck, FileText, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { competenciaDeIso, formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import { limitesDoMes } from "@/lib/rh/formatar";
import { baixarAfd, baixarEspelho671, usePreviaDoAfd, type PreviaDoAfd } from "@/lib/rh/use-marcacoes";

import { Campo } from "./campo";
import { SeletorDeFuncionario } from "./seletor-de-funcionario";
import { SeletorDeMes } from "./seletor-de-mes";

/** Falha de rede do fetch não tem frase útil; o resto já vem em português do servidor. */
function fraseDoErro(e: unknown, padrao: string): string {
  if (e instanceof TypeError) return "Sem conexão com a internet. Conecte-se e tente de novo.";
  return e instanceof Error && e.message ? e.message : padrao;
}

/**
 * Arquivos legais da Portaria 671 do MTE: o AFD (arquivo de texto com todas as batidas do período,
 * que a fiscalização pode pedir) e o espelho de ponto de cada funcionário em PDF.
 */
export function PainelDeArquivosLegais() {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <SecaoDoAfd />
      <SecaoDoEspelho />
    </div>
  );
}

function SecaoDoAfd() {
  const hoje = hojeIsoBrasilia();
  const inicial = limitesDoMes(competenciaDeIso(hoje).ano, competenciaDeIso(hoje).mes);
  const [de, setDe] = useState(inicial.de);
  const [ate, setAte] = useState(inicial.ate);
  const [erro, setErro] = useState<string | null>(null);
  const [baixando, setBaixando] = useState(false);
  // A prévia vale para o período em que foi pedida; mudou a data, é preciso conferir de novo.
  const [previa, setPrevia] = useState<PreviaDoAfd | null>(null);
  const conferir = usePreviaDoAfd();

  const periodoValido = !!de && !!ate && de <= ate;
  const conferido = previa !== null && previa.de === de && previa.ate === ate;

  function mudarPeriodo(definir: (v: string) => void, valor: string) {
    definir(valor);
    setErro(null);
  }

  async function conferirAgora() {
    setErro(null);
    if (!periodoValido) return setErro("Informe o período; o dia final não pode ser antes do inicial.");
    try {
      setPrevia(await conferir.mutateAsync({ de, ate }));
    } catch (e) {
      setPrevia(null);
      setErro(fraseDoErro(e, "Não foi possível conferir o período."));
    }
  }

  async function baixarAgora() {
    setBaixando(true);
    try {
      await baixarAfd(de, ate);
      toast.success("AFD baixado.");
    } catch (e) {
      toast.error(fraseDoErro(e, "Não foi possível baixar o AFD."));
    } finally {
      setBaixando(false);
    }
  }

  return (
    <section className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="font-heading text-[15.5px] font-semibold">AFD — Arquivo Fonte de Dados</h2>
        <p className="mt-0.5 text-[13px] leading-[1.55] text-muted-foreground">
          O arquivo de texto com todas as batidas do período, no formato da Portaria 671. Confira antes de baixar.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Campo id="afd-de" rotulo="De">
          <Input id="afd-de" type="date" value={de} onChange={(e) => mudarPeriodo(setDe, e.target.value)} />
        </Campo>
        <Campo id="afd-ate" rotulo="Até">
          <Input id="afd-ate" type="date" value={ate} onChange={(e) => mudarPeriodo(setAte, e.target.value)} />
        </Campo>
      </div>

      {erro && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      )}

      {conferido && previa && (
        <div className="flex flex-col gap-2 rounded-lg bg-muted px-3.5 py-3 text-sm" role="status">
          <p className="flex items-center gap-2 font-medium">
            <FileCheck className="size-4 shrink-0 text-success" aria-hidden />
            {formatarSoData(previa.de)} a {formatarSoData(previa.ate)}
          </p>
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs text-muted-foreground">Batidas</dt>
              <dd className="font-mono text-lg font-semibold tabular-nums">{previa.marcacoes}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Linhas no arquivo</dt>
              <dd className="font-mono text-lg font-semibold tabular-nums">{previa.linhas}</dd>
            </div>
          </dl>

          {previa.avisos.length > 0 ? (
            <div className="rounded-lg bg-warning-soft px-3 py-2.5 text-[13px] leading-[1.5] text-warning-soft-foreground">
              <p className="flex items-center gap-1.5 font-semibold">
                <TriangleAlert className="size-4 shrink-0" aria-hidden />
                {previa.avisos.length === 1 ? "1 aviso" : `${previa.avisos.length} avisos`}
              </p>
              <ul className="mt-1 list-disc pl-5">
                {previa.avisos.map((a, i) => (
                  <li key={`${i}-${a}`}>{a}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">Nenhum aviso: o período está pronto para baixar.</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="max-md:h-12" disabled={conferir.isPending} onClick={() => void conferirAgora()}>
          <FileCheck />
          {conferir.isPending ? "Conferindo..." : "Conferir"}
        </Button>
        <Button
          variant="action"
          className="max-md:h-12"
          disabled={!conferido || baixando}
          onClick={() => void baixarAgora()}
        >
          <Download />
          {baixando ? "Baixando..." : "Baixar AFD"}
        </Button>
      </div>
      {!conferido && <p className="text-xs text-muted-foreground">Toque em Conferir para liberar o download.</p>}
    </section>
  );
}

function SecaoDoEspelho() {
  const [funcionario, setFuncionario] = useState("");
  const [{ ano, mes }, setCompetencia] = useState(() => competenciaDeIso(hojeIsoBrasilia()));
  const [baixando, setBaixando] = useState(false);

  async function baixarAgora() {
    setBaixando(true);
    try {
      await baixarEspelho671(funcionario, ano, mes);
      toast.success("Espelho baixado.");
    } catch (e) {
      toast.error(fraseDoErro(e, "Não foi possível baixar o espelho."));
    } finally {
      setBaixando(false);
    }
  }

  return (
    <section className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="font-heading text-[15.5px] font-semibold">Espelho de ponto (Portaria 671)</h2>
        <p className="mt-0.5 text-[13px] leading-[1.55] text-muted-foreground">
          O PDF do mês de um funcionário, no modelo da Portaria 671, para entregar a ele ou à fiscalização.
        </p>
      </div>

      <div className="grid gap-3">
        <Campo id="espelho-funcionario" rotulo="Funcionário">
          <SeletorDeFuncionario
            id="espelho-funcionario"
            valor={funcionario}
            onChange={setFuncionario}
            apenasAtivos={false}
            className="md:w-full"
          />
        </Campo>
        <div className="grid gap-1.5">
          <span className="text-sm leading-none font-medium">Mês</span>
          <SeletorDeMes ano={ano} mes={mes} onChange={setCompetencia} />
        </div>
      </div>

      <div>
        <Button
          variant="action"
          className="max-md:h-12"
          disabled={!funcionario || baixando}
          onClick={() => void baixarAgora()}
        >
          <FileText />
          {baixando ? "Baixando..." : "Baixar PDF"}
        </Button>
      </div>
    </section>
  );
}
