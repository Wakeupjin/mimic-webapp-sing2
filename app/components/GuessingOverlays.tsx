"use client";

interface GuessingOverlaysProps {
  remainingPlays: number | null;
  showListen: boolean;
  showWhich: boolean;
  showCorrect: boolean;
  showAgain: boolean;
}

export default function GuessingOverlays({
  remainingPlays,
  showListen,
  showWhich,
  showCorrect,
  showAgain,
}: GuessingOverlaysProps) {
  return (
    <>
      {remainingPlays !== null && remainingPlays > 0 && (
        <p className="guess-banner is-count">x{remainingPlays}</p>
      )}
      {showListen && <p className="guess-banner is-phrase">Listen carefully</p>}
      {showWhich && <p className="guess-banner is-phrase">Which one</p>}
      {showCorrect && <p className="guess-banner is-correct">Correct</p>}
      {showAgain && <p className="guess-banner is-again">Again</p>}
    </>
  );
}
