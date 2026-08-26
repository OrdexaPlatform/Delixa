export type UserRole = 'admin' | 'courier';

export type CourierStatus = 'active' | 'inactive';
export type MerchantStatus = 'active' | 'inactive';
export type OrderStatus = 'pending' | 'assigned' | 'out_for_delivery' | 'delivered' | 'failed' | 'cancelled';

export type CustomerResponseStatus = 'pending' | 'confirmed' | 'reschedule_requested' | 'cancelled';

export type ReturnStatus = 'created' | 'with_courier' | 'returned' | 'cancelled';

export type ReturnReason = 
  | 'customer_refused'
  | 'wrong_address'
  | 'customer_unavailable'
  | 'damaged_shipment'
  | 'customer_cancellation'
  | 'merchant_request'
  | 'other';

export type DeliveryFailureReason = 
  | 'customer_unavailable'
  | 'customer_no_answer'
  | 'wrong_phone'
  | 'wrong_address'
  | 'customer_refused'
  | 'customer_requested_reschedule'
  | 'other';

export type Language = 'ar' | 'en';

export type PricingModel = 'unified' | 'governorate';

export interface ShippingPricingSettings {
  pricing_model: PricingModel;
  default_shipping_fee: number;
  governorate_rates: Record<string, number>;
}

export interface DeliverySlot {
  id: string;
  name: string;
  from_time: string;
  to_time: string;
  is_active: boolean;
}

export type DateFilterOption = 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'custom';

export interface Company {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  logo_url?: string;
  delivery_slots?: DeliverySlot[];
  shipping_pricing?: ShippingPricingSettings;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  auth_user_id: string;
  company_id: string;
  full_name: string;
  phone: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Courier {
  id: string;
  company_id: string;
  profile_id: string;
  employee_id: string;
  full_name: string;
  phone: string;
  area: string;
  status: CourierStatus;
  password?: string; // Stored hashed/secured for courier authentication
  created_at: string;
  updated_at: string;
}

export interface Merchant {
  id: string;
  company_id: string;
  store_name: string;
  owner_name: string;
  brand_name?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address: string;
  logo_url?: string;
  notes?: string;
  status: MerchantStatus;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  company_id: string;
  merchant_id: string;
  courier_id?: string | null;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  governorate?: string;
  city_area?: string;
  customer_address: string;
  customer_landmark?: string;
  cod_amount: number;
  shipping_fee?: number;
  delivery_date: string;
  delivery_from: string;
  delivery_to: string;
  notes?: string;
  status: OrderStatus;
  
  // Operational Delivery Timestamps & Actors (Prompt 4)
  assigned_at?: string;
  delivery_started_at?: string;
  delivered_at?: string;
  delivered_by?: string;
  delivered_by_courier_id?: string;
  failed_at?: string;
  failed_by?: string;
  failure_reason?: DeliveryFailureReason | string;
  failure_note?: string;
  failure_notes?: string;
  
  // Customer Confirmation Fields (Prompt 3 & 4 & Link Analytics)
  confirmation_token: string;
  confirmation_token_expires_at?: string;
  confirmation_sent_at?: string;
  whatsapp_sent_at?: string;
  link_opened_at?: string;
  last_link_opened_at?: string;
  link_open_count?: number;
  customer_response_status: CustomerResponseStatus;
  customer_responded_at?: string;
  customer_selected_date?: string;
  customer_selected_from?: string;
  customer_selected_to?: string;
  customer_note?: string;
  customer_cancellation_reason?: string;
  customer_reschedule_date?: string;
  customer_reschedule_window?: string;
  customer_reschedule_note?: string;
  cancellation_source?: 'customer' | 'admin' | 'merchant';
  cancellation_timestamp?: string;

  created_at: string;
  updated_at: string;
}

export interface PublicShipmentMerchant {
  store_name: string;
  brand_name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  logo_url?: string | null;
}

export interface PublicShipmentCompany {
  name: string;
  phone?: string | null;
}

export interface PublicShipmentView {
  token: string;
  order_number: string;
  status: OrderStatus;
  customer_name: string;
  customer_phone?: string;
  customer_address: string;
  city_area?: string;
  governorate?: string;
  customer_landmark?: string;
  cod_amount: number;
  shipping_fee?: number;
  delivery_date: string;
  delivery_from: string;
  delivery_to: string;
  customer_response_status: CustomerResponseStatus;
  customer_responded_at?: string;
  customer_selected_date?: string;
  customer_selected_from?: string;
  customer_selected_to?: string;
  customer_note?: string;
  customer_cancellation_reason?: string;
  created_at: string;
  link_opened_at?: string;
  last_link_opened_at?: string;
  link_open_count?: number;
  merchant?: PublicShipmentMerchant | null;
  company?: PublicShipmentCompany | null;
}

export type ReturnCostPayer = 'customer' | 'merchant' | 'none';

export interface ReturnRecord {
  id: string;
  company_id: string;
  order_id: string;
  merchant_id: string;
  courier_id?: string | null;
  return_number: string;
  customer_name: string;
  customer_phone: string;
  return_address: string;
  return_amount: number;
  return_shipping_cost: number;
  other_cost: number;
  total_return_amount: number;
  
  // Who pays the return cost logic
  return_cost_payer?: ReturnCostPayer;
  refundable_amount?: number;
  return_cost_amount?: number;
  customer_net_refund?: number;
  merchant_charge_amount?: number;

  return_reason: ReturnReason;
  other_reason?: string;
  notes?: string;
  status: ReturnStatus;
  returned_at?: string;
  returned_by?: string;
  returned_by_courier_id?: string;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export type MerchantTransactionType = 
  | 'CREDIT_TO_MERCHANT'
  | 'DEBIT_FROM_MERCHANT'
  | 'RETURN_COST'
  | 'SHIPPING_CHARGE'
  | 'MERCHANT_SETTLEMENT'
  | 'MERCHANT_DEBT_PAYMENT'
  | 'MANUAL_ADJUSTMENT';

export interface MerchantTransaction {
  id: string;
  company_id: string;
  merchant_id: string;
  transaction_type: MerchantTransactionType;
  type?: 'credit' | 'debit';
  direction: 'credit' | 'debit'; // credit increases amount due, debit increases debt / reduces amount due
  amount: number;
  category?: 'order_delivered' | 'return_fee' | 'payout' | 'charge' | 'adjustment' | string;
  balance_after_due?: number;
  balance_after_debt?: number;
  running_balance?: number;
  reference_type: 'order' | 'return' | 'settlement' | 'manual' | 'shipping_charge';
  reference_id?: string;
  order_id?: string;
  order_number?: string;
  return_id?: string;
  return_number?: string;
  settlement_id?: string;
  settlement_number?: string;
  description: string;
  created_by: string;
  created_at: string;
}

export type MerchantSettlementType = 'payout_to_merchant' | 'debt_collection' | 'net_settlement';

export interface MerchantSettlement {
  id: string;
  company_id: string;
  merchant_id: string;
  settlement_number: string;
  settlement_type: MerchantSettlementType;
  type?: string;
  amount?: number;
  expected_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_method?: 'cash' | 'bank_transfer' | 'vodafone_cash' | 'instapay' | 'cheque' | string;
  reference_number?: string;
  settlement_date?: string;
  settled_by: string;
  created_by?: string;
  settled_by_profile_id?: string;
  notes?: string;
  created_at: string;
}

export interface MerchantFinancialSummary {
  merchant_id: string;
  merchant: Merchant;
  amount_due_to_merchant: number;
  merchant_debt_to_company: number;
  net_position: number;
  net_balance: number;
  total_cod_earned: number;
  total_delivered_orders: number;
  total_returns_debited: number;
  total_settled_paid: number;
  total_orders_count: number;
  total_orders?: number;
  delivered_orders_count: number;
  returns_count: number;
  settlements_count: number;
  transactions_count: number;
  last_settlement_date: string | null;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  return_id?: string;
  company_id: string;
  event_type: 
    | 'order_assigned'
    | 'assigned'
    | 'courier_assigned'
    | 'out_for_delivery'
    | 'link_generated'
    | 'whatsapp_sent'
    | 'link_opened'
    | 'customer_confirmed'
    | 'customer_rescheduled'
    | 'customer_cancelled'
    | 'delivery_started'
    | 'delivered'
    | 'delivery_failed'
    | 'failed'
    | 'cancelled'
    | 'status_changed'
    | 'created'
    | 'settlement_created'
    | 'return_created'
    | 'return_updated'
    | 'return_courier_assigned'
    | 'return_started'
    | 'return_completed'
    | 'return_cancelled';
  timestamp: string;
  created_at?: string;
  actor: 'customer' | 'admin' | 'courier' | 'system';
  actor_type?: 'customer' | 'admin' | 'courier' | 'system';
  actor_id?: string;
  actor_name?: string;
  details?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface CourierSettlement {
  id: string;
  company_id: string;
  courier_id: string;
  settlement_number: string;
  expected_amount: number;
  received_amount: number;
  remaining_amount: number;
  settled_by: string;
  settled_by_profile_id?: string;
  notes?: string;
  created_at: string;
}

export interface CourierCollectionSummary {
  courier_id: string;
  courier: Courier;
  total_delivered_cod: number;
  total_settled_amount: number;
  current_outstanding_balance: number;
  delivered_cod_orders_count: number;
  delivered_cod_orders: Order[];
  settlements_count: number;
  last_settlement_date: string | null;
}

export type SessionMode = 'demo' | 'production';

export interface CourierSession {
  courier_id: string;
  company_id: string;
  employee_id: string;
  full_name: string;
  phone: string;
  role: 'courier';
  mode: SessionMode;
  company: Company;
  courier: Courier;
}

export interface AdminSession {
  admin_id: string;
  company_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'admin';
  mode: SessionMode;
  company: Company;
  profile: Profile;
  user: {
    id: string;
    email: string;
  };
}

export interface AuthSession {
  mode: SessionMode;
  user: {
    id: string;
    email: string;
  };
  profile: Profile;
  company: Company;
  courier?: Courier; // populated if role is courier
  courier_id?: string;
  employee_id?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

export type NotificationType =
  | 'order_created'
  | 'order_assigned'
  | 'customer_confirmed'
  | 'customer_rescheduled'
  | 'customer_cancelled'
  | 'delivery_started'
  | 'delivered'
  | 'delivery_failed'
  | 'return_created'
  | 'return_assigned'
  | 'return_completed'
  | 'return_cancelled'
  | 'general';

export interface AppNotification {
  id: string;
  company_id: string;
  recipient_role?: 'admin' | 'courier' | 'all';
  recipient_courier_id?: string | null;
  recipient_user_id?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  order_id?: string;
  order_number?: string;
  return_id?: string;
  return_number?: string;
  read: boolean;
  is_read?: boolean;
  created_at: string;
}



