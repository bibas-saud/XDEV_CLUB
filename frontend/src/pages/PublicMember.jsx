import { Link, useParams } from "react-router-dom";
import { CalendarDays, ScanLine, ShieldCheck, UserX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/config/api";
import { Logo } from "@/components/Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, initials } from "@/utils/format";
import { displayRole } from "@/utils/roleLabels";

async function fetchPublicMember(id) {
  const { data } = await api.get(`/members/${id}`);
  return data;
}

export default function PublicMember() {
  const { id } = useParams();
  const {
    data: member,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["public-member", id],
    queryFn: () => fetchPublicMember(id),
    retry: false,
    staleTime: 60_000,
  });

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-14 items-center justify-between px-6">
        <Logo />
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-green-600" /> Verified public profile
        </span>
      </header>

      <main className="animate-page-in flex flex-1 items-center justify-center p-4 pb-16">
        <div className="w-full max-w-sm">
          {isLoading ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-10">
                <Skeleton className="size-28 rounded-full" />
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ) : error || !member ? (
            <Card className="border-red-100 text-center">
              <CardContent className="flex flex-col items-center gap-3 py-12">
                <UserX className="size-10 text-destructive" />
                <p className="font-semibold">Profile not found</p>
                <p className="text-sm text-muted-foreground">
                  {error ? apiError(error) : "This member may have left the club."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden shadow-md">
              {/* brand strip */}
              <div className="h-2 bg-primary" />
              <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
                <Avatar className="size-28 border-2 shadow-sm">
                  {withPhotoBust(member) && (
                    <AvatarImage src={withPhotoBust(member)} alt={member.full_name} />
                  )}
                  <AvatarFallback className="text-2xl">
                    {initials(member.full_name)}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h1 className="text-xl font-bold tracking-tight">{member.full_name}</h1>
                  <Badge
                    variant={member.role !== "member" ? "destructive" : "outline"}
                    className="mt-2"
                  >
                    {member.is_active ? displayRole(member.role, true) : "Alumni"}
                  </Badge>
                </div>

                {member.is_active ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    Member since {formatDate(member.joined_at)}
                  </span>
                ) : (
                  <Badge variant="secondary">Alumni</Badge>
                )}

                <p className="mt-2 inline-flex items-center gap-1.5 border-t pt-3 text-[11px] text-muted-foreground">
                  <ScanLine className="size-3" />
                  Authenticity verified via XDEV Club ID card
                </p>
              </CardContent>
            </Card>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Are you the club admin?{" "}
            <Link to="/admin/login" className="font-medium text-destructive hover:underline">
              Sign in to the console
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
