import { ShoppingCart } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function GroceriesPage() {
  return (
    <ComingSoon
      title="Despensa inteligente"
      icon={ShoppingCart}
      description="Lista de compras compartida, calculadora de cantidades por ciclo y precio por tienda. Llegando en la próxima iteración."
    />
  );
}
