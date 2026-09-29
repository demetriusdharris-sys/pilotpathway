import type { ReactNode } from "react";
import { FourForcesDiagram } from "./four-forces";
import { ThreeAxesDiagram } from "./three-axes";

/**
 * Key to drawing.
 *
 * Separate from `src/lib/diagrams/catalogue.ts` because that file has to stay
 * readable by a plain Node script, and JSX is not. A key present here and absent
 * there renders nothing; a key present there and absent here is caught by
 * `renderDiagram` returning null rather than by a crash on a student's lesson.
 */
const COMPONENTS: Record<string, () => ReactNode> = {
  "four-forces": FourForcesDiagram,
  "three-axes": ThreeAxesDiagram,
};

export function renderDiagram(key: string): ReactNode {
  const Component = COMPONENTS[key];

  return Component ? <Component /> : null;
}

export function hasDiagram(key: string): boolean {
  return key in COMPONENTS;
}
