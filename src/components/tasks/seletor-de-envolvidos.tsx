"use client";

import { useRef, useState } from "react";
import { Plus, Search } from "lucide-react";

import { ChipDeEnvolvido, ICONE_DO_ENVOLVIDO } from "@/components/tasks/reuniao-pecas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ROTULO_DO_ENVOLVIDO,
  useEnvolviveis,
  useResponsaveisDoAluno,
  type Envolvivel,
  type TipoDeEnvolvido,
} from "@/lib/tasks/use-reunioes-e-atendimentos";
import { cn } from "@/lib/utils";

/** Pessoa na reunião, com uma chave só de tela (responsável sem cadastro não tem id). */
export interface EnvolvidoDoForm extends Envolvivel {
  chave: string;
  /** Vindo do servidor: a pessoa tem usuário no sistema (pode receber card no quadro). */
  temUsuario?: boolean | null;
}

let contador = 0;
export const novaChave = () => `e${++contador}`;

/** Identifica a mesma pessoa (cadastrada ou só por nome) para não repetir. */
export function identidade(e: Pick<Envolvivel, "tipo" | "studentId" | "guardianId" | "funcionarioId" | "nome">): string {
  const id = e.tipo === "Aluno" ? e.studentId : e.tipo === "Funcionario" ? e.funcionarioId : e.guardianId;
  return id != null ? `${e.tipo}:${id}` : `${e.tipo}:nome:${e.nome.trim().toLowerCase()}`;
}

const FILTROS: { valor: TipoDeEnvolvido | ""; rotulo: string }[] = [
  { valor: "", rotulo: "Todos" },
  { valor: "Aluno", rotulo: "Alunos" },
  { valor: "Responsavel", rotulo: "Responsáveis" },
  { valor: "Funcionario", rotulo: "Funcionários" },
];

/** Depois que um aluno entra, oferece os responsáveis cadastrados dele com um toque. */
function SugestaoDeResponsaveis({
  aluno,
  jaTem,
  aoAdicionar,
}: {
  aluno: EnvolvidoDoForm;
  jaTem: Set<string>;
  aoAdicionar: (e: Envolvivel) => void;
}) {
  const { data } = useResponsaveisDoAluno(aluno.studentId ?? null);
  const faltam = (data ?? []).filter((r) => {
    const id = r.guardianId ?? r.id ?? null;
    return !jaTem.has(identidade({ tipo: "Responsavel", guardianId: id, nome: r.nome }));
  });
  if (faltam.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-2 text-[13px]">
      <span className="text-muted-foreground">Responsáveis de {aluno.nome}:</span>
      {faltam.map((r) => (
        <Button
          key={r.guardianId ?? r.id ?? r.nome}
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            aoAdicionar({
              tipo: "Responsavel",
              guardianId: r.guardianId ?? r.id ?? null,
              nome: r.nome,
              detalhe: [r.parentesco, `de ${aluno.nome}`].filter(Boolean).join(" ") || null,
            })
          }
        >
          <Plus /> {r.nome}
          {r.parentesco ? ` (${r.parentesco})` : ""}
        </Button>
      ))}
    </div>
  );
}

/**
 * Seletor único de envolvidos: uma busca por nome que acha aluno, responsável e funcionário, e os escolhidos
 * ficam como chips com ícone por tipo. Ao incluir um aluno, sugere os responsáveis dele. Responsável que não
 * está no cadastro entra só com o nome. Funcionários só aparecem para a gestão (o servidor já filtra).
 */
export function SeletorDeEnvolvidos({
  valor,
  aoMudar,
  mostrarFuncionarios,
}: {
  valor: EnvolvidoDoForm[];
  aoMudar: (novo: EnvolvidoDoForm[]) => void;
  mostrarFuncionarios: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [termo, setTermo] = useState("");
  const [tipo, setTipo] = useState<TipoDeEnvolvido | "">("");
  const [semCadastro, setSemCadastro] = useState(false);
  const [nomeLivre, setNomeLivre] = useState("");
  const [parentescoLivre, setParentescoLivre] = useState("");
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: achados, isFetching, isError } = useEnvolviveis(termo, tipo);
  const jaTem = new Set(valor.map(identidade));
  const resultado = (achados ?? []).filter((e) => !jaTem.has(identidade(e)) && (mostrarFuncionarios || e.tipo !== "Funcionario"));

  function digitar(v: string) {
    setTexto(v);
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(() => setTermo(v), 250);
  }

  function adicionar(e: Envolvivel & { temUsuario?: boolean | null }) {
    if (jaTem.has(identidade(e))) return;
    aoMudar([...valor, { ...e, chave: novaChave() }]);
  }

  function adicionarSemCadastro() {
    const nome = nomeLivre.trim();
    if (!nome) return;
    adicionar({ tipo: "Responsavel", nome, detalhe: parentescoLivre.trim() || null });
    setNomeLivre("");
    setParentescoLivre("");
    setSemCadastro(false);
  }

  const filtros = FILTROS.filter((f) => f.valor !== "Funcionario" || mostrarFuncionarios);
  const alunos = valor.filter((e) => e.tipo === "Aluno" && e.studentId != null);

  return (
    <div className="grid gap-3">
      {valor.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ninguém ainda. Busque pelo nome abaixo (pelo menos uma pessoa).</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5" aria-label="Quem participa">
          {valor.map((e) => (
            <li key={e.chave} className="max-w-full">
              <ChipDeEnvolvido
                tipo={e.tipo}
                nome={e.nome}
                detalhe={e.detalhe}
                aoRemover={() => aoMudar(valor.filter((x) => x.chave !== e.chave))}
              />
            </li>
          ))}
        </ul>
      )}

      {alunos.map((a) => (
        <SugestaoDeResponsaveis key={a.chave} aluno={a} jaTem={jaTem} aoAdicionar={adicionar} />
      ))}

      <div className="grid gap-2">
        <Label htmlFor="envolvidos-busca">Adicionar pessoa</Label>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="envolvidos-busca"
            value={texto}
            onChange={(e) => digitar(e.target.value)}
            placeholder="Nome do aluno, responsável ou funcionário"
            className="pl-8"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Tipo de pessoa">
          {filtros.map((f) => (
            <button
              key={f.valor || "todos"}
              type="button"
              aria-pressed={tipo === f.valor}
              onClick={() => setTipo(f.valor)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors max-md:py-1.5",
                tipo === f.valor ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {f.rotulo}
            </button>
          ))}
        </div>

        {termo.trim().length >= 2 && (
          <div className="rounded-lg border border-border bg-background" role="status" aria-live="polite">
            {isError ? (
              <p className="px-3 py-2 text-sm text-destructive">Não foi possível buscar agora. Tente de novo.</p>
            ) : isFetching && !achados ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">Buscando…</p>
            ) : resultado.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">Ninguém encontrado com esse nome.</p>
            ) : (
              <ul className="max-h-64 divide-y divide-border overflow-y-auto">
                {resultado.map((e) => (
                  <li key={identidade(e)}>
                    <button
                      type="button"
                      onClick={() => adicionar(e)}
                      className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    >
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground [&_svg]:size-3.5">
                        {ICONE_DO_ENVOLVIDO[e.tipo]}
                      </span>
                      <span className="min-w-0 flex-1 break-words">
                        <span className="font-medium">{e.nome}</span>
                        <span className="block text-[12.5px] text-muted-foreground">
                          {ROTULO_DO_ENVOLVIDO[e.tipo]}
                          {e.detalhe ? ` · ${e.detalhe}` : ""}
                        </span>
                      </span>
                      <Plus aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {semCadastro ? (
        <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)_auto] sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="sem-cadastro-nome">Responsável fora do cadastro</Label>
            <Input id="sem-cadastro-nome" value={nomeLivre} maxLength={200} placeholder="Nome" onChange={(e) => setNomeLivre(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sem-cadastro-parentesco">Parentesco</Label>
            <Input
              id="sem-cadastro-parentesco"
              value={parentescoLivre}
              maxLength={60}
              placeholder="Avó, tio…"
              onChange={(e) => setParentescoLivre(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={!nomeLivre.trim()} onClick={adicionarSemCadastro}>
              Adicionar
            </Button>
            <Button type="button" variant="ghost" onClick={() => setSemCadastro(false)}>
              Fechar
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setSemCadastro(true)}>
            <Plus /> Responsável que não está no cadastro
          </Button>
        </div>
      )}
    </div>
  );
}
