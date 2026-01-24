import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Generate a session ID for anonymous tracking
const getSessionId = (): string => {
  const key = "bundle_session_id";
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
};

export function useBundleAnalytics() {
  const hasTrackedPageView = useRef(false);

  useEffect(() => {
    // Track page view only once per component mount
    if (!hasTrackedPageView.current) {
      trackEvent("page_view");
      hasTrackedPageView.current = true;
    }
  }, []);

  const trackEvent = async (
    eventType: "page_view" | "button_click" | "payment_initiated" | "payment_success",
    metadata: Record<string, unknown> = {}
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("bundle_analytics").insert({
        event_type: eventType,
        user_id: user?.id || null,
        session_id: getSessionId(),
        // Move potentially missing columns into metadata for safety
        metadata: {
          ...metadata,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        },
      });

      if (error) {
        console.error(`[Analytics] ${eventType} tracking error:`, error);
        if (window.location.hostname === 'localhost') {
          const { toast } = await import("sonner");
          toast.error(`Tracking failed: ${error.message}`);
        }
      } else {
        console.log(`[Analytics] ${eventType} tracked successfully`);
      }
    } catch (error) {
      console.error("Analytics tracking internal error:", error);
    }
  };

  const trackButtonClick = () => trackEvent("button_click");
  const trackPaymentInitiated = (metadata?: any) => trackEvent("payment_initiated", metadata);
  const trackPaymentSuccess = (metadata?: any) => trackEvent("payment_success", metadata);

  return {
    trackButtonClick,
    trackPaymentInitiated,
    trackPaymentSuccess,
  };
}
