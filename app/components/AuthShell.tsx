import Link from "next/link";
import { ReactNode } from "react";

export default function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="auth-stage-v2">
      <Link href="/" className="auth-brand-v2">MimiC</Link>
      <section className="auth-intro-v2">
        <p>WATCH · MIMIC · GUESS · WORD</p>
        <h1>영어를 외우지 말고,<br />장면 속 인물처럼 말해 보세요.</h1>
        <span>한 달에 영화 한 편, 원서 한 권.<br />소리와 리듬이 내 것이 될 때까지.</span>
      </section>
      <section className="auth-card-v2">
        <header>
          <p>WELCOME TO MIMIC</p>
          <h2>{title}</h2>
          <span>{description}</span>
        </header>
        {children}
        {footer ? <footer>{footer}</footer> : null}
      </section>
    </main>
  );
}
