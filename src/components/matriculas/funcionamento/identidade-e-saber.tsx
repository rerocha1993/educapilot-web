"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { FuncionamentoDaAssistente, MaterialDoFuncionamento } from "@/lib/matriculas/tipos";
import { cn } from "@/lib/utils";
import { Cartao, Recolhivel, Rotulo, TextoRecolhivel, Vazio } from "./partes";

const numero = new Intl.NumberFormat("pt-BR");

const TIPO_DO_MATERIAL: Record<string, string> = {
  TabelaDePreco: "Tabela de preços",
  Apresentacao: "Apresentação",
  Video: "Vídeo",
  Fotos: "Fotos",
  Atividades: "Atividades",
  Adaptacao: "Adaptação",
  Outro: "Outro",
};

const GATILHO_DO_MATERIAL: Record<string, string> = {
  Inseguranca: "quando a família está insegura",
  PediuPrecos: "quando a família pede preços",
  DuvidaDeRotina: "quando a dúvida é sobre a rotina",
  DuvidaDeAdaptacao: "quando a dúvida é sobre adaptação",
  Sempre: "sempre que couber na conversa",
};

// ------------------------------------------------------------------ identidade

function Tile({
  rotulo,
  valor,
  detalhe,
  selo,
  mono,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  selo?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-[20px] border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <Rotulo>{rotulo}</Rotulo>
        {selo}
      </div>
      <p
        className={cn(
          "break-words font-heading text-[22px] font-semibold leading-tight tracking-[-.02em] tabular-nums",
          mono && "font-mono text-[15px] tracking-normal"
        )}
      >
        {valor}
      </p>
      {detalhe && <p className="text-[12.5px] leading-snug text-muted-foreground">{detalhe}</p>}
    </div>
  );
}

export function Identidade({ f }: { f: FuncionamentoDaAssistente }) {
  const i = f.identidade;
  const e = f.estado;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Tile
        rotulo="Assistente"
        valor={i.nomeDaAssistente ?? "Sem nome ainda"}
        detalhe={i.nomeDaEscola ? `Atende pelo ${i.nomeDaEscola}.` : "A ficha da escola ainda não foi preenchida."}
        selo={<Badge variant={i.ligada ? "success" : "waiting"}>{i.ligada ? "Ligada" : "Desligada"}</Badge>}
      />
      <Tile
        rotulo="Horário de atendimento"
        valor={`${i.atendimentoInicio}h às ${i.atendimentoFim}h`}
        detalhe="Horário de Brasília. Fora dele a mensagem espera a abertura e é a primeira da manhã."
      />
      <Tile
        rotulo="Junta as mensagens por"
        valor={`${i.esperaParaJuntarSegundos} s`}
        detalhe="Espera esse tempo depois da última mensagem da família, para ler tudo de uma vez."
      />
      <Tile
        rotulo="Respostas no mês"
        valor={
          i.limiteMensalDeRespostas != null
            ? `${numero.format(i.respostasNoMes)} de ${numero.format(i.limiteMensalDeRespostas)}`
            : numero.format(i.respostasNoMes)
        }
        detalhe={
          i.limiteMensalDeRespostas != null
            ? "Limite do plano. Passou dele, a conversa vai para a equipe."
            : "O plano não tem limite de respostas por mês."
        }
      />
      <Tile
        rotulo="Modelo de IA"
        valor={i.modelo}
        mono
        selo={
          <Badge variant={i.chaveConfigurada ? "success" : "overdue"}>
            {i.chaveConfigurada ? "Chave configurada" : "Sem chave"}
          </Badge>
        }
        detalhe={
          i.chaveConfigurada
            ? `Até ${i.maximoDeBaloes} balões por resposta e ${i.maximoDeIteracoes} idas ao modelo por turno.`
            : "Sem a chave da Anthropic a assistente não responde e toda conversa vai para a equipe."
        }
      />
      <Tile
        rotulo="WhatsApp"
        valor={e.whatsAppConectado ? (e.numero ?? "Conectado") : "Não conectado"}
        selo={<Badge variant={e.whatsAppConectado ? "success" : "overdue"}>{e.whatsAppConectado ? "Conectado" : "Desconectado"}</Badge>}
        detalhe={
          e.modelosTotal === 0
            ? "Nenhum modelo de mensagem cadastrado ainda."
            : `${e.modelosAprovados} de ${e.modelosTotal} modelos aprovados` +
              (e.modelosEmAnalise ? `, ${e.modelosEmAnalise} em análise` : "") +
              (e.modelosComProblema ? `, ${e.modelosComProblema} com problema` : "") +
              (e.modelosNaoEnviados ? `, ${e.modelosNaoEnviados} não enviados` : "") +
              "."
        }
      />
    </div>
  );
}

// ------------------------------------------------------------------ o que ela sabe

function Campo({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return (
    <div className="min-w-0">
      <dt>
        <Rotulo>{rotulo}</Rotulo>
      </dt>
      <dd className={cn("mt-1 break-words text-[13.5px] leading-relaxed", !valor && "text-muted-foreground")}>
        {valor || "Não informado"}
      </dd>
    </div>
  );
}

function Material({ m }: { m: MaterialDoFuncionamento }) {
  return (
    <li className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-border bg-card p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 break-words text-sm font-semibold">{m.titulo}</span>
        <Badge variant="secondary">{TIPO_DO_MATERIAL[m.tipo] ?? m.tipo}</Badge>
        {m.ano != null && <Badge variant="outline">{m.ano}</Badge>}
      </div>
      <p className="text-[12.5px] leading-snug text-muted-foreground">
        {m.turmas ? `Turmas: ${m.turmas}.` : "Serve para todas as turmas."}{" "}
        {m.gatilho
          ? `Oferece ${GATILHO_DO_MATERIAL[m.gatilho] ?? m.gatilho}.`
          : "Só manda quando a família pedir."}
      </p>
    </li>
  );
}

function Titulo({ children, contagem }: { children: React.ReactNode; contagem?: number }) {
  return (
    <h3 className="mb-2.5 flex items-center gap-2 font-heading text-[15px] font-semibold">
      {children}
      {contagem != null && (
        <span className="rounded-full bg-muted px-2 py-px text-[11px] font-bold tabular-nums text-muted-foreground">{contagem}</span>
      )}
    </h3>
  );
}

function ListaRecolhivel({ blocos }: { blocos: { titulo: string; texto: string }[] }) {
  const [abertos, setAbertos] = useState<Set<number>>(new Set());
  function alternar(i: number) {
    setAbertos((a) => {
      const n = new Set(a);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  }
  return (
    <div className="flex flex-col gap-2">
      {blocos.map((b, i) => (
        <Recolhivel key={`${b.titulo}-${i}`} aberto={abertos.has(i)} aoAlternar={() => alternar(i)} titulo={b.titulo}>
          <p className="whitespace-pre-line break-words text-[13.5px] leading-relaxed">{b.texto}</p>
        </Recolhivel>
      ))}
    </div>
  );
}

export function OQueElaSabe({ f }: { f: FuncionamentoDaAssistente }) {
  const s = f.oQueSabe;
  if (!s.fichaPreenchida) {
    return (
      <div className="flex flex-col gap-6">
        <Vazio acao={{ href: "/matriculas/assistente/ficha", rotulo: "Preencher a ficha" }}>
          A ficha da escola ainda não foi preenchida. Sem ela a assistente não sabe nada da escola e não pode ser ligada.
        </Vazio>
        <MateriaisEAgenda f={f} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <Cartao>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Campo rotulo="Como ela descreve a escola" valor={s.descricao} />
          </div>
          <Campo rotulo="Endereço da visita" valor={s.endereco} />
          <Campo rotulo="Quem recebe na visita" valor={s.quemRecebeNaVisita} />
          <Campo rotulo="E-mail para assuntos de fora" valor={s.email} />
          <Campo
            rotulo="Corte etário"
            valor={`${String(s.diaDoCorte).padStart(2, "0")}/${String(s.mesDoCorte).padStart(2, "0")}`}
          />
          {s.comoEAVisita && (
            <div className="sm:col-span-2">
              <Rotulo>Como é a visita</Rotulo>
              <TextoRecolhivel texto={s.comoEAVisita} className="mt-1" />
            </div>
          )}
          {s.sobreAEscola && (
            <div className="sm:col-span-2">
              <Rotulo>Sobre a escola</Rotulo>
              <TextoRecolhivel texto={s.sobreAEscola} className="mt-1" />
            </div>
          )}
          {s.provaSocial && (
            <div className="sm:col-span-2">
              <Rotulo>Prova social</Rotulo>
              <TextoRecolhivel texto={s.provaSocial} linhas={2} className="mt-1" />
            </div>
          )}
        </dl>
      </Cartao>

      <div>
        <Titulo contagem={s.turmas.length}>Turmas e como ela apresenta cada uma</Titulo>
        {s.turmas.length === 0 ? (
          <Vazio acao={{ href: "/matriculas/assistente/ficha", rotulo: "Cadastrar turmas" }}>
            Nenhuma turma na ficha. Sem turmas ela não consegue dizer em qual a criança entra.
          </Vazio>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {s.turmas.map((t) => (
              <li key={t.nome} className="flex min-w-0 flex-col gap-2 rounded-[20px] border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 break-words font-heading text-base font-semibold">{t.nome}</span>
                  {t.grupo && <Badge variant="secondary">{t.grupo}</Badge>}
                </div>
                <p className="text-[12.5px] font-medium text-action-soft-foreground">
                  {t.criterio === "idade_em_meses" ? "Por idade em meses: " : "Pela data de corte: "}
                  {t.regraDeIdade}
                </p>
                {t.comoApresentar ? (
                  <TextoRecolhivel texto={t.comoApresentar} linhas={3} />
                ) : (
                  <p className="text-[12.5px] text-muted-foreground">Sem texto de apresentação: ela fala só do que está nos fatos.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <Titulo contagem={s.fatos.length}>Fatos confirmados pela direção</Titulo>
        {s.fatos.length === 0 ? (
          <Vazio acao={{ href: "/matriculas/assistente/ficha", rotulo: "Acrescentar fatos" }}>
            Nenhum fato cadastrado. Tudo o que for pergunta sobre a escola, ela confirma com a equipe.
          </Vazio>
        ) : (
          <ListaRecolhivel blocos={s.fatos} />
        )}
      </div>

      {s.respostas.length > 0 && (
        <div>
          <Titulo contagem={s.respostas.length}>Respostas prontas da escola</Titulo>
          <ListaRecolhivel blocos={s.respostas} />
        </div>
      )}

      <div>
        <Titulo contagem={s.naoSabe.length}>O que ela não responde</Titulo>
        {s.naoSabe.length === 0 ? (
          <p className="text-[13.5px] text-muted-foreground">Nenhum assunto listado. Fora dos fatos, ela continua não afirmando nada.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {s.naoSabe.map((n) => (
              <li key={n} className="max-w-full break-words rounded-full bg-muted px-3 py-1 text-[13px] font-medium text-secondary-foreground">
                {n}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[12.5px] text-muted-foreground">Nesses casos ela diz que vai confirmar e chama a equipe.</p>
      </div>

      <MateriaisEAgenda f={f} />
    </div>
  );
}

function MateriaisEAgenda({ f }: { f: FuncionamentoDaAssistente }) {
  const s = f.oQueSabe;
  return (
    <>
      <div>
        <Titulo>Agenda de visitas</Titulo>
        {s.agendaDeVisitas ? (
          <Cartao>
            <p className="break-words text-[13.5px] leading-relaxed">A escola recebe visita {s.agendaDeVisitas}.</p>
          </Cartao>
        ) : (
          <Vazio acao={{ href: "/matriculas/agenda", rotulo: "Configurar a agenda" }}>
            Agenda não configurada: a assistente conversa sobre a visita, mas não marca horário sozinha.
          </Vazio>
        )}
      </div>

      <div>
        <Titulo contagem={s.materiais.length}>Materiais que ela pode enviar</Titulo>
        {s.materiais.length === 0 ? (
          <Vazio acao={{ href: "/matriculas/materiais", rotulo: "Cadastrar materiais" }}>
            Nenhum material ativo. Sem material ela não oferece tabela de preços nem apresentação.
          </Vazio>
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {s.materiais.map((m, i) => (
              <Material key={`${m.titulo}-${i}`} m={m} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
