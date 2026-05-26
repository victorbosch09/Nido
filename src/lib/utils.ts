import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function greetingByTime(name: string): string {
  const h = new Date().getHours();
  if (h < 6) return `Buenas noches, ${name} 🌙`;
  if (h < 12) return `Buen día, ${name} ☀️`;
  if (h < 19) return `Buenas tardes, ${name} 🌤️`;
  return `Buenas noches, ${name} 🌙`;
}

const QUOTES = [
  "El amor no se mide en grandes gestos, sino en pequeños cuidados diarios. 💛",
  "Construir un hogar juntos es el arte de elegirse cada día. 🪺",
  "Las tareas compartidas son raíces; las memorias compartidas son ramas. 🌳",
  "Un equipo de dos puede mover montañas — y también lavar platos. 🏔️🍽️",
  "El presupuesto es un mapa, no una jaula. Recorrámoslo juntos. 🗺️",
  "Hoy es un buen día para hacer algo lindo el uno por el otro. ✨",
];

export function dailyQuote(): string {
  const d = new Date();
  const idx = (d.getFullYear() * 1000 + d.getMonth() * 31 + d.getDate()) % QUOTES.length;
  return QUOTES[idx];
}
