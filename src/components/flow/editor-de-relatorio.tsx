"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForms } from "@/lib/flow/use-forms";
import {
  BASE_FORMULARIO,
  FILTRO_COM_ENVIO,
  FILTRO_SEM_ENVIO,
  FILTRO_TODOS,
  useBasesDeRelatorio,
  useSalvarRelatorio,
  type RelatorioDeFormulario,
} from "@/lib/flow/use-relatorios";

const TODAS = "todas";
const SITUACOES = [
  { valor: TODAS, rotulo: "Todos os envios" },
  { valor: "Concluída", rotulo: "Só os aprovados (Concluída)" },
  { valor: "Pendente", rotulo: "Só os pendentes" },
  { valor: "Revisar", rotulo: "Só os para revisar" },
];

// Sentinela de "não cruzar com formulário": o Select não aceita string vazia como valor.
const NENHUM = "nenhum";

// Guid zerado. Com base de cadastro sem cruzamento não existe formulário, mas o payload tem o campo
// obrigatório — o backend ignora o formId quando a base é de cadastro.
const SEM_FORMULARIO = "00000000-0000-0000-0000-000000000000";

/** Como o envio encontra a pessoa. Os slugs vêm do backend; o nome é o da secretaria. */
const ROTULO_DA_CHAVE: Record<string, string> = {
  "aluno-nome-nascimento": "Pelo aluno (nome e data de nascimento)",
  "responsavel-cpf": "Pelo CPF do responsável",
  "responsavel-email": "Pelo e-mail do responsável",
  "usuario-email": "Pelo e-mail da pessoa",
};

const FILTROS_DO_CRUZAMENTO = [
  { valor: FILTRO_TODOS, rotulo: "Todos" },
  { valor: FILTRO_COM_ENVIO, rotulo: "Só quem enviou" },
  { valor: FILTRO_SEM_ENVIO, rotulo: "Só quem não enviou" },
];

/**
 * Criação e edição de um relatório. Conteúdo de um Dialog, montado só enquanto aberto: o estado
 * começa sempre do relatório atual.
 *
 * Duas formas de montar a lista. Na primeira, cada linha é um envio do formulário. Na segunda, cada
 * linha é uma pessoa do cadastro (aluno, responsável, equipe) e o formulário entra ao lado, como
 * colunas — é a única que responde "quem ainda NÃO enviou", que é a pergunta que a escola faz.
 *
 * As colunas saem na ordem das perguntas no formulário — é a ordem em que a família preencheu, e a
 * que a escola já reconhece.
 */
export function EditorDeRelatorio({
  relatorio,
  onFechar,
  onSalvo,
}: {
  relatorio?: RelatorioDeFormulario;
  onFechar: () => void;
  onSalvo?: (salvo: RelatorioDeFormulario) => void;
}) {
  const { data: forms } = useForms();
  const { data: bases } = useBasesDeRelatorio();
  const salvar = useSalvarRelatorio();

  const [nome, setNome] = useState(relatorio?.nome ?? "");
  const [descricao, setDescricao] = useState(relatorio?.descricao ?? "");
  const [base, setBase] = useState(relatorio?.baseDados || BASE_FORMULARIO);
  // Um único estado para o formulário das perguntas: é o formulário do relatório quando a linha é o
  // envio, e o formulário cruzado quando a linha é uma pessoa do cadastro.
  const [formId, setFormId] = useState(() => {
    const salvo = relatorio?.baseDados && relatorio.baseDados !== BASE_FORMULARIO
      ? relatorio.cruzamentoFormId
      : relatorio?.formId;
    return salvo && salvo !== SEM_FORMULARIO ? salvo : "";
  });
  const [chave, setChave] = useState(relatorio?.chaveDeLigacao ?? "");
  const [filtro, setFiltro] = useState(relatorio?.filtroDoCruzamento || FILTRO_TODOS);
  const [situacao, setSituacao] = useState(relatorio?.statusFiltro ?? TODAS);
  const [somenteGestao, setSomenteGestao] = useState(relatorio?.somenteGestao ?? false);
  // Nulo = todas as perguntas (é como o relatório grava "todas"). Vira lista na primeira mudança.
  const [campos, setCampos] = useState<Set<string> | null>(() =>
    relatorio && relatorio.camposIds.length > 0 ? new Set(relatorio.camposIds) : relatorio ? null : new Set()
  );
  // Mesma convenção das perguntas: nulo = todas as colunas da base.
  const [colunasBase, setColunasBase] = useState<Set<string> | null>(() =>
    relatorio && (relatorio.colunasBase?.length ?? 0) > 0 ? new Set(relatorio.colunasBase) : null
  );

  const formularios = forms ?? [];
  const form = formularios.find((f) => f.id === formId);
  const perguntas = [...(form?.campos ?? [])].sort((a, b) => a.ordem - b.ordem);

  const ehCadastro = base !== BASE_FORMULARIO;
  const baseEscolhida = (bases ?? []).find((b) => b.slug === base);
  const colunasDaBase = baseEscolhida?.colunas ?? [];

  const marcada = (id: string) => campos === null || campos.has(id);
  const marcadaNaBase = (slug: string) => colunasBase === null || colunasBase.has(slug);

  function escolherBase(slug: string) {
    setBase(slug);
    // Colunas e chave são de cada base: trocar de base zera o que não vale mais lá.
    setColunasBase(null);
    setChave(slug === BASE_FORMULARIO ? "" : primeiraChave(slug));
  }

  /** Base com uma única chave não é escolha: já vem pronta, e o backend recusa cruzamento sem ela. */
  function primeiraChave(slug: string) {
    const daBase = (bases ?? []).find((b) => b.slug === slug);
    return daBase?.chaves.length === 1 ? daBase.chaves[0] : "";
  }

  function escolherFormulario(id: string) {
    setFormId(id);
    // Perguntas são de cada formulário: trocar de formulário começa com todas marcadas.
    setCampos(null);
    if (id && ehCadastro && !chave) setChave(primeiraChave(base));
  }

  function alternar(id: string, marcado: boolean) {
    setCampos((atuais) => {
      const proximos = new Set(atuais ?? perguntas.map((p) => p.id));
      if (marcado) proximos.add(id);
      else proximos.delete(id);
      return proximos;
    });
  }

  function alternarColunaDaBase(slug: string, marcado: boolean) {
    setColunasBase((atuais) => {
      const proximos = new Set(atuais ?? colunasDaBase.map((c) => c.slug));
      if (marcado) proximos.add(slug);
      else proximos.delete(slug);
      return proximos;
    });
  }

  async function handleSalvar() {
    if (!nome.trim()) return;
    if (!ehCadastro && !formId) return;

    const escolhidas = perguntas.filter((p) => marcada(p.id)).map((p) => p.id);
    if (perguntas.length > 0 && escolhidas.length === 0) {
      toast.error("Escolha ao menos uma pergunta para virar coluna.");
      return;
    }

    const colunasEscolhidas = colunasDaBase.filter((c) => marcadaNaBase(c.slug)).map((c) => c.slug);
    if (ehCadastro && colunasDaBase.length > 0 && colunasEscolhidas.length === 0) {
      toast.error("Escolha ao menos uma coluna do cadastro.");
      return;
    }
    if (ehCadastro && formId && !chave) {
      toast.error("Escolha como o envio é ligado à pessoa.");
      return;
    }

    // Catálogo de bases ainda carregando: devolve as colunas como estavam gravadas. Sem isto,
    // salvar rápido trocaria a escolha da escola por "todas", porque a lista chegou vazia.
    const colunasParaSalvar = !ehCadastro
      ? []
      : colunasDaBase.length === 0
        ? Array.from(colunasBase ?? [])
        : colunasEscolhidas.length === colunasDaBase.length
          ? []
          : colunasEscolhidas;

    try {
      const salvo = await salvar.mutateAsync({
        id: relatorio?.id,
        dados: {
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          formId: formId || SEM_FORMULARIO,
          // Todas marcadas grava vazio: pergunta nova no formulário entra sozinha no relatório.
          camposIds: escolhidas.length === perguntas.length ? [] : escolhidas,
          statusFiltro: situacao === TODAS ? null : situacao,
          somenteGestao,
          baseDados: base,
          // Mesma ideia das perguntas: vazio grava "todas", e coluna nova da base entra sozinha.
          colunasBase: colunasParaSalvar,
          cruzamentoFormId: ehCadastro && formId ? formId : null,
          chaveDeLigacao: ehCadastro && formId ? chave : null,
          filtroDoCruzamento: ehCadastro ? filtro : null,
        },
      });
      toast.success(relatorio ? "Relatório atualizado." : "Relatório criado.");
      onSalvo?.(salvo);
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar o relatório.");
    }
  }

  const quantasMarcadas = perguntas.filter((p) => marcada(p.id)).length;
  const quantasDaBase = colunasDaBase.filter((c) => marcadaNaBase(c.slug)).length;

  // Frase que descreve a planilha que vai sair, em palavras de secretaria. Sem ela, "base",
  // "cruzamento" e "chave" só fazem sentido para quem montou a tela.
  const explicacao = (() => {
    if (!ehCadastro) {
      return form ? `Uma linha por envio de "${form.nome}".` : "Uma linha por envio do formulário.";
    }
    if (!baseEscolhida) return "";

    const inicio = baseEscolhida.descricao.replace(/\.$/, "");
    if (!form) return `${inicio}. Sem cruzar com formulário, sai só a lista do cadastro.`;

    const final =
      filtro === FILTRO_SEM_ENVIO
        ? ` Com "Só quem não enviou", a lista mostra quem falta.`
        : filtro === FILTRO_COM_ENVIO
          ? ` Com "Só quem enviou", a lista mostra só quem já respondeu.`
          : ` Com "Todos", quem não enviou também aparece, com as colunas do formulário em branco.`;
    return `${inicio}, com as respostas de "${form.nome}" ao lado.${final}`;
  })();

  return (
    <>
      <DialogHeader>
        <DialogTitle>{relatorio ? "Editar relatório" : "Novo relatório"}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-[5px]">
          <Label className="text-xs text-muted-foreground">O que vira linha</Label>
          <Select value={base} onValueChange={(v) => v && escolherBase(String(v))}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {() => (ehCadastro ? (baseEscolhida?.rotulo ?? base) : "Cada envio de um formulário")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={BASE_FORMULARIO}>Cada envio de um formulário</SelectItem>
              {(bases ?? []).map((b) => (
                <SelectItem key={b.slug} value={b.slug}>
                  {b.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {baseEscolhida && <p className="text-xs text-muted-foreground">{baseEscolhida.descricao}</p>}
        </div>

        <div className="flex flex-col gap-[5px]">
          <Label className="text-xs text-muted-foreground">Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Autorizações de passeio" />
        </div>
        <div className="flex flex-col gap-[5px]">
          <Label className="text-xs text-muted-foreground">Descrição (opcional)</Label>
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>

        {ehCadastro && colunasDaBase.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-x-2">
              <Label className="text-xs text-muted-foreground">Colunas do cadastro</Label>
              <div className="flex gap-2">
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto min-h-10 px-0 md:min-h-0"
                  onClick={() => setColunasBase(null)}
                >
                  Marcar todas
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto min-h-10 px-0 md:min-h-0"
                  onClick={() => setColunasBase(new Set())}
                >
                  Limpar
                </Button>
              </div>
            </div>
            <div className="flex max-h-48 flex-col overflow-y-auto rounded-lg border border-border p-1.5">
              {colunasDaBase.map((c) => (
                <label
                  key={c.slug}
                  className="flex min-h-9 cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 text-sm leading-snug hover:bg-muted"
                >
                  <Checkbox
                    className="mt-0.5 shrink-0"
                    checked={marcadaNaBase(c.slug)}
                    onCheckedChange={(v) => alternarColunaDaBase(c.slug, !!v)}
                  />
                  <span className="min-w-0 break-words">{c.rotulo}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {quantasDaBase === colunasDaBase.length
                ? "Todas as colunas do cadastro entram na planilha."
                : `${quantasDaBase} coluna(s) do cadastro.`}
            </p>
          </div>
        )}

        {/* min-w-0 nos dois: item de grid tem largura mínima automática, e o nome comprido do
            formulário empurrava a caixa para fora do diálogo, com barra de rolagem horizontal. */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">
              {ehCadastro ? "Cruzar com o formulário (opcional)" : "Formulário"}
            </Label>
            <Select
              value={ehCadastro ? formId || NENHUM : formId || undefined}
              onValueChange={(v) => v && escolherFormulario(String(v) === NENHUM ? "" : String(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {() => form?.nome ?? (ehCadastro ? "Não cruzar" : "Escolha o formulário")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ehCadastro && <SelectItem value={NENHUM}>Não cruzar</SelectItem>}
                {formularios.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Sem formulário cruzado não existe envio para filtrar: o campo só confundiria. */}
          {(!ehCadastro || form) && (
            <div className="flex min-w-0 flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Envios</Label>
              <Select value={situacao} onValueChange={(v) => v && setSituacao(String(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue>{() => SITUACOES.find((s) => s.valor === situacao)?.rotulo}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SITUACOES.map((s) => (
                    <SelectItem key={s.valor} value={s.valor}>
                      {s.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {ehCadastro && form && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Como ligar o envio à pessoa</Label>
              <Select value={chave || undefined} onValueChange={(v) => v && setChave(String(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() => (chave ? (ROTULO_DA_CHAVE[chave] ?? chave) : "Escolha como ligar")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(baseEscolhida?.chaves ?? []).map((c) => (
                    <SelectItem key={c} value={c}>
                      {ROTULO_DA_CHAVE[c] ?? c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Quem entra na lista</Label>
              <Select value={filtro} onValueChange={(v) => v && setFiltro(String(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() => FILTROS_DO_CRUZAMENTO.find((f) => f.valor === filtro)?.rotulo}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {FILTROS_DO_CRUZAMENTO.map((f) => (
                    <SelectItem key={f.valor} value={f.valor}>
                      {f.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {explicacao && (
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs leading-snug text-muted-foreground">
            {explicacao}
          </p>
        )}

        {form && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-x-2">
              <Label className="text-xs text-muted-foreground">
                {ehCadastro ? "Colunas do formulário" : "Colunas"} (
                <span className="font-mono tabular-nums">{perguntas.length}</span> perguntas)
              </Label>
              <div className="flex gap-2">
                <Button variant="link" size="sm" className="h-auto min-h-10 px-0 md:min-h-0" onClick={() => setCampos(null)}>
                  Marcar todas
                </Button>
                <Button variant="link" size="sm" className="h-auto min-h-10 px-0 md:min-h-0" onClick={() => setCampos(new Set())}>
                  Limpar
                </Button>
              </div>
            </div>
            <div className="flex max-h-64 flex-col overflow-y-auto rounded-lg border border-border p-1.5">
              {perguntas.length === 0 && (
                <p className="px-2 py-2 text-xs text-muted-foreground">Este formulário ainda não tem perguntas.</p>
              )}
              {/* Pergunta longa quebra em vez de ser cortada: são 42 numa ficha de matrícula, e
                  metade delas começa igual ("Nome do...", "Data de nascimento do..."). */}
              {perguntas.map((p) => (
                <label
                  key={p.id}
                  className="flex min-h-9 cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 text-sm leading-snug hover:bg-muted"
                >
                  <Checkbox
                    className="mt-0.5 shrink-0"
                    checked={marcada(p.id)}
                    onCheckedChange={(v) => alternar(p.id, !!v)}
                  />
                  <span className="min-w-0 break-words">{p.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {quantasMarcadas === perguntas.length
                ? "Todas as perguntas viram coluna, inclusive as que forem criadas depois."
                : `${quantasMarcadas} coluna(s) escolhida(s).`}
            </p>
          </div>
        )}

        {/* A ficha de matrícula traz mensalidade e desconto negociado. Quem atende no balcão
            precisa da ficha, não do valor — e a coluna não some sozinha, porque a resposta é uma
            só, então o que se esconde é o relatório inteiro. */}
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <Checkbox
            className="mt-0.5 shrink-0"
            checked={somenteGestao}
            onCheckedChange={(v) => setSomenteGestao(!!v)}
          />
          <span className="min-w-0">
            <span className="block font-medium">Somente a gestão vê este relatório</span>
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
              Marque quando o relatório mostrar valores. Secretaria, coordenação e professores não
              veem o relatório nem o download dele.
            </span>
          </span>
        </label>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button
          onClick={handleSalvar}
          disabled={salvar.isPending || !nome.trim() || (!ehCadastro && !formId)}
        >
          {salvar.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </>
  );
}
