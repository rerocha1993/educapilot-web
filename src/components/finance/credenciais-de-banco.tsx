"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, KeyRound, Pencil, Plug, Trash2, TriangleAlert, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
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
  lerArquivoComoBase64,
  useBancosComApi,
  useCredenciaisDeBanco,
  useExcluirCredencial,
  useSalvarCredencial,
  useTestarCredencial,
  type CredencialDoBanco,
  type TesteDaCredencial,
} from "@/lib/finance/use-conexoes";
import type { SaldoDaConta } from "@/lib/finance/use-tesouraria";

const VAZIO = {
  contaId: "",
  banco: "inter",
  ambiente: "homologacao" as "homologacao" | "producao",
  clientId: "",
  clientSecret: "",
  senhaDoCertificado: "",
  agencia: "",
  numero: "",
  escoposExtras: "",
  ativa: true,
};

/**
 * Credenciais de API dos bancos — o trilho da conexão direta.
 *
 * Existe antes de a escola ter qualquer credencial de propósito: é aqui que ela vê quais bancos
 * o EducaPilot já sabe conversar e o que precisa pedir a cada um. Enquanto não tiver nenhuma, o
 * extrato continua entrando pelo OFX, que é o caminho de hoje.
 *
 * Segredo e certificado entram mas nunca voltam: o que a tela mostra depois é só "tem
 * certificado", e um campo em branco ao editar significa "não mexi nisso".
 */
export function CredenciaisDeBanco({ contas }: { contas: SaldoDaConta[] }) {
  const { data: bancos } = useBancosComApi();
  const { data: credenciais } = useCredenciaisDeBanco();
  const salvar = useSalvarCredencial();
  const excluir = useExcluirCredencial();
  const testar = useTestarCredencial();

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState(VAZIO);
  const [certificado, setCertificado] = useState<{ nome: string; base64: string } | null>(null);
  const certificadoRef = useRef<HTMLInputElement>(null);

  const [resultado, setResultado] = useState<{ id: string; teste: TesteDaCredencial } | null>(null);

  const bancoEscolhido = (bancos ?? []).find((b) => b.codigo === form.banco);
  const ativas = contas.filter((c) => c.ativa);

  function abrirNova() {
    setEditando(null);
    setForm({ ...VAZIO, contaId: ativas[0]?.id ?? "" });
    setCertificado(null);
    setAberto(true);
  }

  function abrirEdicao(credencial: CredencialDoBanco) {
    setEditando(credencial.id);
    setForm({
      contaId: credencial.contaId,
      banco: credencial.banco,
      ambiente: credencial.ambiente,
      clientId: credencial.clientId,
      clientSecret: "",
      senhaDoCertificado: "",
      agencia: credencial.agencia ?? "",
      numero: credencial.numero ?? "",
      escoposExtras: credencial.escoposExtras ?? "",
      ativa: credencial.ativa,
    });
    setCertificado(null);
    setAberto(true);
  }

  async function escolherCertificado(arquivo: File) {
    try {
      const base64 = await lerArquivoComoBase64(arquivo);
      setCertificado({ nome: arquivo.name, base64 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não consegui ler o certificado.");
    } finally {
      if (certificadoRef.current) certificadoRef.current.value = "";
    }
  }

  async function guardar() {
    if (!form.contaId || !form.clientId.trim()) {
      toast.error("Escolha a conta e informe o client id.");
      return;
    }
    try {
      await salvar.mutateAsync({
        id: editando ?? undefined,
        dados: {
          contaId: form.contaId,
          banco: form.banco,
          ambiente: form.ambiente,
          clientId: form.clientId.trim(),
          clientSecret: form.clientSecret || null,
          certificadoPfx: certificado?.base64 ?? null,
          senhaDoCertificado: form.senhaDoCertificado || null,
          agencia: form.agencia || null,
          numero: form.numero || null,
          escoposExtras: form.escoposExtras || null,
          ativa: form.ativa,
        },
      });
      toast.success(
        editando
          ? "Credencial atualizada. Teste a conexão de novo."
          : "Credencial cadastrada. Use “Testar” para conferir com o banco."
      );
      setAberto(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a credencial.");
    }
  }

  async function conferir(id: string) {
    try {
      const teste = await testar.mutateAsync(id);
      setResultado({ id, teste });
      if (teste.ok) toast.success("O banco respondeu.");
      else toast.error("O banco recusou. Veja o detalhe abaixo da credencial.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível testar.");
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-heading text-[15.5px] font-semibold">Credenciais de API do banco</h2>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Com a credencial cadastrada e testada, a conta pode ser ligada à origem &ldquo;API do
            banco&rdquo; e o extrato passa a chegar sozinho. Sem ela, o caminho continua sendo subir
            o OFX.
          </p>
        </div>
        {ativas.length > 0 && (
          <Button variant="outline" size="sm" onClick={abrirNova}>
            <KeyRound className="size-4" />
            Nova credencial
          </Button>
        )}
      </div>

      {(credenciais ?? []).length > 0 && (
        <div className="mt-3.5 flex flex-col gap-2.5">
          {(credenciais ?? []).map((credencial) => (
            <div key={credencial.id} className="rounded-lg border border-border px-3.5 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    <span className="break-words">{credencial.bancoNome}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="break-words font-normal text-muted-foreground">
                      {credencial.contaNome}
                    </span>
                    <Badge variant={credencial.ambiente === "producao" ? "secondary" : "outline"}>
                      {credencial.ambiente === "producao" ? "Produção" : "Homologação"}
                    </Badge>
                    {!credencial.ativa && <Badge variant="outline">Desativada</Badge>}
                  </p>
                  <p className="mt-0.5 font-mono text-xs break-all text-muted-foreground">
                    {credencial.clientId}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-1">
                  <Button variant="ghost" size="sm" disabled={testar.isPending} onClick={() => conferir(credencial.id)}>
                    <Plug className="size-4" />
                    Testar
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Editar credencial" onClick={() => abrirEdicao(credencial)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Apagar credencial"
                    onClick={async () => {
                      try {
                        await excluir.mutateAsync(credencial.id);
                        toast.success("Credencial removida.");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Não foi possível remover.");
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {credencial.faltando.length > 0 && (
                <p className="mt-2 flex gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-xs">
                  <TriangleAlert className="size-4 shrink-0 text-muted-foreground" />
                  <span>Ainda falta {credencial.faltando.join(", ")}.</span>
                </p>
              )}

              {credencial.ultimoTesteEm && (
                <p
                  className={`mt-2 flex gap-2 rounded-lg border px-3 py-2 text-xs ${
                    credencial.ultimoTesteOk
                      ? "border-success-border bg-success-soft text-success-soft-foreground"
                      : "border-destructive-border bg-destructive-soft text-destructive-soft-foreground"
                  }`}
                >
                  {credencial.ultimoTesteOk ? (
                    <CheckCircle2 className="size-4 shrink-0" />
                  ) : (
                    <TriangleAlert className="size-4 shrink-0" />
                  )}
                  <span className="break-words">{credencial.ultimoTesteMensagem}</span>
                </p>
              )}

              {/* A amostra é o coração da homologação: ela prova que data, valor e histórico
                  foram lidos dos campos certos, antes de qualquer lançamento ser criado. */}
              {resultado?.id === credencial.id && resultado.teste.amostra.length > 0 && (
                <div className="mt-2 rounded-lg border border-border bg-muted px-3 py-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Como o EducaPilot leu os últimos lançamentos
                  </p>
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {resultado.teste.amostra.map((linha) => (
                      <li key={linha} className="font-mono text-xs break-words">
                        {linha}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Se alguma coluna vier vazia ou trocada, é o mapa do banco que precisa de ajuste
                    — nada foi gravado.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(bancos ?? []).length > 0 && (credenciais ?? []).length === 0 && (
        <div className="mt-3.5 flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Bancos que o EducaPilot já sabe conversar
          </p>
          {(bancos ?? []).map((banco) => (
            <p key={banco.codigo} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{banco.nome}</span> — {banco.comoLiberar}{" "}
              <a
                href={banco.portal}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 underline"
              >
                portal
                <ExternalLink className="size-3" />
              </a>
            </p>
          ))}
        </div>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar credencial" : "Nova credencial de banco"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Banco</Label>
                <Select value={form.banco} onValueChange={(v) => v && setForm((f) => ({ ...f, banco: String(v) }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{() => bancoEscolhido?.nome ?? "Selecione"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(bancos ?? []).map((b) => (
                      <SelectItem key={b.codigo} value={b.codigo}>
                        {b.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Conta no EducaPilot</Label>
                <Select value={form.contaId || undefined} onValueChange={(v) => v && setForm((f) => ({ ...f, contaId: String(v) }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {() => ativas.find((c) => c.id === form.contaId)?.nome ?? "Selecione"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ativas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {bancoEscolhido && (
              <p className="rounded-lg border border-border bg-muted px-3 py-2 text-xs">
                {bancoEscolhido.comoLiberar}{" "}
                <a
                  href={bancoEscolhido.portal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Abrir o portal do {bancoEscolhido.nome}
                </a>
              </p>
            )}

            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Ambiente</Label>
              <Select
                value={form.ambiente}
                onValueChange={(v) => v && setForm((f) => ({ ...f, ambiente: String(v) as "homologacao" | "producao" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() => (form.ambiente === "producao" ? "Produção" : "Homologação (sandbox)")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="homologacao">Homologação (sandbox)</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Comece em homologação. A credencial de sandbox não serve em produção e vice-versa.
              </p>
            </div>

            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Client id</Label>
              <Input value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))} />
            </div>

            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">
                Client secret {editando && "(em branco mantém o atual)"}
              </Label>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.clientSecret}
                onChange={(e) => setForm((f) => ({ ...f, clientSecret: e.target.value }))}
              />
            </div>

            {bancoEscolhido?.exigeCertificado && (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div className="flex flex-col gap-[5px]">
                  <Label className="text-xs text-muted-foreground">Certificado (.pfx)</Label>
                  <input
                    ref={certificadoRef}
                    type="file"
                    accept=".pfx,.p12"
                    className="hidden"
                    onChange={(e) => {
                      const arquivo = e.target.files?.[0];
                      if (arquivo) escolherCertificado(arquivo);
                    }}
                  />
                  <Button variant="outline" onClick={() => certificadoRef.current?.click()}>
                    <Upload className="size-4" />
                    {certificado ? certificado.nome : "Escolher arquivo"}
                  </Button>
                </div>
                <div className="flex flex-col gap-[5px]">
                  <Label className="text-xs text-muted-foreground">Senha do certificado</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={form.senhaDoCertificado}
                    onChange={(e) => setForm((f) => ({ ...f, senhaDoCertificado: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Agência</Label>
                <Input value={form.agencia} onChange={(e) => setForm((f) => ({ ...f, agencia: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Conta</Label>
                <Input value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} />
              </div>
            </div>

            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Escopos extras (opcional)</Label>
              <Input
                value={form.escoposExtras}
                placeholder="só se o banco pedir algum escopo além do padrão"
                onChange={(e) => setForm((f) => ({ ...f, escoposExtras: e.target.value }))}
              />
            </div>

            <label className="flex items-center gap-2.5 text-sm">
              <Checkbox
                checked={form.ativa}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativa: v === true }))}
              />
              Credencial ativa
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
