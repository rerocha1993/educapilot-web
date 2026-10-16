"use client";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { AgendaEduCard } from "@/components/integrations/agenda-edu-card";
import { PreCadastrosCard } from "@/components/integrations/pre-cadastros-card";
import { TuitionImportCard } from "@/components/finance/tuition-import-card";
import { ImportacaoDeCadastros } from "@/components/registry/importacao-de-cadastros";

export default function ImportarPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <CabecalhoDaPagina
        eyebrow="Administração"
        titulo="Importação em massa"
        apoio="Alunos, responsáveis e turmas por planilha Excel, com conferência antes de gravar."
      />

      <ImportacaoDeCadastros />

      <div className="grid gap-4 lg:grid-cols-3">
        <AgendaEduCard />
        <PreCadastrosCard />
        <TuitionImportCard />
      </div>

      <p className="text-xs text-muted-foreground">
        Na planilha de alunos, aluno que já existe (mesmo nome e data de nascimento) é ignorado, ou atualizado se você
        marcar &quot;Atualizar os existentes&quot;. Responsável que já existe (mesmo CPF) só recebe o que estava vazio. As linhas com
        erro ficam de fora e podem ser baixadas para corrigir. A importação não envia convite: o acesso ao portal continua
        sendo pelo convite normal.
      </p>
    </div>
  );
}
