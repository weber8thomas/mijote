import { useCallback, useEffect, useRef, useState } from "react";

// Appui long tactile : 350 ms, annulé si le doigt bouge de plus de 10 px. Le tap simple reste un clic normal.
// À 120 ms d'immobilité, onArm prévient qu'un appui long se prépare (l'aperçu peut se construire en coulisse) ;
// un tap ou un défilement relâche ou bouge avant, sans rien coûter.

const ARM_MS = 120;
const HOLD_MS = 350;
const MOVE_TOLERANCE = 10;

type Callbacks = {
  onHold: (origin: DOMRect) => void;
  onArm?: () => void;
  /** L'appui s'arrête avant le déclenchement (après onArm). */
  onDisarm?: () => void;
};

export function usePressHold({ onHold, onArm, onDisarm }: Callbacks) {
  const timers = useRef<number[]>([]);
  const start = useRef<{ x: number; y: number } | null>(null);
  const armed = useRef(false);
  const fired = useRef(false);
  /** Doigt posé, aperçu pas encore déclenché : la carte s'enfonce doucement. */
  const [pressing, setPressing] = useState(false);
  const latest = useRef({ onHold, onArm, onDisarm });
  useEffect(() => {
    latest.current = { onHold, onArm, onDisarm };
  });

  const clear = useCallback(() => {
    setPressing(false);
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    start.current = null;
    if (armed.current && !fired.current) latest.current.onDisarm?.();
    armed.current = false;
  }, []);

  useEffect(() => clear, [clear]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    fired.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    const target = e.currentTarget as HTMLElement;
    setPressing(true);
    timers.current = [
      window.setTimeout(() => {
        armed.current = true;
        latest.current.onArm?.();
      }, ARM_MS),
      window.setTimeout(() => {
        fired.current = true;
        armed.current = false;
        setPressing(false);
        navigator.vibrate?.(10);
        latest.current.onHold(target.getBoundingClientRect());
      }, HOLD_MS),
    ];
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current || fired.current) return;
    if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > MOVE_TOLERANCE) clear();
  };

  return {
    pressing,
    /** Vrai si l'appui en cours a déclenché l'aperçu : le clic qui suit doit être ignoré. */
    consumed: () => fired.current,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: clear,
      onPointerCancel: clear,
      onPointerLeave: () => {
        if (!fired.current) clear();
      },
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
}
