import AuthGate from "../components/AuthGate";

export default function PlacementLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
