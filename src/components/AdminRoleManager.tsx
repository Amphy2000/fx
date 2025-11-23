import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield } from "lucide-react";
export default function AdminRoleManager() {
  const [userId, setUserId] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    checkAdminStatus();
  }, []);
  const checkAdminStatus = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const {
        data: roles
      } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
      setIsAdmin(!!roles);
    } catch (error) {
      console.error('Error checking admin status:', error);
    } finally {
      setLoading(false);
    }
  };
  const grantAdminAccess = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;

      // Insert directly (will work for first admin, then admins can grant to others)
      const {
        error: insertError
      } = await supabase.from('user_roles').insert({
        user_id: user.id,
        role: 'admin'
      });
      if (insertError) {
        toast.error("Failed to grant admin access. You may need to run this SQL manually in the database:\nINSERT INTO public.user_roles (user_id, role) VALUES ('" + user.id + "', 'admin');");
        return;
      }
      setIsAdmin(true);
      toast.success("Admin access granted! Refresh the page to see changes.");
    } catch (error) {
      console.error('Error granting admin:', error);
      toast.error("Error granting admin access");
    }
  };
  if (loading) return null;
  return <Card>
      
      
    </Card>;
}