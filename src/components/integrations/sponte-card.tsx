"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  opcoesPadrao,
  useImportarSponte,
  usePreviaSponte,
  useSaveSponteSettings,
  useSponteSettings,
  useTestarSponte,
  type OpcoesDaImportacaoSponte,
  type ResultadoDaImportacaoSponte,
} from "@/lib/integrations/use-sponte";
import { formatarDataHora } from "@/lib/format/date";

/**
 * Configuração e importação da Sponte.
 *
 * As credenciais são de cada escola (Código de Cliente e Token da Sponte), por isso ficam nesta
 * tela. A importação tem dois passos de propósito: a prévia mostra o que aconteceria sem gravar
 * nada, e só uma prévia feita com as mesmas opções libera o botão Importar.
 */

/** Opções como vão para o servidor: as datas só valem com o financeiro marcado. */
function opcoesParaEnvio(o: OpcoesDaImportacaoSponte): OpcoesDaImportacaoSponte {
  return {
    ...o,
    financeiroDesde: o.financeiro ? o.financeiroDesde || null : null,
    financeiroAte: o.financeiro ? o.financeiroAte || null : null,
    // A inscrição na mensalidade parte das parcelas trazidas, então só vale com o financeiro.
    inscreverNaMensalidade: o.financeiro && o.inscreverNaMensalidade,
  };
}

const ROTULO = "text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground";

export function SponteCard() {
  const { data: settings, isLoading, isError, error } = useSponteSettings();
  const saveSettings = useSaveSponteSettings();
  const testar = useTestarSponte();
  const gerarPrevia = usePreviaSponte();
  const importar = useImportarSponte();

  // null = o usuário ainda não digitou: o campo mostra o código gravado.
  const [codigoDigitado, setCodigoDigitado] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [opcoes, setOpcoes] = useState<OpcoesDaImportacaoSponte>(() => opcoesPadrao());
  // A prévia guarda as opções com que foi feita: mudou uma opção, a prévia deixa de valer.
  const [previa, setPrevia] = useState<{ resultado: ResultadoDaImportacaoSponte; chave: string } | null>(null);
  const [resultado, setResultado] = useState<ResultadoDaImportacaoSponte | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const codigoCliente =
    codigoDigitado ?? (settings?.codigoCliente != null ? String(settings.codigoCliente) : "");

  const configurado = settings?.configurado ?? false;
  const envio = opcoesParaEnvio(opcoes);
  const chaveAtual = JSON.stringify(envio);

  const algoParaTrazer = opcoes.turmas || opcoes.alunos || opcoes.matriculas || opcoes.financeiro;
  const periodoValido =
    !opcoes.financeiro ||
    (Boolean(opcoes.financeiroDesde) &&
      Boolean(opcoes.financeiroAte) &&
      (opcoes.financeiroDesde as string) <= (opcoes.financeiroAte as string));
  const opcoesValidas = algoParaTrazer && periodoValido;

  const previaValida = previa !== null && previa.resultado.sucesso && previa.chave === chaveAtual;
  const ocupado = gerarPrevia.isPending || importar.isPending;

  function mudar(parcial: Partial<OpcoesDaImportacaoSponte>) {
    setOpcoes((atual) => ({ ...atual, ...parcial }));
  }

  async function handleSalvar() {
    const codigo = Number(codigoCliente);
    if (!Number.isInteger(codigo) || codigo <= 0) {
      toast.error("Informe o Código de Cliente da Sponte (só números).");
      return;
    }
    try {
      await saveSettings.mutateAsync({ codigoCliente: codigo, token });
      // Limpa o token depois de salvar: mantê-lo na tela deixaria a credencial visível para
      // quem passasse pelo computador.
      setToken("");
      toast.success("Credenciais salvas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  async function handleTestar() {
    try {
      const { sucesso, mensagem } = await testar.mutateAsync();
      if (sucesso) toast.success(mensagem || "Conexão com a Sponte funcionando.");
      else toast.error(mensagem || "Não foi possível conectar. Confira o Código de Cliente e o Token.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao testar conexão.");
    }
  }

  async function handlePrevia() {
    setResultado(null);
    setPrevia(null);
    try {
      const r = await gerarPrevia.mutateAsync(envio);
      setPrevia({ resultado: r, chave: JSON.stringify(envio) });
      if (!r.sucesso) toast.error(r.erro ?? "A pré-visualização falhou.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao pré-visualizar.");
    }
  }

  async function handleImportar() {
    if (!previaValida) return;
    try {
      const r = await importar.mutateAsync(envio);
      setConfirmando(false);
      setResultado(r);
      // Depois de importar, a prévia antiga não vale mais: uma nova importação pede nova prévia.
      setPrevia(null);
      if (r.sucesso) toast.success("Importação concluída.");
      else toast.error(r.erro ?? "A importação falhou.");
    } catch (err) {
      setConfirmando(false);
      toast.error(err instanceof Error ? err.message : "Erro ao importar.");
    }
  }

  if (isLoading) {
    return <Skeleton className="h-56 w-full rounded-lg" />;
  }

  // Sem isto, uma falha ao carregar a configuração deixava o card com os campos em branco e
  // os botões desabilitados — indistinguível de "ainda não configurado".
  if (isError) {
    return (
      <div className="rounded-xl border border-destructive-border bg-destructive-soft p-4 text-sm break-words text-destructive-soft-foreground">
        {error instanceof Error ? error.message : "Não foi possível carregar a configuração da Sponte."}
      </div>
    );
  }

  const exibido = previa?.resultado ?? resultado;

  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="font-heading text-[15.5px] font-semibold">Sponte</h2>
        <p className="mt-1 text-[13.5px] leading-[1.55] text-pretty text-muted-foreground">
          Para a escola que vem da Sponte: traz turmas, alunos, responsáveis, matrículas e, se quiser, o
          financeiro. O que já existe aqui é atualizado, não duplicado.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-[5px]">
          <label htmlFor="sponte-codigo" className={ROTULO}>
            Código de Cliente
          </label>
          <Input
            id="sponte-codigo"
            type="number"
            inputMode="numeric"
            min={1}
            value={codigoCliente}
            onChange={(e) => setCodigoDigitado(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-[5px]">
          <label htmlFor="sponte-token" className={ROTULO}>
            Token {configurado && <span className="text-success-soft-foreground">(já configurado)</span>}
          </label>
          <Input
            id="sponte-token"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={configurado ? "Deixe em branco para manter" : ""}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleSalvar} disabled={saveSettings.isPending} className="w-full md:w-auto">
          {saveSettings.isPending ? "Salvando..." : "Salvar credenciais"}
        </Button>
        <Button
          variant="outline"
          onClick={handleTestar}
          disabled={!configurado || testar.isPending}
          className="w-full md:w-auto"
        >
          {testar.isPending ? "Testando..." : "Testar conexão"}
        </Button>
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-4">
        <fieldset className="flex flex-col gap-2">
          <legend className={`${ROTULO} mb-1`}>O que trazer</legend>
          <Opcao rotulo="Turmas" marcado={opcoes.turmas} aoMudar={(v) => mudar({ turmas: v })} />
          <Opcao rotulo="Alunos e responsáveis" marcado={opcoes.alunos} aoMudar={(v) => mudar({ alunos: v })} />
          <Opcao rotulo="Matrículas" marcado={opcoes.matriculas} aoMudar={(v) => mudar({ matriculas: v })} />
          <Opcao rotulo="Financeiro" marcado={opcoes.financeiro} aoMudar={(v) => mudar({ financeiro: v })} />

          {opcoes.financeiro && (
            <div className="grid gap-3 sm:grid-cols-2 md:pl-6">
              <div className="flex flex-col gap-[5px]">
                <label htmlFor="sponte-desde" className={ROTULO}>
                  Vencimentos de
                </label>
                <Input
                  id="sponte-desde"
                  type="date"
                  value={opcoes.financeiroDesde ?? ""}
                  onChange={(e) => mudar({ financeiroDesde: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-[5px]">
                <label htmlFor="sponte-ate" className={ROTULO}>
                  até
                </label>
                <Input
                  id="sponte-ate"
                  type="date"
                  value={opcoes.financeiroAte ?? ""}
                  onChange={(e) => mudar({ financeiroAte: e.target.value })}
                />
              </div>
              {!periodoValido && (
                <p className="text-xs text-destructive sm:col-span-2">
                  Informe as duas datas, com a primeira antes da segunda.
                </p>
              )}
            </div>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className={`${ROTULO} mb-1`}>Como tratar</legend>
          <Opcao
            rotulo="Só o que está ativo na Sponte"
            marcado={opcoes.somenteAtivos}
            aoMudar={(v) => mudar({ somenteAtivos: v })}
          />
          <Opcao
            rotulo="Atualizar o que já existe aqui"
            marcado={opcoes.atualizarExistentes}
            aoMudar={(v) => mudar({ atualizarExistentes: v })}
          />
          <Opcao
            rotulo="Cadastrar os alunos na mensalidade do EducaPilot"
            marcado={opcoes.inscreverNaMensalidade}
            aoMudar={(v) => mudar({ inscreverNaMensalidade: v })}
            desabilitado={!opcoes.financeiro}
            apoio={
              <>
                As próximas parcelas passam a ser geradas aqui, a partir do mês seguinte à última parcela trazida
                da Sponte. Marque só quando a escola for parar de cobrar pela Sponte.
                {!opcoes.financeiro && " Precisa do Financeiro marcado acima."}
              </>
            }
          />
        </fieldset>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={handlePrevia}
          disabled={!configurado || !opcoesValidas || ocupado}
          className="w-full md:w-auto"
        >
          {gerarPrevia.isPending ? "Pré-visualizando..." : "Pré-visualizar"}
        </Button>
        <Button onClick={() => setConfirmando(true)} disabled={!previaValida || ocupado} className="w-full md:w-auto">
          {importar.isPending ? "Importando..." : "Importar"}
        </Button>
      </div>
      {!configurado ? (
        <p className="text-xs text-muted-foreground">Salve o Código de Cliente e o Token para poder importar.</p>
      ) : previa?.resultado.sucesso && !previaValida ? (
        <p className="text-xs text-muted-foreground">
          As opções mudaram desde a última prévia. Pré-visualize de novo para liberar a importação.
        </p>
      ) : !previa && !resultado ? (
        <p className="text-xs text-muted-foreground">
          Primeiro pré-visualize: a prévia mostra o que vai acontecer sem gravar nada.
        </p>
      ) : null}

      {exibido && <ResultadoSponte resultado={exibido} />}

      {settings?.ultimaImportacaoEm && (
        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          <p>
            Última importação:{" "}
            <span className="font-mono tabular-nums">{formatarDataHora(settings.ultimaImportacaoEm)}</span>
          </p>
          {settings.resumoUltimaImportacao && <p className="break-words">{settings.resumoUltimaImportacao}</p>}
        </div>
      )}

      <Dialog open={confirmando} onOpenChange={(aberto) => !aberto && !importar.isPending && setConfirmando(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar da Sponte agora?</DialogTitle>
            <DialogDescription>
              Vai gravar no EducaPilot o que a prévia mostrou. Nada é apagado: o que já existe é atualizado ou
              completado.
            </DialogDescription>
          </DialogHeader>

          {previa?.resultado && <GradeDeContagens resultado={previa.resultado} />}
          {envio.inscreverNaMensalidade && (
            <p className="rounded-lg border border-action-border bg-action-soft px-3 py-2 text-xs text-action-soft-foreground">
              Os alunos serão cadastrados na mensalidade do EducaPilot: as próximas parcelas passam a ser geradas
              aqui.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" disabled={importar.isPending} onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
            <Button disabled={importar.isPending || !previaValida} onClick={handleImportar}>
              {importar.isPending ? "Importando..." : "Importar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Opcao({
  rotulo,
  marcado,
  aoMudar,
  apoio,
  desabilitado,
}: {
  rotulo: string;
  marcado: boolean;
  aoMudar: (valor: boolean) => void;
  apoio?: ReactNode;
  desabilitado?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex min-h-10 items-center gap-2 text-sm md:min-h-0">
        <Checkbox checked={marcado} disabled={desabilitado} onCheckedChange={(v) => aoMudar(v === true)} />
        {rotulo}
      </label>
      {apoio && <p className="pl-6 text-xs leading-[1.5] text-pretty text-muted-foreground">{apoio}</p>}
    </div>
  );
}

function Numero({ children }: { children: ReactNode }) {
  return <span className="font-mono tabular-nums">{children}</span>;
}

/** Contagens do resultado em grade, uma caixinha por assunto. */
function GradeDeContagens({ resultado: r }: { resultado: ResultadoDaImportacaoSponte }) {
  const itens: { rotulo: string; principal: number; detalhe: ReactNode }[] = [
    {
      rotulo: "Turmas",
      principal: r.turmasCriadas + r.turmasAtualizadas,
      detalhe: (
        <>
          <Numero>{r.turmasCriadas}</Numero> novas, <Numero>{r.turmasAtualizadas}</Numero> atualizadas
          {r.turmasIgnoradas > 0 && (
            <>
              , <Numero>{r.turmasIgnoradas}</Numero> ignoradas
            </>
          )}
        </>
      ),
    },
    {
      rotulo: "Alunos",
      principal: r.alunosCriados + r.alunosAtualizados,
      detalhe: (
        <>
          <Numero>{r.alunosCriados}</Numero> novos, <Numero>{r.alunosAtualizados}</Numero> atualizados
          {r.alunosIgnorados > 0 && (
            <>
              , <Numero>{r.alunosIgnorados}</Numero> ignorados
            </>
          )}
        </>
      ),
    },
    {
      rotulo: "Pré-cadastros",
      principal: r.alunosEmPreCadastro,
      detalhe: <>alunos com turma ou nascimento faltando</>,
    },
    {
      rotulo: "Responsáveis",
      principal: r.responsaveisCriados + r.responsaveisAtualizados,
      detalhe: (
        <>
          <Numero>{r.responsaveisCriados}</Numero> novos, <Numero>{r.responsaveisAtualizados}</Numero> atualizados
        </>
      ),
    },
    {
      rotulo: "Vínculos",
      principal: r.vinculosCriados + r.vinculosAtualizados,
      detalhe: (
        <>
          <Numero>{r.vinculosCriados}</Numero> novos, <Numero>{r.vinculosAtualizados}</Numero> atualizados
        </>
      ),
    },
    {
      rotulo: "Matrículas",
      principal: r.matriculasAplicadas,
      detalhe: (
        <>
          aplicadas
          {r.matriculasIgnoradas > 0 && (
            <>
              , <Numero>{r.matriculasIgnoradas}</Numero> ignoradas
            </>
          )}
        </>
      ),
    },
    {
      rotulo: "Parcelas",
      principal: r.parcelasCriadas + r.parcelasAtualizadas,
      detalhe: (
        <>
          <Numero>{r.parcelasCriadas}</Numero> novas, <Numero>{r.parcelasAtualizadas}</Numero> atualizadas
          {r.parcelasIgnoradas > 0 && (
            <>
              , <Numero>{r.parcelasIgnoradas}</Numero> ignoradas
            </>
          )}
        </>
      ),
    },
    {
      rotulo: "Receitas",
      principal: r.receitasCriadas,
      detalhe: <>das parcelas já pagas</>,
    },
    {
      rotulo: "Na mensalidade",
      principal: r.alunosInscritosNaMensalidade,
      detalhe: <>alunos cadastrados</>,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
      {itens.map((item) => (
        <div key={item.rotulo} className="min-w-0 rounded-lg border border-border bg-card px-3 py-2 text-foreground">
          <div className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
            {item.rotulo}
          </div>
          <div className="font-heading text-lg font-semibold tabular-nums">{item.principal}</div>
          <div className="text-[11.5px] leading-snug break-words text-muted-foreground">{item.detalhe}</div>
        </div>
      ))}
    </div>
  );
}

function ResultadoSponte({ resultado }: { resultado: ResultadoDaImportacaoSponte }) {
  if (!resultado.sucesso) {
    return (
      <div className="rounded-lg border border-destructive-border bg-destructive-soft px-3 py-2 text-sm break-words text-destructive-soft-foreground">
        {resultado.erro ?? (resultado.previa ? "A pré-visualização falhou." : "A importação falhou.")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-success-border bg-success-soft px-3 py-3 text-sm text-success-soft-foreground">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{resultado.previa ? "Prévia" : "Importação concluída"}</span>
        {resultado.previa && (
          <span className="rounded-full border border-success-border bg-card px-2 py-0.5 text-[11px] font-medium">
            Prévia: nada foi gravado
          </span>
        )}
        <span className="text-xs">
          (<Numero>{Math.round(resultado.duracaoSegundos)}</Numero> s)
        </span>
      </div>

      <GradeDeContagens resultado={resultado} />

      {resultado.avisos.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer">
            <Numero>{resultado.avisos.length}</Numero> aviso(s) — ver detalhes
          </summary>
          <ul className="mt-1 list-disc pl-4 break-words">
            {resultado.avisos.map((aviso, i) => (
              <li key={i}>{aviso}</li>
            ))}
          </ul>
        </details>
      )}

      {resultado.ignorados.length > 0 && (
        <details className="text-xs">
          {/* Registros pulados ficam visíveis de propósito: sem isso a conta não fecha e ninguém
              descobre por que o aluno não entrou. */}
          <summary className="cursor-pointer">
            <Numero>{resultado.ignorados.length}</Numero> registro(s) não importado(s) — ver motivos
          </summary>
          <ul className="mt-1 list-disc pl-4 break-words">
            {resultado.ignorados.map((motivo, i) => (
              <li key={i}>{motivo}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
