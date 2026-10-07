"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { CampoNumerico } from "@/components/finance/precificacao/campo-numerico";
import { SeletorDeTurmas } from "@/components/finance/projetos/seletor-de-turmas";
import { Campo } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  dadosDoProjeto,
  useCriarProjeto,
  useSalvarDados,
  type ProjetoDetalhe,
} from "@/lib/finance/use-projetos";

const MARGEM_PADRAO = 10;

/**
 * Novo projeto (sem `projeto`) ou edição dos dados gerais (com `projeto`).
 *
 * Criar já leva para o projeto. Editar manda o que a tela não mostra aqui (valor por família
 * definido, conta financeira) do jeito que o servidor tem, porque o PUT troca o conjunto todo.
 */
export function DialogProjeto({ projeto, onFechar }: { projeto?: ProjetoDetalhe; onFechar: () => void }) {
  const router = useRouter();
  const criar = useCriarProjeto();
  const salvar = useSalvarDados(projeto?.id ?? "");
  const pendente = criar.isPending || salvar.isPending;

  const [nome, setNome] = useState(projeto?.nome ?? "");
  const [data, setData] = useState(projeto?.dataDoEvento?.slice(0, 10) ?? "");
  const [descricao, setDescricao] = useState(projeto?.descricao ?? "");
  const [familias, setFamilias] = useState<number | null>(projeto?.numeroDeFamilias ?? null);
  const [margem, setMargem] = useState<number | null>(projeto?.margemDesejadaPercentual ?? MARGEM_PADRAO);
  const [turmas, setTurmas] = useState<number[]>(projeto?.turmas.map((t) => t.classId) ?? []);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return setErro("Dê um nome ao projeto.");
    if (familias === null || familias < 1) return setErro("Informe o número de famílias (pelo menos 1).");
    if (margem !== null && margem < 0) return setErro("A margem não pode ser negativa.");

    try {
      if (projeto) {
        await salvar.mutateAsync({
          ...dadosDoProjeto(projeto),
          nome: nome.trim(),
          descricao: descricao.trim() || undefined,
          dataDoEvento: data || undefined,
          numeroDeFamilias: Math.round(familias),
          margemDesejadaPercentual: margem ?? 0,
          classIds: turmas,
        });
        toast.success("Dados do projeto salvos.");
        onFechar();
      } else {
        const criado = await criar.mutateAsync({
          nome: nome.trim(),
          descricao: descricao.trim() || undefined,
          dataDoEvento: data || undefined,
          numeroDeFamilias: Math.round(familias),
          margemDesejadaPercentual: margem ?? 0,
          classIds: turmas.length > 0 ? turmas : undefined,
        });
        toast.success("Projeto criado.");
        router.push(`/finance/projetos/${criado.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o projeto.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !pendente && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{projeto ? "Editar dados do projeto" : "Novo projeto"}</DialogTitle>
          <DialogDescription>
            {projeto
              ? "O orçamento é recalculado com o número de famílias e a margem."
              : "Comece pelo básico. Os itens do orçamento entram na tela do projeto."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={confirmar} noValidate className="grid gap-3.5">
          <Campo id="projeto-nome" rotulo="Nome">
            <Input
              id="projeto-nome"
              value={nome}
              maxLength={120}
              autoFocus
              placeholder="Ex.: Festa junina 2026"
              onChange={(e) => {
                setNome(e.target.value);
                setErro(null);
              }}
              aria-invalid={erro !== null && !nome.trim()}
            />
          </Campo>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Campo id="projeto-data" rotulo="Data do evento">
              <Input id="projeto-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </Campo>
            <Campo id="projeto-familias" rotulo="Número de famílias">
              <CampoNumerico
                id="projeto-familias"
                valor={familias}
                onChange={(v) => {
                  setFamilias(v);
                  setErro(null);
                }}
                min={0}
                placeholder="0"
              />
            </Campo>
          </div>

          <Campo
            id="projeto-margem"
            rotulo="Margem desejada"
            dica="O quanto deve sobrar além do custo. Com ela o sistema sugere o valor por família."
          >
            <CampoNumerico id="projeto-margem" valor={margem} onChange={setMargem} sufixo="%" min={0} />
          </Campo>

          <Campo id="projeto-descricao" rotulo="Descrição">
            <Textarea
              id="projeto-descricao"
              value={descricao}
              maxLength={500}
              rows={2}
              placeholder="Opcional"
              onChange={(e) => setDescricao(e.target.value)}
            />
          </Campo>

          <div className="grid gap-1.5">
            <span className="text-sm leading-none font-medium">Turmas</span>
            <SeletorDeTurmas valor={turmas} onChange={setTurmas} />
          </div>

          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={pendente} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={pendente}>
              {pendente ? "Salvando..." : projeto ? "Salvar" : "Criar projeto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
