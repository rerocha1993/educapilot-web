"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Copy, Plug, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCarteiraDaConta,
  useRemoverCarteira,
  useSalvarCarteira,
  useTestarCarteira,
  type AmbienteDoAsaas,
  type CarteiraDeRecebimento,
  type ProvedorDeRecebimento,
  type TesteDaCarteira,
} from "@/lib/finance/use-carteiras";
import type { SaldoDaConta } from "@/lib/finance/use-tesouraria";

function dataEHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

async function copiar(texto: string, oQue: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(`${oQue} copiado.`);
  } catch {
    toast.error("Não consegui copiar. Selecione o texto e copie manualmente.");
  }
}

/**
 * Diálogo "Recebimento · <conta>": como esta conta recebe o dinheiro das famílias.
 *
 * Quem abre decide o ciclo de vida: renderize só enquanto houver uma conta escolhida
 * (`conta !== null`) e feche com `onFechar`. Assim o formulário nasce sempre da carteira que
 * está gravada, sem efeito para ressincronizar estado.
 */
export function RecebimentoDaConta({
  conta,
  onFechar,
}: {
  conta: SaldoDaConta;
  onFechar: () => void;
}) {
  const { data: carteira, isLoading, isError } = useCarteiraDaConta(conta.id);

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="pr-8 break-words">Recebimento · {conta.nome}</DialogTitle>
          <DialogDescription>
            Como esta conta recebe o dinheiro das famílias: automático pelo Asaas ou manual.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col gap-3.5" aria-busy="true">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
            Não foi possível carregar o recebimento desta conta.
          </div>
        )}

        {!isLoading && !isError && carteira !== undefined && (
          // A chave separa "ainda não existe" de "já existe": depois do primeiro salvamento o
          // formulário renasce da carteira gravada (com a chave oculta e o webhook disponível).
          <FormularioDoRecebimento
            key={carteira ? `carteira-${carteira.id}` : "nova"}
            conta={conta}
            carteira={carteira}
            onFechar={onFechar}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormularioDoRecebimento({
  conta,
  carteira,
  onFechar,
}: {
  conta: SaldoDaConta;
  carteira: CarteiraDeRecebimento | null;
  onFechar: () => void;
}) {
  const salvar = useSalvarCarteira();
  const remover = useRemoverCarteira();
  const testar = useTestarCarteira();

  const [provedor, setProvedor] = useState<ProvedorDeRecebimento>(carteira?.provedor ?? "asaas");
  const [ambiente, setAmbiente] = useState<AmbienteDoAsaas>(carteira?.asaasAmbiente ?? "producao");
  const [chaveDaApi, setChaveDaApi] = useState("");
  const [chavePix, setChavePix] = useState(carteira?.chavePix ?? "");
  const [ativa, setAtiva] = useState(carteira?.ativa ?? true);
  const [mensalidades, setMensalidades] = useState(carteira?.padraoParaMensalidades ?? false);
  const [cobrancas, setCobrancas] = useState(carteira?.padraoParaCobrancas ?? false);
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);
  const [resultadoDoTeste, setResultadoDoTeste] = useState<TesteDaCarteira | null>(null);

  const existe = carteira !== null;

  // O teste usa o que está gravado no servidor. Se a tela tem alteração na chave, no ambiente ou
  // no jeito de receber, testar agora conferiria a configuração antiga: pede para salvar antes.
  const mudouAntesDoTeste =
    chaveDaApi.trim() !== "" ||
    provedor !== carteira?.provedor ||
    ambiente !== carteira?.asaasAmbiente;
  const podeTestar = existe && carteira.provedor === "asaas" && carteira.temChave && !mudouAntesDoTeste;

  async function guardar() {
    if (provedor === "asaas" && !carteira?.temChave && !chaveDaApi.trim()) {
      toast.error("Cole a chave da API do Asaas para salvar.");
      return;
    }
    try {
      const salva = await salvar.mutateAsync({
        contaId: conta.id,
        dados: {
          provedor,
          asaasApiKey: chaveDaApi.trim() || null,
          asaasAmbiente: ambiente,
          chavePix: chavePix.trim() || null,
          ativa,
          padraoParaMensalidades: mensalidades,
          padraoParaCobrancas: cobrancas,
        },
      });
      setResultadoDoTeste(null);

      if (salva.provedor === "asaas" && !existe) {
        // Primeiro salvamento no Asaas: o webhook só passa a existir agora e a chave ainda não
        // foi testada. Mantém a tela aberta para fechar esses dois passos.
        toast.success("Recebimento salvo. Agora teste a chave e cadastre o aviso no painel do Asaas.");
      } else {
        toast.success("Recebimento salvo.");
        onFechar();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o recebimento.");
    }
  }

  async function conferirChave() {
    try {
      const teste = await testar.mutateAsync(conta.id);
      setResultadoDoTeste(teste);
      if (teste.ok) toast.success("A chave funciona.");
      else toast.error(teste.mensagem);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível testar a chave.");
    }
  }

  async function removerRecebimento() {
    try {
      await remover.mutateAsync(conta.id);
      toast.success("Recebimento removido.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível remover o recebimento.");
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Jeito de receber: radio nativo escondido dentro do cartão — teclado e leitor de tela
            funcionam sem código extra. */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-xs text-muted-foreground">Como esta conta recebe</legend>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <OpcaoDeProvedor
              valor="asaas"
              marcado={provedor === "asaas"}
              onEscolher={() => setProvedor("asaas")}
              titulo="Pelo Asaas — automático"
              texto="O link, o Pix e o boleto são gerados sozinhos e o pagamento é confirmado sozinho."
            />
            <OpcaoDeProvedor
              valor="manual"
              marcado={provedor === "manual"}
              onEscolher={() => setProvedor("manual")}
              titulo="Manual"
              texto="A família paga na secretaria ou por Pix da chave informada; vocês marcam como paga."
            />
          </div>
        </fieldset>

        {provedor === "asaas" ? (
          <>
            <SecaoDoAsaas
              carteira={carteira}
              ambiente={ambiente}
              onAmbiente={setAmbiente}
              chaveDaApi={chaveDaApi}
              onChaveDaApi={setChaveDaApi}
              podeTestar={podeTestar}
              testando={testar.isPending}
              onTestar={conferirChave}
              resultadoDoTeste={resultadoDoTeste}
            />
            {/* No Asaas a chave Pix e opcional: so o QR estatico do checkout de eventos usa. */}
            <div className="flex flex-col gap-[5px]">
              <Label htmlFor="chave-pix-asaas" className="text-xs text-muted-foreground">
                Chave Pix da conta (opcional)
              </Label>
              <Input
                id="chave-pix-asaas"
                value={chavePix}
                placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                onChange={(e) => setChavePix(e.target.value)}
              />
              <p className="text-[11.5px] text-muted-foreground">
                Usada só no QR Pix da venda de eventos. As cobranças das famílias já saem com o Pix do próprio Asaas.
              </p>
            </div>
          </>
        ) : (
          <SecaoManual chavePix={chavePix} onChavePix={setChavePix} />
        )}

        <div className="flex flex-col gap-2.5 border-t border-border pt-4">
          <label className="flex items-start gap-2.5 text-sm">
            <Checkbox
              className="mt-0.5"
              checked={mensalidades}
              onCheckedChange={(v) => setMensalidades(v === true)}
            />
            <span>Usar esta conta para as mensalidades</span>
          </label>
          <label className="flex items-start gap-2.5 text-sm">
            <Checkbox
              className="mt-0.5"
              checked={cobrancas}
              onCheckedChange={(v) => setCobrancas(v === true)}
            />
            <span>Usar esta conta para as outras cobranças (festas, uniforme, loja)</span>
          </label>
          <p className="text-xs text-muted-foreground">
            Só uma conta pode ser a padrão de cada tipo. Ao marcar aqui, a outra conta deixa de ser.
          </p>
        </div>

        <label className="flex items-center justify-between gap-3 border-t border-border pt-4 text-sm">
          <span>
            Ativa
            <span className="block text-xs text-muted-foreground">
              Desative para parar de receber por esta conta sem apagar a configuração.
            </span>
          </span>
          <Switch checked={ativa} onCheckedChange={setAtiva} />
        </label>
      </div>

      {confirmandoRemocao ? (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          <p>
            Remover o recebimento desta conta? Ela deixa de receber pagamentos das famílias por aqui.
            A conta do Financeiro e o saldo continuam como estão.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmandoRemocao(false)}>
              Manter
            </Button>
            <Button variant="destructive" onClick={removerRecebimento} disabled={remover.isPending}>
              {remover.isPending ? "Removendo…" : "Sim, remover"}
            </Button>
          </div>
        </div>
      ) : (
        <DialogFooter>
          {existe && (
            <Button
              variant="ghost"
              className="text-destructive sm:mr-auto"
              onClick={() => setConfirmandoRemocao(true)}
            >
              Remover recebimento
            </Button>
          )}
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={salvar.isPending}>
            {salvar.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      )}
    </>
  );
}

function OpcaoDeProvedor({
  valor,
  marcado,
  onEscolher,
  titulo,
  texto,
}: {
  valor: ProvedorDeRecebimento;
  marcado: boolean;
  onEscolher: () => void;
  titulo: string;
  texto: string;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 ${
        marcado ? "border-primary bg-accent" : "border-border bg-card hover:bg-muted"
      }`}
    >
      <input
        type="radio"
        name="provedor-de-recebimento"
        value={valor}
        checked={marcado}
        onChange={onEscolher}
        className="sr-only"
      />
      <span className="flex items-center gap-2 text-sm font-medium">
        <span
          aria-hidden
          className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
            marcado ? "border-primary" : "border-input"
          }`}
        >
          {marcado && <span className="size-2 rounded-full bg-primary" />}
        </span>
        {titulo}
      </span>
      <span className="text-xs text-muted-foreground">{texto}</span>
    </label>
  );
}

function SecaoDoAsaas({
  carteira,
  ambiente,
  onAmbiente,
  chaveDaApi,
  onChaveDaApi,
  podeTestar,
  testando,
  onTestar,
  resultadoDoTeste,
}: {
  carteira: CarteiraDeRecebimento | null;
  ambiente: AmbienteDoAsaas;
  onAmbiente: (v: AmbienteDoAsaas) => void;
  chaveDaApi: string;
  onChaveDaApi: (v: string) => void;
  podeTestar: boolean;
  testando: boolean;
  onTestar: () => void;
  resultadoDoTeste: TesteDaCarteira | null;
}) {
  // O resultado recém-chegado vale mais que o gravado; sem ele, mostra o último teste guardado.
  const teste: { ok: boolean; texto: string } | null = resultadoDoTeste
    ? {
        ok: resultadoDoTeste.ok,
        texto: resultadoDoTeste.ok
          ? `Conectado como ${resultadoDoTeste.nomeDaConta ?? carteira?.asaasNomeDaConta ?? "conta do Asaas"}`
          : resultadoDoTeste.mensagem,
      }
    : carteira?.ultimoTesteEm
      ? {
          ok: carteira.ultimoTesteOk === true,
          texto:
            carteira.ultimoTesteOk === true
              ? `Conectado como ${carteira.asaasNomeDaConta ?? "conta do Asaas"}`
              : (carteira.ultimoTesteMensagem ?? "A chave não foi aceita pelo Asaas."),
        }
      : null;

  const dicaDoBotao = !carteira
    ? "Salve primeiro para poder testar a chave."
    : !carteira.temChave
      ? "Salve a chave primeiro para poder testar."
      : !podeTestar
        ? "Há alterações sem salvar. Salve para testar a configuração nova."
        : null;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-[5px]">
        <Label className="text-xs text-muted-foreground">Ambiente</Label>
        <Select value={ambiente} onValueChange={(v) => v && onAmbiente(String(v) as AmbienteDoAsaas)}>
          <SelectTrigger className="w-full">
            <SelectValue>
              {() => (ambiente === "producao" ? "Produção" : "Sandbox (para testes)")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="producao">Produção</SelectItem>
            <SelectItem value="sandbox">Sandbox (para testes)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Cada ambiente tem a sua chave: a de Sandbox não funciona em Produção e vice-versa.
        </p>
      </div>

      <div className="flex flex-col gap-[5px]">
        <Label htmlFor="chave-da-api-asaas" className="text-xs text-muted-foreground">
          Chave da API
        </Label>
        <Input
          id="chave-da-api-asaas"
          type="password"
          autoComplete="new-password"
          value={chaveDaApi}
          placeholder="Cole aqui a chave da API do Asaas"
          onChange={(e) => onChaveDaApi(e.target.value)}
        />
        {carteira?.temChave && (
          <p className="text-xs text-muted-foreground">
            Já tem uma chave gravada. Deixe em branco para manter.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onTestar} disabled={!podeTestar || testando}>
            <Plug className="size-4" />
            {testando ? "Testando…" : "Testar chave"}
          </Button>
          {dicaDoBotao && <span className="text-xs text-muted-foreground">{dicaDoBotao}</span>}
        </div>

        {teste && (
          <p
            role="status"
            className={`flex gap-2 rounded-lg border px-3 py-2 text-xs ${
              teste.ok
                ? "border-success-border bg-success-soft text-success-soft-foreground"
                : "border-destructive-border bg-destructive-soft text-destructive-soft-foreground"
            }`}
          >
            {teste.ok ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <TriangleAlert className="size-4 shrink-0" />
            )}
            <span className="break-words">
              {teste.texto}
              {carteira?.ultimoTesteEm && (
                <span className="block opacity-80">
                  Último teste em {dataEHora(carteira.ultimoTesteEm)}
                </span>
              )}
            </span>
          </p>
        )}
      </div>

      <AvisoDoPagamento carteira={carteira} />
    </div>
  );
}

function AvisoDoPagamento({ carteira }: { carteira: CarteiraDeRecebimento | null }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/50 p-3.5">
      <div>
        <h3 className="font-heading text-sm font-semibold">Avisar o EducaPilot quando a família pagar</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          É isso que confirma o pagamento sozinho. Faça uma vez, no painel do Asaas.
        </p>
      </div>

      {carteira ? (
        <>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-xs">
            <li>No painel do Asaas, abra Integrações › Webhooks.</li>
            <li>Cole a URL abaixo.</li>
            <li>Cole o token no campo &ldquo;Token de autenticação&rdquo;.</li>
            <li>
              Marque os eventos de cobrança (recebida, confirmada, vencida, estornada, excluída).
            </li>
          </ol>

          <CampoCopiavel rotulo="URL do webhook" valor={carteira.webhookUrl} />
          <CampoCopiavel rotulo="Token de autenticação" valor={carteira.webhookToken} />

          {carteira.ultimoWebhookEm ? (
            <p className="flex gap-2 rounded-lg border border-success-border bg-success-soft px-3 py-2 text-xs text-success-soft-foreground">
              <CheckCircle2 className="size-4 shrink-0" />
              Último aviso recebido em {dataEHora(carteira.ultimoWebhookEm)}
            </p>
          ) : (
            <p className="flex gap-2 rounded-lg border border-warning-border bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
              <TriangleAlert className="size-4 shrink-0" />
              Ainda não recebemos nenhum aviso do Asaas
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Salve o recebimento para ver a URL e o token que você vai cadastrar no painel do Asaas.
        </p>
      )}
    </div>
  );
}

function CampoCopiavel({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <Label className="text-xs text-muted-foreground">{rotulo}</Label>
      <div className="flex gap-2">
        <Input readOnly value={valor} className="font-mono text-xs md:text-xs" onFocus={(e) => e.target.select()} />
        <Button
          variant="outline"
          size="icon"
          aria-label={`Copiar ${rotulo.toLowerCase()}`}
          onClick={() => copiar(valor, rotulo)}
        >
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function SecaoManual({
  chavePix,
  onChavePix,
}: {
  chavePix: string;
  onChavePix: (v: string) => void;
}) {
  const pix = chavePix.trim();
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-[5px]">
        <Label htmlFor="chave-pix-manual" className="text-xs text-muted-foreground">
          Chave Pix (opcional)
        </Label>
        <Input
          id="chave-pix-manual"
          value={chavePix}
          placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
          onChange={(e) => onChavePix(e.target.value)}
        />
      </div>

      <p className="rounded-lg border border-border bg-muted px-3 py-2 text-xs">
        {pix ? (
          <>
            A família vai ver o Pix copia e cola com a chave <span className="font-mono break-all">{pix}</span>.
            Depois que ela pagar, vocês marcam a cobrança como paga.
          </>
        ) : (
          <>
            A família vai ver &ldquo;Pague na secretaria&rdquo;. Quando ela pagar, vocês marcam a cobrança
            como paga.
          </>
        )}
      </p>
    </div>
  );
}
