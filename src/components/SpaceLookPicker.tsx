import SpaceIcon from "./SpaceIcon";
import {
  SPACE_ICONS,
  ICON_LABELS,
  SPACE_TONES,
  type SpaceLook,
} from "../lib/spaceLooks";
export default function SpaceLookPicker({
  look,
  onChange,
}: {
  look: SpaceLook;
  onChange: (look: SpaceLook) => void;
}) {
  return (
    <>
      <fieldset className="look-fieldset">
        <legend>Pick an icon</legend>
        <div className="look-options">
          {SPACE_ICONS.map((icon) => (
            <button
              type="button"
              key={icon}
              aria-label={"Icon " + ICON_LABELS[icon]}
              aria-pressed={look.icon === icon}
              className={look.icon === icon ? "chosen" : ""}
              onClick={() => onChange({ ...look, icon })}
            >
              <SpaceIcon name={icon} size={22} />
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="look-fieldset">
        <legend>Pick a colour</legend>
        <div className="look-options">
          {SPACE_TONES.map((tone) => (
            <button
              key={tone}
              type="button"
              data-tone={tone}
              aria-label={tone}
              aria-pressed={look.tone === tone}
              className={"tone-choice " + (look.tone === tone ? "chosen" : "")}
              onClick={() => onChange({ ...look, tone })}
            >
              <span className="tone-swatch" />
              {tone}
            </button>
          ))}
        </div>
      </fieldset>
    </>
  );
}
