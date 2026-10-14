import { useEffect, useState } from "react";

export function WordReveal({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span className={`word-reveal ${className}`} aria-label={children}>
      {children.split(" ").map((word, index) => (
        <span key={`${word}-${index}`} aria-hidden="true">
          {word}
          {index < children.split(" ").length - 1 ? "\u00a0" : ""}
        </span>
      ))}
    </span>
  );
}

export function TypewriterText({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  const [visible, setVisible] = useState("");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(children);
      return;
    }
    setVisible("");
    const totalSteps = Math.min(32, Math.max(12, children.length));
    let step = 0;
    const timer = window.setInterval(
      () => {
        step += 1;
        setVisible(children.slice(0, Math.ceil((children.length * step) / totalSteps)));
        if (step >= totalSteps) window.clearInterval(timer);
      },
      Math.floor(480 / totalSteps),
    );
    return () => window.clearInterval(timer);
  }, [children]);

  return (
    <span className={className} aria-label={children}>
      <span aria-hidden="true">{visible}</span>
    </span>
  );
}
