import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import Navbar from "@/components/Navbar";
import { TrendingUp, Menu } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-h-screen gradient-dark">
          {/* Mobile Header with Hamburger */}
          {isMobile && (
            <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-sidebar-border bg-sidebar/95 backdrop-blur-sm px-4 py-3">
              <SidebarTrigger>
                <Menu className="h-5 w-5 text-sidebar-foreground" />
              </SidebarTrigger>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-sidebar-primary" />
                <span className="font-bold text-lg text-sidebar-foreground">Amphy AI</span>
              </div>
            </div>
          )}

          {/* Desktop Navbar */}
          {!isMobile && <Navbar />}
          
          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
