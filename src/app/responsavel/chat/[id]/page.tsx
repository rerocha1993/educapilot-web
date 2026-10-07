"use client";

import { useParams } from "next/navigation";

import { PainelDaConversa } from "@/components/relacionamento/chat/painel-da-conversa";
import { useConversasDaFamilia } from "@/lib/relacionamento/use-chat-familia";

/**
 * Uma conversa com a escola. Cobre a tela inteira (acima do cabeçalho e da barra de baixo do
 * portal): a caixa de texto precisa ficar no fim da tela, junto do teclado.
 */
export default function ConversaDaFamiliaPage() {
  const { id } = useParams<{ id: string }>();
  // A API dos pais não tem "uma conversa": o cabeçalho sai da lista (já em cache ao chegar daqui).
  const { data, isLoading, isError } = useConversasDaFamilia();
  const conversa = data?.find((c) => c.id === id);

  return (
    <div className="fixed inset-0 z-40 bg-background">
      <div className="mx-auto h-full max-w-md">
        <PainelDaConversa
          key={id}
          lado="familia"
          conversaId={id}
          conversa={conversa}
          carregandoConversa={isLoading}
          erroDaConversa={isError}
          // Com um filho só a lista é pulada, então "voltar" vai para o início.
          voltarHref={data?.length === 1 ? "/responsavel" : "/responsavel/chat"}
          voltarSempre
        />
      </div>
    </div>
  );
}
