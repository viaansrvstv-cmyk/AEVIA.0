import { describe, expect, it } from "vitest";
import { parseVoiceCommand } from "@/lib/voice-commands";

describe("AEVIA voice command parser", () => {
  it.each([
    ["open home", { kind: "navigate", to: "/", label: "Home" }],
    [
      "Could you please take me to our World Explorer module?",
      { kind: "navigate", to: "/world-explorer", label: "World Explorer" },
    ],
    [
      "show me the AI assistant",
      { kind: "navigate", to: "/ai-intelligence", label: "AI Intelligence" },
    ],
    [
      "Aevia, open the crime report page",
      { kind: "navigate", to: "/crime-report", label: "Crime Report" },
    ],
    ["go back", { kind: "navigate", to: "/", label: "back" }],
    ["make the site dark", { kind: "theme", value: "dark" }],
    ["switch to light mode", { kind: "theme", value: "light" }],
    ["change font to serif", { kind: "font", value: "serif" }],
    ["increase text size", { kind: "text-size", value: "large" }],
    ["make text smaller", { kind: "text-size", value: "small" }],
    ["turn off air cursor", { kind: "air-cursor", enabled: false }],
    ["open settings", { kind: "settings", open: true }],
    ["open about", { kind: "about" }],
    ["scroll to top", { kind: "scroll", direction: "top" }],
  ])("parses %s", (spoken, expected) => {
    expect(parseVoiceCommand(spoken)).toEqual(expected);
  });

  it("returns null for speech that is not a supported action", () => {
    expect(parseVoiceCommand("I would like to discuss a new research topic")).toBeNull();
  });

  it("offers help when asked what voice commands are available", () => {
    expect(parseVoiceCommand("what can I say")).toEqual({ kind: "help" });
  });
});
