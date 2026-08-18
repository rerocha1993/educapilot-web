// O Swagger não documenta o corpo da resposta de /api/Auth/login (o controller não usa
// [ProducesResponseType]), então esse formato vem do código real de AuthController.Login
// (EducaPilot.API/Modules/Controllers/Kernel/AuthController.cs) — não do OpenAPI gerado.
export interface LoginResponse {
  token: string;
  role: string;
  userId: string;
  classIds: number[];
  name: string;
  tenantId: string;
}

export interface StoredSession {
  token: string;
  role: string;
  userId: string;
  name: string;
  tenantId: string;
}
