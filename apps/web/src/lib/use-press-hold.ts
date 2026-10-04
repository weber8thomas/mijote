import { useCallback, useEffect, useRef, useState } from "react";

// Appui long tactile : 450 ms, annulé si le doigt bouge de plus de 10 px. Le tap simple reste un clic normal.

const HOLD_MS = 450;
const MOVE_TOLERANCE = 10;

/** onRelease reçoit le point de relâche : glisser jusqu'à un bouton de l'aperçu puis relâcher l'active (« peek and pop »). */
export function usePressHold(onHold: () => void, onRelease?: (point: { x: number; y: number }) => void) {
  const timer = useRef<number | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [holding, setHolding] = useState(false);
  const fired = useRef(false);

  const clear = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    start.current = null;
  }, []);

  useEffect(() => clear, [clear]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    fired.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    timer.current = window.setTimeout(() => {
      fired.current = true;
      setHolding(true);
      navigator.vibrate?.(10);
      onHold();
    }, HOLD_MS);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current || fired.current) return;
    if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > MOVE_TOLERANCE) clear();
  };

  const end = (e: React.PointerEvent) => {
    clear();
    if (fired.current) {
      setHolding(false);
      onRelease?.({ x: e.clientX, y: e.clientY });
    }
  };

  return {
    holding,
    /** Vrai si l'appui en cours a déclenché l'aperçu : le clic qui suit doit être ignoré. */
    consumed: () => fired.current,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
      onPointerLeave: () => {
        if (!fired.current) clear();
      },
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
}
