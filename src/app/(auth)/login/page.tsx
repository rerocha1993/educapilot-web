"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useLogin } from "@/lib/auth/use-login";
import { useQueryStringLocal } from "@/lib/auth/use-sessao-local";

const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe a senha."),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  // Avisos vindos da URL. Lidos de window.location em vez de useSearchParams porque este último
  // exige envolver a página num Suspense — restruturação grande demais para uma faixa de aviso.
  // ?expirada é posto pelo cliente HTTP ao receber 401 (ver src/lib/api/client.ts).
  const params = useQueryStringLocal();
  const sessaoExpirada = params.has("expirada");
  // Chegou aqui vindo da tela de convite, com o cadastro concluído (ver /convite).
  const conviteAceito = params.get("convite") === "aceito";
  // Responsável que acabou de criar a senha pelo link de acesso (ver /responsavel/definir-senha).
  const senhaDefinida = params.get("senha") === "definida";
  const emailDaUrl = params.get("email");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: true },
  });

  useEffect(() => {
    if (emailDaUrl) setValue("email", emailDaUrl);
  }, [emailDaUrl, setValue]);

  async function onSubmit(values: LoginFormValues) {
    try {
      const resultado = await login.mutateAsync(values);
      // Responsável não usa o sistema da equipe: tem o site dele, feito para o celular.
      // No celular a equipe começa pela tela de atalhos; no computador, direto na Chamada.
      const celular = window.matchMedia("(max-width: 767px)").matches;
      router.push(resultado.role === "Responsavel" ? "/responsavel" : celular ? "/inicio" : "/");
    } catch {
      // erro exibido via login.error abaixo, como faixa acima do formulário (ver L1)
    }
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-background p-4 md:p-6">
      <div className="flex w-full max-w-[380px] flex-col gap-4 rounded-[10px] border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,.04)] md:p-7">
        <Image
          src="/logo.png"
          alt="EducaPilot"
          width={156}
          height={123}
          className="mx-auto h-13 w-auto"
          priority
        />

        <div className="flex flex-col items-center gap-1 text-center">
          <span className="font-heading text-base font-bold">Entrar na sua escola</span>
          <span className="text-[13px] text-muted-foreground md:text-[11.5px]">
            Use o e-mail e senha cadastrados pela sua escola.
          </span>
        </div>

        {conviteAceito && !login.error && (
          <div className="rounded-md border border-border bg-accent px-3 py-2 text-sm">
            Cadastro concluído. Entre com seu e-mail e a senha que você acabou de criar.
          </div>
        )}

        {senhaDefinida && !login.error && (
          <div className="rounded-md border border-border bg-accent px-3 py-2 text-sm">
            Senha criada. Entre com seu e-mail.
          </div>
        )}

        {sessaoExpirada && !login.error && (
          <div className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm">
            Sua sessão expirou por inatividade. Entre novamente para continuar.
          </div>
        )}

        {login.error && (
          <div className="rounded-md border border-destructive-border bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground">
            {login.error.message}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-[5px]">
            <Label htmlFor="email" className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground md:text-[9.5px]">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              className="h-10 md:h-9"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-[5px]">
            <Label htmlFor="password" className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground md:text-[9.5px]">
              Senha
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="h-10 pr-10 md:h-9 md:pr-9"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-primary"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Controller
              name="rememberMe"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2.5 py-2 text-[13px] text-foreground md:gap-[7px] md:py-0 md:text-[11.5px]">
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  Manter conectado
                </label>
              )}
            />
            <a href="/esqueci-senha" className="py-2 text-[13px] text-primary hover:underline md:py-0 md:text-[11.5px]">
              Esqueci a senha
            </a>
          </div>

          <Button type="submit" disabled={login.isPending} className="mt-1 h-12 text-base md:h-10 md:text-sm">
            {login.isPending ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </main>
  );
}
