import { MessagesSquare } from "lucide-react";

import { EstadoVazio } from "@/components/padroes/estado-vazio";

/** Sem conversa aberta: o espaço da direita só aparece no computador, com a dica. */
export default function ChatPage() {
  return (
    <div className="grid h-full place-items-center rounded-xl border border-dashed border-border-dashed bg-card p-6">
      <EstadoVazio
        icone={<MessagesSquare />}
        titulo="Escolha uma conversa"
        texto="Abra uma conversa da lista ou inicie uma nova com a família de um aluno."
        className="border-0 bg-transparent"
      />
    </div>
  );
}
