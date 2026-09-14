// Headrule build-time configuration.
// Fill in the Lemon Squeezy values after creating the store and product
// (see HANDOVER.md). Nothing here is secret: the License API is public and
// only accepts keys issued for the matching store/product.
export const CONFIG = {
  productName: "Headrule",
  version: "1.0.0",
  siteUrl: "https://headrule.dev",
  buyUrl: "https://headrule.lemonsqueezy.com/buy/REPLACE_WITH_CHECKOUT_ID",
  supportEmail: "yemoyang9@gmail.com",
  lemonSqueezy: {
    apiBase: "https://api.lemonsqueezy.com/v1/licenses",
    // Set both to the numeric IDs shown in the Lemon Squeezy dashboard.
    // Leave as 0 to skip the ownership check (useful during development).
    storeId: 0,
    productId: 0
  },
  // Free tier limits
  free: {
    maxProfiles: 1,
    allowRegexFilter: false,
    allowImportExport: false,
    allowSync: false
  },
  // Validate a stored license against the API this often; keep working
  // offline for the grace period if the check cannot run.
  licenseRecheckDays: 7,
  licenseOfflineGraceDays: 30
};
