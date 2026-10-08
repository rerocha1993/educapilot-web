"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Campo } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { copiarTexto } from "@/lib/copiar";
import { useProjetos } from "@/lib/finance/use-projetos";
import { useCategoriasFinanceiras, useContas } from "@/lib/finance/use-tesouraria";
import {
  ROTULO_DO_DESTINO,
  useCriarRemetente,
  useEditarRemetente,
  type DestinoPadrao,
  type RemetenteCriado,
  type RemetenteDeWhatsApp,
} from "@/lib/finance/use-whatsapp-remetentes";
import { formatarDataHora } from "@/lib/format/date";
import { soDigitos } from "@/lib/rh/formatar";

const NENHUM = "__nenhum__";
const DESTINOS: DestinoPadrao[] = ["Despesas", "Projeto", "Conciliar"];

/** Celular brasileiro com máscara enquanto a pessoa digita: (11) 91234-5678 ou (11) 1234-5678. */
export function mascararCelular(texto: string): string {
  let d = soDigitos(texto);
  // Colado com o código do país (+55): o DDI não entra na máscara.
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  // Celular tem 9 dígitos depois do DDD (5 antes do hífen); fixo, 8 (4 antes).
  const corte = d.length > 10 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, corte)}${resto.length > corte ? `-${resto.slice(corte)}` : ""}`;
}

/** Os dígitos do celular sem o 55 do país: DDD + número (10 ou 11 dígitos). */
function digitosNacionais(texto: string): string {
  const d = soDigitos(texto);
  return d.length > 11 && d.startsWith("55") ? d.slice(2) : d;
}

/** O celular que a plataforma guarda (55DDNNNNNNNNN) → o que a pessoa vê no campo. */
function celularParaEdicao(telefone: string): string {
  return mascararCelular(digitosNacionais(telefone));
}

/**
 * Cadastrar ou editar quem pode mandar comprovante pelo WhatsApp.
 *
 * Depois de salvar um celular que ainda precisa confirmar, o mesmo diálogo passa a mostrar o
 * código de 6 dígitos e o que a pessoa deve fazer com ele.
 *
 * Quem abre monta o diálogo só enquanto ele está aberto (`remetente` nulo = novo).
 */
export function DialogRemetente({
  remetente,
  numeroDoEducaPilot,
  onFechar,
}: {
  remetente: RemetenteDeWhatsApp | null;
  /** O número da plataforma, para a instrução do código. */
  numeroDoEducaPilot: string | null;
  onFechar: () => void;
}) {
  const criar = useCriarRemetente();
  const editar = useEditarRemetente();
  const { data: projetos } = useProjetos(null, null);
  const { data: contas } = useContas();
  const { data: categorias } = useCategoriasFinanceiras();

  const [nome, setNome] = useState(remetente?.nome ?? "");
  const [celular, setCelular] = useState(remetente ? celularParaEdicao(remetente.telefone) : "");
  const [destino, setDestino] = useState<DestinoPadrao>(remetente?.destinoPadrao ?? "Despesas");
  const [projetoId, setProjetoId] = useState(remetente?.projetoPadraoId ?? "");
  const [contaId, setContaId] = useState(remetente?.contaFinanceiraPadraoId ?? "");
  const [categoriaId, setCategoriaId] = useState(remetente?.categoriaFinanceiraPadraoId ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState<RemetenteCriado | null>(null);

  const pendente = criar.isPending || editar.isPending;
  const projetosAbertos = (projetos ?? []).filter((p) => p.status !== "Encerrado");
  const categoriasDeDespesa = (categorias ?? []).filter((c) => c.tipo === "Despesa" && c.paiId);

  const nomeDoProjeto = projetosAbertos.find((p) => p.id === projetoId)?.nome ?? remetente?.projetoPadraoNome;
  const nomeDaConta = (contas ?? []).find((c) => c.id === contaId)?.nome ?? remetente?.contaPadraoNome;
  const nomeDaCategoria =
    categoriasDeDespesa.find((c) => c.id === categoriaId)?.nome ?? remetente?.categoriaPadraoNome;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const nacional = digitosNacionais(celular);
    if (!nome.trim()) return setErro("Escreva o nome de quem vai mandar os comprovantes.");
    if (nacional.length !== 10 && nacional.length !== 11) {
      return setErro("Confira o celular: ele tem o DDD e 8 ou 9 números.");
    }
    if (destino === "Projeto" && !projetoId) return setErro("Escolha o projeto que vai receber os comprovantes.");

    const dados = {
      nome: nome.trim(),
      telefone: `55${nacional}`,
      destinoPadrao: destino,
      projetoPadraoId: destino === "Projeto" ? projetoId : null,
      contaFinanceiraPadraoId: contaId || null,
      categoriaFinanceiraPadraoId: categoriaId || null,
    };

    try {
      const resposta = remetente
        ? await editar.mutateAsync({ id: remetente.id, dados })
        : await criar.mutateAsync(dados);

      if (resposta?.codigoDeConfirmacao && !resposta.confirmado) {
        setSalvo(resposta);
        return;
      }
      toast.success(remetente ? "Alterações salvas." : "Celular cadastrado.");
      onFechar();
    } catch (err) {
      // 409 (número já está em outra escola) e 400 (telefone inválido) trazem a frase do servidor.
      setErro(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  if (salvo) {
    const numero = salvo.telefoneDaPlataforma || numeroDoEducaPilot;
    return (
      <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Falta confirmar o celular</DialogTitle>
            <DialogDescription>
              Peça para {salvo.nome} enviar este código para o número do EducaPilot
              {numero ? ` (${numero})` : ""}, pelo WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="grid justify-items-center gap-2 rounded-xl border border-border bg-muted/60 px-4 py-5">
            <p
              aria-label={`Código ${salvo.codigoDeConfirmacao}`}
              className="font-heading font-mono text-[40px] leading-none font-semibold tracking-[.18em] tabular-nums"
            >
              {salvo.codigoDeConfirmacao}
            </p>
            {salvo.codigoExpiraEm && (
              <p className="text-[12.5px] text-muted-foreground">Vale até {formatarDataHora(salvo.codigoExpiraEm)}</p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => copiarTexto(salvo.codigoDeConfirmacao ?? "", "Código")}
            >
              <Copy />
              Copiar código
            </Button>
          </div>

          <p className="text-[13px] text-muted-foreground">
            Depois que o código chegar, o celular fica confirmado e os comprovantes passam a cair na Caixa.
            O código também fica visível na lista, caso precise de novo.
          </p>

          <DialogFooter>
            <Button variant="action" onClick={onFechar}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !pendente && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{remetente ? "Editar celular" : "Adicionar celular"}</DialogTitle>
          <DialogDescription>
            Quem estiver na lista pode mandar comprovantes pelo WhatsApp depois de confirmar o celular.
          </DialogDescription>
        </DialogHeader>

        <form id="form-remetente" onSubmit={salvar} noValidate className="grid gap-3.5">
          <Campo id="rem-nome" rotulo="Nome">
            <Input
              id="rem-nome"
              value={nome}
              maxLength={80}
              placeholder="Ex.: Dona Marta"
              onChange={(e) => {
                setNome(e.target.value);
                setErro(null);
              }}
            />
          </Campo>

          <Campo id="rem-celular" rotulo="Celular (WhatsApp)" dica="Com o DDD. Ex.: (11) 91234-5678">
            <Input
              id="rem-celular"
              inputMode="tel"
              autoComplete="off"
              value={celular}
              placeholder="(11) 91234-5678"
              onChange={(e) => {
                setCelular(mascararCelular(e.target.value));
                setErro(null);
              }}
            />
          </Campo>

          <Campo id="rem-destino" rotulo="Para onde vão os comprovantes dessa pessoa">
            <Select value={destino} onValueChange={(v) => v && setDestino(v as DestinoPadrao)}>
              <SelectTrigger id="rem-destino" className="w-full">
                <SelectValue>{() => ROTULO_DO_DESTINO[destino]}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {DESTINOS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {ROTULO_DO_DESTINO[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          {destino === "Projeto" && (
            <Campo id="rem-projeto" rotulo="Projeto">
              <Select
                value={projetoId || NENHUM}
                onValueChange={(v) => {
                  if (!v) return;
                  setProjetoId(v === NENHUM ? "" : v);
                  setErro(null);
                }}
              >
                <SelectTrigger id="rem-projeto" className="w-full">
                  <SelectValue>{() => nomeDoProjeto ?? "Escolha o projeto"}</SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value={NENHUM}>Escolha o projeto</SelectItem>
                  {projetosAbertos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          )}

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Campo id="rem-conta" rotulo="Conta padrão (opcional)">
              <Select value={contaId || NENHUM} onValueChange={(v) => v && setContaId(v === NENHUM ? "" : v)}>
                <SelectTrigger id="rem-conta" className="w-full">
                  <SelectValue>{() => nomeDaConta ?? "Não informar"}</SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value={NENHUM}>Não informar</SelectItem>
                  {(contas ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo id="rem-categoria" rotulo="Categoria padrão (opcional)">
              <Select
                value={categoriaId || NENHUM}
                onValueChange={(v) => v && setCategoriaId(v === NENHUM ? "" : v)}
              >
                <SelectTrigger id="rem-categoria" className="w-full">
                  <SelectValue>{() => nomeDaCategoria ?? "Não informar"}</SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value={NENHUM}>Não informar</SelectItem>
                  {categoriasDeDespesa.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.paiNome ? `${c.paiNome} › ${c.nome}` : c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          </div>

          {erro && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {erro}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" disabled={pendente} onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-remetente" variant="action" disabled={pendente}>
            {pendente ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
