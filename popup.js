"use strict";

const MODE_KEY = "collapseMode";
const LEGACY_SETTINGS_KEY = "autoCollapseEnabled";
const DEFAULT_MODE = "after";
const VALID_MODES = new Set(["always", "after", "never"]);
const modeInputs = Array.from(document.querySelectorAll('input[name="collapse-mode"]'));

chrome.storage.sync.get([MODE_KEY, LEGACY_SETTINGS_KEY], (settings) => {
  const migratedMode = settings[LEGACY_SETTINGS_KEY] === false ? "never" : DEFAULT_MODE;
  const mode = VALID_MODES.has(settings[MODE_KEY]) ? settings[MODE_KEY] : migratedMode;
  const selectedInput = modeInputs.find((input) => input.value === mode);

  if (selectedInput) {
    selectedInput.checked = true;
  }

  if (!VALID_MODES.has(settings[MODE_KEY])) {
    chrome.storage.sync.set({ [MODE_KEY]: mode });
  }
});

for (const input of modeInputs) {
  input.addEventListener("change", () => {
    if (input.checked) {
      chrome.storage.sync.set({ [MODE_KEY]: input.value });
    }
  });
}
