import { Heart } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function CouplePage() {
  return (
    <ComingSoon
      title="Tiempo en pareja"
      icon={Heart}
      description="Citas, deseos compartidos, journal de memorias y notas de amor. Próxima iteración."
    />
  );
}
