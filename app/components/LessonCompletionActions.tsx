"use client";

type LessonCompletionActionsProps = {
  onAgain: () => void;
  onNext: () => void;
};

export default function LessonCompletionActions({
  onAgain,
  onNext,
}: LessonCompletionActionsProps) {
  return (
    <div className="lesson-completion-actions">
      <div className="lesson-completion-item">
        <button type="button" className="select-mode lesson-completion-button" onClick={onAgain}>
          Again
        </button>
        <p className="lesson-completion-caption" aria-hidden="true">
          Let&apos;s go
        </p>
      </div>
      <div className="lesson-completion-item">
        <button
          type="button"
          className="select-mode is-open lesson-completion-button"
          onClick={onNext}
        >
          <img src="/Subject.png" alt="" className="select-chameleon" />
          Next
        </button>
        <p className="cta-go lesson-completion-caption">Let&apos;s go</p>
      </div>
    </div>
  );
}
