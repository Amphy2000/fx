import { LayoutDashboard, MessageSquare, Calendar, Settings, Brain, LogOut, Target, Calculator, CreditCard, Trophy, GraduationCap, Plug, Heart, ClipboardCheck, Lightbulb, BarChart3, Flame, Award, BookOpen, Zap, Notebook, Sparkles, TrendingUp, FileText, Activity, Users, Crown } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Core Trading Features
const tradingNavItems = [{
  title: "Dashboard",
  url: "/dashboard",
  icon: LayoutDashboard
}, {
  title: "Trade Calendar",
  url: "/trade-calendar",
  icon: Calendar
}, {
  title: "Weekly Summary",
  url: "/weekly-summary",
  icon: BarChart3
}];

// AI-Powered Analysis
const aiNavItems = [{
  title: "AI Features Hub",
  url: "/ai-features",
  icon: Brain
}, {
  title: "AI Daily Journal",
  url: "/ai-journal",
  icon: Sparkles
}, {
  title: "AI Setup Analyzer",
  url: "/ai-setup-analyzer",
  icon: Zap
}];

// Manual Tracking & Journaling
const journalNavItems = [{
  title: "Daily Check-In",
  url: "/check-in",
  icon: Heart
}, {
  title: "Trading Routine",
  url: "/routine",
  icon: ClipboardCheck
}];

// Performance & Progress
const performanceNavItems = [{
  title: "Setups",
  url: "/setups",
  icon: Lightbulb
}, {
  title: "Mental State ↔ Performance",
  url: "/analytics/mental-state",
  icon: Brain
}, {
  title: "Streaks",
  url: "/streaks",
  icon: Flame
}, {
  title: "Achievements",
  url: "/achievements",
  icon: Award
}, {
  title: "Leaderboard",
  url: "/leaderboard",
  icon: Crown
}, {
  title: "Accountability Partners",
  url: "/accountability-partners",
  icon: Users
}, {
  title: "Advanced Analytics",
  url: "/analytics/advanced",
  icon: TrendingUp
}];

// Utilities
const toolsNavItems = [{
  title: "Calculators",
  url: "/calculators",
  icon: Calculator
}, {
  title: "Targets",
  url: "/targets",
  icon: Target
}];

// System
const systemNavItems = [{
  title: "Integrations",
  url: "/integrations",
  icon: Plug
}, {
  title: "Settings",
  url: "/settings",
  icon: Settings
}, {
  title: "Pricing",
  url: "/pricing",
  icon: CreditCard
}];
export function AppSidebar() {
  const {
    state,
    setOpenMobile
  } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [tier, setTier] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminAndTier = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          // Check Admin
          const {
            data: adminData,
            error: adminError
          } = await supabase.rpc('has_role', {
            _user_id: session.user.id,
            _role: 'admin'
          });
          if (!adminError && adminData) {
            setIsAdmin(true);
          }

          // Check Tier
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_tier')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setTier(profile.subscription_tier);
          }
        } catch (error) {
          console.error("Error checking user status:", error);
        }
      }
    };
    checkAdminAndTier();
  }, []);
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };
  const handleNavClick = (path: string) => {
    navigate(path);
    // Close mobile sidebar when a link is clicked
    if (state === "expanded") {
      setOpenMobile(false);
    }
  };
  const isActive = (path: string) => location.pathname === path;

  const EducationGroup = () => {
    if (tier !== 'lifetime') return null;

    return (
      <SidebarGroup>
        <SidebarGroupLabel>Execution Mastery</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => window.open("https://smscourse.lovable.app/", "_blank")}
                className="text-yellow-500 font-semibold"
              >
                <BookOpen className="h-4 w-4" />
                <span>SMS Course Access</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
    <SidebarHeader className="border-b border-sidebar-border p-4 overflow-hidden">
      <div className="flex items-center gap-2 min-w-0">
        <Brain className="h-6 w-6 text-sidebar-primary shrink-0" />
        <span className="font-bold text-lg text-sidebar-foreground truncate">Amphy AI</span>
      </div>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Trading</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {tradingNavItems.map(item => <SidebarMenuItem key={item.title}>
              <SidebarMenuButton isActive={isActive(item.url)} onClick={() => handleNavClick(item.url)}>
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>)}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>AI Analysis</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {aiNavItems.map(item => <SidebarMenuItem key={item.title}>
              <SidebarMenuButton isActive={isActive(item.url)} onClick={() => handleNavClick(item.url)}>
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>)}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Journal & Tracking</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {journalNavItems.map(item => <SidebarMenuItem key={item.title}>
              <SidebarMenuButton isActive={isActive(item.url)} onClick={() => handleNavClick(item.url)}>
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>)}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Performance</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {performanceNavItems.map(item => <SidebarMenuItem key={item.title}>
              <SidebarMenuButton isActive={isActive(item.url)} onClick={() => handleNavClick(item.url)}>
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>)}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Tools</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {toolsNavItems.map(item => <SidebarMenuItem key={item.title}>
              <SidebarMenuButton isActive={isActive(item.url)} onClick={() => handleNavClick(item.url)}>
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>)}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>System</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {systemNavItems.map(item => <SidebarMenuItem key={item.title}>
              <SidebarMenuButton isActive={isActive(item.url)} onClick={() => handleNavClick(item.url)}>
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>)}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Education Group for Bundle/Lifetime Users */}
      <EducationGroup />
    </SidebarContent>

    <SidebarFooter className="border-t border-sidebar-border p-4">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={handleSignOut} className="text-sidebar-foreground hover:bg-sidebar-primary/10 hover:text-sidebar-primary transition-smooth">
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>;
}