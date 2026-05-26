import { User } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function MePage() {
  return (
    <ComingSoon
      title="Tu espacio personal"
      icon={User}
      description="Presupuesto personal, tareas privadas, metas y registro de ánimo. Próxima iteración."
    />
  );
}
