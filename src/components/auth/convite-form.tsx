"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConviteValido, DadosDoAceite } from "@/lib/kernel/use-convite";

/** Mesmo mínimo do backend (UserService.TamanhoMinimoDaSenha). */
const TAMANHO_MINIMO_DA_SENHA = 8;

const rotulo = "font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground";

/**
 * Formulário de quem recebeu o convite.
 *
 * Separado da página para poder ser montado sem um convite real. A página cuida de ler o link e
 * falar com o servidor; aqui ficam só os campos e as conferências que evitam uma ida à toa até ele.
 *
 * Não pergunta papel nem turma: isso vem do convite, e é mostrado no topo para a pessoa conferir.
 */
export function ConviteForm({
  convite,
  onEnviar,
  enviando,
  erro,
}: {
  convite: ConviteValido;
  onEnviar: (dados: DadosDoAceite) => void;
  enviando: boolean;
  erro?: string | null;
}) {
  const [dados, setDados] = useState<DadosDoAceite>({
    nome: "",
    cpf: "",
    celular: "",
    senha: "",
    confirmacao: "",
  });
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [tentou, setTentou] = useState(false);

  const cpfDigitos = dados.cpf.replace(/\D/g, "");
  const problemas = {
    nome: !dados.nome.trim() ? "Informe o nome completo." : null,
    cpf: cpfDigitos.length !== 11 ? "O CPF tem 11 números." : null,
    senha:
      dados.senha.length < TAMANHO_MINIMO_DA_SENHA
        ? `A senha precisa ter pelo menos ${TAMANHO_MINIMO_DA_SENHA} caracteres.`
        : null,
    confirmacao: dados.confirmacao !== dados.senha ? "As duas senhas não são iguais." : null,
  };
  const valido = Object.values(problemas).every((p) => p === null);

  function campo<K extends keyof DadosDoAceite>(chave: K) {
    return {
      value: dados[chave],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setDados((d) => ({ ...d, [chave]: e.target.value })),
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTentou(true);
    if (!valido || enviando) return;
    onEnviar(dados);
  }

  // Erro de campo só depois da primeira tentativa: mostrar "informe o nome" antes de a pessoa
  // começar a digitar parece bronca.
  const mostrar = (p: string | null) => tentou && p && <p className="text-sm text-destructive">{p}</p>;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="rounded-md border border-border bg-accent px-3 py-2 text-[12px]">
        <p>
          Convite para o sistema {convite.nomeEscola ? <strong>da {convite.nomeEscola}</strong> : "da escola"}.
        </p>
        {convite.perfil && <p className="text-muted-foreground">Perfil: {convite.perfil}</p>}
      </div>

      {erro && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground">
          {erro}
        </div>
      )}

      <div className="flex flex-col gap-[5px]">
        <Label className={rotulo}>E-mail</Label>
        <Input value={convite.email} readOnly disabled className="h-9" />
      </div>

      <div className="flex flex-col gap-[5px]">
        <Label htmlFor="nome" className={rotulo}>
          Nome completo
        </Label>
        <Input id="nome" autoComplete="name" className="h-9" {...campo("nome")} />
        {mostrar(problemas.nome)}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-[5px]">
          <Label htmlFor="cpf" className={rotulo}>
            CPF
          </Label>
          <Input id="cpf" inputMode="numeric" className="h-9" {...campo("cpf")} />
          {mostrar(problemas.cpf)}
        </div>
        <div className="flex flex-col gap-[5px]">
          <Label htmlFor="celular" className={rotulo}>
            Celular (opcional)
          </Label>
          <Input id="celular" inputMode="tel" autoComplete="tel" className="h-9" {...campo("celular")} />
        </div>
      </div>

      <div className="flex flex-col gap-[5px]">
        <Label htmlFor="senha" className={rotulo}>
          Crie uma senha
        </Label>
        <div className="relative">
          <Input
            id="senha"
            type={mostrarSenha ? "text" : "password"}
            autoComplete="new-password"
            className="h-9 pr-9"
            {...campo("senha")}
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-primary"
            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
          >
            {mostrarSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {mostrar(problemas.senha)}
      </div>

      <div className="flex flex-col gap-[5px]">
        <Label htmlFor="confirmacao" className={rotulo}>
          Repita a senha
        </Label>
        <Input
          id="confirmacao"
          type={mostrarSenha ? "text" : "password"}
          autoComplete="new-password"
          className="h-9"
          {...campo("confirmacao")}
        />
        {mostrar(problemas.confirmacao)}
      </div>

      <Button type="submit" disabled={enviando} className="mt-1 h-10">
        {enviando ? "Criando acesso..." : "Criar meu acesso"}
      </Button>
    </form>
  );
}
