import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiError } from "@/config/api";
import { useAcceptTransfer } from "@/features/ownership/hooks/useOwnership";
import { isValidPassword } from "@/utils/validators";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Shell({ children }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-14 items-center px-6">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center p-4 pt-10 sm:items-center sm:pt-4">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

export default function TransferAccept() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const token = searchParams.get("token") ?? "";

  const accept = useAcceptTransfer();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  if (!token) {
    return (
      <Shell>
        <Card className="border-destructive/30">
          <CardHeader className="items-center text-center">
            <ShieldAlert className="mx-auto size-10 text-destructive" />
            <CardTitle>Invalid transfer link</CardTitle>
            <CardDescription>
              This link is missing its security token. Use the exact link from your invitation
              email.
            </CardDescription>
          </CardHeader>
        </Card>
      </Shell>
    );
  }

  if (result) {
    return (
      <Shell>
        <Card className="border-green-200">
          <CardHeader className="items-center text-center">
            <CheckCircle2 className="mx-auto size-10 text-green-600" />
            <CardTitle>You are now the club admin</CardTitle>
            <CardDescription>
              Ownership transferred to{" "}
              <span className="font-medium text-foreground">{result.email}</span>. Sign in with
              the password you just created.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button
              onClick={async () => {
                await login({ email: result.email, password });
                navigate("/admin", { replace: true });
              }}
              size="lg"
            >
              Sign in to your console
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    if (!fullName.trim()) return setError("Enter your full name.");
    if (!isValidPassword(password))
      return setError("Password must be at least 8 characters.");
    if (password !== confirmPassword)
      return setError("Passwords do not match.");

    accept.mutate(
      { token, full_name: fullName.trim(), password },
      {
        onSuccess: (data) => setResult(data),
        onError: (err) => setError(apiError(err)),
      }
    );
  }

  return (
    <Shell>
      <Card className="shadow-md">
        <CardHeader>
          <div className="mb-1 flex items-center gap-2 text-sm font-medium text-destructive">
            <KeyRound className="size-4" /> Ownership Transfer
          </div>
          <CardTitle>Become the club admin</CardTitle>
          <CardDescription>
            You've been invited to take over the XDEV Club admin account. Set up your
            credentials below — this link can only be used once.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="full-name">Your full name</Label>
              <Input
                id="full-name"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {showPassword ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
              {showPassword ? "Hide passwords" : "Show passwords"}
            </button>

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" disabled={accept.isPending}>
              {accept.isPending && <Loader2 className="animate-spin" />}
              Accept ownership
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Already have access?{" "}
              <Link to="/admin/login" className="font-medium text-destructive hover:underline">
                Sign in instead
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </Shell>
  );
}
