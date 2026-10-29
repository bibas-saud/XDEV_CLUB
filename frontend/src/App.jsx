import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/route-guards";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { SiteLayout } from "@/layouts/SiteLayout";

// Public site
import Home from "@/pages/site/Home";
import Story from "@/pages/site/Story";
import Team from "@/pages/site/Team";
import EventsPage from "@/pages/site/EventsPage";
import EventShowcase from "@/pages/site/EventShowcase";
import SiteNotFound from "@/pages/site/SiteNotFound";

// Admin console
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Members from "@/pages/Members";
import MemberDetail from "@/pages/MemberDetail";
import Events from "@/pages/Events";
import EventDetail from "@/pages/EventDetail";
import EventAttendance from "@/pages/EventAttendance";
import Security from "@/pages/Security";
import Notifications from "@/pages/Notifications";
import TransferAccept from "@/pages/TransferAccept";
import PublicCheckIn from "@/pages/PublicCheckIn";
import PublicMember from "@/pages/PublicMember";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
  },
});

function LegacyEventRedirect() {
  const { id } = useParams();
  return <Navigate to={`/events/${id}`} replace />;
}

export default function App() {
  const { theme } = useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Public website ─────────────────────────────────── */}
            <Route element={<SiteLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/story" element={<Story />} />
              <Route path="/team" element={<Team />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:id" element={<EventShowcase />} />
              <Route
                path="/index.html"
                element={<Navigate to="/" replace />}
              />
              <Route path="*" element={<SiteNotFound />} />
            </Route>

            {/* ── Standalone public flows ────────────────────────── */}
            <Route element={<PublicOnlyRoute />}>
              <Route path="/admin/login" element={<Login />} />
            </Route>
            <Route path="/transfer/accept" element={<TransferAccept />} />
            <Route path="/m/:id" element={<PublicMember />} />
            <Route path="/check-in/:token" element={<PublicCheckIn />} />

            {/* Legacy URLs → new homes */}
            <Route path="/login" element={<Navigate to="/admin/login" replace />} />
            <Route
              path="/public/events"
              element={<Navigate to="/events" replace />}
            />
            <Route
              path="/public/events/:id"
              element={<LegacyEventRedirect />}
            />

            {/* ── Admin console (protected) ──────────────────────── */}
            <Route path="/admin" element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="members" element={<Members />} />
                <Route path="members/:id" element={<MemberDetail />} />
                <Route path="events" element={<Events />} />
                <Route path="events/:id" element={<EventDetail />} />
                <Route path="events/:id/attendance" element={<EventAttendance />} />
                <Route path="security" element={<Security />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
          <Toaster position="top-right" richColors closeButton theme={theme} />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
