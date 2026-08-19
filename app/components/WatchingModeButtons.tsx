interface WatchingModeButtonsProps {
  onAgain: () => void;
  onNext: () => void;
}

export default function WatchingModeButtons({ onAgain, onNext }: WatchingModeButtonsProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/80"></div>

      <div className="cta-row relative pointer-events-auto">
        <button type="button" className="cta-btn cta-ghost" onClick={onAgain}>
          Again
        </button>

        <button type="button" className="cta-btn cta-primary relative" onClick={onNext}>
          <img src="/Subject.png" alt="" className="cta-mascot" />
          Next
        </button>
      </div>
    </div>
  );
}
