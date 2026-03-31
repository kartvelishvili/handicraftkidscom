// ============================================================
// BOG (Bank of Georgia) Payment Integration
// API Docs: https://api.bog.ge/docs/en/payments/introduction
// ============================================================
import crypto from 'crypto';

const BOG_TOKEN_URL = 'https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token';
const BOG_ORDERS_URL = 'https://api.bog.ge/payments/v1/ecommerce/orders';
const BOG_RECEIPT_URL = 'https://api.bog.ge/payments/v1/receipt';

const CLIENT_ID = process.env.BOG_CLIENT_ID || '10007071';
const CLIENT_SECRET = process.env.BOG_CLIENT_SECRET || 'DhnwBS48pcvk';

// BOG public key for verifying callback signatures (SHA256withRSA)
const BOG_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu4RUyAw3+CdkS3ZNILQh
zHI9Hemo+vKB9U2BSabppkKjzjjkf+0Sm76hSMiu/HFtYhqWOESryoCDJoqffY0Q
1VNt25aTxbj068QNUtnxQ7KQVLA+pG0smf+EBWlS1vBEAFbIas9d8c9b9sSEkTrr
TYQ90WIM8bGB6S/KLVoT1a7SnzabjoLc5Qf/SLDG5fu8dH8zckyeYKdRKSBJKvhx
tcBuHV4f7qsynQT+f2UYbESX/TLHwT5qFWZDHZ0YUOUIvb8n7JujVSGZO9/+ll/g
4ZIWhC1MlJgPObDwRkRd8NFOopgxMcMsDIZIoLbWKhHVq67hdbwpAq9K9WMmEhPn
PwIDAQAB
-----END PUBLIC KEY-----`;

// Token cache
let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Get OAuth2 Bearer token (cached until expires)
 */
export async function getBogToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  const res = await fetch(BOG_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`BOG auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // Expire 60 seconds early to be safe
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

/**
 * Create a BOG payment order
 * @param {Object} params
 * @param {string} params.orderId - Our internal order ID
 * @param {number} params.totalAmount - Total in GEL
 * @param {Array} params.cartItems - Cart items [{id, name, price, quantity, image_url}]
 * @param {Object} params.buyer - {fullName, email, phone}
 * @param {string} params.callbackUrl - HTTPS callback URL for webhook
 * @param {string} params.successUrl - Redirect URL on success
 * @param {string} params.failUrl - Redirect URL on failure
 */
export async function createBogOrder({
  orderId, totalAmount, cartItems, buyer,
  callbackUrl, successUrl, failUrl,
}) {
  const token = await getBogToken();

  const basket = cartItems.map(item => ({
    product_id: String(item.id),
    description: item.name || 'Product',
    quantity: item.quantity || 1,
    unit_price: Number(item.price),
    image: item.image_url || undefined,
  }));

  const body = {
    callback_url: callbackUrl,
    external_order_id: String(orderId),
    purchase_units: {
      currency: 'GEL',
      total_amount: Number(totalAmount),
      basket,
    },
    redirect_urls: {
      success: successUrl,
      fail: failUrl,
    },
    payment_method: ['card'],
    buyer: {
      full_name: buyer.fullName || undefined,
      masked_email: buyer.email || undefined,
      masked_phone: buyer.phone || undefined,
    },
  };

  const res = await fetch(BOG_ORDERS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept-Language': 'ka',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`BOG create order failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Get payment details from BOG
 */
export async function getBogPaymentDetails(bogOrderId) {
  const token = await getBogToken();

  const res = await fetch(`${BOG_RECEIPT_URL}/${bogOrderId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`BOG get details failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Verify BOG callback signature (SHA256withRSA)
 * @param {string} rawBody - Raw request body string (before JSON parsing)
 * @param {string} signature - Callback-Signature header value (base64)
 * @returns {boolean}
 */
export function verifyBogCallback(rawBody, signature) {
  if (!signature) return false;
  try {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(rawBody);
    return verifier.verify(BOG_PUBLIC_KEY, signature, 'base64');
  } catch {
    return false;
  }
}
