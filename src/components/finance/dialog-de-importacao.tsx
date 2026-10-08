"use client";

import { useRef, useState } from "react";
import { ArrowLeft, CircleAlert, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CONFIG_DA_IMPORTACAO,
  baixarModeloDaPlanilha,
  useColunasDaImportacao,
  useConfirmarImportacao,
  usePreviaDaImportacao,
  type ColunasAceitas,
  type LinhaDaPrevia,
  type PreviaDaImportacao,
  type ResultadoDaImportacao,
  type SituacaoDaLinha,
  type TipoDeImportacao,
  type ValoresDaLinha,
} from "@/lib/finance/use-importacao";
import { cn } from "@/lib/utils";
import { formatarSoData } from "@/lib/format/date";

/**
 * Importar planilha de despesas, receitas ou orçamento, em três passos: escolher o arquivo,
 * conferir o que vai acontecer (nada é gravado ainda) e ver o resultado.
 *
 * A prévia e a confirmação recebem o mesmo arquivo; o token da prévia garante que o que foi
 * conferido é o que será gravado. Linhas com erro nunca entram; as demais entram, a menos que a
 * pessoa peça "só gravar se todas estiverem certas".
 */

const FORMATOS_PADRAO = [".xlsx", ".csv"];
const POR_PAGINA = 100;

function dinheiro(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function inteiro(v: number) {
  return v.toLocaleString("pt-BR");
}

function megabytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

// ------------------------------------------------------------------ formatação das células

const CAMPOS_DE_DINHEIRO = new Set([
  "valor",
  "valorPago",
  "valorRecebido",
  "juros",
  "multa",
  "desconto",
  "valorDaSerie",
  "valorPorMes",
]);
const CAMPOS_DE_DATA = new Set(["vencimento", "dataPagamento", "ultimoVencimento"]);

/** Nomes para o cabeçalho da tabela quando a prévia não traz o título da coluna. */
const TITULOS_PADRAO: Record<string, string> = {
  descricao: "Descrição",
  valor: "Valor",
  vencimento: "Vencimento",
  categoria: "Categoria",
  fornecedor: "Fornecedor",
  dataPagamento: "Data do pagamento",
  aluno: "Aluno",
  responsavel: "Responsável",
  situacao: "Situação",
  tipo: "Tipo",
  ano: "Ano",
  mes: "Mês",
  centroDeCusto: "Centro de custo",
};

function formatarCelula(campo: string, bruto: ValoresDaLinha[string]): string {
  if (bruto === null || bruto === undefined || bruto === "") return "—";
  if (typeof bruto === "boolean") return bruto ? "Sim" : "Não";

  if (CAMPOS_DE_DINHEIRO.has(campo)) {
    const n = typeof bruto === "number" ? bruto : Number(String(bruto).replace(",", "."));
    return Number.isFinite(n) ? dinheiro(n) : String(bruto);
  }
  if (CAMPOS_DE_DATA.has(campo)) return formatarSoData(String(bruto));
  if (campo === "competencia") {
    const [ano, mes] = String(bruto).split("-");
    return ano && mes ? `${mes}/${ano}` : String(bruto);
  }
  if (campo === "mes") {
    if (String(bruto).toLowerCase() === "ano") return "Ano inteiro";
    const n = Number(bruto);
    return Number.isFinite(n) ? String(n).padStart(2, "0") : String(bruto);
  }
  return String(bruto);
}

const CAMPOS_ALINHADOS_A_DIREITA = new Set(["valor"]);

// ------------------------------------------------------------------ textos de ajuda

function RegrasDeAjuda({ tipo }: { tipo: TipoDeImportacao }) {
  const comuns = [
    <>
      A ordem das colunas não importa, e nomes parecidos são reconhecidos. A lista completa está em{" "}
      <strong>Ver colunas aceitas</strong>.
    </>,
    <>
      Valores podem ser escritos como <span className="font-mono">1234,56</span>,{" "}
      <span className="font-mono">1.234,56</span> ou <span className="font-mono">R$ 1.234,56</span>.
    </>,
  ];

  const datas = (
    <>
      Datas em <span className="font-mono">dd/mm/aaaa</span> ou em célula de data do Excel. A competência vai como{" "}
      <span className="font-mono">mm/aaaa</span>; se ficar vazia, vale o mês do vencimento.
    </>
  );

  const porTipo: Record<TipoDeImportacao, React.ReactNode[]> = {
    despesas: [
      datas,
      <>
        Despesa com data do pagamento já nasce paga. Se o valor pago for diferente, a diferença vira juros ou
        desconto.
      </>,
    ],
    receitas: [
      datas,
      <>
        A situação pode vir escrita à vontade: &quot;pago via boleto&quot; vira Recebido, pago por boleto. Receita
        ligada a uma cobrança não é alterada por planilha.
      </>,
    ],
    orcamento: [
      <>
        No mês, escreva o número de 1 a 12 ou <span className="font-mono">ano</span>. Com{" "}
        <span className="font-mono">ano</span>, o valor é dividido em 12 meses iguais.
      </>,
      <>
        Cada categoria só pode ter um valor por mês (e por centro de custo). Se já existir, a linha atualiza o que
        está cadastrado.
      </>,
    ],
  };

  const fim = [
    <>Linhas com erro não entram; as outras entram normalmente. Você vê tudo antes de confirmar.</>,
    <>
      Enviar a mesma planilha de novo atualiza, não duplica. A planilha exportada traz a coluna{" "}
      <strong>Id (não alterar)</strong>: você pode exportar, corrigir no Excel e enviar de volta.
    </>,
  ];

  return (
    <ul className="list-disc space-y-1 pl-5 text-[13px] leading-[1.55] text-muted-foreground">
      {[...porTipo[tipo], ...comuns, ...fim].map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------------ peças da conferência

function Contador({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string;
  valor: string;
  tom?: "bom" | "info" | "ruim" | "atencao";
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <p className="text-[11.5px] font-medium text-muted-foreground">{rotulo}</p>
      <p
        className={cn(
          "mt-1 font-mono text-[17px] leading-none font-semibold tabular-nums",
          tom === "bom" && "text-success-soft-foreground",
          tom === "info" && "text-sky-700 dark:text-sky-300",
          tom === "ruim" && "text-destructive-soft-foreground",
          tom === "atencao" && "text-action-soft-foreground"
        )}
      >
        {valor}
      </p>
    </div>
  );
}

function EtiquetaDaSituacao({ situacao }: { situacao: SituacaoDaLinha }) {
  if (situacao === "Nova") return <Badge variant="success">Nova</Badge>;
  if (situacao === "Erro") return <Badge variant="overdue">Erro</Badge>;
  return <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200">Atualiza</Badge>;
}

function ObservacaoDaLinha({ linha }: { linha: LinhaDaPrevia }) {
  const avisos = linha.avisos ?? [];
  if (!linha.motivo && avisos.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="grid gap-0.5 text-xs">
      {linha.motivo && (
        <span className={linha.situacao === "Erro" ? "text-destructive-soft-foreground" : "text-muted-foreground"}>
          {linha.motivo}
        </span>
      )}
      {avisos.map((a, i) => (
        <span key={i} className="text-action-soft-foreground">
          Aviso: {a}
        </span>
      ))}
    </div>
  );
}

function TabelaDaPrevia({
  tipo,
  previa,
  soErros,
}: {
  tipo: TipoDeImportacao;
  previa: PreviaDaImportacao;
  soErros: boolean;
}) {
  const [visiveis, setVisiveis] = useState(POR_PAGINA);

  const linhas = soErros ? previa.linhas.filter((l) => l.situacao === "Erro") : previa.linhas;

  // Só as colunas principais do tipo que aparecem em alguma linha: planilha sem "Fornecedor" não
  // ganha uma coluna de traços.
  const colunas = (() => {
    const preenchidos = new Set<string>();
    for (const l of previa.linhas) {
      for (const [campo, v] of Object.entries(l.valores ?? {})) {
        if (v !== null && v !== undefined && v !== "") preenchidos.add(campo);
      }
    }
    return CONFIG_DA_IMPORTACAO[tipo].colunasDaTabela
      .filter((campo) => preenchidos.has(campo))
      .map((campo) => ({
        campo,
        titulo: previa.colunas.find((c) => c.campo === campo)?.titulo ?? TITULOS_PADRAO[campo] ?? campo,
      }));
  })();

  if (linhas.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
        {soErros ? "Nenhuma linha com erro. Tudo certo por aqui." : "A planilha não tem nenhuma linha preenchida."}
      </p>
    );
  }

  const mostradas = linhas.slice(0, visiveis);

  return (
    <div className="grid gap-2">
      <div className="max-h-[42vh] overflow-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="w-14">Linha</TableHead>
              <TableHead>Situação</TableHead>
              {colunas.map((c) => (
                <TableHead key={c.campo} className={cn(CAMPOS_ALINHADOS_A_DIREITA.has(c.campo) && "text-right")}>
                  {c.titulo}
                </TableHead>
              ))}
              <TableHead className="min-w-48">Observação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mostradas.map((l) => (
              <TableRow key={l.numero} className={cn(l.situacao === "Erro" && "bg-destructive-soft/40")}>
                <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">{l.numero}</TableCell>
                <TableCell>
                  <EtiquetaDaSituacao situacao={l.situacao} />
                </TableCell>
                {colunas.map((c) => (
                  <TableCell
                    key={c.campo}
                    className={cn(
                      "max-w-56 truncate text-sm",
                      CAMPOS_ALINHADOS_A_DIREITA.has(c.campo) && "text-right font-mono tabular-nums"
                    )}
                    title={formatarCelula(c.campo, l.valores?.[c.campo])}
                  >
                    {formatarCelula(c.campo, l.valores?.[c.campo])}
                  </TableCell>
                ))}
                <TableCell className="whitespace-normal">
                  <ObservacaoDaLinha linha={l} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {linhas.length > mostradas.length && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Mostrando <span className="font-mono tabular-nums">{inteiro(mostradas.length)}</span> de{" "}
            <span className="font-mono tabular-nums">{inteiro(linhas.length)}</span> linhas.
          </span>
          <Button variant="outline" size="sm" onClick={() => setVisiveis((v) => v + POR_PAGINA)}>
            Mostrar mais {POR_PAGINA}
          </Button>
        </div>
      )}
    </div>
  );
}

function ListaDeColunas({ info }: { info: ColunasAceitas | undefined }) {
  if (!info) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Carregando a lista de colunas...
      </p>
    );
  }
  if (info.colunas.length === 0) {
    return <p className="text-sm text-muted-foreground">Não foi possível carregar a lista de colunas.</p>;
  }

  return (
    <div className="grid gap-2">
      {info.colunas.map((c) => (
        <div key={c.campo} className="grid gap-1 rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{c.titulo}</span>
            {c.obrigatoria ? <Badge variant="pending">Obrigatória</Badge> : <Badge variant="waiting">Opcional</Badge>}
          </div>
          {c.descricao && <p className="text-[13px] text-muted-foreground">{c.descricao}</p>}
          {c.exemplo && (
            <p className="text-xs text-muted-foreground">
              Exemplo: <span className="font-mono">{c.exemplo}</span>
            </p>
          )}
          {!!c.opcoes?.length && (
            <p className="text-xs text-muted-foreground">Valores aceitos: {c.opcoes.join(", ")}.</p>
          )}
          {!!c.sinonimos?.length && (
            <p className="text-xs text-muted-foreground">Também reconhecemos: {c.sinonimos.join(", ")}.</p>
          )}
        </div>
      ))}
    </div>
  );
}

function OpcaoComMarcador({
  marcada,
  onMarcar,
  titulo,
  texto,
  perigosa = false,
  desabilitada = false,
}: {
  marcada: boolean;
  onMarcar: (v: boolean) => void;
  titulo: string;
  texto?: React.ReactNode;
  perigosa?: boolean;
  desabilitada?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm",
        perigosa ? "border-destructive-border bg-destructive-soft/50" : "border-border bg-card",
        desabilitada && "cursor-not-allowed opacity-60"
      )}
    >
      <Checkbox
        className="mt-0.5"
        checked={marcada}
        disabled={desabilitada}
        onCheckedChange={(v) => onMarcar(v === true)}
      />
      <span className="grid gap-0.5">
        <span className="font-medium">{titulo}</span>
        {texto && <span className="text-xs leading-[1.5] text-muted-foreground">{texto}</span>}
      </span>
    </label>
  );
}

// ------------------------------------------------------------------ o diálogo

/** A frase do que há de errado com o arquivo (formato, tamanho), ou nulo se está tudo bem. */
function problemaDoArquivo(a: File, info: ColunasAceitas | undefined): string | null {
  const nome = a.name.toLowerCase();
  const aceitos = info?.formatos ?? FORMATOS_PADRAO;
  if (!aceitos.some((f) => nome.endsWith(f.toLowerCase()))) {
    return `Este arquivo não serve. Envie uma planilha em ${aceitos.join(" ou ")}.`;
  }
  if (a.size === 0) return "O arquivo está vazio.";
  if (info && info.limiteDeBytes > 0 && a.size > info.limiteDeBytes) {
    return `O arquivo tem ${megabytes(a.size)} e o limite é ${megabytes(info.limiteDeBytes)}. Divida a planilha em partes menores.`;
  }
  return null;
}

export function DialogDeImportacao({
  tipo,
  onFechar,
}: {
  tipo: TipoDeImportacao;
  onFechar: () => void;
}) {
  const config = CONFIG_DA_IMPORTACAO[tipo];
  const ehOrcamento = tipo === "orcamento";

  const aceitas = useColunasDaImportacao(tipo);
  const lerPrevia = usePreviaDaImportacao(tipo);
  const confirmar = useConfirmarImportacao(tipo);

  const entrada = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [baixandoModelo, setBaixandoModelo] = useState(false);
  const [verColunas, setVerColunas] = useState(false);

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<PreviaDaImportacao | null>(null);
  const [resultado, setResultado] = useState<ResultadoDaImportacao | null>(null);
  const [substituirAno, setSubstituirAno] = useState(false);
  const [todasOuNenhuma, setTodasOuNenhuma] = useState(false);
  const [soErros, setSoErros] = useState(false);

  const formatos = aceitas.data?.formatos ?? FORMATOS_PADRAO;
  const passo = resultado ? 3 : previa ? 2 : 1;
  const ocupado = lerPrevia.isPending || confirmar.isPending;

  function pedirParaFechar(aberto: boolean) {
    if (!aberto && !confirmar.isPending) onFechar();
  }

  async function ler(a: File, substituir: boolean) {
    try {
      const p = await lerPrevia.mutateAsync({ arquivo: a, substituirAno: ehOrcamento ? substituir : undefined });
      setPrevia(p);
      setSoErros(false);
    } catch (err) {
      setPrevia(null);
      setArquivo(null);
      toast.error(err instanceof Error ? err.message : "Não foi possível ler a planilha.");
    }
  }

  async function escolher(a: File | undefined) {
    if (!a || ocupado) return;

    // Se a lista de limites ainda não chegou, busca antes de conferir o tamanho.
    const info = aceitas.data ?? (await aceitas.refetch()).data;
    const problema = problemaDoArquivo(a, info);
    if (problema) {
      toast.error(problema);
      return;
    }

    setArquivo(a);
    await ler(a, substituirAno);
  }

  async function alternarSubstituirAno(v: boolean) {
    setSubstituirAno(v);
    // O "apagaria N" muda com a opção: a prévia é refeita com o mesmo arquivo.
    if (arquivo) await ler(arquivo, v);
  }

  async function gravar() {
    if (!arquivo || !previa) return;
    try {
      const r = await confirmar.mutateAsync({
        arquivo,
        token: previa.token,
        todasOuNenhuma,
        substituirAno: ehOrcamento ? substituirAno : undefined,
      });
      setResultado(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gravar a planilha.");
    }
  }

  function recomecar() {
    setArquivo(null);
    setPrevia(null);
    setResultado(null);
    setTodasOuNenhuma(false);
    setSoErros(false);
    setSubstituirAno(false);
  }

  async function baixarModelo() {
    setBaixandoModelo(true);
    try {
      await baixarModeloDaPlanilha(tipo);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível baixar o modelo.");
    } finally {
      setBaixandoModelo(false);
    }
  }

  const boas = previa ? previa.totais.novas + previa.totais.atualizam : 0;
  const titulos = ["Escolha o arquivo", "Confira", "Resultado"];

  return (
    <Dialog open onOpenChange={pedirParaFechar}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar {config.oQue} por planilha</DialogTitle>
          <DialogDescription>
            Passo <span className="font-mono tabular-nums">{passo}</span> de{" "}
            <span className="font-mono tabular-nums">3</span> · {titulos[passo - 1]}
          </DialogDescription>
        </DialogHeader>

        {/* ------------------------------------------------ lista de colunas aceitas */}
        {verColunas && (
          <div className="grid gap-3">
            <Button variant="ghost" size="sm" className="w-fit" onClick={() => setVerColunas(false)}>
              <ArrowLeft />
              Voltar
            </Button>
            <h3 className="font-heading text-[15px] font-semibold">Colunas aceitas</h3>
            <p className="text-[13px] text-muted-foreground">
              A primeira linha da planilha deve ter os nomes das colunas. Se o nome da sua coluna for parecido com
              um destes, nós reconhecemos.
            </p>
            <ListaDeColunas info={aceitas.data} />
          </div>
        )}

        {/* ------------------------------------------------ passo 1 */}
        {!verColunas && passo === 1 && (
          <div className="grid gap-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setArrastando(true);
              }}
              onDragLeave={() => setArrastando(false)}
              onDrop={(e) => {
                e.preventDefault();
                setArrastando(false);
                void escolher(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "grid justify-items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
                arrastando ? "border-primary bg-accent" : "border-input bg-card"
              )}
            >
              <input
                ref={entrada}
                type="file"
                accept={formatos.join(",")}
                className="sr-only"
                tabIndex={-1}
                aria-label="Arquivo da planilha"
                onChange={(e) => {
                  const a = e.target.files?.[0];
                  // Limpa para poder escolher o mesmo arquivo de novo depois de corrigi-lo.
                  e.target.value = "";
                  void escolher(a);
                }}
              />

              {lerPrevia.isPending ? (
                <>
                  <Loader2 className="size-7 animate-spin text-muted-foreground" />
                  <p className="text-sm font-medium">Lendo a planilha...</p>
                  {arquivo && <p className="text-xs text-muted-foreground">{arquivo.name}</p>}
                </>
              ) : (
                <>
                  <span className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <FileSpreadsheet className="size-5" />
                  </span>
                  <p className="text-sm font-medium">Arraste a planilha para cá</p>
                  <p className="text-xs text-muted-foreground">
                    ou escolha o arquivo no computador ({formatos.join(" ou ")}
                    {aceitas.data && aceitas.data.limiteDeBytes > 0 && (
                      <>, até {megabytes(aceitas.data.limiteDeBytes)}</>
                    )}
                    {aceitas.data && aceitas.data.limiteDeLinhas > 0 && (
                      <>, até {inteiro(aceitas.data.limiteDeLinhas)} linhas</>
                    )}
                    )
                  </p>
                  <Button variant="action" onClick={() => entrada.current?.click()}>
                    <Upload />
                    Escolher arquivo
                  </Button>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Button variant="outline" size="sm" disabled={baixandoModelo} onClick={baixarModelo}>
                <Download />
                {baixandoModelo ? "Baixando..." : "Baixar modelo"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setVerColunas(true)}>
                Ver colunas aceitas
              </Button>
            </div>

            {ehOrcamento && (
              <OpcaoComMarcador
                perigosa={substituirAno}
                marcada={substituirAno}
                desabilitada={ocupado}
                onMarcar={setSubstituirAno}
                titulo="Substituir o orçamento do ano inteiro"
                texto="Cuidado: o orçamento que já está cadastrado para o ano da planilha é apagado e fica só o que estiver nela. Desmarcado, as linhas só entram ou atualizam o que já existe, sem apagar nada. Você vê quantos seriam apagados antes de confirmar."
              />
            )}

            <div className="grid gap-1.5">
              <p className="text-[12.5px] font-medium">Como preencher</p>
              <RegrasDeAjuda tipo={tipo} />
            </div>
          </div>
        )}

        {/* ------------------------------------------------ passo 2 */}
        {!verColunas && passo === 2 && previa && (
          <div className="grid gap-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex min-w-0 items-center gap-2 text-sm">
                <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{previa.arquivo || arquivo?.name}</span>
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => setVerColunas(true)}>
                  Ver colunas aceitas
                </Button>
                <Button variant="outline" size="sm" disabled={ocupado} onClick={recomecar}>
                  Trocar arquivo
                </Button>
              </div>
            </div>

            <div
              className={cn(
                "grid grid-cols-2 gap-2 sm:grid-cols-3",
                ehOrcamento ? "lg:grid-cols-6" : "lg:grid-cols-5"
              )}
            >
              <Contador rotulo="Linhas lidas" valor={inteiro(previa.totais.linhas)} />
              <Contador rotulo="Novas" valor={inteiro(previa.totais.novas)} tom="bom" />
              <Contador rotulo="Atualizam" valor={inteiro(previa.totais.atualizam)} tom="info" />
              <Contador
                rotulo="Com erro"
                valor={inteiro(previa.totais.erros)}
                tom={previa.totais.erros > 0 ? "ruim" : undefined}
              />
              <Contador rotulo="Valor total" valor={dinheiro(previa.totais.valorTotal)} />
              {ehOrcamento && (
                <Contador
                  rotulo="Apagaria"
                  valor={inteiro(previa.totais.apagariam)}
                  tom={previa.totais.apagariam > 0 ? "atencao" : undefined}
                />
              )}
            </div>

            {previa.colunasIgnoradas.length > 0 && (
              <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-[13px] text-muted-foreground">
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  Colunas que não reconhecemos e vamos ignorar: <strong>{previa.colunasIgnoradas.join(", ")}</strong>.
                </span>
              </p>
            )}

            {ehOrcamento && (
              <OpcaoComMarcador
                perigosa={substituirAno}
                marcada={substituirAno}
                desabilitada={ocupado}
                onMarcar={(v) => void alternarSubstituirAno(v)}
                titulo="Substituir o orçamento do ano inteiro"
                texto={
                  substituirAno
                    ? `Ao confirmar, ${inteiro(previa.totais.apagariam)} orçamento(s) já cadastrado(s) serão apagados e ficará só o que está na planilha.`
                    : "Desmarcado: nada é apagado; as linhas da planilha só entram ou atualizam o que já existe."
                }
              />
            )}

            <OpcaoComMarcador
              marcada={soErros}
              onMarcar={setSoErros}
              titulo="Só erros"
              texto={
                previa.totais.erros === 0 ? "Nenhuma linha com erro." : "Mostra apenas as linhas que precisam de correção."
              }
            />

            <TabelaDaPrevia tipo={tipo} previa={previa} soErros={soErros} />

            {previa.totais.erros > 0 && (
              <p className="text-xs text-muted-foreground">
                As linhas com erro não serão gravadas. Para incluí-las, corrija a planilha e envie de novo: o que já
                foi gravado é atualizado, não duplicado.
              </p>
            )}

            <OpcaoComMarcador
              marcada={todasOuNenhuma}
              onMarcar={setTodasOuNenhuma}
              titulo="Só gravar se todas estiverem certas"
              texto="Se alguma linha tiver erro, nada é gravado."
            />
          </div>
        )}

        {/* ------------------------------------------------ passo 3 */}
        {!verColunas && passo === 3 && resultado && (
          <div className="grid gap-3.5">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Contador rotulo="Gravadas (novas)" valor={inteiro(resultado.gravadas)} tom="bom" />
              <Contador rotulo="Atualizadas" valor={inteiro(resultado.atualizadas)} tom="info" />
              <Contador
                rotulo="Apagadas"
                valor={inteiro(resultado.apagadas)}
                tom={resultado.apagadas > 0 ? "atencao" : undefined}
              />
            </div>

            {resultado.recusadas.length > 0 ? (
              <div className="grid gap-2 rounded-lg border border-destructive-border bg-destructive-soft/50 p-3.5">
                <p className="text-sm font-medium text-destructive-soft-foreground">
                  {inteiro(resultado.recusadas.length)} linha(s) não entraram
                </p>
                <ul className="max-h-[30vh] list-disc space-y-1 overflow-auto pl-5 text-[13px]">
                  {resultado.recusadas.map((r) => (
                    <li key={r.numero}>
                      <span className="font-mono tabular-nums">Linha {r.numero}</span>: {r.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="rounded-lg border border-success-border bg-success-soft px-3.5 py-2.5 text-sm text-success-soft-foreground">
                Tudo certo: todas as linhas confirmadas foram gravadas.
              </p>
            )}
          </div>
        )}

        {/* ------------------------------------------------ rodapé */}
        <DialogFooter>
          {passo === 3 ? (
            <>
              <Button variant="outline" onClick={recomecar}>
                Importar outra planilha
              </Button>
              <Button onClick={onFechar}>Concluir</Button>
            </>
          ) : passo === 2 && !verColunas ? (
            <>
              <Button variant="outline" disabled={confirmar.isPending} onClick={onFechar}>
                Cancelar
              </Button>
              <Button disabled={boas === 0 || ocupado} onClick={gravar}>
                {confirmar.isPending ? "Gravando..." : `Confirmar ${inteiro(boas)} ${boas === 1 ? "linha" : "linhas"}`}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
