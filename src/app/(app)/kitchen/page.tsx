import { Utensils } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function KitchenPage() {
  return (
    <ComingSoon
      title="Cocina y meal prep"
      icon={Utensils}
      description="Recetario, planificador semanal y batch cooking. Próxima iteración."
    />
  );
}
