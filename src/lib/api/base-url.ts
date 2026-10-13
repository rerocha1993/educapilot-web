// Sem /api no final — os paths gerados (ex: "/api/Auth/login") já incluem o prefixo.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";
