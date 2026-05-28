import {
  Home,
  ListTodo,
  Wallet,
  ShoppingCart,
  Utensils,
  Wrench,
  Heart,
  User,
  Sparkles,
  Shirt,
  ChefHat,
  HelpCircle,
  PartyPopper,
  Pill,
  Droplet,
  UtensilsCrossed,
  Boxes,
  CalendarDays,
  Handshake,
  type LucideIcon,
} from "lucide-react";

export type IconName =
  // tasks categories
  | "cleaning"
  | "laundry"
  | "kitchen"
  | "general"
  // budget categories
  | "groceries"
  | "home"
  | "personal_care"
  | "eating_out"
  | "fun"
  | "health"
  | "repairs"
  | "other";

export const CATEGORY_ICON: Record<IconName, LucideIcon> = {
  cleaning: Sparkles,
  laundry: Shirt,
  kitchen: ChefHat,
  general: Home,
  groceries: ShoppingCart,
  home: Home,
  personal_care: Droplet,
  eating_out: UtensilsCrossed,
  fun: PartyPopper,
  health: Pill,
  repairs: Wrench,
  other: HelpCircle,
};

export const SECTION_ICON = {
  dashboard: Home,
  tasks: ListTodo,
  routine: CalendarDays,
  budget: Wallet,
  groceries: ShoppingCart,
  inventory: Boxes,
  kitchen: Utensils,
  pending: Wrench,
  rules: Handshake,
  couple: Heart,
  me: User,
} satisfies Record<string, LucideIcon>;
