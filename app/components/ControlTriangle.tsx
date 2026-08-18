"use client";

type ControlTriangleProps = {
  direction: "left" | "right";
  onClick: () => void;
  label: string;
  disabled?: boolean;
  highlight?: boolean;
};

export default function ControlTriangle({
  direction,
  onClick,
  label,
  disabled = false,
  highlight = false,
}: ControlTriangleProps) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex shrink-0 items-center justify-center rounded-lg transition-transform duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${
        highlight ? "animate-next-nudge ring-2 ring-[#60D96C] ring-offset-2 ring-offset-[#201E1E]" : ""
      }`}
      style={{ width: "var(--ctrl-nav)", height: "var(--ctrl-nav)" }}
    >
      <span
        className={direction === "left" ? "tri-left" : "tri-right"}
        style={
          highlight
            ? direction === "left"
              ? { borderRightColor: "#60D96C" }
              : { borderLeftColor: "#60D96C" }
            : undefined
        }
      />
    </button>
  );
}
