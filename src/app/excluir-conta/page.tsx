import type { Metadata } from "next";
import Link from "next/link";
import { MarcaEducaPilot } from "@/components/auth/marca";
import { SecaoLegal } from "@/components/legal/secao-legal";
import { CNPJ, EMAIL_PRIVACIDADE, RAZAO_SOCIAL } from "@/lib/legal/contato";

export const metadata: Metadata = {
  title: "Excluir conta e dados · EducaPilot",
  description: "Como pedir a exclusão da sua conta e dos seus dados no aplicativo e no portal do EducaPilot.",
};

/**
 * Página PÚBLICA (fora do grupo (app): sem login, sem menu) de pedido de exclusão de conta e de dados.
 *
 * Existe porque a Google Play e a App Store exigem um endereço público, que não pede login, com os passos do pedido, o que
 * é apagado, o que é mantido e por quanto tempo. O texto descreve o que o sistema faz hoje; se o fluxo mudar (por exemplo,
 * quando a exclusão pelo próprio aplicativo entrar), esta página muda junto. Precisa de revisão jurídica.
 */

const ATUALIZADO_EM = "14 de outubro de 2026";

export default function PaginaExcluirConta() {
  const assunto = encodeURIComponent("Excluir minha conta no EducaPilot");

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <header className="space-y-4">
        <MarcaEducaPilot />
        <h1 className="font-heading text-3xl font-semibold text-foreground">Excluir conta e dados</h1>
        <p className="text-[15px] leading-relaxed text-foreground/85">
          Esta página explica como pedir a exclusão da sua conta no aplicativo e no portal do <strong>EducaPilot</strong> e dos
          dados ligados a ela, o que é apagado, o que a escola é obrigada a manter e em quanto tempo o pedido é atendido.
        </p>
        <p className="text-sm text-muted-foreground">Última atualização: {ATUALIZADO_EM}</p>
      </header>

      <SecaoLegal titulo="Como pedir">
        <ol className="ml-5 list-decimal space-y-2 pl-1">
          <li>
            Escreva para{" "}
            <a href={`mailto:${EMAIL_PRIVACIDADE}?subject=${assunto}`}>{EMAIL_PRIVACIDADE}</a>, <strong>do mesmo e-mail</strong>{" "}
            que você usa para entrar no EducaPilot, com o assunto <strong>“Excluir minha conta no EducaPilot”</strong>.
          </li>
          <li>
            Informe o seu <strong>nome completo</strong>, o <strong>nome da escola</strong> e, se quiser que dados específicos
            sejam apagados sem encerrar a conta, diga quais.
          </li>
          <li>
            Podemos pedir uma confirmação de que o pedido é seu (por exemplo, responder a uma mensagem enviada ao seu e-mail),
            para que ninguém apague a conta de outra pessoa.
          </li>
          <li>
            Você também pode fazer o pedido à <strong>secretaria da sua escola</strong>, que é quem responde pelos seus dados,
            e ela pede a exclusão ao EducaPilot.
          </li>
        </ol>
        <p>
          O pedido é atendido em <strong>até 15 dias</strong>. Você recebe a confirmação no mesmo e-mail.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="O que é apagado">
        <ul>
          <li>o seu acesso (e-mail e senha) e todas as sessões abertas nos seus aparelhos;</li>
          <li>os aparelhos cadastrados para receber notificações;</li>
          <li>a posição e o trajeto registrados pelo “Estou a caminho” (o sistema só guarda a última posição);</li>
          <li>os dados de perfil que você forneceu e que a escola não precisa manter por obrigação legal.</li>
        </ul>
        <p>
          O pedido encerra o seu acesso ao aplicativo e ao portal. Para voltar a usar, a escola precisa criar um novo acesso.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="O que pode ser mantido, e por quanto tempo">
        <p>
          A <strong>escola</strong> é a controladora dos dados escolares e financeiros e é obrigada por lei a guardar alguns
          deles, mesmo depois da exclusão do seu acesso:
        </p>
        <ul>
          <li>registros acadêmicos e pedagógicos do aluno, pelo prazo que a legislação educacional exige;</li>
          <li>contratos, cobranças e comprovantes de pagamento, pelo prazo das obrigações fiscais e contábeis;</li>
          <li>registros necessários para a escola se defender em caso de disputa.</li>
        </ul>
        <p>
          Esses dados deixam de ser usados para qualquer outra finalidade e são apagados quando o prazo legal acaba. Cada escola
          informa os seus prazos. O EducaPilot atua como operador, em nome da escola.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="Mais informações">
        <p>
          Veja também a <Link href="/privacidade">Política de Privacidade</Link>, que explica quais dados são tratados, com quem
          são compartilhados e quais são os seus direitos pela LGPD.
        </p>
      </SecaoLegal>

      <footer className="border-t border-border pt-6 text-sm text-muted-foreground">
        {RAZAO_SOCIAL}
        {CNPJ ? ` · CNPJ ${CNPJ}` : ""} ·{" "}
        <a className="text-primary underline" href={`mailto:${EMAIL_PRIVACIDADE}`}>
          {EMAIL_PRIVACIDADE}
        </a>
      </footer>
    </main>
  );
}
