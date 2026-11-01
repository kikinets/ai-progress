import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { CircleCheck, Moon, Pause, Play, Square, Volume2 } from "lucide-react";
import { placedTasks } from "../lib/plan";
import { SECTIONS } from "./Sidebar";
import { useStore } from "./store";
import { useTheme } from "./theme";
import { soundEnabled } from "./useTimer";
import { toast } from "../components/Toasts";

const itemClass =
  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted data-[selected=true]:bg-surface-2 data-[selected=true]:text-ink";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { roadmap, view, setSection, openTask, actions } = useStore();
  const [, toggleTheme] = useTheme();
  const session = view.activeSession;

  const run = (fn: () => void) => () => {
    onOpenChange(false);
    fn();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className="surface fixed top-[18%] left-1/2 z-50 w-[560px] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-hidden rounded-2xl shadow-2xl"
                initial={{ opacity: 0, scale: 0.97, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.16 }}
              >
                <Dialog.Title className="sr-only">Paleta de comandos</Dialog.Title>
                <Command loop>
                  <Command.Input autoFocus placeholder="Busca una tarea o una acción…" className="w-full border-b border-line bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-faint" />
                  <Command.List className="max-h-80 overflow-y-auto p-2">
                    <Command.Empty className="px-3 py-6 text-center text-sm text-muted">Sin resultados.</Command.Empty>
                    <Command.Group heading="Ir a" className="text-[11px] text-faint [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5">
                      {SECTIONS.map(({ id, label, icon: Icon }) => (
                        <Command.Item key={id} value={`ir ${label}`} onSelect={run(() => setSection(id))} className={itemClass}>
                          <Icon className="size-4" /> {label}
                        </Command.Item>
                      ))}
                    </Command.Group>
                    <Command.Group heading="Acciones" className="text-[11px] text-faint [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5">
                      {session && !session.paused && (
                        <Command.Item value="pausar temporizador" onSelect={run(actions.pauseSession)} className={itemClass}>
                          <Pause className="size-4" /> Pausar temporizador
                        </Command.Item>
                      )}
                      {session?.paused && (
                        <Command.Item value="seguir temporizador" onSelect={run(actions.resumeSession)} className={itemClass}>
                          <Play className="size-4" /> Seguir con la sesión
                        </Command.Item>
                      )}
                      {session && (
                        <Command.Item value="terminar sesion" onSelect={run(actions.stopSession)} className={itemClass}>
                          <Square className="size-4" /> Terminar sesión
                        </Command.Item>
                      )}
                      <Command.Item value="cambiar tema claro oscuro" onSelect={run(toggleTheme)} className={itemClass}>
                        <Moon className="size-4" /> Cambiar tema
                      </Command.Item>
                      <Command.Item
                        value="sonido temporizador"
                        onSelect={run(() => {
                          const next = soundEnabled() ? "off" : "on";
                          try {
                            localStorage.setItem("sound", next);
                          } catch {
                            // ignore
                          }
                          toast("info", next === "off" ? "Sonido del temporizador desactivado" : "Sonido del temporizador activado");
                        })}
                        className={itemClass}
                      >
                        <Volume2 className="size-4" /> Activar o desactivar sonido
                      </Command.Item>
                    </Command.Group>
                    <Command.Group heading="Tareas" className="text-[11px] text-faint [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5">
                      {placedTasks(roadmap).map(({ task, week }) => (
                        <Command.Item key={task.id} value={`${task.title} ${task.id}`} onSelect={run(() => openTask(task.id))} className={itemClass}>
                          <CircleCheck className={`size-4 shrink-0 ${view.tasks[task.id]?.completedAt ? "text-accent" : "text-faint"}`} />
                          <span className="truncate">{task.title}</span>
                          <span className="ml-auto shrink-0 text-[11px] text-faint">S{week.number}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  </Command.List>
                </Command>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
