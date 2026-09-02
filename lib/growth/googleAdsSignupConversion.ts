// Assigned lead value for Google Ads reporting and bidding. This is not
// purchase revenue: paid conversions send the real Stripe amount separately.
// Keep the currency aligned with Kineo's single commercial currency.
export const GOOGLE_ADS_SIGNUP_CONVERSION = Object.freeze({
  send_to: 'AW-18156258081/SXGYCK_VlrEcEKGGytFD',
  value: 1,
  currency: 'USD',
})
