export type Customer = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  user_type: string;
  organ_model: string | null;
  subscription_tier: string;
  created_at: string;
};

export type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  notes: string | null;
  created_at: string;
};

export type Supplier = {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  category: string;
  is_active: boolean;
  payment_notes: string | null;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "done";
  priority: "low" | "normal" | "high" | "urgent";
  due_date: string | null;
  related_customer_id: string | null;
  related_lead_id: string | null;
  created_at: string;
};

export const ORGAN_MODELS = [
  "Korg PA5X",
  "Korg PA4X",
  "Korg PA1000",
  "Yamaha Genos",
  "Yamaha PSR-SX900",
  "Roland",
  "אחר",
];
