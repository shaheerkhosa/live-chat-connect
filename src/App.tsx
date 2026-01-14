import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import WidgetPreview from "./pages/WidgetPreview";
import Analytics from "./pages/Analytics";
import TeamMembers from "./pages/TeamMembers";
import AISupport from "./pages/AISupport";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import AgentDashboard from "./pages/AgentDashboard";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";
import Support from "./pages/Support";
import SlackApp from "./pages/SlackApp";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Route guard for clients only
const RequireClient = ({ children }: { children: React.ReactNode }) => {
  const { isClient, isAdmin, loading } = useAuth();
  
  if (loading) return null;
  
  if (!isClient && !isAdmin) {
    return <Navigate to="/conversations" replace />;
  }
  
  return <>{children}</>;
};

// Route guard for agents only
const RequireAgent = ({ children }: { children: React.ReactNode }) => {
  const { isAgent, loading } = useAuth();
  
  if (loading) return null;
  
  if (!isAgent) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/conversations" element={<RequireAgent><AgentDashboard /></RequireAgent>} />
      <Route path="/onboarding" element={<Onboarding />} />
      
      {/* Client routes */}
      <Route path="/dashboard" element={<RequireClient><Dashboard /></RequireClient>} />
      <Route path="/dashboard/active" element={<RequireClient><Dashboard /></RequireClient>} />
      <Route path="/dashboard/closed" element={<RequireClient><Dashboard /></RequireClient>} />
      <Route path="/dashboard/team" element={<RequireClient><TeamMembers /></RequireClient>} />
      <Route path="/dashboard/ai-support" element={<RequireClient><AISupport /></RequireClient>} />
      <Route path="/dashboard/analytics" element={<RequireClient><Analytics /></RequireClient>} />
      <Route path="/dashboard/widget" element={<RequireClient><WidgetPreview /></RequireClient>} />
      <Route path="/dashboard/settings" element={<RequireClient><Settings /></RequireClient>} />
      <Route path="/dashboard/support" element={<RequireClient><Support /></RequireClient>} />
      
      <Route path="/widget-preview" element={<WidgetPreview />} />
      <Route path="/slack-app" element={<SlackApp />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
