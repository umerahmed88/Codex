// ============================================================================
// SubscriptionProvider — holds the current premium-entitlement status and
// exposes it app-wide via useSubscription(). It also keeps
// users.subscription_status in Supabase in sync with RevenueCat, so the server
// (e.g. the coach rate-limit check) sees the same truth as the app.
// ============================================================================
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { CustomerInfo } from 'react-native-purchases';
import { configurePurchases, getCustomerInfo, hasPremium, onCustomerInfoUpdate } from './purchases';
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

  // Push the current entitlement to Supabase so server-side checks agree.
  const syncToServer = async (subscribed: boolean) => {
    if (!userId) return;
    await supabase
      .from('users')
      .update({ subscription_status: subscribed ? 'active' : 'free' })
      .eq('id', userId);
  };

  const applyInfo = (info: CustomerInfo) => {
    const premium = hasPremium(info);
    setIsSubscribed(premium);
    syncToServer(premium);
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
    if (!userId) return; // signed-out values are derived below, not set here
    try {
      configurePurchases(userId);
    } catch {
      // ignore configuration errors (dev client without native module)
    }
    // Syncing with an external SDK (RevenueCat) is the documented use-case for
    // effects; refresh() only calls setState after its first await, so there is
    // no synchronous cascading render — the rule can't see across the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
