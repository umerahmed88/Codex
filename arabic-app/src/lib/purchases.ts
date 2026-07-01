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

// Configure RevenueCat once at startup, tying purchases to the logged-in user
// so entitlements follow them across devices.
export function configurePurchases(appUserId: string) {
  const apiKey = Platform.select({ ios: iosKey, android: androidKey, default: '' });
  if (!apiKey) {
    console.warn('[purchases] Missing RevenueCat key for this platform — paywall disabled.');
    return;
  }
  Purchases.configure({ apiKey, appUserID: appUserId });
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
