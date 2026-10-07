"use client";

import { useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useSessaoLocal } from "@/lib/auth/use-sessao-local";
import { useClasses } from "@/lib/kernel/use-classes";
import { useSalvarAlbum, type AlbumDetalhe } from "@/lib/relacionamento/use-conteudo";

import { Segmentado } from "./segmentado";

type Destino = "escola" | "turma";

/**
 * Criar ou editar o álbum (título, descrição, para quem e data do evento). As fotos são enviadas
 * na página do álbum.
 *
 * Fica montado só enquanto aberto: o pai o renderiza condicionalmente. Professor (perfil Teacher)
 * nunca escolhe "Escola toda": o servidor recusa e a tela nem oferece.
 */
export function DialogDeAlbum({
  album,
  onFechar,
  onSalvo,
}: {
  /** Nulo = álbum novo. */
  album: AlbumDetalhe | null;
  onFechar: () => void;
  /** Recebe o id do álbum gravado. */
  onSalvo: (id: string) => void;
}) {
  const sessao = useSessaoLocal();
  const ehProfessor = sessao?.role === "Teacher";

  const { data: classes } = useClasses();
  const turmas = useMemo(
    () =>
      (classes ?? [])
        .filter((c): c is typeof c & { id: number } => typeof c.id === "number")
        .map((c) => ({ id: c.id, nome: c.className ?? `Turma ${c.id}` })),
    [classes]
  );

  const salvar = useSalvarAlbum();
  const [titulo, setTitulo] = useState(album?.titulo ?? "");
  const [descricao, setDescricao] = useState(album?.descricao ?? "");
  const [destinoEscolhido, setDestino] = useState<Destino>(album && !album.escolaToda ? "turma" : "escola");
  const [classIdEscolhido, setClassId] = useState<number | null>(album?.classId ?? null);
  const [dataDoEvento, setDataDoEvento] = useState(album?.dataDoEvento ?? "");
  const [erro, setErro] = useState<string | null>(null);

  const destino: Destino = ehProfessor ? "turma" : destinoEscolhido;
  const classId = classIdEscolhido ?? (destino === "turma" && turmas.length === 1 ? turmas[0].id : null);
  const nomeDaTurma = turmas.find((t) => t.id === classId)?.nome ?? album?.turma ?? null;

  async function gravar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return setErro("Dê um título ao álbum.");
    if (destino === "turma" && classId === null) return setErro("Escolha a turma do álbum.");

    try {
      const salvo = await salvar.mutateAsync({
        id: album?.id,
        dados: {
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          classId: destino === "turma" ? classId : null,
          dataDoEvento: dataDoEvento || null,
        },
      });
      toast.success(album ? "Álbum atualizado." : "Álbum criado. Agora você pode adicionar as fotos.");
      onSalvo(album?.id ?? salvo.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o álbum.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !salvar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{album ? "Editar álbum" : "Novo álbum"}</DialogTitle>
          <DialogDescription>
            Um álbum reúne fotos de um passeio, festa ou projeto. Aparece para as famílias só depois de publicado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void gravar(e)} noValidate className="grid gap-4">
          <Campo id="album-titulo" rotulo="Título">
            <Input
              id="album-titulo"
              value={titulo}
              maxLength={160}
              autoFocus
              placeholder="Ex.: Festa junina 2026"
              onChange={(e) => {
                setTitulo(e.target.value);
                setErro(null);
              }}
              aria-invalid={erro !== null && !titulo.trim()}
            />
          </Campo>

          <Campo id="album-descricao" rotulo="Descrição (opcional)">
            <Textarea
              id="album-descricao"
              value={descricao}
              rows={3}
              placeholder="Conte em poucas linhas o que as fotos mostram."
              onChange={(e) => setDescricao(e.target.value)}
            />
          </Campo>

          <div className="grid gap-1.5">
            <p className="text-sm font-medium">Para quem</p>
            {ehProfessor ? (
              <p className="text-xs text-muted-foreground">Professores criam álbuns só para as próprias turmas.</p>
            ) : (
              <Segmentado
                rotulo="Para quem é o álbum"
                opcoes={[
                  { id: "escola", rotulo: "Escola toda" },
                  { id: "turma", rotulo: "Uma turma" },
                ]}
                valor={destino}
                onChange={(d) => {
                  setDestino(d);
                  setErro(null);
                }}
                cheio
              />
            )}
          </div>

          {destino === "turma" && (
            <Campo id="album-turma" rotulo="Turma">
              <Select
                value={classId === null ? undefined : String(classId)}
                onValueChange={(v) => {
                  if (!v) return;
                  setClassId(Number(v));
                  setErro(null);
                }}
              >
                <SelectTrigger id="album-turma" className="w-full" aria-invalid={erro !== null && classId === null}>
                  <SelectValue>{() => nomeDaTurma ?? "Escolha a turma"}</SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} className="max-h-60">
                  {turmas.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          )}

          <Campo id="album-data" rotulo="Data do evento (opcional)">
            <Input
              id="album-data"
              type="date"
              value={dataDoEvento}
              onChange={(e) => setDataDoEvento(e.target.value)}
            />
          </Campo>

          {erro && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {erro}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={salvar.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : album ? "Salvar" : "Criar álbum"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
