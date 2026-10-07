"use client";

import { FinanceNav } from "@/components/finance/finance-nav";
import { SecaoWhatsApp } from "@/components/finance/whatsapp/secao-whatsapp";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { useSessaoLocal } from "@/lib/auth/use-sessao-local";

export default function ConfiguracaoDoFinanceiroPage() {
  const sessao = useSessaoLocal();
  // Quem cadastra celulares é a gestão e a secretaria; professor nem chega aqui, mas a tela não oferece os botões.
  const podeEscrever = !!sessao && sessao.role !== "Teacher";

  return (
    <div className="flex flex-col gap-4">
      <FinanceNav />

      <CabecalhoDaPagina
        eyebrow="Financeiro"
        titulo="Configuração"
        apoio="Como os comprovantes chegam ao Financeiro."
      />

      <div className="max-w-3xl">
        <SecaoWhatsApp podeEscrever={podeEscrever} />
      </div>
    </div>
  );
}
