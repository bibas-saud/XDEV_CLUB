import { Logo } from "@/components/Logo";

export function AuthLayout({ children }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-14 items-center px-6">
        <Logo />
      </header>
      <main className="animate-page-in flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm">{children}</div>
      </main>
      <footer className="pb-6 text-center text-xs text-muted-foreground">
        XDEV Club · Admin Console
      </footer>
    </div>
  );
}
