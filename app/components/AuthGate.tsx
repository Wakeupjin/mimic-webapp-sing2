"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { signupPath } from "../lib/authRedirect";
import styles from "./AuthGate.module.css";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || user) return;
    const requestedPath = `${pathname}${window.location.search}${window.location.hash}`;
    router.replace(signupPath(requestedPath));
  }, [loading, pathname, router, user]);

  if (loading || !user) {
    return (
      <main className={styles.screen} aria-live="polite">
        <div className={styles.status}>
          <div className={styles.mark}>MimiC</div>
          <div className={styles.spinner} aria-hidden="true" />
          <p>{loading ? "계정을 확인하고 있어요" : "가입 화면을 열고 있어요"}</p>
        </div>
      </main>
    );
  }

  return children;
}
