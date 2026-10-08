"use client";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { FormularioDePublicacao } from "@/components/relacionamento/formulario-de-publicacao";
import { RelacionamentoNav } from "@/components/relacionamento/relacionamento-nav";

export default function NovaPublicacaoPage() {
  return (
    <div className="flex flex-col gap-4">
      <RelacionamentoNav />

      <CabecalhoDaPagina
        eyebrow="Avisos e eventos"
        eyebrowHref="/relacionamento/avisos"
        titulo="Nova publicação"
        apoio="Salve como rascunho para revisar e anexar arquivos. As famílias só recebem quando você publicar."
      />

      <FormularioDePublicacao publicacao={null} />
    </div>
  );
}
