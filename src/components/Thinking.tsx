/** Waiting state for coach calls, which can take a while. The pulse only runs if motion is allowed. */
export function Thinking({ label }: { label: string }) {
  return (
    <p role="status" className="mt-3 text-sm text-muted motion-safe:animate-pulse">
      {label}
    </p>
  );
}
