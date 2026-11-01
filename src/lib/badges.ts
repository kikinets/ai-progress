// Names, descriptions and icons for the badges. Rust decides when they unlock (progress/badges.rs).
import {
  BookOpenText,
  Brain,
  CalendarCheck,
  Clock,
  Flame,
  Footprints,
  Gem,
  Hourglass,
  Moon,
  Mountain,
  Package,
  Sunrise,
  Target,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const BADGE_IDS = [
  "first-step",
  "first-deliverable",
  "streak-3",
  "streak-7",
  "streak-14",
  "focus-1h",
  "focus-10h",
  "focus-25h",
  "marathon",
  "deep-work",
  "early-bird",
  "night-owl",
  "week-complete",
  "skill-mastered",
  "note-taker",
] as const;

export type BadgeId = (typeof BADGE_IDS)[number];

export const BADGE_INFO: Record<BadgeId, { name: string; description: string; icon: LucideIcon }> = {
  "first-step": { name: "Primer paso", description: "Completa tu primera tarea", icon: Footprints },
  "first-deliverable": { name: "Primer entregable", description: "Completa un entregable", icon: Package },
  "streak-3": { name: "En marcha", description: "Racha de 3 días", icon: Flame },
  "streak-7": { name: "Una semana seguida", description: "Racha de 7 días", icon: Zap },
  "streak-14": { name: "Imparable", description: "Racha de 14 días", icon: Mountain },
  "focus-1h": { name: "Primera hora", description: "60 minutos de estudio", icon: Clock },
  "focus-10h": { name: "Diez horas", description: "600 minutos de estudio", icon: Hourglass },
  "focus-25h": { name: "Veinticinco horas", description: "1500 minutos de estudio", icon: Gem },
  marathon: { name: "Maratón", description: "180 minutos en un mismo día", icon: Timer },
  "deep-work": { name: "Trabajo profundo", description: "Una sesión de 90 minutos", icon: Target },
  "early-bird": { name: "Madrugador", description: "Empieza una sesión antes de las 8:00", icon: Sunrise },
  "night-owl": { name: "Búho", description: "Empieza una sesión a partir de las 23:00", icon: Moon },
  "week-complete": { name: "Semana redonda", description: "Completa todas las tareas de una semana", icon: CalendarCheck },
  "skill-mastered": { name: "Habilidad dominada", description: "Completa todas las tareas de una habilidad", icon: Brain },
  "note-taker": { name: "Apuntes al día", description: "Escribe notas en 5 tareas", icon: BookOpenText },
};

export const badgeInfo = (id: string) => BADGE_INFO[id as BadgeId];
