import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Calculators from "./pages/Calculators";
import AIChat from "./pages/AIChat";
import WeeklySummary from "./pages/WeeklySummary";
import AIJournal from "./pages/AIJournal";
import PatternRecognition from "./pages/PatternRecognition";
import Journal from "./pages/Journal";
import Leaderboard from "./pages/Leaderboard";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Targets from "./pages/Targets";
import TradeCalendar from "./pages/TradeCalendar";
import Pricing from "./pages/Pricing";
import Feedback from "./pages/Feedback";
import Privacy from "./pages/Privacy";
import Integrations from "./pages/Integrations";
import MT5Setup from "./pages/MT5Setup";
import NotFound from "./pages/NotFound";
import CheckIn from "./pages/CheckIn";
import Routine from "./pages/Routine";
import Setups from "./pages/Setups";
import AdvancedAnalytics from "./pages/AdvancedAnalytics";
import AISetupAnalyzer from "./pages/AISetupAnalyzer";
import Streaks from "./pages/Streaks";
import Onboarding from "./pages/Onboarding";
import Achievements from "./pages/Achievements";
import Install from "./pages/Install";
import AbusePreventionAdmin from "./pages/AbusePreventionAdmin";
import { FloatingActionMenu } from "./components/FloatingActionMenu";

const queryClient = new QueryClient();

const AppContent = () => {
  useOfflineSync();
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calculators" element={<Calculators />} />
          <Route path="/ai-chat" element={<AIChat />} />
          <Route path="/weekly-summary" element={<WeeklySummary />} />
          <Route path="/ai-journal" element={<AIJournal />} />
        <Route path="/pattern-recognition" element={<PatternRecognition />} />
        <Route path="/ai-setup-analyzer" element={<AISetupAnalyzer />} />
        <Route path="/journal" element={<Journal />} />
        
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/integrations/mt5-setup" element={<MT5Setup />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/abuse-prevention" element={<AbusePreventionAdmin />} />
        <Route path="/targets" element={<Targets />} />
        <Route path="/trade-calendar" element={<TradeCalendar />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/check-in" element={<CheckIn />} />
        <Route path="/routine" element={<Routine />} />
        <Route path="/setups" element={<Setups />} />
        <Route path="/analytics/advanced" element={<AdvancedAnalytics />} />
        <Route path="/streaks" element={<Streaks />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/install" element={<Install />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <FloatingActionMenu />
    </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
