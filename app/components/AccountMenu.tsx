"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { signOut, updateOwnAccount } from "../lib/auth";

export default function AccountMenu({ onOpenAdmin }: { onOpenAdmin?: () => void }) {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const metadataNickname = typeof user?.user_metadata?.nickname === "string" ? user.user_metadata.nickname : "";
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(profile?.nickname || metadataNickname);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const email = profile?.email || user?.email || "이메일 정보 없음";
  const name = profile?.nickname || metadataNickname || email.split("@")[0] || "계정";
  const roleLabel = profile?.role === "academy" ? "원장 계정" : "학생 계정";
  const initial = name.trim().charAt(0).toUpperCase() || "M";

  useEffect(() => {
    setNickname(profile?.nickname || metadataNickname);
  }, [profile?.nickname, metadataNickname]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);

  if (!user) return null;

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password && password.length < 6) {
      setError("새 비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    setBusy(true);
    try {
      await updateOwnAccount({ userId: user.id, nickname, password: password || undefined });
      await refreshProfile();
      setPassword("");
      setEditing(false);
      setMessage("계정 정보가 저장됐어요.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "계정 정보를 저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    setError("");
    try {
      await signOut();
      router.replace("/auth/login");
      router.refresh();
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "로그아웃하지 못했어요.");
      setBusy(false);
    }
  };

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        type="button"
        className="account-trigger"
        onClick={() => {
          setOpen((value) => !value);
          setMessage("");
          setError("");
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="account-avatar">{initial}</span>
        <span className="account-trigger-copy">
          <strong>{name}</strong>
          <small>{roleLabel}</small>
        </span>
        <span className={`account-chevron ${open ? "is-open" : ""}`} aria-hidden>⌄</span>
      </button>

      {open && (
        <section className="account-popover" role="dialog" aria-label="내 계정">
          <div className="account-summary">
            <span className="account-avatar is-large">{initial}</span>
            <span>
              <strong>{name}</strong>
              <small>{email}</small>
              <em>{roleLabel}</em>
            </span>
          </div>

          {message && <p className="account-message is-success">{message}</p>}
          {error && <p className="account-message is-error">{error}</p>}

          {editing ? (
            <form className="account-form" onSubmit={handleSave}>
              <label>
                이름
                <input value={nickname} onChange={(event) => setNickname(event.target.value)} required />
              </label>
              <label>
                새 비밀번호
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  placeholder="변경할 때만 입력"
                  autoComplete="new-password"
                />
              </label>
              <div className="account-form-actions">
                <button type="button" onClick={() => setEditing(false)} disabled={busy}>취소</button>
                <button type="submit" className="is-primary" disabled={busy}>{busy ? "저장 중…" : "저장"}</button>
              </div>
            </form>
          ) : (
            <nav className="account-actions" aria-label="계정 메뉴">
              <button type="button" onClick={() => setEditing(true)}>계정 정보 수정 <span>›</span></button>
              {onOpenAdmin && <button type="button" onClick={onOpenAdmin}>학생 현황 <span>›</span></button>}
              <button type="button" className="is-logout" onClick={handleLogout} disabled={busy}>로그아웃 <span>↗</span></button>
            </nav>
          )}
        </section>
      )}
    </div>
  );
}
