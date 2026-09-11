"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useTenantEmail,
  useSaveTenantEmail,
  useTestarTenantEmail,
} from "@/lib/kernel/use-tenant-email";

// Conta de e-mail da escola (2026-09).
//
// Por escola, e não uma configuração única do sistema: a família responde ao endereço que recebeu,
// e todo provedor limita envios por conta — uma escola em janela de matrícula não pode travar o
// envio das outras.

export default function EmailEscolaPage() {
  const { data, isLoading, isError } = useTenantEmail();
  const salvar = useSaveTenantEmail();
  const testar = useTestarTenantEmail();

  // null = ainda não mexeram; o valor exibido vem do servidor. Evita a janela em que o formulário
  // aparece vazio antes de um efeito copiar os dados.
  const [editado, setEditado] = useState<Record<string, string> | null>(null);
  const [destinoTeste, setDestinoTeste] = useState("");
  const [erroTeste, setErroTeste] = useState<string | null>(null);

  const valores = {
    host: data?.host ?? "",
    port: String(data?.port ?? 587),
    username: data?.username ?? "",
    senha: "",
    remetente: data?.remetente ?? "",
    nomeRemetente: data?.nomeRemetente ?? "",
    ...(editado ?? {}),
  };

  function mudar(campo: string, valor: string) {
    setEditado((atual) => ({ ...(atual ?? {}), [campo]: valor }));
  }

  async function handleSalvar() {
    try {
      await salvar.mutateAsync({
        host: valores.host.trim(),
        port: Number(valores.port) || 587,
        username: valores.username.trim(),
        senha: valores.senha.trim() || undefined,
        remetente: valores.remetente.trim() || null,
        nomeRemetente: valores.nomeRemetente.trim() || null,
      });
      setEditado(null);
      toast.success("Configuração salva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  async function handleTestar() {
    setErroTeste(null);
    try {
      const resultado = await testar.mutateAsync(destinoTeste.trim());
      if (resultado.sucesso) {
        toast.success("E-mail de teste enviado. Confira a caixa de entrada.");
        return;
      }
      setErroTeste(resultado.erro ?? "Não foi possível enviar.");
    } catch (err) {
      setErroTeste(err instanceof Error ? err.message : "Não foi possível enviar.");
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl font-bold">E-mail da escola</h1>
        <p className="text-sm text-muted-foreground">
          Conta usada para enviar as mensagens automáticas — entre elas o contrato assinado, depois
          que a gestão aprova a matrícula. É este endereço que a família vê como remetente.
        </p>
      </div>

      {isLoading && <Skeleton className="h-72 w-full" />}

      {isError && (
        <p className="rounded-lg border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar a configuração.
        </p>
      )}

      {!isLoading && !isError && (
        <>
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Servidor de envio (SMTP)</Label>
                <Input
                  value={valores.host}
                  placeholder="smtp.gmail.com"
                  onChange={(e) => mudar("host", e.target.value)}
                />
                {/* Erro facil de cometer e dificil de perceber: o campo pede o servidor, mas o
                    nome da tela e "e-mail da escola" e o primeiro impulso e digitar o endereco.
                    Sem este aviso, o problema so apareceria no teste de envio, como uma falha de
                    conexao que nao diz o que esta errado. */}
                {valores.host.includes("@") && (
                  <p className="rounded-md border border-warning-border bg-warning-soft px-2 py-1 text-xs text-warning-soft-foreground">
                    Isto parece um endereco de e-mail. Aqui vai o servidor: no Gmail,
                    <strong> smtp.gmail.com</strong>. O e-mail vai no campo Usuario.
                  </p>
                )}
              </div>
              <div className="flex w-24 flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Porta</Label>
                <Input
                  type="number"
                  value={valores.port}
                  onChange={(e) => mudar("port", e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Usuário</Label>
              <Input
                value={valores.username}
                placeholder="atendimento@suaescola.com.br"
                onChange={(e) => mudar("username", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">
                Senha {data?.configurado && "(deixe em branco para manter a atual)"}
              </Label>
              <Input
                type="password"
                value={valores.senha}
                placeholder={data?.configurado ? "••••••••••••" : "senha de app"}
                onChange={(e) => mudar("senha", e.target.value)}
              />
              {/* A senha é gravada cifrada e nunca volta para a tela — por isso o campo em branco
                  significa "mantém a que está lá", e não "apaga". */}
              <p className="text-xs text-muted-foreground">
                No Gmail, use uma senha de app (não a senha normal da conta). Ela fica cifrada no
                banco e nunca é exibida de volta. A senha de app vale só na conta que a gerou —
                precisa ser a mesma do campo Usuário.
              </p>
            </div>

            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Remetente (opcional)</Label>
                <Input
                  value={valores.remetente}
                  placeholder="igual ao usuário"
                  onChange={(e) => mudar("remetente", e.target.value)}
                />
              </div>
              <div className="flex flex-1 flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Nome exibido</Label>
                <Input
                  value={valores.nomeRemetente}
                  placeholder="Colégio Aprender & Saber"
                  onChange={(e) => mudar("nomeRemetente", e.target.value)}
                />
              </div>
            </div>

            <Button onClick={handleSalvar} disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Mail className="size-4 shrink-0 text-primary" />
              <h2 className="font-heading text-sm font-semibold">Testar envio</h2>
            </div>

            <p className="text-xs text-muted-foreground">
              Manda uma mensagem agora. Vale fazer antes de abrir a rematrícula: uma credencial
              errada só apareceria quando as famílias reclamassem de não ter recebido o contrato.
            </p>

            {data?.testadoEm && (
              <p className="flex items-center gap-1 text-xs text-success-soft-foreground">
                <CheckCircle2 className="size-3.5" />
                Último teste bem-sucedido em{" "}
                {new Date(data.testadoEm).toLocaleString("pt-BR")}
              </p>
            )}

            <div className="flex gap-2">
              <Input
                value={destinoTeste}
                placeholder="seu-email@exemplo.com"
                onChange={(e) => setDestinoTeste(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={handleTestar}
                disabled={testar.isPending || !destinoTeste.trim()}
              >
                {testar.isPending ? "Enviando..." : "Enviar teste"}
              </Button>
            </div>

            {erroTeste && (
              // Mensagem do provedor, sem tradução: é ela que diz se foi senha, porta ou bloqueio.
              <p className="rounded-md border border-destructive-border bg-destructive-soft px-3 py-2 text-xs text-destructive-soft-foreground">
                {erroTeste}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
