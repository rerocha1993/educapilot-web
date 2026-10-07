"use client";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { FormularioDeAtividade } from "@/components/relacionamento/formulario-de-atividade";
import { RelacionamentoNav } from "@/components/relacionamento/relacionamento-nav";

export default function NovaAtividadePage() {
  return (
    <div className="flex flex-col gap-4">
      <RelacionamentoNav />

      <CabecalhoDaPagina
        eyebrow="Atividades"
        eyebrowHref="/relacionamento/atividades"
        titulo="Nova atividade"
        apoio="Salve como rascunho para adicionar as fotos. As famílias só recebem quando você publicar."
      />

      <FormularioDeAtividade atividade={null} />
    </div>
  );
}
