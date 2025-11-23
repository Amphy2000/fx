import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UnreadCount {
  partnershipId: string;
  count: number;
}

export function useUnreadMessages(userId: string | null) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const fetchUnreadCounts = async () => {
      try {
        // Get all partnerships
        const { data: partnerships } = await supabase
          .from('accountability_partnerships')
          .select('id')
          .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
          .eq('status', 'active');

        if (!partnerships) return;

        // Get unread counts for each partnership
        const counts: Record<string, number> = {};
        let total = 0;

        for (const partnership of partnerships) {
          const { count } = await supabase
            .from('partner_messages')
            .select('*', { count: 'exact', head: true })
            .eq('partnership_id', partnership.id)
            .neq('sender_id', userId)
            .is('read_at', null)
            .eq('is_system', false);

          counts[partnership.id] = count || 0;
          total += count || 0;
        }

        setUnreadCounts(counts);
        setTotalUnread(total);
      } catch (error) {
        console.error('Error fetching unread counts:', error);
      }
    };

    fetchUnreadCounts();

    // Subscribe to message changes
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partner_messages'
        },
        () => {
          fetchUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { unreadCounts, totalUnread };
}
