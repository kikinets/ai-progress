// Roadmap dates are plain "YYYY-MM-DD" strings in local time.

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const WEEKDAY_INITIALS = ["D", "L", "M", "X", "J", "V", "S"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

export function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const todayIso = () => toIso(new Date());

export function greeting(hour: number): string {
  if (hour >= 6 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

/** "lunes 2 de noviembre" */
export function longDate(iso: string): string {
  const d = parseLocal(iso);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

/** "2 – 8 nov", or "30 nov – 6 dic" across months. */
export function shortRange(start: string, end: string): string {
  const a = parseLocal(start);
  const b = parseLocal(end);
  const left = a.getMonth() === b.getMonth() ? `${a.getDate()}` : `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]}`;
  return `${left} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}`;
}

/** "3 nov" */
export function shortDate(iso: string): string {
  const d = parseLocal(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function weekdayShort(iso: string): string {
  return WEEKDAY_INITIALS[parseLocal(iso).getDay()];
}

export function weekdayLong(iso: string): string {
  const name = WEEKDAYS[parseLocal(iso).getDay()];
  return name[0].toUpperCase() + name.slice(1);
}
