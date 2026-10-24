// UI-only settings, saved in this browser (no backend). Used by the Settings page,
// the nav avatar, the home page (reduced motion) and View sightings (default range).
import { useEffect, useState } from "react";

export const DEFAULT_SETTINGS = {
  displayName: "",
  avatarColor: "teal",
  reduceMotion: false,
  mapRange: "7",
  notifyMatches: true,
  notifyWeekly: false,
};

export const AVATAR_COLORS = {
  teal: "linear-gradient(140deg, #3CD6C4, #2A7FB8)",
  sky: "linear-gradient(140deg, #7DD3FC, #3B6FD4)",
  amber: "linear-gradient(140deg, #F2B45A, #D9772B)",
  violet: "linear-gradient(140deg, #B69CFF, #6A4FD6)",
  rose: "linear-gradient(140deg, #FF9DB5, #D6457A)",
};

const keyFor = (user) => `settings:${user?.id ?? "guest"}`;

export function loadSettings(user) {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(keyFor(user)) || "{}") };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(user, settings) {
  try {
    localStorage.setItem(keyFor(user), JSON.stringify(settings));
  } catch {
    // storage full or blocked: settings just won't persist
  }
  window.dispatchEvent(new CustomEvent("settings-change"));
}

// Current settings, updated live when they're saved anywhere in the app.
export function useSettings(user) {
  const [settings, setSettings] = useState(() => loadSettings(user));
  useEffect(() => {
    setSettings(loadSettings(user));
    const onChange = () => setSettings(loadSettings(user));
    window.addEventListener("settings-change", onChange);
    return () => window.removeEventListener("settings-change", onChange);
  }, [user]);
  return settings;
}

export function initialsFor(user, settings) {
  const name = (settings?.displayName || user?.email?.split("@")[0] || "?").trim();
  const parts = name.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts[1]?.[0] || "")).toUpperCase();
}
