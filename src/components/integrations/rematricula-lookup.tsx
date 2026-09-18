"use client";

import { useState } from "react";
import { Search, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useBuscarRematricula,
  useTurmasPublicas,
  type DadosRematricula,
} from "@/lib/integrations/use-rematricula";

/** Rótulo de campo do guia: maiúsculas pequenas, bold, muito espaçadas. */
const rotulo = "text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground";

/**
 * Identificação do aluno no formulário público, que dispara o preenchimento automático.
 *
 * Existe porque todos os responsáveis recebem o MESMO link: sem se identificar, não há como
 * saber de quem é o formulário. Pede três dados (nome, nascimento e turma atual) em vez de CPF —
 * CPF circula em vazamentos e permitiria varrer uma lista colhendo dados de famílias; a
 * combinação exige que quem consulta já saiba de quem está falando.
 *
 * Só aparece quando o formulário tem ao menos um campo marcado para preenchimento automático —
 * um formulário comum não deve pedir identificação nenhuma.
 */
export function RematriculaLookup({
  token,
  onEncontrado,
  onPreencherManualmente,
}: {
  token: string;
  onEncontrado: (dados: DadosRematricula) => void;
  /**
   * Libera o formulário sem ter encontrado o aluno.
   *
   * Só vem preenchido quando o formulário exige identificação E permite a saída manual —
   * sem a exigência não há o que liberar, porque os campos já estão à mostra.
   */
  onPreencherManualmente?: () => void;
}) {
  const { data: turmas = [] } = useTurmasPublicas(token);
  const buscar = useBuscarRematricula(token);

  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [classId, setClassId] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);
  const [encontrado, setEncontrado] = useState<string | null>(null);

  const podeBuscar = nome.trim() !== "" && dataNascimento !== "" && classId !== "";

  async function handleBuscar() {
    setErro(null);
    try {
      const dados = await buscar.mutateAsync({
        nome: nome.trim(),
        dataNascimento,
        classId: Number(classId),
      });

      if (!dados.encontrado) {
        setEncontrado(null);
        setErro(dados.mensagem ?? "Não encontramos esse aluno.");
        return;
      }

      setEncontrado(dados.nomeAluno ?? nome.trim());
      onEncontrado(dados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível consultar agora.");
    }
  }

  if (encontrado) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-success-border bg-success-soft px-4 py-3 text-sm text-success-soft-foreground">
        <CheckCircle2 className="size-4 shrink-0" />
        <span className="min-w-0 break-words">
          Dados de <strong>{encontrado}</strong> carregados. Confira tudo antes de enviar.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="font-heading text-[15.5px] font-semibold tracking-[-.02em]">Identifique o aluno</h2>
        <p className="text-sm text-muted-foreground">
          Preenchemos o resto do formulário automaticamente com os dados que já temos.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className={rotulo}>Nome do aluno</Label>
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Como está na matrícula"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className={rotulo}>Data de nascimento</Label>
        <Input
          type="date"
          className="font-mono tabular-nums"
          value={dataNascimento}
          onChange={(e) => setDataNascimento(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        {/* "atual" em destaque: o erro mais comum é a família informar a turma do ano que vem. */}
        <Label className={rotulo}>
          Turma que ele frequenta <strong className="text-foreground">atualmente</strong>
        </Label>
        <Select value={classId || undefined} onValueChange={(v) => v && setClassId(String(v))}>
          <SelectTrigger className="w-full">
            <SelectValue>
              {() => turmas.find((t) => String(t.id) === classId)?.nome ?? "Selecione"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {turmas.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {erro && (
        <p className="rounded-lg border border-warning-border bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
          {erro}
        </p>
      )}

      <Button
        onClick={handleBuscar}
        disabled={!podeBuscar || buscar.isPending}
        className="h-12 w-full text-base md:h-8 md:text-sm"
      >
        <Search className="size-4" />
        {buscar.isPending ? "Buscando..." : "Buscar meus dados"}
      </Button>

      {/* O botão só aparece depois de uma tentativa que falhou: oferecê-lo de saída convidaria
          a pular a busca, e aí o preenchimento automático não serve para nada. */}
      {onPreencherManualmente && erro && (
        <button
          type="button"
          onClick={onPreencherManualmente}
          className="py-2 text-sm text-muted-foreground underline hover:text-foreground md:py-0 md:text-xs"
        >
          Não consigo encontrar — preencher tudo à mão
        </button>
      )}

      {!onPreencherManualmente && (
        <p className="text-xs text-muted-foreground">
          Não encontrou? Você pode preencher tudo à mão normalmente.
        </p>
      )}
    </div>
  );
}
