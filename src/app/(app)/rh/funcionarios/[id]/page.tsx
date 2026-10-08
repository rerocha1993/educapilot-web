"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Pencil, RotateCcw, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { Campo, ErroDeCarga } from "@/components/rh/campo";
import { Confirmacao } from "@/components/rh/confirmacao";
import { DialogFuncionario } from "@/components/rh/dialog-funcionario";
import { PainelDeAfastamentos } from "@/components/rh/painel-de-afastamentos";
import { PainelDeAtestados } from "@/components/rh/painel-de-atestados";
import { PainelDeDocumentos } from "@/components/rh/painel-de-documentos";
import { PainelDePonto } from "@/components/rh/painel-de-ponto";
import { RhNav } from "@/components/rh/rh-nav";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { podeVerArea } from "@/lib/access/pode-ver";
import { useMeuAcesso } from "@/lib/access/use-acessos";
import { formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import { useUsers } from "@/lib/kernel/use-users";
import { formatarCpf, formatarMoeda } from "@/lib/rh/formatar";
import { usePodeEscreverNoRh } from "@/lib/rh/use-pode-escrever";
import {
  ROTULO_DO_CONTRATO,
  useDesligarFuncionario,
  useExcluirFuncionario,
  useFuncionario,
  useReativarFuncionario,
  type Funcionario,
} from "@/lib/rh/use-rh";

type Dialogo = "editar" | "desligar" | "reativar" | "excluir";

export default function FichaDoFuncionarioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const podeEscrever = usePodeEscreverNoRh();
  const { data: meuAcesso } = useMeuAcesso();
  const { data: funcionario, isLoading, isError, refetch } = useFuncionario(id);
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);

  const reativar = useReativarFuncionario();
  const excluir = useExcluirFuncionario();

  // Cada aba de dentro é uma área da permissão: quem tem só "Funcionários" vê só os dados.
  const ver = (area: string) => podeVerArea(meuAcesso, "rh", area);

  async function confirmarReativacao() {
    try {
      await reativar.mutateAsync(id);
      toast.success("Funcionário reativado.");
      setDialogo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível reativar o funcionário.");
    }
  }

  async function confirmarExclusao() {
    try {
      await excluir.mutateAsync(id);
      toast.success("Funcionário excluído.");
      router.replace("/rh/funcionarios");
    } catch (err) {
      // 409: tem ponto, atestado ou afastamento — o servidor diz o que impede.
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o funcionário.");
      setDialogo(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <RhNav />

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar o funcionário." onTentar={() => refetch()} />
      ) : isLoading || !funcionario ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full max-w-md" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <CabecalhoDaPagina
            eyebrow="← Funcionários"
            eyebrowHref="/rh/funcionarios"
            titulo={funcionario.nomeCompleto}
            tags={
              funcionario.ativo ? (
                <Badge variant="success">Ativo</Badge>
              ) : (
                <Badge variant="waiting">
                  Desligado
                  {funcionario.dataDeDesligamento && ` em ${formatarSoData(funcionario.dataDeDesligamento)}`}
                </Badge>
              )
            }
            apoio={[funcionario.cargo, funcionario.departamento].filter(Boolean).join(" · ") || "Sem cargo definido"}
            acoesClassName="w-full md:w-auto"
            acoes={
              podeEscrever && (
                <>
                  <Button variant="outline" onClick={() => setDialogo("editar")}>
                    <Pencil />
                    Editar
                  </Button>
                  {funcionario.ativo ? (
                    <Button variant="outline" onClick={() => setDialogo("desligar")}>
                      <UserMinus />
                      Desligar
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => setDialogo("reativar")}>
                      <RotateCcw />
                      Reativar
                    </Button>
                  )}
                  <Button variant="destructive" onClick={() => setDialogo("excluir")}>
                    <Trash2 />
                    Excluir
                  </Button>
                </>
              )
            }
          />

          <Tabs defaultValue="dados">
            <TabsList className="w-full justify-start md:w-fit">
              <TabsTrigger value="dados" className="px-3">
                Dados
              </TabsTrigger>
              {ver("ponto") && (
                <TabsTrigger value="ponto" className="px-3">
                  Ponto
                </TabsTrigger>
              )}
              {ver("atestados") && (
                <TabsTrigger value="atestados" className="px-3">
                  Atestados
                </TabsTrigger>
              )}
              {ver("afastamentos") && (
                <TabsTrigger value="afastamentos" className="px-3">
                  Afastamentos
                </TabsTrigger>
              )}
              {ver("documentos") && (
                <TabsTrigger value="documentos" className="px-3">
                  Documentos
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="dados" className="pt-3">
              <DadosDoFuncionario funcionario={funcionario} />
            </TabsContent>
            {ver("ponto") && (
              <TabsContent value="ponto" className="pt-3">
                <PainelDePonto funcionarioFixo={id} />
              </TabsContent>
            )}
            {ver("atestados") && (
              <TabsContent value="atestados" className="pt-3">
                <PainelDeAtestados funcionarioFixo={id} />
              </TabsContent>
            )}
            {ver("afastamentos") && (
              <TabsContent value="afastamentos" className="pt-3">
                <PainelDeAfastamentos funcionarioFixo={id} />
              </TabsContent>
            )}
            {ver("documentos") && (
              <TabsContent value="documentos" className="pt-3">
                <PainelDeDocumentos funcionarioFixo={id} />
              </TabsContent>
            )}
          </Tabs>

          {dialogo === "editar" && <DialogFuncionario funcionario={funcionario} onFechar={() => setDialogo(null)} />}
          {dialogo === "desligar" && (
            <DialogDesligar funcionario={funcionario} onFechar={() => setDialogo(null)} />
          )}
          {dialogo === "reativar" && (
            <Confirmacao
              titulo="Reativar este funcionário?"
              descricao={`${funcionario.nomeCompleto} volta para a lista de ativos e a data de desligamento é removida.`}
              rotuloConfirmar="Reativar"
              pendente={reativar.isPending}
              onConfirmar={confirmarReativacao}
              onFechar={() => setDialogo(null)}
            />
          )}
          {dialogo === "excluir" && (
            <Confirmacao
              titulo="Excluir este funcionário?"
              descricao={`A ficha de ${funcionario.nomeCompleto} será apagada. Quem já tem ponto, atestado ou afastamento não pode ser excluído: nesse caso, desligue.`}
              rotuloConfirmar="Excluir"
              perigosa
              pendente={excluir.isPending}
              onConfirmar={confirmarExclusao}
              onFechar={() => setDialogo(null)}
            />
          )}
        </>
      )}
    </div>
  );
}

function Dado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-bold tracking-[.14em] text-muted-foreground uppercase">{rotulo}</dt>
      <dd className="mt-1 text-sm break-words">{children || "—"}</dd>
    </div>
  );
}

function DadosDoFuncionario({ funcionario: f }: { funcionario: Funcionario }) {
  const { data: usuarios } = useUsers(1, 100);
  const usuario = f.userId ? usuarios?.items.find((u) => u.id === f.userId) : null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        <Dado rotulo="CPF">{f.cpf ? formatarCpf(f.cpf) : null}</Dado>
        <Dado rotulo="Nascimento">{f.dataDeNascimento ? formatarSoData(f.dataDeNascimento) : null}</Dado>
        <Dado rotulo="E-mail">{f.email}</Dado>
        <Dado rotulo="Telefone">{f.telefone}</Dado>
        <Dado rotulo="Cargo">{f.cargo}</Dado>
        <Dado rotulo="Departamento">{f.departamento}</Dado>
        <Dado rotulo="Contrato">{ROTULO_DO_CONTRATO[f.tipoDeContrato]}</Dado>
        <Dado rotulo="Admissão">{f.dataDeAdmissao ? formatarSoData(f.dataDeAdmissao) : null}</Dado>
        <Dado rotulo="Desligamento">{f.dataDeDesligamento ? formatarSoData(f.dataDeDesligamento) : null}</Dado>
        <Dado rotulo="Salário">{f.salario != null ? formatarMoeda(f.salario) : null}</Dado>
        <Dado rotulo="Carga horária semanal">
          {f.cargaHorariaSemanal != null ? `${f.cargaHorariaSemanal} horas` : null}
        </Dado>
        <Dado rotulo="Usuário do sistema">
          {f.userId ? (usuario ? `${usuario.fullName} (${usuario.email})` : "Ligado a um usuário") : "Sem usuário"}
        </Dado>
      </dl>

      {f.observacoes && (
        <div>
          <p className="text-[10.5px] font-bold tracking-[.14em] text-muted-foreground uppercase">Observações</p>
          <p className="mt-1 text-sm whitespace-pre-wrap">{f.observacoes}</p>
        </div>
      )}
    </div>
  );
}

function DialogDesligar({ funcionario, onFechar }: { funcionario: Funcionario; onFechar: () => void }) {
  const desligar = useDesligarFuncionario();
  const [data, setData] = useState(hojeIsoBrasilia);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return setErro("Informe a data do desligamento.");
    // Datas em yyyy-MM-dd comparam certo como texto.
    if (funcionario.dataDeAdmissao && data < funcionario.dataDeAdmissao) {
      return setErro("O desligamento não pode ser antes da admissão.");
    }

    try {
      await desligar.mutateAsync({ id: funcionario.id, data });
      toast.success("Funcionário desligado.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível desligar o funcionário.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !desligar.isPending && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desligar funcionário</DialogTitle>
          <DialogDescription>
            {funcionario.nomeCompleto} sai da lista de ativos. Ponto, atestados e documentos continuam guardados.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} noValidate className="grid gap-4">
          <Campo id="desligar-data" rotulo="Data do desligamento">
            <Input
              id="desligar-data"
              type="date"
              value={data}
              onChange={(e) => {
                setData(e.target.value);
                setErro(null);
              }}
              aria-invalid={erro !== null}
              autoFocus
            />
          </Campo>
          {erro && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {erro}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={desligar.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={desligar.isPending}>
              {desligar.isPending ? "Desligando..." : "Desligar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
