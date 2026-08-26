import { Order } from '../types';

/**
 * Generates a short, cryptographically secure, URL-safe alphanumeric token (8 to 10 chars).
 * Omits easily confused characters like 0, O, I, l, 1.
 */
export function generateConfirmationToken(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  const length = 8;
  const randomValues = new Uint8Array(length);
  let token = '';

  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      token += chars[randomValues[i] % chars.length];
    }
  } else if (typeof globalThis !== 'undefined' && (globalThis as any).crypto && (globalThis as any).crypto.getRandomValues) {
    (globalThis as any).crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      token += chars[randomValues[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return token;
}

/**
 * Normalizes Egyptian phone numbers into international format (201XXXXXXXXX)
 * Supports inputs like '01012345678', '+201012345678', '011 2345 6789', '201234567890'
 */
export function normalizeEgyptianPhone(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 002, strip 00
  if (cleaned.startsWith('002')) {
    cleaned = cleaned.substring(2);
  }
  
  // If starts with Egyptian country code 20
  if (cleaned.startsWith('20') && cleaned.length >= 12) {
    return cleaned;
  }
  
  // If starts with leading 0 (e.g., 010, 011, 012, 015)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '2' + cleaned;
  }
  
  // If starts directly with 1 (e.g. 1012345678)
  if (cleaned.startsWith('1') && cleaned.length === 10) {
    return '20' + cleaned;
  }
  
  return cleaned;
}

/**
 * Returns the public application URL base using environment variables or browser origin.
 */
export function getPublicAppBaseUrl(): string {
  // 1. Check Vite frontend environment variables
  try {
    const viteUrl = (import.meta as any)?.env?.VITE_PUBLIC_APP_URL || (import.meta as any)?.env?.VITE_APP_URL;
    if (viteUrl && typeof viteUrl === 'string' && viteUrl.trim()) {
      return viteUrl.trim().replace(/\/+$/, '');
    }
  } catch (_) {}

  // 2. Check Node / Server environment variables
  if (typeof process !== 'undefined' && process.env) {
    const procUrl = process.env.VITE_PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || process.env.APP_URL;
    if (procUrl && typeof procUrl === 'string' && procUrl.trim()) {
      return procUrl.trim().replace(/\/+$/, '');
    }
  }

  // 3. Fallback to active browser origin
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  return '';
}

/**
 * Builds the full public shipment confirmation URL (/c/:token)
 */
export function getConfirmationUrl(token: string): string {
  const base = getPublicAppBaseUrl();
  const cleanToken = (token || '').trim();
  return base ? `${base}/c/${cleanToken}` : `/c/${cleanToken}`;
}

/**
 * Generates the clean, customer-friendly Arabic WhatsApp message for customer confirmation
 */
export function generateWhatsAppConfirmationMessage(params: {
  order: Order;
  merchantName: string;
  companyName?: string;
}): string {
  const { order, merchantName } = params;
  const token = order.confirmation_token || (order as any).token || order.id;
  const confirmationUrl = getConfirmationUrl(token);
  const customerName = order.customer_name?.trim() || 'عزيزي العميل';
  const amount = Number(order.cod_amount || 0).toLocaleString();

  return `مرحباً ${customerName} 👋

لديك شحنة من *${merchantName}* بقيمة *${amount}* جنيه.

يمكنك تأكيد استلام الشحنة أو تأجيلها أو إلغاء الطلب من خلال الرابط التالي:

${confirmationUrl}

الرابط خاص بشحنتك فقط.`;
}

/**
 * Builds the direct WhatsApp Click-to-Chat URL
 */
export function buildWhatsAppClickUrl(phone: string, text: string): string {
  const normalizedPhone = normalizeEgyptianPhone(phone);
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${normalizedPhone}?text=${encodedText}`;
}

/**
 * Triggers WhatsApp Click-to-Chat in a new window/tab
 */
export function openWhatsAppChat(phone: string, text: string): boolean {
  const url = buildWhatsAppClickUrl(phone, text);
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  }
  return false;
}

