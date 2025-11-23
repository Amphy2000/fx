import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Brain, LogOut, Shield, Sun, Moon, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { CreditDisplay } from "@/components/CreditDisplay";
import { isAppInstalled } from "@/utils/browserDetection";
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
  return (
    <nav className="flex-1 flex items-center justify-between">
      <div className="flex items-center justify-between w-full">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <Brain className="h-6 w-6 text-primary" />
          <span>Amphy AI</span>
        </Link>
        
        <div className="flex items-center gap-4">
          {user ? <>
              {isAdmin && <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="gap-2 text-primary hover:text-primary/80 hidden md:flex">
                  <Shield className="h-4 w-4" />
                  Admin
                </Button>}
              <CreditDisplay />
              {showInstallButton && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate("/install")} 
                  className="gap-2 hidden md:flex"
                >
                  <Download className="h-4 w-4" />
                  Install App
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="flex-shrink-0">
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </> : <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
              <Button size="sm" onClick={() => navigate("/auth")} className="gradient-primary">
                Get Started
              </Button>
            </>}
        </div>
      </div>
    </nav>
  );
};
export default Navbar;