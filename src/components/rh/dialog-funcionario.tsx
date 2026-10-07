"use client";

import { useState } from "react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUsers } from "@/lib/kernel/use-users";
import {
  mascararCpf,
  mascararMoeda,
  moedaParaNumero,
  numeroParaMoeda,
  soDigitos,
} from "@/lib/rh/formatar";
import {
  ROTULO_DO_CONTRATO,
  TIPOS_DE_CONTRATO,
  useSalvarFuncionario,
  type Funcionario,
  type SalvarFuncionario,
  type TipoDeContrato,
} from "@/lib/rh/use-rh";

import { Campo } from "./campo";

const SEM_USUARIO = "nenhum";

interface Formulario {
  nomeCompleto: string;
  cpf: string;
  dataDeNascimento: string;
  email: string;
  telefone: string;
  cargo: string;
  departamento: string;
  tipoDeContrato: TipoDeContrato;
  dataDeAdmissao: string;
  salario: string;
  cargaHorariaSemanal: string;
  observacoes: string;
  userId: string;
}

function formularioDe(f: Funcionario | null): Formulario {
  return {
    nomeCompleto: f?.nomeCompleto ?? "",
    cpf: f?.cpf ? mascararCpf(f.cpf) : "",
    dataDeNascimento: f?.dataDeNascimento ?? "",
    email: f?.email ?? "",
    telefone: f?.telefone ?? "",
    cargo: f?.cargo ?? "",
    departamento: f?.departamento ?? "",
    tipoDeContrato: f?.tipoDeContrato ?? "CLT",
    dataDeAdmissao: f?.dataDeAdmissao ?? "",
    salario: numeroParaMoeda(f?.salario),
    cargaHorariaSemanal: f?.cargaHorariaSemanal != null ? String(f.cargaHorariaSemanal) : "",
    observacoes: f?.observacoes ?? "",
    userId: f?.userId ?? SEM_USUARIO,
  };
}

const textoOuNulo = (v: string) => (v.trim() ? v.trim() : null);

/** O que o servidor espera a partir do que está na tela, ou a frase que diz o que falta. */
function validar(f: Formulario): { erro: string } | { dados: SalvarFuncionario } {
  const nome = f.nomeCompleto.trim();
  if (!nome) return { erro: "Informe o nome completo." };

  const cpf = soDigitos(f.cpf);
  if (cpf && cpf.length !== 11) return { erro: "O CPF precisa ter 11 números." };

  const email = f.email.trim();
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { erro: "Informe um e-mail válido." };

  const carga = f.cargaHorariaSemanal.trim() ? Number(f.cargaHorariaSemanal.replace(",", ".")) : null;
  if (carga !== null && (!Number.isFinite(carga) || carga < 0 || carga > 80)) {
    return { erro: "A carga horária semanal vai de 0 a 80 horas." };
  }

  return {
    dados: {
      nomeCompleto: nome,
      cpf: cpf || null,
      dataDeNascimento: f.dataDeNascimento || null,
      email: textoOuNulo(email ?? ""),
      telefone: textoOuNulo(f.telefone),
      cargo: textoOuNulo(f.cargo),
      departamento: textoOuNulo(f.departamento),
      tipoDeContrato: f.tipoDeContrato,
      dataDeAdmissao: f.dataDeAdmissao || null,
      salario: moedaParaNumero(f.salario),
      cargaHorariaSemanal: carga,
      observacoes: textoOuNulo(f.observacoes),
      userId: f.userId === SEM_USUARIO ? null : f.userId,
    },
  };
}

/**
 * Cadastrar ou editar a ficha de um funcionário.
 *
 * O pai monta o diálogo quando abre e o desmonta ao fechar, então o formulário nasce da ficha
 * recebida sem efeito de sincronização. O usuário do sistema (userId) é opcional: liga a ficha à
 * conta de quem também entra no EducaPilot.
 */
export function DialogFuncionario({
  funcionario,
  onSalvo,
  onFechar,
}: {
  funcionario: Funcionario | null;
  onSalvo?: (salvo: Funcionario) => void;
  onFechar: () => void;
}) {
  const salvar = useSalvarFuncionario();
  const { data: usuarios, isLoading: carregandoUsuarios, isError: usuariosFalhou } = useUsers(1, 100);
  const [f, setF] = useState(() => formularioDe(funcionario));
  const [erro, setErro] = useState<string | null>(null);

  function mudar(parte: Partial<Formulario>) {
    setF((atual) => ({ ...atual, ...parte }));
    setErro(null);
  }

  const itensDeUsuario = (usuarios?.items ?? []).filter((u) => u.ativo || u.id === f.userId);
  const usuarioEscolhido = itensDeUsuario.find((u) => u.id === f.userId);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const resultado = validar(f);
    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }

    try {
      const salvo = await salvar.mutateAsync({ id: funcionario?.id, dados: resultado.dados });
      toast.success(funcionario ? "Funcionário atualizado." : "Funcionário cadastrado.");
      onSalvo?.(salvo);
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o funcionário.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !salvar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{funcionario ? "Editar funcionário" : "Novo funcionário"}</DialogTitle>
          <DialogDescription>
            Dados da ficha. Salário e CPF só aparecem para quem tem acesso ao RH.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} noValidate className="grid gap-4">
          <Campo id="func-nome" rotulo="Nome completo">
            <Input
              id="func-nome"
              value={f.nomeCompleto}
              onChange={(e) => mudar({ nomeCompleto: e.target.value })}
              autoFocus
              autoComplete="off"
              aria-invalid={erro !== null && !f.nomeCompleto.trim()}
            />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="func-cpf" rotulo="CPF">
              <Input
                id="func-cpf"
                inputMode="numeric"
                value={f.cpf}
                onChange={(e) => mudar({ cpf: mascararCpf(e.target.value) })}
                placeholder="000.000.000-00"
                autoComplete="off"
              />
            </Campo>
            <Campo id="func-nascimento" rotulo="Data de nascimento">
              <Input
                id="func-nascimento"
                type="date"
                value={f.dataDeNascimento}
                onChange={(e) => mudar({ dataDeNascimento: e.target.value })}
              />
            </Campo>
            <Campo id="func-email" rotulo="E-mail">
              <Input
                id="func-email"
                type="email"
                value={f.email}
                onChange={(e) => mudar({ email: e.target.value })}
                autoComplete="off"
              />
            </Campo>
            <Campo id="func-telefone" rotulo="Telefone">
              <Input
                id="func-telefone"
                type="tel"
                value={f.telefone}
                onChange={(e) => mudar({ telefone: e.target.value })}
                autoComplete="off"
              />
            </Campo>
            <Campo id="func-cargo" rotulo="Cargo">
              <Input id="func-cargo" value={f.cargo} onChange={(e) => mudar({ cargo: e.target.value })} />
            </Campo>
            <Campo id="func-departamento" rotulo="Departamento">
              <Input
                id="func-departamento"
                value={f.departamento}
                onChange={(e) => mudar({ departamento: e.target.value })}
              />
            </Campo>
            <Campo id="func-contrato" rotulo="Tipo de contrato">
              <Select
                value={f.tipoDeContrato}
                onValueChange={(v) => v && mudar({ tipoDeContrato: v as TipoDeContrato })}
              >
                <SelectTrigger id="func-contrato" className="w-full">
                  <SelectValue>{() => ROTULO_DO_CONTRATO[f.tipoDeContrato]}</SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {TIPOS_DE_CONTRATO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ROTULO_DO_CONTRATO[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo id="func-admissao" rotulo="Data de admissão">
              <Input
                id="func-admissao"
                type="date"
                value={f.dataDeAdmissao}
                onChange={(e) => mudar({ dataDeAdmissao: e.target.value })}
              />
            </Campo>
            <Campo id="func-salario" rotulo="Salário">
              <Input
                id="func-salario"
                inputMode="numeric"
                value={f.salario}
                onChange={(e) => mudar({ salario: mascararMoeda(e.target.value) })}
                placeholder="R$ 0,00"
                autoComplete="off"
              />
            </Campo>
            <Campo id="func-carga" rotulo="Carga horária semanal (horas)">
              <Input
                id="func-carga"
                inputMode="decimal"
                value={f.cargaHorariaSemanal}
                onChange={(e) => mudar({ cargaHorariaSemanal: e.target.value })}
                placeholder="Ex.: 40"
              />
            </Campo>
          </div>

          <Campo
            id="func-usuario"
            rotulo="Usuário do sistema"
            dica={
              usuariosFalhou
                ? "Não foi possível carregar os usuários. Você pode ligar a conta depois."
                : "Liga a ficha à conta de quem também entra no EducaPilot."
            }
          >
            <Select
              value={f.userId}
              onValueChange={(v) => v && mudar({ userId: v })}
              disabled={carregandoUsuarios || usuariosFalhou}
            >
              <SelectTrigger id="func-usuario" className="w-full">
                <SelectValue>
                  {() =>
                    f.userId === SEM_USUARIO
                      ? "Sem usuário"
                      : (usuarioEscolhido?.fullName ?? (carregandoUsuarios ? "Carregando..." : "Usuário ligado"))
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} className="max-h-72">
                <SelectItem value={SEM_USUARIO}>Sem usuário</SelectItem>
                {itensDeUsuario.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.fullName}
                    <span className="text-muted-foreground"> · {u.email}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          <Campo id="func-observacoes" rotulo="Observações">
            <Textarea
              id="func-observacoes"
              value={f.observacoes}
              onChange={(e) => mudar({ observacoes: e.target.value })}
              rows={3}
            />
          </Campo>

          {erro && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {erro}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={salvar.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
