export const plans = {
  solo: {
    name: "Solo",
    price: 4900,
    professionals: 1,
    services: 10,
    bookings: 100,
  },
  team: {
    name: "Equipe",
    price: 9900,
    professionals: 5,
    services: 50,
    bookings: 500,
  },
} as const;
export const PIX_KEY = "+5511949345361";
export const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n / 100,
  );
export const statusLabel: Record<string, string> = {
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
  blocked: "Bloqueado",
  trial: "Em teste",
  active: "Ativo",
  expired: "Encerrado",
  pending: "Pendente",
  approved: "Pago",
  past_due: "Em atraso",
};
