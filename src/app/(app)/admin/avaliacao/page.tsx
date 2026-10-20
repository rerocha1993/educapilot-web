"use client";

import { useState } from "react";

import { AnosLetivosPainel } from "@/components/notas/admin-anos";
import { MateriasPainel } from "@/components/notas/admin-materias";
import { TurmasPainel } from "@/components/notas/admin-turmas";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Aba = "anos" | "materias" | "turmas";

/**
 * Administração → Matérias e avaliação: o que a escola precisa configurar antes de lançar notas.
 * Anos letivos e períodos, as matérias (com modelos prontos) e, por turma, o tipo de avaliação, a
 * média, as escalas e a professora de cada matéria. O lançamento em si é da Rotina → Notas.
 */
export default function MateriasEAvaliacaoPage() {
  const [aba, setAba] = useState<Aba>("anos");

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <CabecalhoDaPagina
        eyebrow="Administração"
        titulo="Matérias e avaliação"
        apoio="Anos letivos e períodos, matérias e como cada turma é avaliada. As notas são lançadas em Rotina → Notas."
      />

      <Tabs value={aba} onValueChange={(v) => setAba(v as Aba)}>
        <TabsList>
          <TabsTrigger value="anos" className="px-4">
            Anos e períodos
          </TabsTrigger>
          <TabsTrigger value="materias" className="px-4">
            Matérias
          </TabsTrigger>
          <TabsTrigger value="turmas" className="px-4">
            Turmas
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {aba === "anos" && <AnosLetivosPainel />}
      {aba === "materias" && <MateriasPainel />}
      {aba === "turmas" && <TurmasPainel />}
    </div>
  );
}
