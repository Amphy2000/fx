import { LayoutDashboard, Calendar, Settings, Brain, LogOut, CreditCard, BarChart3, BookOpen, Zap, TrendingUp, Shield, Mic, Search, Plug, Heart, ClipboardCheck, MessageSquare } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const primaryNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Prop Guardian", url: "/prop-firm-protector", icon: Shield, badge: "Core" },
  { title: "Trade Calendar", url: "/trade-calendar", icon: Calendar },
  { title: "Daily Check-In", url: "/check-in", icon: Heart },
];

const toolsNavItems = [
  { title: "MT5 Accounts", url: "/integrations", icon: Plug, badge: "Auto" },
  { title: "AI Journal", url: "/ai-journal", icon: Brain },
  { title: "AI Setup Analyzer", url: "/ai-setup-analyzer", icon: Zap },
  { title: "Voice Memos", url: "/voice-memos", icon: Mic },
  { title: "Weekly Summary", url: "/weekly-summary", icon: BarChart3 },
];

const secondaryNavItems = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Feedback", url: "/feedback", icon: MessageSquare },
];

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [tier, setTier] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminAndTier = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        try {
          const { data: adminData, error: adminError } = await supabase.rpc("has_role", {
            _user_id: session.user.id,
            _role: "admin",
          });

          if (!adminError && adminData) {
            setIsAdmin(true);
          }

          const { data: profile } = await supabase
            .from("profiles")
            .select("subscription_tier")
            .eq("id", session.user.id)
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
    if (state === "expanded") {
      setOpenMobile(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const renderNavGroup = (
    label: string,
    items: Array<{ title: string; url: string; icon: any; badge?: string }>,
  ) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton isActive={isActive(item.url)} onClick={() => handleNavClick(item.url)}>
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <item.icon className="h-4 w-4" />
                    <span className="truncate">{item.title}</span>
                  </div>
                  {item.badge ? (
                    <Badge className="bg-primary text-primary-foreground text-[10px] px-1 h-4 ml-auto">
                      {item.badge}
                    </Badge>
                  ) : null}
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  const EducationGroup = () => {
    if (tier !== "lifetime") return null;

    return (
      <SidebarGroup>
        <SidebarGroupLabel>Execution Mastery</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                id="tour-sms-course"
                onClick={() => window.open("https://smscourse.lovable.app/dashboard", "_blank")}
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
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Brain className="h-6 w-6 text-sidebar-primary shrink-0" />
          <span className="font-bold text-lg text-sidebar-foreground truncate">Amphy AI</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between text-muted-foreground font-normal bg-sidebar-accent/50 border-sidebar-border hover:bg-sidebar-accent transition-all h-9 px-3"
          onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs">Search...</span>
          </div>
          <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </div>
    </SidebarHeader>

    <SidebarContent>
      {renderNavGroup("Core", primaryNavItems)}
      {renderNavGroup("Discipline", disciplineNavItems)}
      {renderNavGroup("Secondary", secondaryNavItems)}

      {isAdmin ? renderNavGroup("Admin", [{ title: "Admin", url: "/admin", icon: Settings }]) : null}
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