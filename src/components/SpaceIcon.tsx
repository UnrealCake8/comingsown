import {
  Sparkles,
  Gamepad2,
  BookOpen,
  Palette,
  Rocket,
  Moon,
} from "lucide-react";
import type { SpaceLook } from "../lib/spaceLooks";
const icons = {
  sparkles: Sparkles,
  gaming: Gamepad2,
  study: BookOpen,
  art: Palette,
  rocket: Rocket,
  moon: Moon,
};
export default function SpaceIcon({
  name,
  size = 17,
}: {
  name: SpaceLook["icon"];
  size?: number;
}) {
  const Icon = icons[name];
  return <Icon size={size} aria-hidden="true" />;
}
