import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Coins, Search, Plus } from 'lucide-react';

export const AdminCreditManager = () => {
  const [email, setEmail] = useState('');
  const [credits, setCredits] = useState('');
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  const searchUser = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, ai_credits')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (error) throw error;

      if (data) {
        setUserInfo(data);
        toast.success('User found');
      } else {
        toast.error('User not found');
        setUserInfo(null);
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error('Failed to find user');
      setUserInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const addCredits = async () => {
    if (!userInfo) {
      toast.error('Please search for a user first');
      return;
    }

    const creditAmount = parseInt(credits);
    if (isNaN(creditAmount) || creditAmount <= 0) {
      toast.error('Please enter a valid credit amount');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-add-credits`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            userId: userInfo.id,
            credits: creditAmount
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add credits');
      }

      const result = await response.json();
      toast.success(`Added ${creditAmount} credits to ${userInfo.email}`);
      
      // Update local user info
      setUserInfo({
        ...userInfo,
        ai_credits: result.newBalance
      });
      setCredits('');
    } catch (error: any) {
      console.error('Add credits error:', error);
      toast.error(error.message || 'Failed to add credits');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Credit Manager</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">User Email</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUser()}
              />
              <Button onClick={searchUser} disabled={loading}>
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </div>

          {userInfo && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">User Found</span>
                <span className="text-xs text-muted-foreground">{userInfo.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Name:</span>
                <span className="text-sm font-medium">{userInfo.full_name || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Current Credits:</span>
                <span className="text-sm font-bold text-primary">{userInfo.ai_credits}</span>
              </div>
            </div>
          )}

          {userInfo && (
            <div className="space-y-2">
              <Label htmlFor="credits">Credits to Add</Label>
              <div className="flex gap-2">
                <Input
                  id="credits"
                  type="number"
                  placeholder="100"
                  value={credits}
                  onChange={(e) => setCredits(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCredits()}
                  min="1"
                />
                <Button onClick={addCredits} disabled={loading}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Credits
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <p>💡 This will add the specified amount to the user's current balance</p>
          <p>⚠️ Use responsibly - this action is logged</p>
        </div>
      </div>
    </Card>
  );
};