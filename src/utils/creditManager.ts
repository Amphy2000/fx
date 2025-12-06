import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CreditEarningType = 
  | 'daily_checkin'
  | 'trade_logged'
  | 'streak_milestone'
  | 'achievement_unlocked'
  | 'referral'
  | 'feedback_submitted';

export const CREDIT_COSTS = {
  checkin_analysis: 2,
  trade_validation: 2,
  trade_analysis: 5,
  ai_coach_message: 5,
  weekly_summary: 10,
  pattern_recognition: 3,
  setup_analysis: 3,
} as const;

export const CREDIT_REWARDS = {
  daily_checkin: 1,
  trade_logged: 1,
  streak_milestone_7: 10,
  streak_milestone_30: 50,
  achievement_unlocked: 5,
  feedback_submitted: 2,
} as const;

/**
 * Award credits to a user for completing an action
 */
export async function awardCredits(
  userId: string,
  earningType: CreditEarningType,
  credits: number,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('award_credits', {
      p_user_id: userId,
      p_earning_type: earningType,
      p_credits: credits,
      p_description: description || null,
    });

    if (error) throw error;

    // Show success notification
    const messages: Record<CreditEarningType, string> = {
      daily_checkin: '🎯 +1 credit earned for daily check-in!',
      trade_logged: '📊 +1 credit earned for logging trade!',
      streak_milestone: `🔥 +${credits} credits earned for streak milestone!`,
      achievement_unlocked: '🏆 +5 credits earned for unlocking achievement!',
      referral: '🎁 +25 credits earned for referral!',
      feedback_submitted: '💬 +2 credits earned for feedback!',
    };

    toast.success(messages[earningType] || `+${credits} credits earned!`, {
      description: description,
    });

    return { success: true };
  } catch (error) {
    console.error('Error awarding credits:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Check if user has enough credits and deduct them
 */
export async function deductCredits(
  userId: string,
  cost: number
): Promise<{ success: boolean; error?: string; newBalance?: number; isPremium?: boolean }> {
  try {
    // Get current balance
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('ai_credits, subscription_tier')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    // Premium users (pro, lifetime, monthly) get UNLIMITED AI features - no deduction
    const isPremium = profile.subscription_tier && ['pro', 'lifetime', 'monthly'].includes(profile.subscription_tier);
    
    if (isPremium) {
      return { success: true, newBalance: 999999, isPremium: true };
    }

    // Check if sufficient credits for free users
    if ((profile.ai_credits || 0) < cost) {
      return { 
        success: false, 
        error: `Insufficient credits. Required: ${cost}, Available: ${profile.ai_credits || 0}` 
      };
    }

    // Deduct credits only for free users
    const newBalance = (profile.ai_credits || 0) - cost;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ ai_credits: newBalance })
      .eq('id', userId);

    if (updateError) throw updateError;

    return { success: true, newBalance, isPremium: false };
  } catch (error) {
    console.error('Error deducting credits:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Check if user can perform an action based on credits
 */
export async function hasEnoughCredits(
  userId: string,
  cost: number
): Promise<boolean> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_credits, subscription_tier')
      .eq('id', userId)
      .single();

    if (!profile) return false;

    // Premium users (pro, lifetime, monthly) have unlimited credits
    const isPremium = profile.subscription_tier && ['pro', 'lifetime', 'monthly'].includes(profile.subscription_tier);
    if (isPremium) return true;

    return (profile.ai_credits || 0) >= cost;
  } catch (error) {
    console.error('Error checking credits:', error);
    return false;
  }
}

/**
 * Get user's credit balance
 */
export async function getCreditBalance(
  userId: string
): Promise<{ balance: number; tier: string }> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_credits, subscription_tier')
      .eq('id', userId)
      .single();

    return {
      balance: profile?.ai_credits || 0,
      tier: profile?.subscription_tier || 'free',
    };
  } catch (error) {
    console.error('Error getting credit balance:', error);
    return { balance: 0, tier: 'free' };
  }
}
