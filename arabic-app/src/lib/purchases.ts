// ============================================================================
// RevenueCat wrapper. RevenueCat abstracts BOTH Apple IAP and Google Play
// Billing behind one API — which is why we use it instead of Stripe. Apple and
// Google REQUIRE their own billing for digital subscriptions; shipping Stripe
// for in-app digital goods gets the app rejected.
//
// The keys used here are RevenueCat PUBLIC SDK keys — they are designed to live
// in the app (unlike the Claude/service keys). Still injected via env, not
// hardcoded.
// ============================================================================
import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import { PREMIUM_ENTITLEMENT } from './entitlements';

const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

// Is a RevenueCat key present for THIS platform? When false, purchases are not
// configured — the paywall is inert and premium gating is disabled so we never
// route users to a paywall that can't load (graceful fallback until keys are
// set). Mirrors the key check in configurePurchases below.
export function isPurchasesConfigured(): boolean {
  const apiKey = Platform.select({ ios: iosKey, android: androidKey, default: '' });
  return !!apiKey;
}

// RevenueCat must be configured exactly ONCE per process; user switches after
// that go through logIn/logOut (calling configure again does NOT reset the
// cached CustomerInfo, which would leak entitlements across users on a shared
// device).
let sdkInitialized = false;

// Configure on first login, then re-identify on subsequent user switches.
export function configurePurchases(appUserId: string) {
  const apiKey = Platform.select({ ios: iosKey, android: androidKey, default: '' });
  if (!apiKey) {
    console.warn('[purchases] Missing RevenueCat key for this platform — paywall disabled.');
    return;
  }
  if (!sdkInitialized) {
    Purchases.configure({ apiKey, appUserID: appUserId });
    sdkInitialized = true;
  } else {
    // Different user on the same running app — re-identify.
    Purchases.logIn(appUserId).catch(() => {});
  }
}

// Detach the RevenueCat identity on logout so the next user on this device does
// NOT inherit the previous user's cached entitlement.
export async function logoutPurchases(): Promise<void> {
  if (!sdkInitialized) return;
  try {
    await Purchases.logOut();
  } catch {
    // Anonymous/already-logged-out — nothing to do.
  }
}

// True if the customer currently holds the premium entitlement.
export function hasPremium(info: CustomerInfo): boolean {
  return info.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

// Fetch the current offering (the set of subscription packages to show).
export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  // Without a key RevenueCat is never configured; calling getOfferings() then
  // hangs on native. Fail fast so the paywall shows "unavailable" instead of
  // spinning forever.
  if (!isPurchasesConfigured()) throw new Error('purchases_not_configured');
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

// Purchase a package; returns the updated CustomerInfo.
export async function purchase(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

// Restore purchases (Apple REQUIRES a visible "Restore" affordance).
export async function restore(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

// Subscribe to entitlement changes (fires when a purchase/expiry happens).
export function onCustomerInfoUpdate(cb: (info: CustomerInfo) => void): () => void {
  Purchases.addCustomerInfoUpdateListener(cb);
  return () => Purchases.removeCustomerInfoUpdateListener(cb);
}
