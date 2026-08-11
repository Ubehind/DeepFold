(() => {
  "use strict";

  const VERSION = "1.3.2";
  const MODE_KEY = "collapseMode";
  const LEGACY_SETTINGS_KEY = "autoCollapseEnabled";
  const MODES = {
    ALWAYS: "always",
    AFTER: "after",
    NEVER: "never"
  };
  const THINKING_PATTERN = /正在思考|思考中|thinking(?:\.\.\.|…)?$/i;
  const FINISHED_PATTERN = /已思考|思考完成|thought for|thinking completed/i;
  const HANDLED_ATTRIBUTE = "data-deepfold-handled";
  const USER_OVERRIDE_ATTRIBUTE = "data-deepfold-user-override";

  let mode = MODES.AFTER;
  let scanTimer = null;
  let observerStarted = false;

  const status = {
    version: VERSION,
    detected: 0,
    collapsed: 0,
    lastAction: null
  };

  function normalizeText(value) {
    return value.replace(/\s+/g, " ").trim();
  }

  function isValidMode(value) {
    return Object.values(MODES).includes(value);
  }

  function getLabelState(text) {
    const normalized = normalizeText(text);

    if (!normalized || normalized.length > 100) {
      return null;
    }

    if (FINISHED_PATTERN.test(normalized)) {
      return "finished";
    }

    if (THINKING_PATTERN.test(normalized)) {
      return "thinking";
    }

    return null;
  }

  function collectLabels() {
    const labels = [];

    for (const element of document.querySelectorAll("span, button, [role='button']")) {
      const state = getLabelState(element.textContent || "");

      if (state) {
        labels.push({ element, state });
      }
    }

    return labels;
  }

  function findTrigger(labelElement) {
    let trigger = labelElement;
    let current = labelElement;

    for (let depth = 0; current && depth < 5; depth += 1) {
      const text = normalizeText(current.textContent || "");
      const style = window.getComputedStyle(current);
      const explicitlyClickable =
        current.matches("button, summary, [role='button'], [tabindex='0']") ||
        current.getAttribute("aria-expanded") !== null;

      if (text.length <= 160 && (style.cursor === "pointer" || explicitlyClickable)) {
        trigger = current;
      } else if (trigger !== labelElement) {
        break;
      }

      current = current.parentElement;
    }

    return trigger;
  }

  function findTriggerFromClickTarget(target) {
    let current = target instanceof Element ? target : target?.parentElement;

    for (let depth = 0; current && depth < 6; depth += 1) {
      if (getLabelState(current.textContent || "")) {
        return findTrigger(current);
      }

      current = current.parentElement;
    }

    return null;
  }

  function readExpandedState(trigger) {
    let current = trigger;

    for (let depth = 0; current && depth < 4; depth += 1) {
      const ariaExpanded = current.getAttribute("aria-expanded");
      const dataState = current.getAttribute("data-state");

      if (ariaExpanded === "true" || dataState === "open" || dataState === "expanded") {
        return true;
      }

      if (ariaExpanded === "false" || dataState === "closed" || dataState === "collapsed") {
        return false;
      }

      current = current.parentElement;
    }

    const thoughtContainer = trigger.parentElement;

    if (!thoughtContainer) {
      return null;
    }

    const headerText = normalizeText(trigger.textContent || "");
    const containerText = normalizeText(thoughtContainer.textContent || "");

    if (!containerText.startsWith(headerText)) {
      return null;
    }

    return containerText.length > headerText.length;
  }

  function shouldCollapse(state) {
    if (mode === MODES.ALWAYS) {
      return true;
    }

    return mode === MODES.AFTER && state === "finished";
  }

  function collapseThought(trigger, state) {
    if (
      trigger.getAttribute(USER_OVERRIDE_ATTRIBUTE) === "true" ||
      trigger.getAttribute(HANDLED_ATTRIBUTE) === state ||
      !shouldCollapse(state)
    ) {
      return;
    }

    const expandedState = readExpandedState(trigger);

    if (expandedState !== true) {
      if (state === "finished" && expandedState === false) {
        trigger.setAttribute(HANDLED_ATTRIBUTE, state);
      }
      return;
    }

    trigger.setAttribute(HANDLED_ATTRIBUTE, state);
    trigger.click();
    status.collapsed += 1;
    status.lastAction = new Date().toISOString();
    updatePageStatus();
  }

  function updatePageStatus() {
    document.documentElement.setAttribute("data-deepfold-status", observerStarted ? "running" : "starting");
    document.documentElement.setAttribute("data-deepfold-version", VERSION);
    document.documentElement.setAttribute("data-deepfold-mode", mode);
    document.documentElement.setAttribute("data-deepfold-detected", String(status.detected));
    document.documentElement.setAttribute("data-deepfold-collapsed", String(status.collapsed));
  }

  function scanPage() {
    scanTimer = null;

    if (!document.body) {
      updatePageStatus();
      return;
    }

    const uniqueThoughts = new Map();

    for (const { element, state } of collectLabels()) {
      uniqueThoughts.set(findTrigger(element), state);
    }

    status.detected = uniqueThoughts.size;

    for (const [trigger, state] of uniqueThoughts) {
      collapseThought(trigger, state);
    }

    updatePageStatus();
  }

  function scheduleScan() {
    if (scanTimer !== null) {
      return;
    }

    scanTimer = window.setTimeout(scanPage, 50);
  }

  function clearAutomaticMarkers() {
    for (const element of document.querySelectorAll(`[${HANDLED_ATTRIBUTE}]`)) {
      element.removeAttribute(HANDLED_ATTRIBUTE);
    }
  }

  const observer = new MutationObserver(scheduleScan);

  function start() {
    if (observerStarted) {
      return;
    }

    observerStarted = true;
    document.addEventListener(
      "click",
      (event) => {
        if (!event.isTrusted) {
          return;
        }

        const trigger = findTriggerFromClickTarget(event.target);

        if (trigger) {
          trigger.setAttribute(USER_OVERRIDE_ATTRIBUTE, "true");
        }
      },
      true
    );
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-expanded", "data-state"]
    });
    scanPage();
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "DEEPFOLD_GET_STATUS") {
      sendResponse({
        ...status,
        mode,
        running: observerStarted,
        url: window.location.href
      });
    }
  });

  chrome.storage.sync.get([MODE_KEY, LEGACY_SETTINGS_KEY], (settings) => {
    const migratedMode = settings[LEGACY_SETTINGS_KEY] === false ? MODES.NEVER : MODES.AFTER;
    mode = isValidMode(settings[MODE_KEY]) ? settings[MODE_KEY] : migratedMode;

    if (!isValidMode(settings[MODE_KEY])) {
      chrome.storage.sync.set({ [MODE_KEY]: mode });
    }

    start();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes[MODE_KEY] || !isValidMode(changes[MODE_KEY].newValue)) {
      return;
    }

    mode = changes[MODE_KEY].newValue;
    clearAutomaticMarkers();
    scheduleScan();
  });
})();
