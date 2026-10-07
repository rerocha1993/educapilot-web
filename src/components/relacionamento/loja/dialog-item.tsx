"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";

import { CampoDeDinheiro, emCentavos, emReais } from "@/components/finance/campo-de-dinheiro";
import { SeletorDeTurmas } from "@/components/finance/projetos/seletor-de-turmas";
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
import { Textarea } from "@/components/ui/textarea";
import { comprimirImagem } from "@/lib/relacionamento/comprimir-imagem";
import {
  useCriarItemDaLoja,
  useEditarItemDaLoja,
  useEnviarFotoDoItem,
  type ItemDaLoja,
  type SalvarItemDaLoja,
} from "@/lib/relacionamento/use-loja";
import { CATEGORIAS_DA_LOJA, ROTULO_DA_CATEGORIA, type CategoriaDaLoja } from "@/lib/relacionamento/use-portal-pagamentos";

/**
 * Item da loja: dados, turmas e foto. A foto só pode ir depois que o item existe (o upload é por
 * id), então o diálogo salva primeiro e envia a imagem em seguida. Se a foto falhar, o item já está
 * salvo e o aviso diz isso, em vez de fingir que nada foi gravado.
 */
export function DialogItemDaLoja({
  item,
  onFechar,
  onFotoEnviada,
}: {
  item?: ItemDaLoja;
  onFechar: () => void;
  /** Quem desenha a miniatura precisa saber que a imagem mudou. */
  onFotoEnviada: (id: string) => void;
}) {
  const criar = useCriarItemDaLoja();
  const editar = useEditarItemDaLoja();
  const enviarFoto = useEnviarFotoDoItem();
  const [enviando, setEnviando] = useState(false);
  const pendente = criar.isPending || editar.isPending || enviando;

  const [nome, setNome] = useState(item?.nome ?? "");
  const [descricao, setDescricao] = useState(item?.descricao ?? "");
  const [categoria, setCategoria] = useState<CategoriaDaLoja>(item?.categoria ?? "Material");
  const [preco, setPreco] = useState<number | null>(item ? item.preco : null);
  const [estoque, setEstoque] = useState(item?.estoque === null || item?.estoque === undefined ? "" : String(item.estoque));
  const [turmas, setTurmas] = useState<number[]>(item?.turmas.map((t) => t.classId) ?? []);
  const [foto, setFoto] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const entradaDeFoto = useRef<HTMLInputElement>(null);

  function escolherFoto(arquivo: File | undefined) {
    if (!arquivo) return;
    if (!/^image\/(jpeg|png)$/.test(arquivo.type) && !/\.(jpe?g|png)$/i.test(arquivo.name)) {
      return setErro("Envie uma foto JPG ou PNG.");
    }
    setErro(null);
    setFoto(arquivo);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const quantidade = estoque.trim() === "" ? undefined : Number(estoque);
    if (!nome.trim()) return setErro("Dê um nome ao item.");
    if (preco === null || preco <= 0) return setErro("Informe o preço.");
    if (quantidade !== undefined && (!Number.isInteger(quantidade) || quantidade < 0)) {
      return setErro("O estoque é um número inteiro, de 0 para cima. Deixe em branco se não há limite.");
    }

    const dados: SalvarItemDaLoja = {
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
      categoria,
      preco,
      estoque: quantidade,
      classIds: turmas.length > 0 ? turmas : undefined,
      ordem: item?.ordem,
    };

    let id = item?.id ?? "";
    try {
      if (item) {
        await editar.mutateAsync({ id: item.id, dados });
      } else {
        id = (await criar.mutateAsync(dados)).id;
      }
    } catch (err) {
      return void toast.error(err instanceof Error ? err.message : "Não foi possível salvar o item.");
    }

    if (foto && id) {
      setEnviando(true);
      try {
        await enviarFoto.mutateAsync({ id, arquivo: await comprimirImagem(foto) });
        onFotoEnviada(id);
        toast.success(item ? "Item atualizado." : "Item criado.");
      } catch (err) {
        toast.warning(
          `${item ? "Item atualizado" : "Item criado"}, mas a foto não foi enviada: ${
            err instanceof Error ? err.message : "tente de novo pela edição do item."
          }`
        );
      } finally {
        setEnviando(false);
      }
    } else {
      toast.success(item ? "Item atualizado." : "Item criado.");
    }
    onFechar();
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !pendente && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Editar item" : "Novo item da loja"}</DialogTitle>
          <DialogDescription>
            Material, taxa ou uniforme que as famílias pedem e pagam pelo portal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={salvar} noValidate className="grid gap-3.5">
          <Campo id="item-nome" rotulo="Nome">
            <Input
              id="item-nome"
              value={nome}
              maxLength={80}
              placeholder="Ex.: Kit de material do 1º semestre"
              onChange={(e) => {
                setNome(e.target.value);
                setErro(null);
              }}
            />
          </Campo>

          <Campo id="item-descricao" rotulo="Descrição (opcional)">
            <Textarea id="item-descricao" rows={2} value={descricao} maxLength={300} onChange={(e) => setDescricao(e.target.value)} />
          </Campo>

          <div className="grid gap-3.5 sm:grid-cols-3">
            <Campo id="item-categoria" rotulo="Categoria">
              <Select value={categoria} onValueChange={(v) => v && setCategoria(v as CategoriaDaLoja)}>
                <SelectTrigger id="item-categoria" className="w-full">
                  <SelectValue>{() => ROTULO_DA_CATEGORIA[categoria]}</SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {CATEGORIAS_DA_LOJA.map((c) => (
                    <SelectItem key={c} value={c}>
                      {ROTULO_DA_CATEGORIA[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo id="item-preco" rotulo="Preço">
              <CampoDeDinheiro
                id="item-preco"
                valorEmCentavos={emCentavos(preco)}
                onChange={(c) => {
                  setPreco(c === null ? null : emReais(c));
                  setErro(null);
                }}
              />
            </Campo>
            <Campo id="item-estoque" rotulo="Estoque" dica="Em branco: sem limite.">
              <Input
                id="item-estoque"
                type="number"
                inputMode="numeric"
                min={0}
                value={estoque}
                onChange={(e) => {
                  setEstoque(e.target.value);
                  setErro(null);
                }}
              />
            </Campo>
          </div>

          <div className="grid gap-2">
            <span className="text-sm leading-none font-medium">Quem vê este item</span>
            <SeletorDeTurmas
              valor={turmas}
              onChange={setTurmas}
              disabled={pendente}
              textoVazio="Nenhuma turma marcada: todas as famílias veem o item."
            />
          </div>

          <div className="grid gap-1.5">
            <span className="text-sm leading-none font-medium">Foto (opcional)</span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={entradaDeFoto}
                type="file"
                accept="image/jpeg,image/png"
                aria-label="Escolher foto do item"
                className="sr-only"
                onChange={(e) => {
                  escolherFoto(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <Button type="button" variant="outline" disabled={pendente} onClick={() => entradaDeFoto.current?.click()}>
                <ImagePlus />
                {foto ? "Trocar foto" : item?.temFoto ? "Enviar outra foto" : "Escolher foto"}
              </Button>
              {foto && <span className="min-w-0 text-[13px] break-words text-muted-foreground">{foto.name}</span>}
              {!foto && item?.temFoto && <span className="text-[13px] text-muted-foreground">O item já tem foto.</span>}
            </div>
            <p className="text-xs text-muted-foreground">A foto é reduzida antes do envio e vai depois que o item for salvo.</p>
          </div>

          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={pendente} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={pendente}>
              {enviando ? "Enviando a foto..." : pendente ? "Salvando..." : item ? "Salvar" : "Criar item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
