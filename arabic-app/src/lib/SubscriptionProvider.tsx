// ============================================================================
// SubscriptionProvider — holds the current premium-entitlement status and
// exposes it app-wide via useSubscription(). It also keeps
// users.subscription_status in Supabase in sync with RevenueCat, so the server
// (e.g. the coach rate-limit check) sees the same truth as the app.
// ============================================================================
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { CustomerInfo } from 'react-native-purchases';
import { configurePurchases, getCustomerInfo, hasPremium, onCustomerInfoUpdate, logoutPurchases } from './purchases';
import { supabase } from './supabase';
import { useAuth } from './AuthProvider';

interface SubscriptionContextValue {
  isSubscribed: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Best-effort mirror of the entitlement to Supabase. The server treats
  // subscription_status as authoritative only from the RevenueCat webhook
  // (migration 0008 ignores client writes), so a failure here is harmless.
  const syncToServer = async (subscribed: boolean) => {
    if (!userId) return;
    try {
      await supabase
        .from('users')
        .update({ subscription_status: subscribed ? 'active' : 'free' })
        .eq('id', userId);
    } catch {
      // Non-fatal — the webhook is the source of truth.
    }
  };

  const applyInfo = (info: CustomerInfo) => {
    const premium = hasPremium(info);
    setIsSubscribed(premium);
    void syncToServer(premium);
  };

  const refresh = async () => {
    try {
      const info = await getCustomerInfo();
      applyInfo(info);
    } catch {
      // RevenueCat not configured (e.g. Expo Go / no key) — treat as free.
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      // Signed out — drop the RevenueCat identity so the next user on this
      // device can't inherit the previous user's cached entitlement.
      void logoutPurchases();
      return; // signed-out values are derived below, not set here
    }
    // Reset entitlement before re-identifying. If the session switches straight
    // from user A to user B (shared device, no signed-out frame), we must not
    // keep reporting A's `isSubscribed: true` during the async re-identify —
    // otherwise B briefly bypasses the paywall.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSubscribed(false);
    setIsLoading(true);
    try {
      configurePurchases(userId);
    } catch {
      // ignore configuration errors (dev client without native module)
    }
    // Syncing with an external SDK (RevenueCat) is the documented use-case for
    // effects; refresh() only calls setState after its first await, so there is
    // no synchronous cascading render — the rule can't see across the await.
    refresh();
    const unsub = onCustomerInfoUpdate(applyInfo);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Signed out ⇒ definitively not subscribed and nothing to load. Deriving
  // this (instead of setState in the effect) avoids a cascading render and
  // means stale entitlement state can never leak across a logout.
  const value: SubscriptionContextValue = userId
    ? { isSubscribed, isLoading, refresh }
    : { isSubscribed: false, isLoading: false, refresh };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used inside a <SubscriptionProvider>');
  return ctx;
}
