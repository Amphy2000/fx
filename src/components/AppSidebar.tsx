import { LayoutDashboard, MessageSquare, Calendar, Settings, Shield, TrendingUp, LogOut, Target, Sun, Moon, Calculator, CreditCard, MessagesSquare } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Calculators", url: "/calculators", icon: Calculator },
  { title: "Targets", url: "/targets", icon: Target },
  { title: "Trade Calendar", url: "/trade-calendar", icon: Calendar },
  { title: "AI Chat", url: "/ai-chat", icon: MessageSquare },
  { title: "Weekly Summary", url: "/weekly-summary", icon: TrendingUp },
  { title: "Pricing", url: "/pricing", icon: CreditCard },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          const { data, error } = await supabase
            .rpc('has_role', { _user_id: session.user.id, _role: 'admin' });
          if (!error && data) {
            setIsAdmin(true);
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
        }
      }
    };
    checkAdmin();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const handleNavClick = () => {
    // Close mobile sidebar when a link is clicked
    if (state === "expanded") {
      setOpenMobile(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r border-sidebar-border bg-sidebar"
    >
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-sidebar-primary" />
          <span className="font-bold text-lg text-sidebar-foreground">Amphy AI</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 text-xs uppercase tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="transition-smooth hover:bg-sidebar-primary/10 data-[active=true]:bg-sidebar-primary/20 data-[active=true]:text-sidebar-primary"
                    onClick={handleNavClick}
                  >
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive("/admin")}
                      className="transition-smooth hover:bg-sidebar-primary/10 data-[active=true]:bg-sidebar-primary/20 data-[active=true]:text-sidebar-primary"
                      onClick={handleNavClick}
                    >
                      <NavLink to="/admin">
                        <Shield className="h-4 w-4" />
                        <span>Admin</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive("/feedback")}
                      className="transition-smooth hover:bg-sidebar-primary/10 data-[active=true]:bg-sidebar-primary/20 data-[active=true]:text-sidebar-primary"
                      onClick={handleNavClick}
                    >
                      <NavLink to="/feedback">
                        <MessagesSquare className="h-4 w-4" />
                        <span>User Feedback</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-primary/10 hover:text-sidebar-primary transition-smooth"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
