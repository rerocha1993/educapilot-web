import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eventsApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// PaymentStatus (SharedKernel/Enums/enum.cs): 1=AguardandoPagamento, 2=Pago, 3=Cancelado.
// Não existe valor "Expirado" no backend — ver disclaimer na tela de Pedidos (E4).
export const PAYMENT_STATUS_LABEL: Record<number, string> = {
  1: "Aguardando",
  2: "Pago",
  3: "Cancelado",
};
export const PAYMENT_STATUS_BADGE: Record<number, string> = {
  1: "bg-warning-soft text-warning-soft-foreground",
  2: "bg-success-soft text-success-soft-foreground",
  3: "bg-destructive-soft text-destructive-soft-foreground",
};

export interface OrderProductEventDto {
  id: string;
  productId: string;
  nomeProduto: string | null;
  subProductId: string | null;
  nomeSubProduto: string | null;
  quantidade: number;
}

export interface OrderEventDto {
  id: string;
  nomeCliente: string;
  valorTotal: number;
  formaPagamento: string;
  dataHoraPedido: string;
  status: string; // status de produção: "Em Producao" | "Finalizado"
  // null = não informado (pedidos reais criados antes desse campo existir/ser
  // preenchido — 15 dos 18 pedidos já existentes no tenant de teste estavam assim).
  // Não presumimos Aguardando nem Pago pra esses casos.
  statusPayment: number | null;
  asaasPaymentId: string | null;
  produtos: OrderProductEventDto[];
}

export function useOrders() {
  return useQuery({
    queryKey: ["events", "orders"],
    queryFn: async () => {
      const result = await eventsApi.GET("/api/events/OrderEvent");
      const data = unwrapApiResponse(result, "Não foi possível carregar os pedidos.");
      return (data ?? []) as unknown as OrderEventDto[];
    },
  });
}

export interface CreateOrderItemInput {
  productId: string;
  subProductId?: string;
  quantidade: number;
}

export interface CreateOrderInput {
  nomeCliente: string;
  valorTotal: number;
  formaPagamento: "Pix" | "Dinheiro";
  produtos: CreateOrderItemInput[];
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const result = await eventsApi.POST("/api/events/OrderEvent", { body: input });
      unwrapApiResponse(result, "Não foi possível criar o pedido.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events", "orders"] }),
  });
}

export function useFinalizarPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await eventsApi.PUT("/api/events/OrderEvent/{id}/finalizar", {
        params: { path: { id } },
      });
      unwrapApiResponse(result, "Não foi possível finalizar o pedido.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events", "orders"] }),
  });
}

export interface ResumoVendasDto {
  totalPedidos: number;
  totalArrecadado: number;
  totalFinalizados: number;
  totalAbertos: number;
}

export function useResumoVendas(inicio: string, fim: string) {
  return useQuery({
    queryKey: ["events", "resumo", inicio, fim],
    queryFn: async () => {
      const result = await eventsApi.GET("/api/events/OrderEvent/dashboard/resumo", {
        params: { query: { inicio, fim } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar o resumo.");
      return data as unknown as ResumoVendasDto;
    },
  });
}
