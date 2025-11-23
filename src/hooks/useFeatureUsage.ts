import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeatureUsage {
  featureName: string;
  usageCount: number;
  lastUsed: string;
  creditsSpent: number;
}

export const useFeatureUsage = () => {
  const [usage, setUsage] = useState<FeatureUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCreditsUsed, setTotalCreditsUsed] = useState(0);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get credit earnings to track feature usage
      const { data: earnings } = await supabase
        .from('credit_earnings')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false })
        .limit(100);

      if (earnings) {
        // Aggregate usage by feature type
        const usageMap = new Map<string, FeatureUsage>();
        let totalSpent = 0;

        earnings.forEach((earning) => {
          const featureName = earning.earning_type || 'Unknown';
          const credits = Math.abs(earning.credits_earned || 0);
          
          if (!usageMap.has(featureName)) {
            usageMap.set(featureName, {
              featureName,
              usageCount: 0,
              lastUsed: earning.earned_at || '',
              creditsSpent: 0
            });
          }

          const current = usageMap.get(featureName)!;
          current.usageCount += 1;
          current.creditsSpent += credits;
          current.lastUsed = earning.earned_at || current.lastUsed;
          
          totalSpent += credits;
        });

        setUsage(Array.from(usageMap.values()).sort((a, b) => b.creditsSpent - a.creditsSpent));
        setTotalCreditsUsed(totalSpent);
      }
    } catch (error) {
      console.error('Error fetching feature usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMostUsedFeature = () => {
    return usage.length > 0 ? usage[0] : null;
  };

  const getFeatureUsagePercentage = (featureName: string) => {
    const feature = usage.find(f => f.featureName === featureName);
    if (!feature || totalCreditsUsed === 0) return 0;
    return Math.round((feature.creditsSpent / totalCreditsUsed) * 100);
  };

  return {
    usage,
    loading,
    totalCreditsUsed,
    getMostUsedFeature,
    getFeatureUsagePercentage,
    refreshUsage: fetchUsage
  };
};
