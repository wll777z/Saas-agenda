import type { Metadata } from "next";
import "./globals.css";
import "./redesign.css";
import "./product-features.css";
import "./liquid-glass.css";
export const metadata: Metadata = {
  title: "Agenda Clara — Mais tempo para o que importa",
  description:
    "Sua agenda organizada. Seus clientes com hora marcada. Agendamento online para profissionais e pequenos negócios.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
