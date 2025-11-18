import { supabase } from "@/integrations/supabase/client";
import {
  getUnsyncedTrades,
  getUnsyncedJournalEntries,
  markTradeAsSynced,
  markJournalAsSynced,
  deleteOfflineTrade,
  deleteOfflineJournal,
} from "./offlineStorage";
import { toast } from "sonner";

export const syncOfflineData = async () => {
  if (!navigator.onLine) {
    console.log("Device is offline, skipping sync");
    return;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("No user logged in, skipping sync");
      return;
    }

    // Sync trades
    const unsyncedTrades = await getUnsyncedTrades();
    for (const trade of unsyncedTrades) {
      try {
        const { error } = await supabase.from("trades").insert({
          ...trade.data,
          user_id: user.id,
        });

        if (!error) {
          await deleteOfflineTrade(trade.id);
          console.log(`Synced trade ${trade.id}`);
        }
      } catch (error) {
        console.error(`Failed to sync trade ${trade.id}:`, error);
      }
    }

    // Sync journal entries
    const unsyncedJournals = await getUnsyncedJournalEntries();
    for (const journal of unsyncedJournals) {
      try {
        const { error } = await supabase.from("journal_entries").insert({
          ...journal.data,
          user_id: user.id,
        });

        if (!error) {
          await deleteOfflineJournal(journal.id);
          console.log(`Synced journal ${journal.id}`);
        }
      } catch (error) {
        console.error(`Failed to sync journal ${journal.id}:`, error);
      }
    }

    if (unsyncedTrades.length > 0 || unsyncedJournals.length > 0) {
      toast.success("Offline data synced successfully!");
    }
  } catch (error) {
    console.error("Sync failed:", error);
    toast.error("Failed to sync offline data");
  }
};

// Auto-sync when coming back online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    toast.info("Back online! Syncing data...");
    syncOfflineData();
  });

  window.addEventListener("offline", () => {
    toast.info("You're offline. Data will be saved locally and synced when back online.");
  });
}
