import type { ReactNode } from "react";
import { FourForcesDiagram } from "./four-forces";
import { ThreeAxesDiagram } from "./three-axes";
import { AirplanePartsDiagram } from "./airplane-parts";
import { AngleOfAttackDiagram } from "./angle-of-attack";
import { AirspaceProfileDiagram } from "./airspace-profile";
import { FourStrokeDiagram } from "./four-stroke";
import { PitotStaticDiagram } from "./pitot-static";
import { TrafficPatternDiagram } from "./traffic-pattern";

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
  "airplane-parts": AirplanePartsDiagram,
  "angle-of-attack": AngleOfAttackDiagram,
  "airspace-profile": AirspaceProfileDiagram,
  "four-stroke": FourStrokeDiagram,
  "pitot-static": PitotStaticDiagram,
  "traffic-pattern": TrafficPatternDiagram,
};

export function renderDiagram(key: string): ReactNode {
  const Component = COMPONENTS[key];

  return Component ? <Component /> : null;
}

export function hasDiagram(key: string): boolean {
  return key in COMPONENTS;
}
