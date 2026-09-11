"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Paperclip, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  decodeFieldConfig,
  decodeOpcoes,
  encodeOpcoes,
  type AutoFillKey,
} from "@/lib/flow/use-form-fields";
import { RematriculaLookup } from "@/components/integrations/rematricula-lookup";
import { decodeFormConfig } from "@/lib/flow/form-config";
import { ContractField } from "@/components/flow/contract-field";
import { CepInput } from "@/components/flow/cep-input";
import { AssinaturaPendente } from "@/components/flow/assinatura-pendente";
import { valorDaParte, type EnderecoCep } from "@/lib/flow/cep";
import type { DadosRematricula } from "@/lib/integrations/use-rematricula";
import {
  usePublicForm,
  useSubmitPublicForm,
  useUploadPublicFormFile,
  PublicFormLoadError,
  type PublicFormFieldDto,
} from "@/lib/flow/use-public-form";

// Novo (2026-08) — link público de preenchimento, pedido explícito do cliente:
// responsáveis externos (sem login) precisam abrir um link e preencher o formulário.
// Página FORA do grupo de rotas (app) — sem layout autenticado, sem sidebar, não
// exige sessão nenhuma. Adaptada de flow/[id]/preencher/page.tsx (staff, autenticada)
// com 2 diferenças deliberadas:
// 1. Campo tipo "referencia" vira texto livre aqui — o lookup de dado de referência
//    (GET /api/ReferenceData/{tabela}) continua [Authorize] de propósito; abrir isso
//    pra qualquer visitante do link deixaria enumerar todo o cadastro de alunos/
//    turmas/usuários da escola sem login nenhum. Um respondente externo digitando o
//    nome à mão é seguro e, na prática, é como ele preencheria de qualquer jeito.
// 2. Sem redirecionamento pós-envio (não existe tela de respostas pra um visitante) —
//    mostra uma confirmação inline.

function isVisible(field: PublicFormFieldDto, answers: Record<string, string>): boolean {
  const config = decodeFieldConfig(field.config);
  if (!config.visibleIf) return true;
  const target = answers[config.visibleIf.fieldId];
  const preenchido = !!target && target.trim() !== "";
  switch (config.visibleIf.operator) {
    case "filled":
      return preenchido;
    case "not_filled":
      return !preenchido;
    case "equals":
      return target === config.visibleIf.value;
    case "not_equals":
      return target !== config.visibleIf.value;
    default:
      return true;
  }
}

function FieldInput({
  field,
  token,
  value,
  onChange,
  travado,
  valoresPorRotulo,
  onEndereco,
}: {
  field: PublicFormFieldDto;
  token: string;
  value: string;
  onChange: (v: string) => void;
  /** Recebe o endereco achado pelo CEP, para preencher os campos marcados. */
  onEndereco?: (endereco: EnderecoCep) => void;
  /** Rotulo -> resposta, para o contrato resolver os marcadores {{campo}}. */
  valoresPorRotulo?: Record<string, string>;
  /** Campo preenchido pela escola (mensalidade, turma do ano seguinte): exibe, não deixa editar. */
  travado?: boolean;
}) {
  // Um <input readOnly> em vez de esconder o campo: a família precisa VER o valor que está
  // aceitando ao assinar. E readOnly (não disabled) porque campo disabled não é enviado em
  // formulário nativo e some de leitores de tela.
  if (travado) {
    return (
      <Input
        value={value}
        readOnly
        tabIndex={-1}
        className="bg-muted/50 text-muted-foreground"
      />
    );
  }

  const config = decodeFieldConfig(field.config);
  const uploadFile = useUploadPublicFormFile(token);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

  switch (field.tipo) {
    case "texto_longo":
      return <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} />;

    case "numero":
      return (
        <Input
          type="number"
          min={config.min}
          max={config.max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "data":
      return <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />;

    case "sim_nao":
      return (
        <div className="flex gap-2">
          {["Sim", "Não"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                "flex-1 rounded-md border px-3 py-2 text-sm transition-colors",
                value === opt
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent/50"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      );

    case "selecao":
    case "dropdown": {
      const opcoes = decodeOpcoes(field.opcoes);
      if (field.tipo === "dropdown") {
        return (
          <Select value={value || undefined} onValueChange={(v) => v && onChange(String(v))}>
            <SelectTrigger className="w-full">
              <SelectValue>{() => value || "Selecione"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {opcoes.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      return (
        <div className="flex flex-col gap-2">
          {opcoes.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              className={cn(
                "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                value === o
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent/50"
              )}
            >
              {o}
            </button>
          ))}
        </div>
      );
    }

    case "checkbox": {
      const opcoes = decodeOpcoes(field.opcoes);
      const selecionados = decodeOpcoes(value);
      return (
        <div className="flex flex-col gap-2">
          {opcoes.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selecionados.includes(o)}
                onCheckedChange={(checked) => {
                  const next = checked ? [...selecionados, o] : selecionados.filter((s) => s !== o);
                  onChange(encodeOpcoes(next) ?? "");
                }}
              />
              {o}
            </label>
          ))}
        </div>
      );
    }

    case "avaliacao": {
      const max = config.maxEstrelas ?? 5;
      return (
        <div className="flex gap-1.5">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(String(n))}
              className={cn(
                "flex size-9 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                Number(value) >= n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent/50"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      );
    }

    // O tipo "contrato" existia no construtor e no backend, mas nenhuma tela sabia desenha-lo:
    // caia no default e virava um campo de texto vazio. Ver contract-field.tsx.
    case "cep":
      return (
        <CepInput
          value={value}
          onChange={onChange}
          onEndereco={(endereco) => onEndereco?.(endereco)}
        />
      );

    case "contrato":
      return (
        <ContractField
          titulo={config.titulo}
          texto={config.contratoTexto ?? ""}
          valoresPorRotulo={valoresPorRotulo ?? {}}
          aceito={value.toLowerCase() === "aceito"}
          onAceitar={(aceito) => onChange(aceito ? "aceito" : "")}
        />
      );

    case "anexo":
      return (
        <div className="flex flex-col gap-1.5">
          {/* O <input type=file> cru so mostrava o texto do navegador ("Nenhum arquivo
              escolhido"), sem nada com cara de botao: ninguem descobria onde clicar. O input
              fica invisivel dentro do label, que vira a area clicavel. */}
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/50">
            <Paperclip className="size-4" />
            {uploadFile.isPending
              ? "Enviando..."
              : value
                ? "Trocar arquivo"
                : "Escolher arquivo"}
          <input
            type="file"
            className="sr-only"
            disabled={uploadFile.isPending}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const url = await uploadFile.mutateAsync(file);
                onChange(url);
                setUploadedName(file.name);
                toast.success("Arquivo enviado.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erro ao enviar arquivo.");
              }
            }}
          />
          </label>
          {value && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Paperclip className="size-3" /> {uploadedName ?? "Arquivo enviado"}
            </p>
          )}
        </div>
      );

    // "referencia" cai aqui de propósito — ver comentário no topo do arquivo.
    case "texto_curto":
    case "referencia":
    default:
      return (
        <Input
          value={value}
          maxLength={config.maxLength}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

// Traduz os dados do cadastro para o texto que vai no campo.
//
// Dinheiro e data viram string aqui, e nao no backend, porque e aqui que se sabe o formato que
// o respondente le. Datas chegam ISO (o input type=date exige ISO); dinheiro vira "R$ 1.234,56"
// porque esse valor entra no contrato assinado e precisa ser lido sem ambiguidade.
function valorAutoPreenchido(chave: AutoFillKey, dados: DadosRematricula): string | null {
  const moeda = (v: number | null | undefined) =>
    v == null ? null : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  switch (chave) {
    case "nome_aluno":
      return dados.nomeAluno ?? null;
    case "data_nascimento_aluno":
      return dados.dataNascimentoAluno ? dados.dataNascimentoAluno.slice(0, 10) : null;
    case "turma_atual":
      return dados.turmaAtual ?? null;
    case "turma_proximo_ano":
      return dados.turmaProximoAno ?? null;
    case "nome_responsavel":
      return dados.nomeResponsavel ?? null;
    case "cpf_responsavel":
      return dados.cpfResponsavel ?? null;
    case "email_responsavel":
      return dados.emailResponsavel ?? null;
    case "telefone_responsavel":
      return dados.telefoneResponsavel ?? null;
    case "valor_atual":
      return moeda(dados.valorAtual);
    case "valor_proximo_ano":
      return moeda(dados.valorProximoAno);
    case "valor_anuidade":
      return moeda(dados.valorAnuidade);
    case "percentual_reajuste":
      return dados.percentualReajuste == null ? null : dados.percentualReajuste + "%";
    case "cep":
      return dados.cep ?? null;
    case "logradouro":
      return dados.logradouro ?? null;
    case "numero_endereco":
      return dados.numeroEndereco ?? null;
    case "complemento":
      return dados.complemento ?? null;
    case "bairro":
      return dados.bairro ?? null;
    case "cidade":
      return dados.cidade ?? null;
    case "uf":
      return dados.uf ?? null;
    case "endereco_completo":
      // Mesma composicao do preenchimento por CEP, para o campo unico de endereco.
      return [dados.logradouro, dados.bairro].filter(Boolean).join(" - ") || null;
    case "cidade_uf":
      return [dados.cidade, dados.uf].filter(Boolean).join("/") || null;
    case "dia_vencimento":
      return dados.diaVencimento == null ? null : String(dados.diaVencimento);
    default:
      return null;
  }
}

export default function PublicFormFillPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const { data: form, isLoading, isError, error, refetch, isFetching } = usePublicForm(token);
  const submitForm = useSubmitPublicForm(token);
  const loadErrorKind = error instanceof PublicFormLoadError ? error.kind : "unavailable";

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [nomeReferencia, setNomeReferencia] = useState("");
  const [observacoes, setObservacoes] = useState("");
  // Id da resposta enviada: e por ele que a tela acompanha a assinatura logo depois do envio.
  const [respostaId, setRespostaId] = useState<string | null>(null);
  const [autoPreenchido, setAutoPreenchido] = useState(false);

  // Valores que o campo já nasce trazendo (Config.valorPadrao). Aplicados uma vez, quando os
  // campos chegam: depois disso a resposta é do respondente, e reaplicar apagaria o que digitou.
  const [padroesAplicados, setPadroesAplicados] = useState(false);

  // A família optou por preencher sem ter sido encontrada.
  const [preenchendoManualmente, setPreenchendoManualmente] = useState(false);

  const campos = [...(form?.campos ?? [])].sort((a, b) => a.ordem - b.ordem);
  const camposVisiveis = campos.filter((c) => isVisible(c, answers));

  if (!padroesAplicados && campos.length > 0) {
    const padroes: Record<string, string> = {};
    for (const campo of campos) {
      const padrao = decodeFieldConfig(campo.config).valorPadrao;
      if (padrao) padroes[campo.id] = padrao;
    }

    // setState durante o render é intencional e seguro aqui: acontece uma vez só (o flag),
    // antes de qualquer interação, e evita o piscar de um useEffect mostrando o campo vazio
    // antes de preencher — num contrato, isso é o valor errado à vista por um instante.
    if (Object.keys(padroes).length > 0) setAnswers((a) => ({ ...padroes, ...a }));
    setPadroesAplicados(true);
  }

  // Rotulo -> resposta. O contrato resolve os marcadores {{campo}} contra isso, do mesmo jeito
  // que o backend faz ao gerar o PDF: quem le na tela ve o texto que vai ser assinado.
  const valoresPorRotulo = Object.fromEntries(
    campos.map((c) => [c.label, answers[c.id] ?? ""])
  );

  // O bloco de identificacao so existe se a escola marcou algum campo para preenchimento
  // automatico: um formulario comum (pesquisa, autorizacao de passeio) nao deve pedir nada disso.
  const usaAutoPreenchimento = campos.some((c) => !!decodeFieldConfig(c.config).autoPreenchimento);

  const regras = decodeFormConfig(form?.config);

  // Com a regra ligada, o formulário só aparece depois da busca. Sem ela, tudo à mostra desde
  // o início — que é como os formulários existentes já funcionam.
  const exigeIdentificacao = usaAutoPreenchimento && !!regras.exigirIdentificacao;
  const mostrarCampos = !exigeIdentificacao || autoPreenchido || preenchendoManualmente;

  // Espalha o endereco achado pelo CEP nos campos marcados para receber cada parte.
  //
  // Sobrescreve o que estiver la: quem corrige o CEP espera o endereco todo trocar junto, e
  // manter o antigo deixaria rua de um lugar com cidade de outro.
  function aplicarEndereco(endereco: EnderecoCep) {
    setAnswers((atuais) => {
      const proximos = { ...atuais };

      for (const campo of campos) {
        const parte = decodeFieldConfig(campo.config).preenchidoPeloCep;
        if (!parte) continue;

        const valor = valorDaParte(parte, endereco);
        if (valor) proximos[campo.id] = valor;
      }

      return proximos;
    });
  }

  function aplicarDados(dados: DadosRematricula) {
    setAnswers((atuais) => {
      const proximos = { ...atuais };

      for (const campo of campos) {
        const chave = decodeFieldConfig(campo.config).autoPreenchimento;
        if (!chave) continue;

        const valor = valorAutoPreenchido(chave, dados);

        // Dado ausente no cadastro deixa o campo como esta, em branco, para a familia preencher.
        // Escrever string vazia apagaria o que ela ja tivesse digitado antes de buscar.
        if (valor != null && valor !== "") proximos[campo.id] = valor;
      }

      return proximos;
    });
    setAutoPreenchido(true);
  }

  async function handleSubmit() {
    try {
      const criada = await submitForm.mutateAsync({
        nomeReferencia: nomeReferencia.trim() || null,
        observacoes: observacoes.trim() || null,
        itens: camposVisiveis.map((c) => ({ fieldId: c.id, valor: answers[c.id] ?? null })),
      });
      setRespostaId((criada as { id?: string } | undefined)?.id ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar resposta.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-2xl">
        <p className="mb-4 text-center text-xs font-medium tracking-wide text-muted-foreground uppercase">
          EducaPilot
        </p>

        {isLoading && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {!isLoading && (isError || !form) && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive-border bg-destructive-soft px-4 py-6 text-center text-sm text-destructive-soft-foreground">
            <p>
              {loadErrorKind === "not-found"
                ? "Este link não é válido ou o formulário foi removido."
                : (error instanceof Error ? error.message : null) ??
                  "Não foi possível carregar o formulário agora. Tente novamente em instantes."}
            </p>
            {loadErrorKind === "unavailable" && (
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                {isFetching ? "Tentando..." : "Tentar novamente"}
              </Button>
            )}
          </div>
        )}

        {!isLoading && form && form.status !== "Ativo" && (
          <div className="rounded-lg border border-warning-border bg-warning-soft px-4 py-6 text-center text-sm text-warning-soft-foreground">
            Este formulário não está aberto para respostas no momento.
          </div>
        )}

        {!isLoading && form && form.status === "Ativo" && respostaId && (
          <AssinaturaPendente token={token} responseId={respostaId} />
        )}

        {!isLoading && form && form.status === "Ativo" && !respostaId && (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <h1 className="font-heading text-xl font-bold">{form.nome}</h1>
              {form.descricao && <p className="text-sm text-muted-foreground">{form.descricao}</p>}
            </div>

            {usaAutoPreenchimento && (
              <RematriculaLookup
                token={token}
                onEncontrado={aplicarDados}
                // Escape para quem a busca não acha — nome com grafia diferente da matrícula,
                // data digitada errada. Sem isso, essas famílias não conseguiriam enviar nada.
                onPreencherManualmente={
                  exigeIdentificacao && regras.permitirSemEncontrar !== false
                    ? () => setPreenchendoManualmente(true)
                    : undefined
                }
              />
            )}

            {mostrarCampos && (
            <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Seu nome (opcional)</Label>
                <Input value={nomeReferencia} onChange={(e) => setNomeReferencia(e.target.value)} />
              </div>

              {camposVisiveis.map((field) => {
                const config = decodeFieldConfig(field.config);

                // Travado é travado desde o começo, com ou sem busca: são os campos que a escola
                // define (valor, turma do ano seguinte, desconto). Antes isto só valia depois da
                // busca, e os campos que a escola preenche por fora — como o desconto, que na
                // rematrícula não se aplica — ficavam abertos para a família digitar qualquer coisa.
                const travado = !!config.travado;

                return (
                  <div key={field.id} className="flex flex-col gap-[5px]">
                    <Label className="text-sm">
                      {field.label}
                      {field.obrigatorio && !travado && <span className="text-destructive"> *</span>}
                    </Label>
                    <FieldInput
                      field={field}
                      token={token}
                      value={answers[field.id] ?? ""}
                      onChange={(v) => setAnswers((a) => ({ ...a, [field.id]: v }))}
                      travado={travado}
                      valoresPorRotulo={valoresPorRotulo}
                      onEndereco={aplicarEndereco}
                    />
                    {travado && (
                      <p className="text-xs text-muted-foreground">
                        Definido pela escola. Se algo estiver errado, fale com a secretaria antes de enviar.
                      </p>
                    )}
                  </div>
                );
              })}

              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Observações (opcional)</Label>
                <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />
              </div>
            </div>
            )}

            {mostrarCampos && (
              <Button onClick={handleSubmit} disabled={submitForm.isPending}>
                {submitForm.isPending ? "Enviando..." : "Enviar resposta"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
