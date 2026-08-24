import { Order } from '../types';

/**
 * Generates a short, secure, non-sequential alphanumeric token (6 to 8 chars).
 * Omits ambiguous characters like 0, O, I, l, 1 to prevent reading confusion.
 */
export function generateConfirmationToken(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  let token = '';
  const length = 6;
  const randomValues = new Uint8Array(length);
  
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randomValues);
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
 * Builds the full public shipment confirmation URL
 */
export function getConfirmationUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://delixa.app';
  return `${origin}/s/${token}`;
}

/**
 * Generates the friendly, structured Arabic WhatsApp message for customer confirmation
 */
export function generateWhatsAppConfirmationMessage(params: {
  order: Order;
  merchantName: string;
  companyName: string;
}): string {
  const { order, merchantName, companyName } = params;
  const confirmationUrl = getConfirmationUrl(order.confirmation_token);
  
  const formattedDate = order.delivery_date || 'اليوم';
  const timeWindow = (order.delivery_from && order.delivery_to)
    ? `من ${order.delivery_from} إلى ${order.delivery_to}`
    : 'خلال ساعات العمل';

  return `🚚 *أهلاً بك يا فندم،*
لديك طلب جديد من *${merchantName}* جاهز للتوصيل.

📦 *رقم الشحنة:* #${order.order_number}
💰 *المبلغ المطلوب عند الاستلام:* ${Number(order.cod_amount).toLocaleString()} جنيه
📅 *موعد التوصيل المحدد:* ${formattedDate}
🕐 *نافذة التوصيل:* ${timeWindow}

يرجى الدخول على الرابط التالي لتأكيد استلام الشحنة في الموعد المحدد، أو اختيار موعد آخر يناسبك، أو إلغاء الطلب:
🔗 ${confirmationUrl}

شكرًا لتعاونكم مع *${companyName}*.`;
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
