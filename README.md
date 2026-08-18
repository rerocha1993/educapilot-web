# EducaPilot Web

Frontend novo do EducaPilot, em Next.js/React/TypeScript — substitui o app Flutter
(`sistema_reunioes`), que continua rodando em paralelo até este atingir paridade.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript
- **Tailwind CSS v4** + **shadcn/ui**
- **TanStack Query** para dados de servidor
- **Zustand** para estado de UI (quando necessário)
- **React Hook Form + Zod** para formulários
- **openapi-fetch** + tipos gerados via **openapi-typescript** a partir do Swagger real
  do backend (`EducaPilot.API`)
- **@microsoft/signalr** para tempo real (pedidos de Events)

## Como rodar

```bash
npm install
cp .env.local.example .env.local   # ajuste NEXT_PUBLIC_API_BASE_URL se precisar
npm run dev
```

Precisa do backend (`EducaPilot - core/EducaPilot.API`) rodando — ver `SECRETS.md` lá
pra configurar `JwtSettings:MasterKey` etc. antes de `dotnet run`.

## Clientes de API tipados

Os arquivos em `src/lib/api/generated/*.d.ts` são gerados a partir do Swagger real do
backend (um por módulo: Core/Tasks/Flow/Events/Finance), e os `.json` em `openapi/`
são o snapshot usado pra gerar. Pra regenerar depois de mudar o backend:

```bash
# com o backend rodando em https://localhost:7141
curl -s https://localhost:7141/swagger/Core/swagger.json -o openapi/Core.json
curl -s https://localhost:7141/swagger/Tasks/swagger.json -o openapi/Tasks.json
curl -s https://localhost:7141/swagger/Flow/swagger.json -o openapi/Flow.json
curl -s https://localhost:7141/swagger/Events/swagger.json -o openapi/Events.json
curl -s https://localhost:7141/swagger/Finance/swagger.json -o openapi/Finance.json

npx openapi-typescript openapi/Core.json -o src/lib/api/generated/core.d.ts
npx openapi-typescript openapi/Tasks.json -o src/lib/api/generated/tasks.d.ts
npx openapi-typescript openapi/Flow.json -o src/lib/api/generated/flow.d.ts
npx openapi-typescript openapi/Events.json -o src/lib/api/generated/events.d.ts
npx openapi-typescript openapi/Finance.json -o src/lib/api/generated/finance.d.ts
```

**Atenção**: alguns controllers do backend não usam `[ProducesResponseType]`, então o
Swagger não documenta o formato de resposta (ex: `POST /api/Auth/login`). Nesses casos
o tipo de resposta é definido manualmente no frontend (ver `src/lib/auth/types.ts`) a
partir do código real do controller, não do OpenAPI gerado — confira o comentário em
cada arquivo assim.

## Estrutura por módulo (planejada, espelha o backend)

```
src/app/
  (auth)/         → Kernel: login, convites, primeiro acesso, reset de senha
  admin/          → Kernel: tenants, módulos, usuários, turmas, alunos
  tasks/          → attendance, absence, occurrence, meetings, checklist,
                    weekly seminar, reports, materials, notifications
  events/         → sales groups, products, subproducts, orders (+ SignalR)
  flow/           → forms, fields, responses, automations
  finance/        → expenses, revenue, projections
```

## Status

- [x] Base técnica (Next.js, Tailwind, shadcn/ui, TanStack Query, clientes tipados)
- [x] Login (fatia vertical completa, testada contra o backend real)
- [ ] Kernel: admin, usuários, turmas, alunos, convites
- [ ] Tasks
- [ ] Events
- [ ] Flow
- [ ] Finance
