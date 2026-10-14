export type VoiceRoute =
  "/" | "/ar-labs" | "/crime-report" | "/ai-news" | "/ai-intelligence" | "/world-explorer";

export type VoiceAction =
  | { kind: "navigate"; to: VoiceRoute; label: string }
  | { kind: "theme"; value: "light" | "dark" }
  | { kind: "settings"; open: boolean }
  | { kind: "about" }
  | { kind: "font"; value: "editorial" | "sans" | "serif" }
  | { kind: "text-size"; value: "small" | "normal" | "large" }
  | { kind: "reduce-motion"; value: boolean }
  | { kind: "air-cursor"; enabled: boolean }
  | { kind: "scroll"; direction: "top" | "bottom" | "up" | "down" }
  | { kind: "help" };

const DESTINATIONS: Array<{ to: VoiceRoute; label: string; aliases: string[] }> = [
  { to: "/", label: "Home", aliases: ["home", "home page", "homepage", "main page"] },
  {
    to: "/ar-labs",
    label: "AR Labs",
    aliases: ["ar labs", "ar lab", "augmented reality", "hand tracking", "spatial lab"],
  },
  {
    to: "/crime-report",
    label: "Crime Report",
    aliases: ["crime report", "crime reports", "crime dashboard", "crime stats", "india crime"],
  },
  {
    to: "/ai-news",
    label: "AI News",
    aliases: ["ai news", "news", "news page", "headlines", "news headlines"],
  },
  {
    to: "/ai-intelligence",
    label: "AI Intelligence",
    aliases: ["ai intelligence", "ai assistant", "intelligence", "assistant", "chatbot"],
  },
  {
    to: "/world-explorer",
    label: "World Explorer",
    aliases: ["world explorer", "earth", "globe", "country explorer", "world map"],
  },
];

const POLITE_PREFIXES = [
  "could you please ",
  "would you please ",
  "can you please ",
  "please ",
  "could you ",
  "would you ",
  "can you ",
  "will you ",
  "i want you to ",
  "i want to ",
  "i would like you to ",
];

function normalizeSpeech(spoken: string) {
  let command = spoken
    .toLocaleLowerCase("en-IN")
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  command = command.replace(/^(hey|hi|hello)\s+aevia\s*/, "").replace(/^aevia\s+/, "");
  for (let i = 0; i < 3; i += 1) {
    const prefix = POLITE_PREFIXES.find((candidate) => command.startsWith(candidate));
    if (!prefix) break;
    command = command.slice(prefix.length).trim();
  }
  return command
    .replace(/\s+(please|now)$/u, "")
    .replace(/^the\s+/u, "")
    .trim();
}

function routeTarget(command: string) {
  return command
    .replace(
      /^(open|show me|show|go to|navigate to|take me to|bring up|visit|switch to|load)\s+/u,
      "",
    )
    .replace(/\s+(page|module|section)$/u, "")
    .replace(/^(the|our|this|my|aevia)\s+/u, "")
    .replace(/\s+(on aevia|in aevia|for me)$/u, "")
    .trim();
}

export function parseVoiceCommand(spoken: string): VoiceAction | null {
  const command = normalizeSpeech(spoken);
  if (!command) return null;

  if (/^(go back|back|previous page|return to previous page)$/u.test(command)) {
    return { kind: "navigate", to: "/", label: "back" };
  }

  if (/^(what can you do|what can i say|voice help|help|commands)$/u.test(command)) {
    return { kind: "help" };
  }

  if (/\b(settings|preferences)\b/u.test(command)) {
    if (/\b(close|hide|dismiss)\b/u.test(command)) return { kind: "settings", open: false };
    return { kind: "settings", open: true };
  }
  if (
    /\b(about aevia|about the site|about this site|open about|show about|about page)\b/u.test(
      command,
    )
  ) {
    return { kind: "about" };
  }

  if (/\b(air cursor|air mouse|hand cursor)\b/u.test(command)) {
    if (/\b(off|disable|stop|turn off)\b/u.test(command)) {
      return { kind: "air-cursor", enabled: false };
    }
    if (/\b(on|enable|start|turn on)\b/u.test(command)) {
      return { kind: "air-cursor", enabled: true };
    }
  }

  if (
    /\b(dark mode|dark theme|night mode|make it dark|make this dark|make the site dark|switch to dark)\b/u.test(
      command,
    )
  ) {
    return { kind: "theme", value: "dark" };
  }
  if (
    /\b(light mode|light theme|day mode|make it light|make this light|make the site light|switch to light)\b/u.test(
      command,
    )
  ) {
    return { kind: "theme", value: "light" };
  }

  const font = command.match(/\b(editorial|sans|serif)\b/u)?.[1];
  if (font && /\b(font|typeface|use|switch|change)\b/u.test(command)) {
    return { kind: "font", value: font as "editorial" | "sans" | "serif" };
  }

  if (
    /\b(reduce motion|less motion|less animation|turn off animations|disable animations)\b/u.test(
      command,
    )
  ) {
    return { kind: "reduce-motion", value: true };
  }
  if (/\b(enable animations|turn on animations|full motion|normal motion)\b/u.test(command)) {
    return { kind: "reduce-motion", value: false };
  }

  if (
    /\b(text|font) size\b/u.test(command) ||
    /\b(bigger text|larger text|smaller text|increase text|make text bigger|make text larger|make text smaller)\b/u.test(
      command,
    )
  ) {
    if (/\b(small|smaller|decrease|reduce)\b/u.test(command)) {
      return { kind: "text-size", value: "small" };
    }
    if (/\b(normal|default|reset)\b/u.test(command)) {
      return { kind: "text-size", value: "normal" };
    }
    return { kind: "text-size", value: "large" };
  }

  if (/\b(scroll to top|go to top|back to top)\b/u.test(command)) {
    return { kind: "scroll", direction: "top" };
  }
  if (/\b(scroll to bottom|go to bottom)\b/u.test(command)) {
    return { kind: "scroll", direction: "bottom" };
  }
  if (/\b(scroll down|move down)\b/u.test(command)) return { kind: "scroll", direction: "down" };
  if (/\b(scroll up|move up)\b/u.test(command)) return { kind: "scroll", direction: "up" };

  const navigationIntent =
    /^(open|show me|show|go to|navigate to|take me to|bring up|visit|switch to|load)\s+/u.test(
      command,
    );
  const target = routeTarget(command);
  const destination = DESTINATIONS.find(({ aliases }) =>
    aliases.some((alias) => target === alias || (navigationIntent && target.includes(alias))),
  );
  if (destination) return { kind: "navigate", to: destination.to, label: destination.label };

  return null;
}
