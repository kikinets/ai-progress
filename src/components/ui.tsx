// Small building blocks shared by every screen.
import { useEffect, useId, useState, type ReactNode } from "react";
import { animate, motion, useReducedMotion } from "motion/react";

export const SPRING = { type: "spring", visualDuration: 0.4, bounce: 0.15 } as const;

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`surface rounded-2xl p-5 ${className}`}>{children}</section>;
}

export function CardTitle({ icon, children, aside }: { icon?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <header className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
        {icon}
        {children}
      </h2>
      {aside}
    </header>
  );
}

/** Circular progress with the accent gradient; children go in the middle. */
export function Ring({
  value,
  max,
  size = 120,
  stroke = 10,
  label,
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  label: string;
  children?: ReactNode;
}) {
  const id = useId();
  const r = (size - stroke) / 2;
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemax={max}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-accent-from)" />
            <stop offset="100%" stopColor="var(--color-accent-to)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${CSS.escape(id)})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: ratio, opacity: ratio > 0 ? 1 : 0 }}
          transition={SPRING}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function ProgressBar({ value, max, label, className = "" }: { value: number; max: number; label: string; className?: string }) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemax={max} className={`h-1.5 overflow-hidden rounded-full bg-surface-3 ${className}`}>
      <motion.div className="bg-accent-gradient h-full origin-left rounded-full" initial={false} animate={{ scaleX: ratio }} transition={SPRING} />
    </div>
  );
}

/** Checkbox whose tick is drawn when checked. */
export function Checkbox({ checked, onChange, label, size = "md" }: { checked: boolean; onChange: () => void; label: string; size?: "md" | "lg" }) {
  const box = size === "lg" ? "size-6 rounded-lg" : "size-5 rounded-md";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`group relative grid shrink-0 place-items-center border transition-colors duration-150 ${box} ${
        checked ? "bg-accent-gradient border-transparent" : "border-line-strong bg-surface-2 hover:border-accent"
      }`}
    >
      <svg viewBox="0 0 16 16" className="size-3.5 text-white" aria-hidden>
        <motion.path
          d="M3.5 8.5l3 3 6-7"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        />
      </svg>
    </button>
  );
}

/** A number that counts up to its new value. */
export function CountUp({ value, className = "" }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    const controls = animate(shown, value, { duration: 0.6, ease: "easeOut", onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate from the last shown value
  }, [value, reduce]);
  return <span className={`tabular-nums ${className}`}>{shown}</span>;
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "warning" }) {
  const tones = {
    neutral: "border-line bg-surface-2 text-muted",
    accent: "border-transparent bg-accent/15 text-accent",
    warning: "border-transparent bg-warning/15 text-warning",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
}

export function Button({
  children,
  onClick,
  variant = "secondary",
  disabled,
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const variants = {
    primary: "bg-accent-gradient text-white shadow-[0_4px_20px_-6px_var(--color-accent-from)] hover:brightness-110",
    secondary: "border border-line bg-surface-2 text-ink hover:border-line-strong hover:bg-surface-3",
    ghost: "text-muted hover:bg-surface-2 hover:text-ink",
  };
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-[background,border,filter] duration-150 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
}

/** Fades and lifts a screen in when it mounts. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} className="mx-auto w-full max-w-6xl px-8 py-8">
      {children}
    </motion.div>
  );
}

export function ScreenHeader({ title, subtitle, aside }: { title: ReactNode; subtitle?: ReactNode; aside?: ReactNode }) {
  return (
    <header className="mb-8 flex items-end justify-between gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
      </div>
      {aside}
    </header>
  );
}

/** Renders `backtick` spans in plan text as inline code. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, i) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code key={i} className="rounded bg-surface-3 px-1 py-px font-mono text-[0.85em]">
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}
