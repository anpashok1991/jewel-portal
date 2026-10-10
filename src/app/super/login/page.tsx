import { SuperLoginForm } from "@/components/super/SuperForms";

export const metadata = { title: "JewelPortal · Platform Login" };

export default function SuperLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0b0e14" }}>
      <div className="w-full max-w-md" style={{ "--c-primary": "#3b82f6", "--c-muted": "#8b93a7", "--c-danger": "#f87171", "--c-surface": "#161a22", "--c-text": "#e7e9ee", "--c-bg": "#0b0e14", "--radius": "12px" } as React.CSSProperties}>
        <div className="text-center mb-6">
          <p className="text-2xl font-bold text-white">JewelPortal</p>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "#8b93a7" }}>Platform console</p>
        </div>
        <div className="card p-6" style={{ background: "#161a22", borderColor: "rgba(255,255,255,.08)", color: "#e7e9ee" }}>
          <SuperLoginForm />
        </div>
      </div>
    </div>
  );
}
