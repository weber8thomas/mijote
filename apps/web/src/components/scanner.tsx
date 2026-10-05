import type { BarcodeFormat } from "barcode-detector/ponyfill";
import { CameraOff, Check, Flashlight, FlashlightOff, Keyboard, XIcon } from "lucide-react";
import { motion } from "motion/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
// Le moteur de lecture (ZXing, ~1 Mo) est servi depuis le site, jamais depuis un CDN, et chargé seulement si besoin.
import zxingWasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Lecteur de code-barres plein écran : caméra arrière, viseur, lampe si l'appareil en a une.
// BarcodeDetector natif (Chrome Android) sinon polyfill ZXing chargé à la demande (iOS, Firefox).
// Toujours une saisie à la main, et un message clair si la caméra est refusée ou absente.

declare global {
  interface Window {
    /** Tests de bout en bout : code « lu » juste après l'ouverture, sans caméra. */
    __mijoteFakeBarcode?: string;
  }
}

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "qr_code"];
/** ~5 lectures par seconde : assez réactif, sans chauffer le téléphone. */
const INTERVAL = 200;

type Detected = { rawValue: string; format?: string };
type Detector = { detect(source: HTMLVideoElement): Promise<Detected[]> };
type DetectorCtor = { new (options?: { formats?: string[] }): Detector; getSupportedFormats?(): Promise<string[]> };

let detectorPromise: Promise<Detector> | undefined;

async function makeDetector(): Promise<Detector> {
  const Native = (globalThis as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  if (Native) {
    try {
      const supported = (await Native.getSupportedFormats?.()) ?? [];
      const formats = FORMATS.filter((f) => supported.includes(f));
      if (formats.includes("ean_13")) return new Native({ formats });
    } catch {
      // Détecteur natif incomplet : on passe au polyfill.
    }
  }
  const { BarcodeDetector, prepareZXingModule } = await import("barcode-detector/ponyfill");
  prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? zxingWasmUrl : prefix + path) } });
  return new BarcodeDetector({ formats: FORMATS as BarcodeFormat[] });
}

/** Un seul détecteur pour toute la session (le polyfill coûte cher à charger). */
const getDetector = () => {
  detectorPromise ??= makeDetector().catch((e: unknown) => {
    detectorPromise = undefined;
    throw e;
  });
  return detectorPromise;
};

/** Code lisible par Open Food Facts : un EAN tel quel, ou le GTIN d'un QR code GS1 (« …/01/03017620422003 »). */
export function normalizeCode(raw: string): string | undefined {
  const t = raw.trim();
  if (/^\d{8,14}$/.test(t)) return t.length === 14 && t.startsWith("0") ? t.slice(1) : t;
  const gs1 = t.match(/\/01\/(\d{14})\b/);
  if (gs1) return gs1[1].replace(/^0/, "");
  return t || undefined;
}

type CamState = "starting" | "live" | "denied" | "insecure" | "unavailable" | "error";

const MESSAGES: Record<Exclude<CamState, "starting" | "live">, { title: string; text: string }> = {
  denied: { title: "Caméra refusée", text: "Autorise la caméra pour Mijoté dans les réglages du navigateur, puis rouvre le lecteur. Ou saisis le code juste en dessous." },
  insecure: { title: "Caméra indisponible", text: "La caméra ne s'ouvre que sur une connexion sécurisée (https). Saisis le code juste en dessous." },
  unavailable: { title: "Pas de caméra", text: "Aucune caméra trouvée sur cet appareil. Saisis le code juste en dessous." },
  error: { title: "La caméra ne répond pas", text: "Ferme les autres applis qui l'utilisent, puis réessaie. Ou saisis le code juste en dessous." },
};

type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };

/** Même code relu par la caméra pendant ce délai : ignoré (mode continu). */
const SAME_CODE_MS = 4000;
/** Pause après une lecture en mode continu, le temps de lire le résultat. */
const COOLDOWN_MS = 1200;

type ScannerProps = {
  onDetected: (code: string) => void;
  onClose: () => void;
  title?: string;
  hint?: string;
  /** Mode continu (magasin) : la caméra reste ouverte après une lecture, bouton « Terminer ». */
  continuous?: boolean;
  /** Résultat de la dernière lecture, affiché au-dessus des commandes (zone du pouce). */
  children?: ReactNode;
};

export function BarcodeScanner({ onDetected, onClose, title = "Scanner un produit", hint: liveHint, continuous = false, children }: ScannerProps) {
  const lastRef = useRef<{ code: string; at: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const doneRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);
  const [cam, setCam] = useState<CamState>("starting");
  const [detector, setDetector] = useState<Detector | null>(null);
  const [detectorFailed, setDetectorFailed] = useState(false);
  const [torch, setTorch] = useState<{ supported: boolean; on: boolean }>({ supported: false, on: false });
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string>();

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const finish = (value: string, manualEntry = false) => {
    if (doneRef.current) return;
    if (continuous) {
      const last = lastRef.current;
      const now = performance.now();
      if (!manualEntry && last && (now - last.at < COOLDOWN_MS || (last.code === value && now - last.at < SAME_CODE_MS))) return;
      lastRef.current = { code: value, at: now };
      onDetectedRef.current(value);
      return;
    }
    doneRef.current = true;
    stop();
    onDetectedRef.current(value);
  };

  // Caméra arrière, coupée à la fermeture.
  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      if (!window.isSecureContext) return setCam("insecure");
      if (!navigator.mediaDevices?.getUserMedia) return setCam("unavailable");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        const track = stream.getVideoTracks()[0];
        const caps = (track?.getCapabilities?.() ?? {}) as TorchCapabilities;
        setTorch({ supported: !!caps.torch, on: false });
        setCam("live");
      } catch (e) {
        if (cancelled) return;
        const name = e instanceof DOMException ? e.name : "";
        setCam(name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" || name === "OverconstrainedError" ? "unavailable" : "error");
      }
    };
    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  // Détecteur préparé en parallèle de la caméra.
  useEffect(() => {
    let cancelled = false;
    getDetector().then(
      (d) => !cancelled && setDetector(d),
      () => !cancelled && setDetectorFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Code factice pour les tests de bout en bout.
  useEffect(() => {
    const fake = window.__mijoteFakeBarcode;
    if (!fake) return;
    const t = setTimeout(() => finish(fake), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Boucle de lecture : à chaque image de la vidéo, au plus toutes les 200 ms.
  useEffect(() => {
    const video = videoRef.current;
    if (cam !== "live" || !detector || !video) return;
    let stopped = false;
    let busy = false;
    let last = 0;
    let handle = 0;
    const rvfc = typeof video.requestVideoFrameCallback === "function";
    const schedule = () => {
      handle = rvfc ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
    };
    const tick = () => {
      if (stopped) return;
      const now = performance.now();
      if (!busy && now - last >= INTERVAL && video.readyState >= 2) {
        busy = true;
        last = now;
        detector
          .detect(video)
          .then((found) => {
            const hit = found.map((f) => normalizeCode(f.rawValue)).find(Boolean);
            if (hit && !stopped) {
              const last = lastRef.current;
              const now = performance.now();
              const fresh = !last || (now - last.at >= COOLDOWN_MS && (last.code !== hit || now - last.at >= SAME_CODE_MS));
              if (!continuous) stopped = true;
              if (fresh) navigator.vibrate?.(30);
              finish(hit);
            }
          })
          .catch(() => undefined)
          .finally(() => {
            busy = false;
          });
      }
      if (!stopped) schedule();
    };
    schedule();
    return () => {
      stopped = true;
      if (rvfc) video.cancelVideoFrameCallback(handle);
      else cancelAnimationFrame(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cam, detector]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const on = !torch.on;
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
      setTorch({ supported: true, on });
    } catch {
      setTorch({ supported: false, on: false });
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = code.replace(/\s+/g, "");
    if (!/^\d{8,14}$/.test(value)) return setCodeError("Un code-barres compte 8 à 13 chiffres.");
    finish(value, true);
    if (continuous) setCode("");
  };

  const failed = cam !== "starting" && cam !== "live";
  const showManual = manual || failed;
  const hint = detectorFailed ? "Lecture automatique indisponible : saisis le code." : cam === "starting" ? "Ouverture de la caméra…" : (liveHint ?? "Vise le code-barres : il se lit tout seul.");

  return (
    <DialogPrimitive.Root open onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-foreground text-white outline-none data-open:animate-in data-open:fade-in-0"
          aria-describedby="scanner-hint"
          // Un toast (« Annuler ») touché pendant le scan ne ferme pas le lecteur.
          onPointerDownOutside={(e) => {
            if ((e.target as Element | null)?.closest?.("[data-sonner-toaster]")) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if ((e.target as Element | null)?.closest?.("[data-sonner-toaster]")) e.preventDefault();
          }}
        >
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            aria-hidden
            className={cn("absolute inset-0 size-full object-cover transition-opacity duration-300", cam === "live" ? "opacity-100" : "opacity-0")}
          />

          {/* En-tête */}
          <div className="pt-safe relative z-10 bg-gradient-to-b from-black/55 to-transparent">
            <div className="flex h-16 items-center gap-2 px-3">
              <DialogPrimitive.Close className="grid size-12 shrink-0 place-items-center rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/25 focus-visible:ring-[3px] focus-visible:ring-white/70 focus-visible:outline-none" aria-label="Fermer le lecteur">
                <XIcon className="size-6" />
              </DialogPrimitive.Close>
              <DialogPrimitive.Title className="min-w-0 flex-1 truncate text-center font-heading text-xl">{title}</DialogPrimitive.Title>
              {torch.supported ? (
                <button
                  type="button"
                  onClick={toggleTorch}
                  aria-pressed={torch.on}
                  aria-label={torch.on ? "Éteindre la lampe" : "Allumer la lampe"}
                  className={cn(
                    "grid size-12 shrink-0 place-items-center rounded-full backdrop-blur-sm focus-visible:ring-[3px] focus-visible:ring-white/70 focus-visible:outline-none",
                    torch.on ? "bg-ochre-soft text-ochre-ink" : "bg-white/15 hover:bg-white/25",
                  )}
                >
                  {torch.on ? <Flashlight className="size-6" /> : <FlashlightOff className="size-6" />}
                </button>
              ) : (
                <span className="size-12 shrink-0" aria-hidden />
              )}
            </div>
          </div>

          {/* Viseur, ou explication si la caméra ne s'ouvre pas */}
          <div className="relative z-0 grid flex-1 place-items-center px-6">
            {failed && children ? null : failed ? (
              <div role="alert" className="paper w-full max-w-sm rounded-3xl px-6 py-7 text-center text-foreground shadow-float">
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary-soft text-primary-ink">
                  <CameraOff className="size-7" aria-hidden />
                </span>
                <h2 className="mt-3 font-heading text-xl">{MESSAGES[cam].title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{MESSAGES[cam].text}</p>
              </div>
            ) : (
              <div className="relative aspect-[3/2] w-[min(80vw,24rem)] rounded-3xl shadow-[0_0_0_200vmax_rgb(0_0_0/0.45)]" aria-hidden>
                {(["top-0 left-0 border-t-4 border-l-4 rounded-tl-3xl", "top-0 right-0 border-t-4 border-r-4 rounded-tr-3xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl"] as const).map((c) => (
                  <span key={c} className={cn("absolute size-10 border-white", c)} />
                ))}
                {cam === "live" && detector && (
                  <motion.span
                    className="absolute inset-x-5 h-0.5 rounded-full bg-primary-soft shadow-[0_0_12px_2px_rgb(245_221_208/0.8)]"
                    initial={{ top: "15%" }}
                    animate={{ top: ["15%", "85%", "15%"] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Bas d'écran : zone du pouce */}
          <div className="pb-safe relative z-10 bg-gradient-to-t from-black/65 via-black/40 to-transparent">
            <div className="mx-auto flex max-w-md flex-col gap-3 px-4 pt-6 pb-4">
              {children}
              {!failed && (
                <p id="scanner-hint" className={cn("text-center text-base font-medium text-white/90", children && "sr-only")} aria-live="polite">
                  {hint}
                </p>
              )}
              {failed && (
                <p id="scanner-hint" className="sr-only">
                  {MESSAGES[cam].text}
                </p>
              )}
              {showManual ? (
                <form onSubmit={submit} className="flex gap-2" noValidate>
                  <label htmlFor="scanner-code" className="sr-only">
                    Code-barres
                  </label>
                  <Input
                    id="scanner-code"
                    inputMode="numeric"
                    autoComplete="off"
                    enterKeyHint="search"
                    autoFocus={manual}
                    placeholder="Ex. 3017620422003"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      setCodeError(undefined);
                    }}
                    aria-invalid={!!codeError}
                    aria-describedby={codeError ? "scanner-code-error" : undefined}
                    className="h-12 flex-1 bg-card text-base text-foreground"
                  />
                  <Button type="submit" size="lg" className="h-12">
                    Valider
                  </Button>
                </form>
              ) : continuous ? null : (
                <Button type="button" variant="outline" size="lg" className="h-12 border-white/50 text-white hover:bg-white/15 hover:text-white" onClick={() => setManual(true)}>
                  <Keyboard /> Saisir le code
                </Button>
              )}
              {continuous && (
                <div className={cn("grid gap-2", showManual ? "grid-cols-1" : "grid-cols-2")}>
                  {!showManual && (
                    <Button type="button" variant="outline" size="lg" className="h-12 border-white/50 bg-transparent text-white hover:bg-white/15 hover:text-white" onClick={() => setManual(true)}>
                      <Keyboard /> Saisir
                    </Button>
                  )}
                  <Button type="button" size="lg" className="h-12" onClick={onClose}>
                    <Check /> Terminer
                  </Button>
                </div>
              )}
              {codeError && (
                <p id="scanner-code-error" role="alert" className="text-center text-sm font-semibold text-primary-soft">
                  {codeError}
                </p>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
