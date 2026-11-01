// Roadmap dates are plain "YYYY-MM-DD" strings in local time.

const shortDate = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });

function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function formatRange(start: string, end: string): string {
  return `${shortDate.format(parseLocal(start))} – ${shortDate.format(parseLocal(end))}`;
}
