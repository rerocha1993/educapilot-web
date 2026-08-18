"use client";

import { useState } from "react";
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

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: true },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      await login.mutateAsync(values);
      router.push("/");
    } catch {
      // erro exibido via login.error abaixo, como faixa acima do formulário (ver L1)
    }
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-[380px] flex-col gap-4 rounded-[10px] border border-border bg-card p-7 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
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
          <span className="text-[11.5px] text-muted-foreground">
            Use o e-mail e senha cadastrados pela sua escola.
          </span>
        </div>

        {login.error && (
          <div className="rounded-md border border-destructive-border bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground">
            {login.error.message}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-[5px]">
            <Label htmlFor="email" className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              className="h-9"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-[5px]">
            <Label htmlFor="password" className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
              Senha
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="h-9 pr-9"
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
                <label className="flex items-center gap-[7px] text-[11.5px] text-foreground">
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  Manter conectado
                </label>
              )}
            />
            <a href="/esqueci-senha" className="text-[11.5px] text-primary hover:underline">
              Esqueci a senha
            </a>
          </div>

          <Button type="submit" disabled={login.isPending} className="mt-1 h-10">
            {login.isPending ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </main>
  );
}
