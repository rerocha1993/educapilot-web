"use client";

import { useEffect, useState } from "react";
import { Search, Pencil, Trash2, UserPlus, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useUsers, useSaveUser, useDeleteUser, useSendInvite, type UserDto } from "@/lib/kernel/use-users";
import { cn } from "@/lib/utils";
import { AcessoDialog } from "@/components/access/acesso-dialog";
import { SeletorDeAcesso } from "@/components/access/seletor-de-acesso";
import { type AcessoDoUsuario } from "@/lib/access/use-acessos";

const ROLE_LABELS: Record<string, string> = {
  Admin: "Administrador",
  Teacher: "Professor",
  Master: "Master",
};

export default function UsuariosPage() {
  const { data, isLoading, isError } = useUsers(1, 100);
  const saveUser = useSaveUser();
  const deleteUser = useDeleteUser();
  const sendInvite = useSendInvite();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [turmasDe, setTurmasDe] = useState<UserDto | null>(null);

  const users = data?.items ?? [];
  const roles = Array.from(new Set(users.map((u) => u.userType))).sort();

  const filtered = users.filter((u) => {
    if (roleFilter && u.userType !== roleFilter) return false;
    const q = search.toLowerCase();
    return !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const [editing, setEditing] = useState<UserDto | null>(null);
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState("Teacher");
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (editing) {
      setFullName(editing.fullName);
      setCpf(editing.cpf);
      setEmail(editing.email);
      setUserType(editing.userType);
      setAtivo(editing.ativo);
    }
  }, [editing]);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNome, setInviteNome] = useState("");
  const [linkConvite, setLinkConvite] = useState<string | null>(null);

  // Professor sem módulo é o padrão seguro: quem convida marca o que a pessoa precisa, em vez
  // de tirar o que ela não deveria ter.
  const [inviteAcesso, setInviteAcesso] = useState<AcessoDoUsuario>({
    userType: "Teacher",
    modulos: [],
    classIds: [],
  });

  async function handleSave() {
    if (!editing || !fullName.trim() || !email.trim()) return;
    try {
      await saveUser.mutateAsync({ id: editing.id, fullName: fullName.trim(), cpf, email: email.trim(), userType, ativo });
      toast.success("Usuário atualizado.");
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  async function handleDelete(user: UserDto) {
    try {
      await deleteUser.mutateAsync(user.id);
      toast.success("Usuário excluído.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    try {
      const resultado = await sendInvite.mutateAsync({
        email: inviteEmail.trim(),
        nome: inviteNome.trim() || undefined,
        acesso: inviteAcesso,
      });

      if (resultado && !resultado.enviado) {
        // O convite vale mesmo sem o e-mail. Mostrar o link deixa a escola repassar por WhatsApp
        // em vez de ficar convidando de novo e acumulando convites para a mesma pessoa.
        setLinkConvite(resultado.link ?? null);
        toast.warning(resultado.message);
        return;
      }
      toast.success("Convite enviado.");
      setInviteEmail("");
      setInviteOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao convidar.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRoleFilter(null)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              roleFilter === null
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-accent-foreground hover:bg-accent/70"
            )}
          >
            Todos ({users.length})
          </button>
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                roleFilter === role
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-accent-foreground hover:bg-accent/70"
              )}
            >
              {ROLE_LABELS[role] ?? role} ({users.filter((u) => u.userType === role).length})
            </button>
          ))}
        </div>

        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="size-4" />
          Convidar
        </Button>
      </div>

      <div className="relative w-72">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 pl-8"
        />
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os usuários.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            )}

            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.fullName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{ROLE_LABELS[u.userType] ?? u.userType}</Badge>
                </TableCell>
                <TableCell>
                  {u.ativo ? (
                    <Badge className="bg-success-soft text-success-soft-foreground">Ativo</Badge>
                  ) : (
                    <Badge className="bg-destructive-soft text-destructive-soft-foreground">Inativo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Acesso e turmas"
                      onClick={() => setTurmasDe(u)}
                    >
                      <GraduationCap className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditing(u)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(u)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Turmas por usuário: resolvido em 2026-09 (ícone de turmas na linha). A lista de
          convites pendentes continua sem endpoint no backend (InviteToken não tem
          GetAll/GetByTenant) — ver design/handoff. */}
      <p className="text-xs text-muted-foreground">
        A lista de convites pendentes ainda não é suportada pelo backend — próxima etapa.
      </p>

      {/* key: remonta ao trocar de usuário, zerando a seleção do anterior. */}
      <AcessoDialog
        key={turmasDe?.id ?? "nenhum"}
        userId={turmasDe?.id ?? null}
        userName={turmasDe?.fullName}
        onClose={() => setTurmasDe(null)}
      />

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-[5px]">
              <Label className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Nome completo
              </Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                CPF
              </Label>
              <Input value={cpf} onChange={(e) => setCpf(e.target.value)} />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                E-mail
              </Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Papel
              </Label>
              <Select value={userType} onValueChange={(v) => v && setUserType(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: string) => ROLE_LABELS[v] ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Administrador</SelectItem>
                  <SelectItem value="Teacher">Professor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={ativo} onCheckedChange={(v) => setAtivo(v === true)} />
              Usuário ativo
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saveUser.isPending || !fullName.trim() || !email.trim()}>
              {saveUser.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Convidar usuário</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              O acesso é definido aqui e vai descrito no e-mail. A pessoa só escolhe a senha ao
              aceitar.
            </p>

            <div className="flex flex-col gap-[5px]">
              <Label className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Nome (opcional)
              </Label>
              <Input value={inviteNome} onChange={(e) => setInviteNome(e.target.value)} />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                E-mail
              </Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                autoFocus
              />
            </div>

            {linkConvite && (
              <div className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
                O e-mail não saiu, mas o convite está válido. Envie este link para a pessoa:
                <code className="mt-1 block break-all">{linkConvite}</code>
              </div>
            )}

            <SeletorDeAcesso valor={inviteAcesso} onChange={setInviteAcesso} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleInvite} disabled={sendInvite.isPending || !inviteEmail.trim()}>
              {sendInvite.isPending ? "Enviando..." : "Enviar convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
