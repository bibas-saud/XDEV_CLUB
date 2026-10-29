import { Link } from "react-router-dom";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <ShieldX className="size-10 text-primary" />
      <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Button asChild variant="outline">
        <Link to="/admin">Back to dashboard</Link>
      </Button>
    </div>
  );
}
