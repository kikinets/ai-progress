import { motion } from "motion/react";

interface Props {
  value: number;
  max: number;
  label: string;
  className?: string;
}

/** Accent bar that grows with a soft spring when progress changes. */
export function ProgressBar({ value, max, label, className = "" }: Props) {
  const ratio = max === 0 ? 0 : value / max;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={`h-2 overflow-hidden rounded-full bg-line ${className}`}
    >
      <motion.div
        className="h-full origin-left rounded-full bg-accent"
        initial={false}
        animate={{ scaleX: ratio }}
        transition={{ type: "spring", visualDuration: 0.3, bounce: 0.15 }}
      />
    </div>
  );
}
