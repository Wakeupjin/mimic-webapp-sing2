export default function RotateGate() {
  return (
    <div className="rotate-gate" role="alertdialog" aria-live="polite" aria-label="휴대폰을 가로로 돌려 주세요">
      <div className="rotate-gate-phone" aria-hidden="true" />
      <p className="rotate-gate-title">휴대폰을 가로로 돌려 주세요</p>
      <p className="rotate-gate-sub">이 수업은 가로 화면에 맞춰져 있어요</p>
    </div>
  );
}
