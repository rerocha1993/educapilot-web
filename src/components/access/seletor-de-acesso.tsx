"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCatalogoDeAcesso, type AcessoDoUsuario } from "@/lib/access/use-acessos";
import { useClasses } from "@/lib/kernel/use-classes";

/**
 * Escolhe o que uma pessoa pode ver.
 *
 * Um componente só, usado no convite e na edição, porque as duas telas decidem exatamente a mesma
 * coisa. Separadas, elas divergiriam — e a divergência apareceria como "convidei com um acesso e
 * ficou outro".
 *
 * O papel muda o que se pergunta depois: professor trabalha por turma e precisa da lista de
 * turmas; gestão não. Manter as duas perguntas sempre visíveis obrigaria quem convida a ignorar
 * metade da tela toda vez.
 */
export function SeletorDeAcesso({
  valor,
  onChange,
}: {
  valor: AcessoDoUsuario;
  onChange: (acesso: AcessoDoUsuario) => void;
}) {
  const { data: catalogo, isLoading } = useCatalogoDeAcesso();
  const { data: turmas } = useClasses();

  const ehProfessor = valor.userType !== "Admin";

  function moduloMarcado(slug: string) {
    return valor.modulos.some((m) => m.moduloSlug === slug);
  }

  function alternarModulo(slug: string, marcado: boolean) {
    onChange({
      ...valor,
      modulos: marcado
        ? [...valor.modulos, { moduloSlug: slug, areas: [] }]
        : valor.modulos.filter((m) => m.moduloSlug !== slug),
    });
  }

  function areaMarcada(moduloSlug: string, areaSlug: string, todas: string[]) {
    const modulo = valor.modulos.find((m) => m.moduloSlug === moduloSlug);
    if (!modulo) return false;

    // Lista vazia significa módulo inteiro — então todas aparecem marcadas.
    return modulo.areas.length === 0 ? todas.includes(areaSlug) : modulo.areas.includes(areaSlug);
  }

  function alternarArea(moduloSlug: string, areaSlug: string, todas: string[], marcada: boolean) {
    onChange({
      ...valor,
      modulos: valor.modulos.map((m) => {
        if (m.moduloSlug !== moduloSlug) return m;

        // Expande o "vazio = tudo" antes de tirar uma: sem isso, desmarcar a primeira área de um
        // módulo liberado por inteiro deixaria a lista vazia — ou seja, tudo liberado de novo.
        const atuais = m.areas.length === 0 ? todas : m.areas;
        const proximas = marcada
          ? [...new Set([...atuais, areaSlug])]
          : atuais.filter((a) => a !== areaSlug);

        // Voltou a ter todas: grava vazio de novo, para que uma área nova criada amanhã já entre
        // para quem tinha o módulo completo.
        return { ...m, areas: proximas.length === todas.length ? [] : proximas };
      }),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-[5px]">
        <Label className="text-sm">Tipo de acesso</Label>
        <div className="flex gap-2">
          {[
            { valor: "Teacher", rotulo: "Professor(a)", ajuda: "Trabalha por turma" },
            { valor: "Admin", rotulo: "Gestão", ajuda: "Administra a escola" },
          ].map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              onClick={() => onChange({ ...valor, userType: opcao.valor })}
              className={cn(
                "flex-1 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                valor.userType === opcao.valor
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent/50"
              )}
            >
              <span className="block font-medium">{opcao.rotulo}</span>
              <span className="block text-xs opacity-80">{opcao.ajuda}</span>
            </button>
          ))}
        </div>
      </div>

      {ehProfessor && (
        <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
          <Label className="text-sm">Turmas</Label>
          <p className="text-xs text-muted-foreground">
            Ela verá apenas os alunos destas turmas.
          </p>
          <div className="mt-1 flex max-h-40 flex-col gap-1.5 overflow-y-auto">
            {(turmas ?? []).map((t) => {
              const id = t.id as number;
              return (
                <label key={id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={valor.classIds.includes(id)}
                    onCheckedChange={(marcada) =>
                      onChange({
                        ...valor,
                        classIds: marcada
                          ? [...valor.classIds, id]
                          : valor.classIds.filter((x) => x !== id),
                      })
                    }
                  />
                  {t.className}
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label className="text-sm">O que pode acessar</Label>
        <p className="text-xs text-muted-foreground">
          Marque o módulo para liberar inteiro, ou abra e escolha só as áreas.
        </p>

        {isLoading && <Skeleton className="h-40 w-full" />}

        {(catalogo ?? []).map((modulo) => {
          const marcado = moduloMarcado(modulo.slug);
          const todas = modulo.areas.map((a) => a.slug);

          return (
            <div
              key={modulo.slug}
              className={cn(
                "rounded-md border p-3 transition-colors",
                marcado ? "border-primary/40 bg-accent/20" : "border-border"
              )}
            >
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={marcado}
                  onCheckedChange={(v) => alternarModulo(modulo.slug, !!v)}
                />
                {modulo.rotulo}
              </label>

              {/* As áreas só aparecem com o módulo marcado: mostrar checkboxes de um módulo que a
                  pessoa não tem sugere que marcá-las daria acesso, e não dá. */}
              {marcado && (
                <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2 pl-6">
                  {modulo.areas.map((area) => (
                    <label key={area.slug} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={areaMarcada(modulo.slug, area.slug, todas)}
                        onCheckedChange={(v) =>
                          alternarArea(modulo.slug, area.slug, todas, !!v)
                        }
                      />
                      {area.rotulo}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
