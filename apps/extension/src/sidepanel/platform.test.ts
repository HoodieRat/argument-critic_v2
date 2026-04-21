import {
  persistDensityPreference,
  persistThemePreference,
  readPersistedDensityPreferenceSync,
  readPersistedThemePreferenceSync
} from "./platform";

beforeEach(() => {
  window.localStorage.clear();
  Reflect.deleteProperty(globalThis as typeof globalThis & { chrome?: unknown }, "chrome");
});

test("reads cached theme and density synchronously from localStorage", () => {
  window.localStorage.setItem("argumentCriticThemePreference", "slate");
  window.localStorage.setItem("argumentCriticDensityPreference", "comfortable");

  expect(readPersistedThemePreferenceSync("studio")).toBe("slate");
  expect(readPersistedDensityPreferenceSync("compact")).toBe("comfortable");
});

test("persists theme and density to the local cache even when chrome storage exists", async () => {
  const set = vi.fn(async () => undefined);
  (globalThis as typeof globalThis & { chrome?: unknown }).chrome = {
    storage: {
      local: {
        set
      }
    }
  };

  await persistThemePreference("forest");
  await persistDensityPreference("comfortable");

  expect(set).toHaveBeenCalledWith({ argumentCriticThemePreference: "forest" });
  expect(set).toHaveBeenCalledWith({ argumentCriticDensityPreference: "comfortable" });
  expect(window.localStorage.getItem("argumentCriticThemePreference")).toBe("forest");
  expect(window.localStorage.getItem("argumentCriticDensityPreference")).toBe("comfortable");
});