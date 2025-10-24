import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Theme = "dark" | "light";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user and load their theme preference
    const loadTheme = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("theme")
          .eq("id", session.user.id)
          .single();

        if (profile?.theme) {
          const savedTheme = profile.theme as Theme;
          setThemeState(savedTheme);
          document.documentElement.classList.remove("light", "dark");
          document.documentElement.classList.add(savedTheme);
        }
      }
    };

    loadTheme();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        setUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(newTheme);

    // Save to database if user is logged in
    if (userId) {
      try {
        await supabase
          .from("profiles")
          .update({ theme: newTheme })
          .eq("id", userId);
      } catch (error) {
        console.error("Error saving theme:", error);
      }
    }
  };

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
