import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Calculators from "./pages/Calculators";
import AIChat from "./pages/AIChat";
import WeeklySummary from "./pages/WeeklySummary";
import TradeCopilot from "./pages/TradeCopilot";
import AICoach from "./pages/AICoach";
import Leaderboard from "./pages/Leaderboard";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Targets from "./pages/Targets";
import TradeCalendar from "./pages/TradeCalendar";
import Pricing from "./pages/Pricing";
import Feedback from "./pages/Feedback";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/calculators" element={<Calculators />} />
            <Route path="/ai-chat" element={<AIChat />} />
            <Route path="/weekly-summary" element={<WeeklySummary />} />
            <Route path="/trade-copilot" element={<TradeCopilot />} />
            <Route path="/ai-coach" element={<AICoach />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/targets" element={<Targets />} />
            <Route path="/trade-calendar" element={<TradeCalendar />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/privacy" element={<Privacy />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
