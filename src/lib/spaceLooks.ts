export const SPACE_ICONS = [
  "sparkles",
  "gaming",
  "study",
  "art",
  "rocket",
  "moon",
] as const;
export const ICON_LABELS = {
  sparkles: "Sparkles",
  gaming: "Gaming",
  study: "Study",
  art: "Art",
  rocket: "Rocket",
  moon: "Moon",
} as const;
export const SPACE_TONES = ["lilac", "peach", "mint", "sky"] as const;
export type SpaceLook = {
  icon: (typeof SPACE_ICONS)[number];
  tone: (typeof SPACE_TONES)[number];
};
export type SpaceLooks = Record<string, SpaceLook>;
export const DEFAULT_LOOK: SpaceLook = { icon: "sparkles", tone: "lilac" };
const storageKey = (userId: string) => "mao:space-looks:v1:" + userId;
export function readSpaceLooks(userId: string): SpaceLooks {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(userId)) || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([, look]) =>
          look &&
          typeof look === "object" &&
          SPACE_ICONS.includes((look as SpaceLook).icon) &&
          SPACE_TONES.includes((look as SpaceLook).tone),
      ),
    ) as SpaceLooks;
  } catch {
    return {};
  }
}
export function saveSpaceLook(
  userId: string,
  spaceId: string,
  look: SpaceLook,
): SpaceLooks {
  const next = { ...readSpaceLooks(userId), [spaceId]: look };
  localStorage.setItem(storageKey(userId), JSON.stringify(next));
  return next;
}
