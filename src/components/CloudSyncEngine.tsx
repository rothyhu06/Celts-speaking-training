"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export default function CloudSyncEngine() {
  const state = useStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialPullDone = useRef(false);

  // 1. BACKGROUND PULL (On Mount)
  useEffect(() => {
    if (!state.user?.email || isInitialPullDone.current) return;

    const pullFromCloud = async () => {
      try {
        console.log("[CloudSync] Attempting startup sync...");
        const { data, error } = await supabase
          .from("cloud_save")
          .select("app_data")
          .eq("email", state.user!.email!.toLowerCase())
          .single();

        if (error) throw error;

        if (data?.app_data && Object.keys(data.app_data).length > 0) {
          console.log("[CloudSync] Background Pull Successful. Checking for consistency...");
          
          // CRITICAL: Prevent "Onboarding Rollback"
          // If local user is already onboarded, don't let a stale cloud record revert them.
          const cloudUser = data.app_data.user;
          if (state.user?.hasOnboarded && cloudUser && !cloudUser.hasOnboarded) {
            console.log("[CloudSync] Cloud state is stale regarding onboarding. Preserving local profile status.");
            data.app_data.user = { ...cloudUser, ...state.user };
          }

          state.restoreBackup(data.app_data);
        }
      } catch (err) {
        console.error("[CloudSync] Startup pull failed.", err);
      } finally {
        isInitialPullDone.current = true;
      }
    };

    pullFromCloud();
  }, [state.user]);

  // 2. BACKGROUND PUSH (On State Change)
  useEffect(() => {
    // Only attempt to sync if we have a logged-in user and haven't just pulled (to avoid immediate overwrite)
    if (!state.user || !state.user.id || !isInitialPullDone.current) return;

    const syncData = async () => {
      // LAST MINUTE SAFETY: Check if we are still initialized
      if (!isInitialPullDone.current) return;
      // Create a snapshot of the current state of user data
      const exportData = {
        user: state.user,
        categories: state.categories.filter((c) => c.userId === state.user?.id),
        topics: state.topics.filter((t) => t.userId === state.user?.id),
        stories: state.stories.filter((s) => s.userId === state.user?.id),
      };

      try {
        await supabase
          .from("cloud_save")
          .update({ app_data: exportData, updated_at: new Date().toISOString() })
          .eq("email", state.user!.email?.toLowerCase() || "");
        
        console.log("[CloudSync] Successfully backed up state to Supabase.");
      } catch (err) {
        console.error("[CloudSync] Failed to sync.", err);
      }
    };

    // Debounce the sync to avoid spamming the database on every keystroke
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      syncData();
    }, 3000); // 3 seconds of inactivity before uploading

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state.user, state.categories, state.topics, state.stories]);

  return null; // This component handles side effects only
}
