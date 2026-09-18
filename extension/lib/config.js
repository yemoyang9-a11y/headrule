// Headrule build-time configuration.
// Fill in the Lemon Squeezy values after creating the store and product
// (see HANDOVER.md). Nothing here is secret: the License API is public and
// only accepts keys issued for the matching store/product.
export const CONFIG = {
  productName: "Headrule",
  version: "1.0.1",
  siteUrl: "https://headrule.com",
  buyUrl: "https://headrule.lemonsqueezy.com/checkout/buy/116bb731-2b75-4840-b39f-35e3b86c47fa",
  supportEmail: "support@headrule.com",
  lemonSqueezy: {
    apiBase: "https://api.lemonsqueezy.com/v1/licenses",
    // Numeric IDs from the Lemon Squeezy dashboard. A key only unlocks Pro
    // if it was issued for this store and this product.
    storeId: 473656,
    productId: 1362488
  },
  // Free tier limits
  free: {
    maxProfiles: 1,
    allowRegexFilter: false,
    allowImportExport: true,
    allowSync: false
  },
  // Validate a stored license against the API this often; keep working
  // offline for the grace period if the check cannot run.
  licenseRecheckDays: 7,
  licenseOfflineGraceDays: 30
};
