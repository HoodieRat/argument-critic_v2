import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SessionHeader } from "./SessionHeader";

function createProps(overrides: Partial<React.ComponentProps<typeof SessionHeader>> = {}): React.ComponentProps<typeof SessionHeader> {
  return {
    busy: overrides.busy ?? false,
    mode: overrides.mode ?? "critic",
    themePreference: overrides.themePreference ?? "slate",
    settingsViewOpen: overrides.settingsViewOpen ?? false,
    onSetMode: overrides.onSetMode ?? vi.fn(),
    onSetThemePreference: overrides.onSetThemePreference ?? vi.fn(),
    onOpenSettings: overrides.onOpenSettings ?? vi.fn(),
    onCaptureCrop: overrides.onCaptureCrop ?? vi.fn(),
    onShutdown: overrides.onShutdown ?? vi.fn()
  };
}

test("shows the three-dot theme selector in the header and changes themes from it", async () => {
  const user = userEvent.setup();
  const onSetThemePreference = vi.fn();

  render(<SessionHeader {...createProps({ themePreference: "slate", onSetThemePreference })} />);

  expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Switch to Slate theme" })).toHaveAttribute("aria-checked", "true");

  await user.click(screen.getByRole("radio", { name: "Switch to Forest theme" }));

  expect(onSetThemePreference).toHaveBeenCalledWith("forest");
});