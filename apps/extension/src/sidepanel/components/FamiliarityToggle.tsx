import type { FamiliaritySignalType } from "../types";

interface FamiliarityToggleProps {
  readonly value: FamiliaritySignalType | null;
  readonly busy?: boolean;
  readonly onChange: (nextValue: FamiliaritySignalType) => void;
}

const ORDER: FamiliaritySignalType[] = ["interested", "examined", "familiar"];

function describeLabel(value: FamiliaritySignalType | null): string {
  switch (value) {
    case "familiar":
      return "Familiar";
    case "examined":
      return "Examined";
    case "interested":
      return "Interested";
    default:
      return "Mark familiarity";
  }
}

function nextValue(value: FamiliaritySignalType | null): FamiliaritySignalType {
  if (!value) {
    return ORDER[0];
  }

  const index = ORDER.indexOf(value);
  return ORDER[(index + 1) % ORDER.length] ?? ORDER[0];
}

export function FamiliarityToggle(props: FamiliarityToggleProps) {
  return (
    <button
      type="button"
      className={`familiarity-toggle ${props.value ? `familiarity-toggle--${props.value}` : ""}`}
      onClick={() => props.onChange(nextValue(props.value))}
      disabled={props.busy}
      title="Cycle through interested, examined, and familiar."
    >
      {describeLabel(props.value)}
    </button>
  );
}