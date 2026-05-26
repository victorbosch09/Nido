import { Wrench } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function PendingPage() {
  return (
    <ComingSoon
      title="Asuntos pendientes"
      icon={Wrench}
      description="Tablero kanban para arreglos, pagos y trámites. Próxima iteración."
    />
  );
}
