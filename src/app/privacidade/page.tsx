import type { Metadata } from "next";
import Link from "next/link";
import { MarcaEducaPilot } from "@/components/auth/marca";
import { SecaoLegal as Secao } from "@/components/legal/secao-legal";
import { CNPJ, EMAIL_PRIVACIDADE, RAZAO_SOCIAL } from "@/lib/legal/contato";

export const metadata: Metadata = {
  title: "Política de Privacidade · EducaPilot",
  description:
    "Como o EducaPilot e as escolas que o usam tratam os dados no aplicativo, no portal e no atendimento de matrículas pelo WhatsApp.",
};

/**
 * Política de privacidade — página PÚBLICA (fora do grupo (app): sem login, sem menu).
 *
 * Existe por dois motivos, nesta ordem de importância:
 *
 * 1. LGPD. O atendimento de matrículas trata dado pessoal de responsável e, principalmente, de criança
 *    (art. 14), que tem proteção reforçada. Quem é família precisa saber o que se guarda, por quê, com quem se
 *    divide e como pedir exclusão.
 *
 * 2. A Meta exige uma URL pública de política de privacidade para o EducaPilot atuar como Tech Provider do WhatsApp
 *    Business, e o robô dela visita a página.
 *
 * Adaptada da política do Colégio Aprender e Saber (a que a Meta já aceitou), com uma diferença que muda quem responde
 * por quê: lá a escola operava o próprio sistema; aqui o EducaPilot é uma PLATAFORMA usada por várias escolas. Cada escola
 * é a CONTROLADORA dos dados das suas famílias (decide a finalidade); o EducaPilot é o OPERADOR (art. 5º, VI e VII da LGPD:
 * trata os dados em nome da escola, seguindo as instruções dela).
 *
 * O texto descreve o que o sistema REALMENTE faz. Se o comportamento mudar, esta página muda junto: uma política que não
 * corresponde ao sistema é pior que nenhuma. O texto é um ponto de partida e PRECISA de revisão jurídica antes de a Meta ou
 * uma família depender dele.
 */

const ATUALIZADO_EM = "14 de outubro de 2026";

export default function PaginaPrivacidade() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <header className="space-y-4">
        <MarcaEducaPilot />
        <h1 className="font-heading text-3xl font-semibold text-foreground">Política de Privacidade</h1>
        <p className="text-[15px] leading-relaxed text-foreground/85">
          Esta página explica quais informações são guardadas quando uma família conversa pelo WhatsApp com uma escola
          que usa o EducaPilot, por que elas são necessárias, quem responde por elas e como pedir para apagá-las.
        </p>
        <p className="text-sm text-muted-foreground">Última atualização: {ATUALIZADO_EM}</p>
      </header>

      <Secao titulo="Quem é quem">
        <p>
          O <strong>EducaPilot</strong> é um sistema de gestão escolar que cada escola contrata para organizar a sua rotina,
          inclusive o atendimento de matrículas pelo WhatsApp. Nesse atendimento:
        </p>
        <ul>
          <li>
            A <strong>escola</strong> com quem você conversa é a <strong>controladora</strong> dos seus dados: ela decide para
            que eles são usados e responde pelo atendimento.
          </li>
          <li>
            O <strong>{RAZAO_SOCIAL}</strong>
            {CNPJ ? ` (CNPJ ${CNPJ})` : ""} é o <strong>operador</strong>: guarda e processa os dados em nome da escola, só para
            fazer o sistema funcionar, e não os usa para fins próprios.
          </li>
        </ul>
        <p>
          Para qualquer assunto de privacidade, inclusive pedido de exclusão, você pode escrever à escola ou ao EducaPilot, em{" "}
          <a href={`mailto:${EMAIL_PRIVACIDADE}`}>{EMAIL_PRIVACIDADE}</a>. Se o pedido for ao EducaPilot, ele é repassado à
          escola responsável.
        </p>
      </Secao>

      <Secao titulo="Aplicativo e portal do EducaPilot">
        <p>
          O <strong>aplicativo EducaPilot</strong> (Android e iPhone) e o portal na web são usados por famílias, professores e
          equipe das escolas. As contas são criadas pela escola, por convite; ninguém se cadastra sozinho. Dentro do aplicativo
          e do portal são tratados:
        </p>
        <ul>
          <li>
            <strong>Conta e acesso:</strong> nome, e-mail, perfil (responsável, professor ou equipe) e a escola a que a pessoa
            pertence. A senha é guardada de forma protegida (apenas um resumo irreversível, nunca a senha).
          </li>
          <li>
            <strong>Aparelho e sessão:</strong> um identificador do aparelho e do aplicativo, para manter você conectado com
            segurança, e os dados necessários para enviar <strong>notificações</strong> (avisos, mensagens, cobranças).
          </li>
          <li>
            <strong>Comunicação com a escola:</strong> as mensagens do chat entre família e escola, os avisos, a agenda e o
            mural.
          </li>
          <li>
            <strong>Fotos e arquivos:</strong> fotos de atividades e do mural publicadas pela escola, respeitando a autorização
            de imagem de cada aluno, e arquivos que você mesmo envia.
          </li>
          <li>
            <strong>Cobranças:</strong> valores, vencimentos e situação das mensalidades e dos itens da loja. O pagamento é feito
            no ambiente do Asaas, fora do aplicativo.
          </li>
          <li>
            <strong>Localização, só se você usar:</strong> quando um responsável toca em <strong>“Estou a caminho”</strong>, a
            posição do aparelho é enviada à escola para avisar a chegada, e o sistema guarda apenas a última posição, sem
            histórico de trajeto. O aviso automático de chegada, quando existir, só liga com o seu consentimento e pode ser
            desligado a qualquer momento.
          </li>
        </ul>
        <p>
          Não há anúncios, não vendemos dados e o aplicativo não acompanha você em outros aplicativos ou sites. A escola é a{" "}
          <strong>controladora</strong> desses dados e o EducaPilot é o <strong>operador</strong>, como explicado acima. Para
          pedir a exclusão da conta e dos dados, veja <Link href="/excluir-conta">Excluir conta e dados</Link>.
        </p>
      </Secao>

      <Secao titulo="Quando esta política se aplica">
        <p>
          Esta parte vale para o atendimento de <strong>matrículas pelo WhatsApp</strong>: quando uma família escreve para o número
          de uma escola que usa o EducaPilot, por um anúncio, pelo site, por indicação ou diretamente, e quando preenche um
          formulário de anúncio (Facebook ou Instagram) da escola.
        </p>
        <p>
          O atendimento inicial é feito por um <strong>assistente automatizado</strong>, que usa inteligência artificial para
          redigir as respostas. Uma pessoa da equipe da escola assume a conversa sempre que o assunto sai do que o assistente
          pode responder, e você pode pedir para falar com uma pessoa a qualquer momento.
        </p>
      </Secao>

      <Secao titulo="Quais informações são guardadas">
        <p>Somente o necessário para responder e organizar a matrícula:</p>
        <ul>
          <li>
            <strong>Seu telefone e o nome do seu perfil no WhatsApp</strong>, que chegam junto com a mensagem.
          </li>
          <li>
            <strong>O nome e a data de nascimento da criança</strong>, quando você informa. A data é o que define a turma.
          </li>
          <li>
            <strong>O conteúdo da conversa</strong> (textos, fotos, áudios e documentos que você enviar), para dar continuidade
            ao atendimento sem pedir tudo de novo a cada mensagem.
          </li>
          <li>
            <strong>O que você conta sobre a criança</strong>, como restrição alimentar, alergia, adaptação ou preferências,
            quando você escolhe contar. Isso ajuda a equipe a receber vocês preparada.
          </li>
          <li>
            <strong>Como você chegou até a escola</strong>: anúncio, site, indicação ou busca. Quando vem de um anúncio, a
            escola recebe junto um identificador do clique.
          </li>
          <li>
            <strong>Data e horário da visita</strong>, se você agendar uma.
          </li>
        </ul>
        <p>
          O atendimento não pede CPF, documento, dado bancário nem forma de pagamento pelo WhatsApp. Se alguém pedir isso em
          nome da escola por esse canal, desconfie e fale diretamente com a escola.
        </p>
      </Secao>

      <Secao titulo="Dados de crianças">
        <p>
          Parte das informações se refere a uma criança, e a lei dá a elas proteção reforçada (art. 14 da LGPD). Por isso:
        </p>
        <ul>
          <li>
            Esses dados só são tratados quando <strong>o próprio responsável</strong> os informa, no interesse da matrícula.
          </li>
          <li>Não se pede que a criança fale com o atendimento, nem se coleta nada diretamente dela.</li>
          <li>
            Os dados de criança não são usados para publicidade, nem para formar perfil comercial, nem repassados a terceiros
            com essa finalidade.
          </li>
        </ul>
      </Secao>

      <Secao titulo="Por que esses dados podem ser tratados">
        <p>
          Você escreveu para saber sobre vagas, e responder exige guardar o que foi conversado. As bases legais, que cabem à
          escola como controladora, são as <strong>medidas preliminares a um contrato</strong> (art. 7º, V) e o{" "}
          <strong>legítimo interesse</strong> em atender quem procura a escola (art. 7º, IX), sempre limitado ao necessário
          para essa finalidade.
        </p>
        <p>As informações não são vendidas, alugadas nem cedidas.</p>
      </Secao>

      <Secao titulo="Com quem os dados são compartilhados">
        <p>
          Existem serviços de terceiros necessários para o atendimento funcionar. Eles tratam os dados só para esse fim:
        </p>
        <ul>
          <li>
            <strong>WhatsApp Business (Meta)</strong>. É por onde a conversa acontece. O EducaPilot usa a plataforma do WhatsApp
            Business da Meta para receber e enviar as mensagens da escola; elas passam pela infraestrutura da Meta, como em
            qualquer conversa de WhatsApp. Quando a escola conecta o Facebook para acompanhar anúncios e formulários, a Meta
            também informa ao EducaPilot os dados do formulário preenchido e o resultado dos anúncios.
          </li>
          <li>
            <strong>Anthropic</strong>, empresa que fornece o modelo de inteligência artificial que redige as respostas do
            assistente. O texto da conversa é enviado a ela para gerar cada resposta. Pelos termos comerciais do serviço, esse
            conteúdo não é usado para treinar modelos.
          </li>
          <li>
            <strong>Microsoft Azure</strong>, onde o sistema e o banco de dados do EducaPilot ficam hospedados.
          </li>
        </ul>
        <p>Também pode haver compartilhamento quando a lei exigir ou para responder a autoridade competente.</p>
      </Secao>

      <Secao titulo="Onde os dados ficam e por quanto tempo">
        <p>
          Os dados ficam no banco de dados do EducaPilot, em nuvem, separados por escola: uma escola não enxerga as famílias de
          outra. Alguns dos serviços acima podem tratar dados fora do Brasil; nesse caso, a transferência observa o que a LGPD
          permite.
        </p>
        <p>
          Os dados ficam guardados enquanto a escola precisar deles para o atendimento da matrícula. Cada escola define o prazo
          de guarda de acordo com as suas obrigações, e a família pode pedir a exclusão antes disso, a qualquer momento. Quando
          a matrícula acontece, os dados escolares passam a seguir as regras de guarda de documentos acadêmicos, que a escola
          é obrigada por lei a manter.
        </p>
      </Secao>

      <Secao titulo="Como os dados são protegidos">
        <p>
          O acesso ao sistema é restrito à equipe da escola, com login individual e permissão por área. A conexão é
          criptografada, as credenciais da escola com a Meta ficam guardadas cifradas, e cada escola só acessa os dados da
          própria escola.
        </p>
        <p>
          Nenhum sistema é imune a incidentes. Se acontecer algum que possa trazer risco a você, a escola e o EducaPilot
          comunicarão você e a Autoridade Nacional de Proteção de Dados, como a lei determina.
        </p>
      </Secao>

      <Secao titulo="Seus direitos e como pedir exclusão">
        <p>A LGPD garante que você pode, a qualquer momento:</p>
        <ul>
          <li>saber quais dados a escola tem sobre você e sobre a criança;</li>
          <li>corrigir o que estiver errado ou incompleto;</li>
          <li>pedir a exclusão;</li>
          <li>pedir uma cópia dos dados;</li>
          <li>revogar o consentimento e pedir que parem de entrar em contato.</li>
        </ul>
        <p>
          Para pedir a <strong>exclusão</strong> (ou qualquer um dos outros direitos), basta escrever{" "}
          <strong>no próprio WhatsApp do atendimento</strong>, falar com a escola ou escrever para{" "}
          <a href={`mailto:${EMAIL_PRIVACIDADE}`}>{EMAIL_PRIVACIDADE}</a>, dizendo o telefone da conversa. A escola apaga a
          família do sistema, com as mensagens e os arquivos que você enviou, e o sistema guarda apenas uma marca irreversível
          (não o número) para que uma mensagem antiga, reenviada pelo WhatsApp, não recrie o cadastro apagado. O prazo de
          resposta é de até 15 dias. Pedir para parar de receber mensagens tem efeito imediato.
        </p>
        <p>
          Quem usa o aplicativo ou o portal pode pedir a exclusão da conta e dos dados pela página{" "}
          <Link href="/excluir-conta">Excluir conta e dados</Link>.
        </p>
      </Secao>

      <Secao titulo="Mudanças nesta política">
        <p>Se o funcionamento do atendimento mudar, esta página muda junto, e a data no topo é atualizada.</p>
      </Secao>

      <footer className="border-t border-border pt-6 text-sm text-muted-foreground">
        {RAZAO_SOCIAL}
        {CNPJ ? ` · CNPJ ${CNPJ}` : ""} ·{" "}
        <a className="text-primary underline" href={`mailto:${EMAIL_PRIVACIDADE}`}>
          {EMAIL_PRIVACIDADE}
        </a>
        <br />
        <Link className="text-primary underline" href="/login">
          Entrar no sistema
        </Link>
      </footer>
    </main>
  );
}
