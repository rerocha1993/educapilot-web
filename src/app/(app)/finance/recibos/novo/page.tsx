"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { CampoDeDinheiro, emCentavos, emReais } from "@/components/finance/campo-de-dinheiro";
import { FinanceNav } from "@/components/finance/finance-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { Campo, ErroDeCarga } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import { abrirPdfDoRecibo } from "@/lib/finance/recibos-api";
import { useGuardians } from "@/lib/finance/use-guardians";
import {
  FORMAS_DE_PAGAMENTO,
  ROTULO_DA_FORMA,
  formaConhecida,
  numeroDeReciboFormatado,
  usePrePreencherRecibo,
  useProximoNumeroDeRecibo,
  useEmitirRecibo,
  type FormaDePagamento,
  type PrePreenchimento,
} from "@/lib/finance/use-recibos";
import { formatarCpf, formatarMoeda, soDigitos } from "@/lib/rh/formatar";

/** De onde o recibo parte: o responsável, e opcionalmente a receita paga ou o aluno. */
interface Origem {
  guardianId?: string;
  revenueEntryId?: string;
  studentId?: string;
}

const NENHUM = "__nenhum__";

const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export default function NovoReciboPage() {
  // useSearchParams pede um Suspense em volta para a página poder ser pré-renderizada.
  return (
    <Suspense fallback={null}>
      <NovoRecibo />
    </Suspense>
  );
}

function NovoRecibo() {
  const params = useSearchParams();
  const [origem, setOrigem] = useState<Origem>(() => ({
    guardianId: params.get("guardianId") ?? undefined,
    revenueEntryId: params.get("revenueEntryId") ?? undefined,
    studentId: params.get("studentId") ?? undefined,
  }));

  const temOrigem = !!origem.guardianId || !!origem.revenueEntryId;
  const pre = usePrePreencherRecibo(origem);
  const guardianId = pre.data?.guardianId ?? origem.guardianId;

  // A receita pode vir sem responsável identificável: nesse caso a pessoa escolhe quem pagou.
  const precisaEscolher = !temOrigem || (!!pre.data && !guardianId);

  return (
    <div className="flex flex-col gap-[18px]">
      <FinanceNav />

      <CabecalhoDaPagina
        eyebrow="Recibos"
        eyebrowHref="/finance/recibos"
        titulo="Novo recibo"
        apoio="Escolha o responsável, confira os dados e emita. O PDF abre em uma nova aba."
      />

      {precisaEscolher ? (
        <>
          {temOrigem && (
            <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              Não foi possível identificar o responsável por essa receita. Escolha quem pagou.
            </p>
          )}
          <EscolherResponsavel
            onEscolher={(id) => setOrigem({ guardianId: id })}
          />
        </>
      ) : pre.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : pre.isError || !pre.data || !guardianId ? (
        <div className="flex flex-col gap-3">
          <ErroDeCarga
            texto={pre.error instanceof Error ? pre.error.message : "Não foi possível preencher os dados do recibo."}
            onTentar={() => pre.refetch()}
          />
          <div>
            <Button variant="outline" onClick={() => setOrigem({})}>
              Escolher outro responsável
            </Button>
          </div>
        </div>
      ) : (
        <FormularioDoRecibo
          // Trocar de responsável ou de receita reinicia o formulário com os dados novos.
          key={`${guardianId}|${origem.revenueEntryId ?? ""}|${origem.studentId ?? ""}`}
          pre={pre.data}
          guardianId={guardianId}
          receitaInicial={origem.revenueEntryId}
          alunoInicial={origem.studentId}
          onTrocarResponsavel={() => setOrigem({})}
        />
      )}
    </div>
  );
}

function EscolherResponsavel({ onEscolher }: { onEscolher: (guardianId: string) => void }) {
  const { data, isLoading, isError, refetch } = useGuardians();
  const [busca, setBusca] = useState("");

  const lista = useMemo(() => {
    const termo = normalizar(busca.trim());
    const digitos = soDigitos(busca);
    return (data ?? [])
      .filter(
        (g) =>
          !termo ||
          normalizar(g.fullName).includes(termo) ||
          (digitos.length > 0 && soDigitos(g.cpf ?? "").includes(digitos)) ||
          normalizar(g.email ?? "").includes(termo)
      )
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"))
      .slice(0, 30);
  }, [data, busca]);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="font-heading text-[15px] font-semibold">1. Quem pagou</h2>
        <p className="text-[13px] text-muted-foreground">Busque o responsável por nome, CPF ou e-mail.</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Buscar responsável"
          placeholder="Nome, CPF ou e-mail"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-8"
          autoFocus
        />
      </div>

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar os responsáveis." onTentar={() => refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <EstadoVazio titulo="Nenhum responsável encontrado" texto="Confira a busca ou cadastre o responsável em Administração." />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {lista.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => onEscolher(g.id)}
                className="flex min-h-12 w-full flex-col items-start gap-0.5 rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="font-medium">{g.fullName}</span>
                <span className="text-[13px] break-all text-muted-foreground">
                  <span className="font-mono tabular-nums">{g.cpf ? formatarCpf(g.cpf) : "Sem CPF"}</span>
                  {" · "}
                  {g.email ?? "Sem e-mail"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FormularioDoRecibo({
  pre,
  guardianId,
  receitaInicial,
  alunoInicial,
  onTrocarResponsavel,
}: {
  pre: PrePreenchimento;
  guardianId: string;
  receitaInicial?: string;
  alunoInicial?: string;
  onTrocarResponsavel: () => void;
}) {
  const router = useRouter();
  const emitir = useEmitirRecibo();
  const hoje = hojeIsoBrasilia();
  const anoAtual = Number(hoje.slice(0, 4));
  const { data: proximo } = useProximoNumeroDeRecibo(anoAtual);

  const receitaDaOrigem = pre.receitasPagas.find((r) => r.revenueEntryId === receitaInicial);

  const [studentId, setStudentId] = useState(() => {
    const sugerido = pre.sugestao.studentId ?? (alunoInicial ? Number(alunoInicial) : undefined);
    if (sugerido !== undefined && pre.alunos.some((a) => a.studentId === sugerido)) return String(sugerido);
    return pre.alunos.length === 1 ? String(pre.alunos[0].studentId) : "";
  });
  const [receitaId, setReceitaId] = useState(receitaDaOrigem?.revenueEntryId ?? "");
  const [valor, setValor] = useState<number | null>(() =>
    emCentavos(pre.sugestao.valor ?? receitaDaOrigem?.valor)
  );
  const [referenteA, setReferenteA] = useState(pre.sugestao.referenteA ?? receitaDaOrigem?.descricao ?? "");
  const [forma, setForma] = useState<FormaDePagamento>(() => formaConhecida(pre.sugestao.formaDePagamento) ?? "Pix");
  const [data, setData] = useState(pre.sugestao.dataDoPagamento ?? receitaDaOrigem?.dataPagamento ?? hoje);
  const [observacoes, setObservacoes] = useState("");
  const [tentou, setTentou] = useState(false);

  const erroValor = valor === null || valor <= 0 ? "Informe um valor maior que zero." : null;
  const erroReferente = referenteA.trim() === "" ? "Informe a que se refere o pagamento." : null;
  const erroData = !data ? "Informe a data do pagamento." : data > hoje ? "A data não pode ser futura." : null;

  function escolherReceita(id: string) {
    setReceitaId(id);
    const receita = pre.receitasPagas.find((r) => r.revenueEntryId === id);
    if (!receita) return;

    // Escolher a receita preenche o recibo com o que ela diz; a pessoa ainda pode ajustar.
    setValor(emCentavos(receita.valor));
    if (receita.descricao) setReferenteA(receita.descricao);
    if (receita.dataPagamento) setData(receita.dataPagamento);
    if (receita.studentId !== undefined && pre.alunos.some((a) => a.studentId === receita.studentId)) {
      setStudentId(String(receita.studentId));
    }
  }

  async function aoEmitir(e: React.FormEvent) {
    e.preventDefault();
    setTentou(true);
    if (erroValor || erroReferente || erroData) return;

    // A aba abre agora, no clique: depois da espera da rede o navegador a bloquearia.
    const aba = window.open("", "_blank");
    try {
      const recibo = await emitir.mutateAsync({
        guardianId,
        studentId: studentId ? Number(studentId) : undefined,
        revenueEntryId: receitaId || undefined,
        valor: emReais(valor),
        referenteA: referenteA.trim(),
        formaDePagamento: forma,
        dataDoPagamento: data,
        observacoes: observacoes.trim() || undefined,
      });
      toast.success(`Recibo ${recibo.numeroFormatado} emitido.`);
      abrirPdfDoRecibo(recibo.id, recibo.numeroFormatado, aba).catch((err: unknown) =>
        toast.error(err instanceof Error ? err.message : "O recibo foi emitido, mas o PDF não abriu. Abra pela lista.")
      );
      router.push(`/finance/recibos?destaque=${recibo.id}`);
    } catch (err) {
      aba?.close();
      // 409: a receita já tem recibo. A mensagem do servidor diz isso.
      toast.error(err instanceof Error ? err.message : "Não foi possível emitir o recibo.");
    }
  }

  const aluno = pre.alunos.find((a) => String(a.studentId) === studentId);
  const receita = pre.receitasPagas.find((r) => r.revenueEntryId === receitaId);
  const sugestaoDeReferente = pre.sugestao.referenteA;

  return (
    <form onSubmit={aoEmitir} noValidate className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-[11.5px] font-bold tracking-[.16em] text-muted-foreground uppercase">Recebido de</p>
          <p className="mt-1 text-base font-semibold break-words">{pre.nomeDoPagador}</p>
          <p className="text-[13px] break-words text-muted-foreground">
            <span className="font-mono tabular-nums">{pre.cpfDoPagador ? formatarCpf(pre.cpfDoPagador) : "Sem CPF"}</span>
            {" · "}
            {pre.email ?? "Sem e-mail"}
          </p>
          {!pre.cpfDoPagador && (
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              Sem CPF no cadastro, o recibo sai sem ele. Complete em Administração, Responsáveis, se precisar.
            </p>
          )}
        </div>
        <Button type="button" variant="outline" onClick={onTrocarResponsavel}>
          Trocar responsável
        </Button>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-[15px] font-semibold">2. Dados do recibo</h2>
          {proximo && (
            <p className="text-[13px] text-muted-foreground">
              Próximo número:{" "}
              <span className="font-mono font-semibold text-foreground tabular-nums">
                {numeroDeReciboFormatado(proximo.numero, proximo.ano)}
              </span>
            </p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Campo id="recibo-aluno" rotulo="Aluno (opcional)">
            <Select value={studentId || NENHUM} onValueChange={(v) => setStudentId(!v || v === NENHUM ? "" : v)}>
              <SelectTrigger id="recibo-aluno" className="w-full">
                <SelectValue>
                  {() => (aluno ? `${aluno.nome}${aluno.turma ? ` (${aluno.turma})` : ""}` : "Sem aluno")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value={NENHUM}>Sem aluno</SelectItem>
                {pre.alunos.map((a) => (
                  <SelectItem key={a.studentId} value={String(a.studentId)}>
                    {a.nome}
                    {a.turma ? ` (${a.turma})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          <Campo
            id="recibo-receita"
            rotulo="Vincular a uma receita paga (opcional)"
            dica={
              pre.receitasPagas.length === 0
                ? "Este responsável não tem receita paga sem recibo."
                : "Preenche valor, referente a e data com os da receita."
            }
          >
            <Select
              value={receitaId || NENHUM}
              onValueChange={(v) => (!v || v === NENHUM ? setReceitaId("") : escolherReceita(v))}
            >
              <SelectTrigger id="recibo-receita" className="w-full" disabled={pre.receitasPagas.length === 0}>
                <SelectValue>
                  {() =>
                    receita
                      ? `${receita.descricao ?? "Receita"} · ${formatarMoeda(receita.valor)}`
                      : "Não vincular"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value={NENHUM}>Não vincular</SelectItem>
                {pre.receitasPagas.map((r) => (
                  <SelectItem key={r.revenueEntryId} value={r.revenueEntryId}>
                    {r.descricao ?? "Receita"} · {formatarMoeda(r.valor)}
                    {r.dataPagamento ? ` · ${formatarSoData(r.dataPagamento)}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          <Campo id="recibo-valor" rotulo="Valor">
            <CampoDeDinheiro
              id="recibo-valor"
              valorEmCentavos={valor}
              onChange={setValor}
              className={tentou && erroValor ? "border-destructive" : undefined}
            />
            {tentou && erroValor && <p className="text-xs text-destructive">{erroValor}</p>}
          </Campo>

          <Campo id="recibo-data" rotulo="Data do pagamento">
            <Input
              id="recibo-data"
              type="date"
              value={data}
              max={hoje}
              onChange={(e) => setData(e.target.value)}
              aria-invalid={tentou && erroData !== null}
            />
            {tentou && erroData && <p className="text-xs text-destructive">{erroData}</p>}
          </Campo>

          <Campo id="recibo-referente" rotulo="Referente a" className="md:col-span-2">
            <Input
              id="recibo-referente"
              value={referenteA}
              onChange={(e) => setReferenteA(e.target.value)}
              placeholder="Ex.: Mensalidade de outubro/2026"
              autoComplete="off"
              aria-invalid={tentou && erroReferente !== null}
            />
            {tentou && erroReferente && <p className="text-xs text-destructive">{erroReferente}</p>}
            {sugestaoDeReferente && sugestaoDeReferente !== referenteA && (
              <button
                type="button"
                onClick={() => setReferenteA(sugestaoDeReferente)}
                className="w-fit rounded-md bg-muted px-2 py-1 text-left text-xs text-muted-foreground hover:text-foreground"
              >
                Sugestão: {sugestaoDeReferente}
              </button>
            )}
          </Campo>

          <Campo id="recibo-forma" rotulo="Forma de pagamento">
            <Select value={forma} onValueChange={(v) => v && setForma(v as FormaDePagamento)}>
              <SelectTrigger id="recibo-forma" className="w-full">
                <SelectValue>{() => ROTULO_DA_FORMA[forma]}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {FORMAS_DE_PAGAMENTO.map((f) => (
                  <SelectItem key={f} value={f}>
                    {ROTULO_DA_FORMA[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          <Campo id="recibo-observacoes" rotulo="Observações (opcional)" className="md:col-span-2">
            <Textarea
              id="recibo-observacoes"
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </Campo>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <Button type="button" variant="outline" disabled={emitir.isPending} onClick={() => router.push("/finance/recibos")}>
          Cancelar
        </Button>
        <Button type="submit" variant="action" disabled={emitir.isPending}>
          {emitir.isPending ? "Emitindo..." : "Emitir recibo"}
        </Button>
      </div>
    </form>
  );
}
