import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Brain, LogOut, Shield, Sun, Moon, Download, Menu, HelpCircle, LayoutDashboard, CreditCard, Bell, Settings, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { CreditDisplay } from "@/components/CreditDisplay";
import { NotificationBell } from "@/components/NotificationBell";
import { isAppInstalled } from "@/utils/browserDetection";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const {
    theme,
    setTheme
  } = useTheme();

  useEffect(() => {
    // Show install button only if app is not already installed
    setShowInstallButton(!isAppInstalled());
  }, []);
  useEffect(() => {
    const loadUser = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);

        // Show welcome back toast only once per session for returning users
        const justLoggedIn = localStorage.getItem('just_logged_in');
        const welcomeShown = sessionStorage.getItem('welcomeShown');
        const isReturningUser = localStorage.getItem('userLastLogin');
        if (!justLoggedIn && !welcomeShown && isReturningUser) {
          const userName = session.user.user_metadata?.full_name || 'back';
          toast.success(`Welcome back, ${userName}! 👋`);
          sessionStorage.setItem('welcomeShown', 'true');
        }
        localStorage.removeItem('just_logged_in');
      }
    };
    loadUser();
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);

        // Redirect to auth page if session expires or user signs out
        if (!session && window.location.pathname !== '/auth' && window.location.pathname !== '/') {
          navigate('/auth');
          if (event === 'SIGNED_OUT' && window.location.pathname !== '/') {
            // Don't show expiry message for manual sign out
            return;
          }
          toast.info('Your session has expired. Please sign in again.');
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  const checkAdminStatus = async (userId: string) => {
    try {
      const {
        data,
        error
      } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin'
      });
      if (!error && data) {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  };
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };
  const NavItems = () => (
    <>
      {user ? (
        <>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="hidden md:flex gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/guides")} className="hidden md:flex gap-2">
            <HelpCircle className="h-4 w-4" />
            Guides
          </Button>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="gap-2 text-primary hover:text-primary/80 hidden md:flex">
              <Shield className="h-4 w-4" />
              Admin
            </Button>
          )}
          <div className="flex items-center gap-2 mr-2">
            <CreditDisplay />
            <NotificationBell />
          </div>
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="flex-shrink-0">
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2 hidden md:flex">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </>
      ) : (
        <>
          <Button variant="ghost" size="sm" onClick={() => navigate("/pricing")} className="hidden md:flex">
            Pricing
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/guides")} className="hidden md:flex">
            Guides
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
          <Button size="sm" onClick={() => navigate("/auth")} className="bg-primary text-primary-foreground font-bold hover:scale-105 transition-transform px-6">
            Get Started
          </Button>
        </>
      )}
    </>
  );

  const MobileMenu = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-card/95 backdrop-blur-xl border-l border-border/50">
        <SheetHeader className="pb-8 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2 font-black italic text-2xl">
            <Brain className="h-8 w-8 text-primary" />
            Amphy AI
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 py-8">
          {user ? (
            <>
              <Button variant="ghost" className="justify-start gap-4 h-14 text-lg font-bold rounded-2xl" onClick={() => navigate("/dashboard")}>
                <LayoutDashboard className="h-6 w-6 text-primary" />
                Dashboard
              </Button>
              <Button variant="ghost" className="justify-start gap-4 h-14 text-lg font-bold rounded-2xl" onClick={() => navigate("/guides")}>
                <HelpCircle className="h-6 w-6 text-primary" />
                Guides
              </Button>
              <Button variant="ghost" className="justify-start gap-4 h-14 text-lg font-bold rounded-2xl" onClick={() => navigate("/settings")}>
                <Settings className="h-6 w-6 text-primary" />
                Settings
              </Button>
              {isAdmin && (
                <Button variant="ghost" className="justify-start gap-4 h-14 text-lg font-bold rounded-2xl text-primary" onClick={() => navigate("/admin")}>
                  <Shield className="h-6 w-6" />
                  Admin Panel
                </Button>
              )}
              <div className="mt-auto pt-8 border-t border-border/50">
                <Button variant="destructive" className="w-full justify-start gap-4 h-14 text-lg font-bold rounded-2xl shadow-lg" onClick={handleSignOut}>
                  <LogOut className="h-6 w-6" />
                  Sign Out
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="ghost" className="justify-start gap-4 h-14 text-lg font-bold rounded-2xl" onClick={() => navigate("/pricing")}>
                <CreditCard className="h-6 w-6 text-primary" />
                Pricing
              </Button>
              <Button variant="ghost" className="justify-start gap-4 h-14 text-lg font-bold rounded-2xl" onClick={() => navigate("/guides")}>
                <HelpCircle className="h-6 w-6 text-primary" />
                Guides
              </Button>
              <Button className="mt-4 justify-start gap-4 h-16 text-xl font-black rounded-2xl bg-primary text-primary-foreground shadow-xl" onClick={() => navigate("/auth")}>
                <Zap className="h-6 w-6 fill-current" />
                Get Started
              </Button>
            </>
          )}
          <div className="mt-8 flex items-center justify-between px-4 py-4 rounded-3xl bg-muted/50">
            <span className="font-bold">Dark Mode</span>
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <nav className="flex items-center justify-between w-full">
      <Link to="/" className="flex items-center gap-2 font-black italic text-2xl group">
        <Brain className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
        <span className="tracking-tighter">AMPHY AI</span>
      </Link>
      
      <div className="flex items-center gap-2">
        <NavItems />
        <MobileMenu />
      </div>
    </nav>
  );
};
export default Navbar;