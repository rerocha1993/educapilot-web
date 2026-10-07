"use client";

import { useState } from "react";
import { toast } from "sonner";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { Campo, ErroDeCarga } from "@/components/rh/campo";
import { RelacionamentoNav } from "@/components/relacionamento/relacionamento-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSessaoLocal } from "@/lib/auth/use-sessao-local";
import {
  useConfiguracaoDoRelacionamento,
  useSalvarConfiguracaoDoRelacionamento,
  type ConfiguracaoDoRelacionamento,
} from "@/lib/relacionamento/use-relacionamento";

export default function ConfiguracaoDoRelacionamentoPage() {
  const { data, isLoading, isError, refetch } = useConfiguracaoDoRelacionamento();

  return (
    <div className="flex flex-col gap-4">
      <RelacionamentoNav />

      <CabecalhoDaPagina
        eyebrow="Relacionamento"
        titulo="Configuração"
        apoio="Como o portal das famílias se apresenta e o que a escola mostra e avisa por e-mail."
      />

      {isError && <ErroDeCarga texto="Não foi possível carregar a configuração." onTentar={() => refetch()} />}
      {isLoading && <Skeleton className="h-96 w-full rounded-xl" />}

      {/* Sem chave de atualização: refazer o formulário a cada resposta apagaria o que está sendo digitado. */}
      {data && <Formulario inicial={data} />}
    </div>
  );
}

function Formulario({ inicial }: { inicial: ConfiguracaoDoRelacionamento }) {
  const sessao = useSessaoLocal();
  // Configuração é da gestão e da coordenação; professor nem chega aqui, mas a tela não oferece o botão.
  const podeEscrever = !!sessao && sessao.role !== "Teacher";
  const salvar = useSalvarConfiguracaoDoRelacionamento();
  const [c, setC] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);

  function mudar(parte: Partial<ConfiguracaoDoRelacionamento>) {
    setC((atual) => ({ ...atual, ...parte }));
    setErro(null);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();

    const nome = c.nomeDoPortal.trim();
    if (!nome) return setErro("Dê um nome ao portal.");

    try {
      const salva = await salvar.mutateAsync({
        ...c,
        nomeDoPortal: nome,
        mensagemDeBoasVindas: c.mensagemDeBoasVindas?.trim() || null,
      });
      setC(salva);
      toast.success("Configuração salva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a configuração.");
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex max-w-3xl flex-col gap-4">
      <fieldset disabled={!podeEscrever || salvar.isPending} className="flex min-w-0 flex-col gap-4">
        <section className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-4 md:p-5">
          <div>
            <h2 className="font-heading text-[15.5px] font-semibold">Portal das famílias</h2>
            <p className="mt-0.5 text-[13px] leading-[1.55] text-muted-foreground">
              O nome aparece no topo do portal e nos e-mails. A mensagem fica na tela inicial.
            </p>
          </div>

          <Campo id="cfg-nome" rotulo="Nome do portal">
            <Input
              id="cfg-nome"
              value={c.nomeDoPortal}
              maxLength={80}
              onChange={(e) => mudar({ nomeDoPortal: e.target.value })}
              aria-invalid={erro !== null && !c.nomeDoPortal.trim()}
            />
          </Campo>

          <Campo id="cfg-boas-vindas" rotulo="Mensagem de boas-vindas (opcional)">
            <Textarea
              id="cfg-boas-vindas"
              value={c.mensagemDeBoasVindas ?? ""}
              rows={4}
              onChange={(e) => mudar({ mensagemDeBoasVindas: e.target.value })}
              placeholder="Ex.: Aqui você acompanha os avisos, a agenda e a rotina do seu filho."
            />
          </Campo>
        </section>

        <section className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 md:p-5">
          <h2 className="mb-1 font-heading text-[15.5px] font-semibold">O que as famílias veem</h2>

          <Opcao
            id="cfg-calendario"
            rotulo="Mostrar o calendário escolar na agenda"
            marcado={c.mostrarCalendarioEscolar}
            onChange={(v) => mudar({ mostrarCalendarioEscolar: v })}
          />
          <Opcao
            id="cfg-cronograma"
            rotulo="Mostrar o cronograma da turma"
            marcado={c.mostrarCronograma}
            onChange={(v) => mudar({ mostrarCronograma: v })}
          />
        </section>

        <section className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 md:p-5">
          <h2 className="mb-1 font-heading text-[15.5px] font-semibold">Avisos por e-mail</h2>

          <Opcao
            id="cfg-email"
            rotulo="Enviar e-mail às famílias ao publicar (complemento; o aviso no portal sempre acontece, e-mail nasce desligado)"
            marcado={c.emailAoPublicar}
            onChange={(v) => mudar({ emailAoPublicar: v })}
          />
        </section>
      </fieldset>

      {erro && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      )}

      {podeEscrever ? (
        <div>
          <Button type="submit" variant="action" disabled={salvar.isPending} className="w-full md:w-auto">
            {salvar.isPending ? "Salvando..." : "Salvar configuração"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Você pode ver a configuração, mas não alterá-la.</p>
      )}
    </form>
  );
}

function Opcao({
  id,
  rotulo,
  marcado,
  onChange,
}: {
  id: string;
  rotulo: string;
  marcado: boolean;
  onChange: (valor: boolean) => void;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3">
      <Switch id={id} checked={marcado} onCheckedChange={onChange} />
      <Label htmlFor={id} className="cursor-pointer leading-snug">
        {rotulo}
      </Label>
    </div>
  );
}
