import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import Navbar from "@/components/Navbar";
import { FeedbackButton } from "@/components/FeedbackButton";
import { TrendingUp, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
interface LayoutProps {
  children: ReactNode;
}
export function Layout({
  children
}: LayoutProps) {
  const isMobile = useIsMobile();
  const {
    theme,
    setTheme
  } = useTheme();
  return <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-h-screen bg-background">
          {/* Mobile Header with Hamburger */}
          {isMobile && <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4 py-3">
              <div className="flex items-center gap-3">
                <SidebarTrigger>
                  <Menu className="h-5 w-5 text-foreground" />
                </SidebarTrigger>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="font-bold text-lg text-foreground">Amphy AI</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="h-9 w-9">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </div>}

          {/* Desktop Navbar with Sidebar Toggle */}
          {!isMobile && <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4 py-3">
              <SidebarTrigger className="text-foreground hover:bg-muted" />
              <Navbar />
            </div>}
          
          {/* Main Content */}
          <main className="flex-1 my-[5px] mx-0">
            {children}
          </main>
          
          {/* Feedback Button */}
          <FeedbackButton />
        </div>
      </div>
    </SidebarProvider>;
}