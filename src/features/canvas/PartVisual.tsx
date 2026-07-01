import type { Part } from "../../engine";

export type PartVisualVariant = "toolbox" | "node" | "micro";
export type PartVisualType =
  | "cylinder"
  | "regulator"
  | "adapter"
  | "tubing"
  | "valve"
  | "needleValve"
  | "reducer"
  | "trap"
  | "quickPlug"
  | "quickSocket"
  | "gcPort"
  | "cap"
  | "generic";

export function getPartVisualType(part: Part): PartVisualType {
  const slug = part.slug.toLowerCase();
  const name = part.name.toLowerCase();
  const category = part.category.toLowerCase();

  if (slug.includes("source") || name.includes("cylinder")) return "cylinder";
  if (name.includes("regulator")) return "regulator";
  if (category.includes("tubing") || category.includes("hose")) return "tubing";
  if (name.includes("needle valve")) return "needleValve";
  if (category.includes("valves")) return "valve";
  if (name.includes("reducer")) return "reducer";
  if (category.includes("traps") || name.includes("trap") || name.includes("filter")) return "trap";
  if (category.includes("quick")) return name.includes("socket") ? "quickSocket" : "quickPlug";
  if (category.includes("gc instrument")) return "gcPort";
  if (category.includes("caps")) return "cap";
  if (category.includes("adapters")) return "adapter";
  return "generic";
}

export function PartVisual({ part, variant = "node" }: { part: Part; variant?: PartVisualVariant }) {
  const type = getPartVisualType(part);

  return (
    <svg
      className={`part-visual part-visual-${variant}`}
      data-visual-type={type}
      viewBox="0 0 160 80"
      role="img"
      aria-label={`${part.name} visual`}
    >
      <PartVisualDrawing type={type} />
    </svg>
  );
}

function PartVisualDrawing({ type }: { type: PartVisualType }) {
  switch (type) {
    case "cylinder":
      return (
        <>
          <rect className="visual-fill-blue" x="52" y="14" width="48" height="58" rx="13" />
          <path className="visual-thin" d="M61 16 C63 8 89 8 91 16" />
          <rect className="visual-metal" x="69" y="7" width="18" height="11" rx="2" />
          <path className="visual-line" d="M100 39 H136" />
          <circle className="visual-metal" cx="138" cy="39" r="5" />
          <path className="visual-thin" d="M63 29 H89 M63 58 H89" />
        </>
      );
    case "regulator":
      return (
        <>
          <path className="visual-line" d="M10 43 H48 M112 43 H150" />
          <rect className="visual-dark" x="49" y="30" width="62" height="28" rx="7" />
          <circle className="visual-fill-blue" cx="61" cy="22" r="14" />
          <circle className="visual-fill-blue" cx="99" cy="22" r="14" />
          <path className="visual-thin" d="M56 22 L63 17 M94 22 L101 16 M75 30 V20 H86 V30" />
        </>
      );
    case "adapter":
      return (
        <>
          <path className="visual-line" d="M8 42 H43 M105 42 H152" />
          <polygon className="visual-metal" points="43,25 88,25 105,42 88,59 43,59 29,42" />
          <path className="visual-thread" d="M110 32 L127 52 M119 32 L136 52 M128 32 L145 52" />
          <path className="visual-thin" d="M45 34 H86 M45 50 H86" />
        </>
      );
    case "tubing":
      return (
        <>
          <path className="visual-line" d="M10 40 H150" />
          <path className="visual-thin" d="M18 32 H142 M18 48 H142 M58 28 C71 13 90 13 103 28" />
          <circle className="visual-dark" cx="27" cy="40" r="8" />
          <circle className="visual-dark" cx="133" cy="40" r="8" />
        </>
      );
    case "valve":
      return (
        <>
          <path className="visual-line" d="M8 42 H48 M112 42 H152" />
          <polygon className="visual-fill-green" points="48,28 80,42 48,56" />
          <polygon className="visual-fill-green" points="112,28 80,42 112,56" />
          <circle className="visual-dark" cx="80" cy="42" r="12" />
          <path className="visual-line" d="M80 30 V17" />
          <rect className="visual-metal" x="55" y="10" width="50" height="12" rx="6" />
        </>
      );
    case "needleValve":
      return (
        <>
          <path className="visual-line" d="M8 42 H48 M112 42 H152" />
          <polygon className="visual-fill-green" points="48,28 80,42 48,56" />
          <polygon className="visual-fill-green" points="112,28 80,42 112,56" />
          <path className="visual-line" d="M80 42 V16" />
          <path className="visual-thin" d="M67 16 H93 M71 10 H89" />
          <path className="visual-thread" d="M72 54 L88 30" />
        </>
      );
    case "reducer":
      return (
        <>
          <path className="visual-line" d="M8 42 H42" />
          <path className="visual-thin" d="M118 42 H152" />
          <polygon className="visual-metal" points="42,24 84,24 118,34 118,50 84,60 42,60 28,42" />
          <path className="visual-thin" d="M44 32 H82 M44 52 H82 M92 35 H114 M92 49 H114" />
        </>
      );
    case "trap":
      return (
        <>
          <path className="visual-line" d="M8 42 H40 M120 42 H152" />
          <rect className="visual-fill-yellow" x="40" y="18" width="80" height="48" rx="12" />
          <path className="visual-thin" d="M55 30 H105 M55 42 H105 M55 54 H105" />
          <path className="visual-thin" d="M70 26 L90 42 L70 58" />
        </>
      );
    case "quickPlug":
      return (
        <>
          <path className="visual-line" d="M8 42 H48" />
          <rect className="visual-metal" x="48" y="30" width="42" height="24" rx="6" />
          <path className="visual-fill-blue" d="M90 35 H123 L146 42 L123 49 H90 Z" />
          <path className="visual-thin" d="M106 35 V49 M118 36 V48" />
        </>
      );
    case "quickSocket":
      return (
        <>
          <path className="visual-line" d="M8 42 H38 M122 42 H152" />
          <rect className="visual-fill-blue" x="38" y="26" width="84" height="32" rx="8" />
          <path className="visual-dark" d="M56 32 H104 V52 H56 Z" />
          <path className="visual-thin" d="M44 26 L52 18 M116 26 L124 18" />
        </>
      );
    case "gcPort":
      return (
        <>
          <path className="visual-line" d="M8 42 H50" />
          <rect className="visual-dark" x="50" y="14" width="84" height="52" rx="10" />
          <circle className="visual-fill-green" cx="66" cy="30" r="5" />
          <circle className="visual-fill-yellow" cx="82" cy="30" r="5" />
          <circle className="visual-fill-blue" cx="98" cy="30" r="5" />
          <path className="visual-thin" d="M62 48 H122 M62 56 H110" />
          <text x="84" y="47" textAnchor="middle">
            GC
          </text>
        </>
      );
    case "cap":
      return (
        <>
          <path className="visual-line" d="M8 42 H80" />
          <path className="visual-metal" d="M80 25 H122 Q138 25 138 42 Q138 59 122 59 H80 Z" />
          <path className="visual-thread" d="M86 31 L106 53 M96 31 L116 53 M106 31 L126 53" />
        </>
      );
    default:
      return (
        <>
          <path className="visual-line" d="M8 42 H44 M116 42 H152" />
          <rect className="visual-dark" x="44" y="24" width="72" height="36" rx="8" />
          <path className="visual-thin" d="M58 36 H102 M58 48 H102" />
        </>
      );
  }
}
