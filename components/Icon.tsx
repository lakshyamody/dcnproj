"use client";

import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Check,
  CheckCircle2,
  CircleAlert,
  CirclePlus,
  Copy,
  Database,
  Eraser,
  FastForward,
  FlaskConical,
  Gauge,
  HeartCrack,
  Link2,
  Link2Off,
  ListOrdered,
  type LucideIcon,
  Move,
  Network,
  Pause,
  Play,
  RefreshCw,
  Repeat,
  RotateCcw,
  Rows3,
  Route,
  Send,
  Shield,
  Table2,
  Terminal,
  TrendingUp,
  Trash2,
  Waypoints,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Icon shim.
 *
 * The lab was originally drawn with Google Material Symbols. The restyle moves
 * to lucide, but several call sites pick an icon by name at runtime, so the
 * name-based API is kept and mapped here rather than rewritten at every site.
 * That also means the Material Symbols webfont is no longer loaded at all.
 */
const MAP: Record<string, LucideIcon> = {
  add_circle: CirclePlus,
  add_link: Link2,
  arrow_back: ArrowLeft,
  dns: Database,
  arrow_forward: ArrowRight,
  arrow_forward_ios: ChevronRight,
  autorenew: RefreshCw,
  backspace: Eraser,
  bolt: Zap,
  cancel: XCircle,
  check: Check,
  check_circle: CheckCircle2,
  close: X,
  content_copy: Copy,
  delete: Trash2,
  fast_forward: FastForward,
  heart_broken: HeartCrack,
  hub: Network,
  link_off: Link2Off,
  low_priority: ListOrdered,
  open_with: Move,
  pause: Pause,
  play_arrow: Play,
  refresh: RefreshCw,
  restart_alt: RotateCcw,
  route: Route,
  science: FlaskConical,
  send: Send,
  shield: Shield,
  speed: Gauge,
  summarize: Table2,
  table_rows: Rows3,
  swap_horiz: Repeat,
  sync_alt: Repeat,
  terminal: Terminal,
  timeline: TrendingUp,
  warning: CircleAlert,
  waypoints: Waypoints,
};

export function Icon({
  name,
  className = "",
  filled = false,
  size = 16,
}: {
  name: string;
  className?: string;
  /** Kept for call-site compatibility; lucide is stroke-based, so this is a no-op. */
  filled?: boolean;
  size?: number;
}) {
  const Glyph = MAP[name] ?? CircleAlert;
  return (
    <Glyph
      aria-hidden="true"
      className={cn("shrink-0", className)}
      size={size}
      strokeWidth={filled ? 2 : 1.6}
    />
  );
}
