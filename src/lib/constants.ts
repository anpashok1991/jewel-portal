export const ROLES = ["SUPER_ADMIN", "OWNER", "STAFF", "CUSTOMER"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSION_MODULES = [
  "dashboard",
  "products",
  "orders",
  "customers",
  "inventory",
  "queries",
  "appointments",
  "reports",
  "schemes",
  "coupons",
  "staff",
  "branches",
  "settings",
  "popups",
  "media",
  "bot",
] as const;
export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export type Action = "view" | "create" | "edit" | "delete";

/** Master platform feature list — super admin can grant/block per shop. */
export const FEATURE_LIST = [
  { key: "storefront", label: "Online storefront" },
  { key: "ecommerce", label: "E-commerce (cart & checkout)" },
  { key: "invoices_gst", label: "GST invoices & estimates" },
  { key: "cod", label: "Cash on delivery" },
  { key: "razorpay", label: "Razorpay online payments" },
  { key: "upi_qr", label: "Dynamic UPI QR payments" },
  { key: "coupons", label: "Coupons & discounts" },
  { key: "giftcards", label: "Gift cards" },
  { key: "loyalty", label: "Loyalty points" },
  { key: "schemes", label: "Savings schemes (ROI + Gold)" },
  { key: "appointments", label: "Appointment booking" },
  { key: "exchange", label: "Old gold exchange" },
  { key: "popups", label: "Offer popups" },
  { key: "whatsapp", label: "WhatsApp connect" },
  { key: "sambot", label: "Sam Bot chatbot" },
  { key: "multi_branch", label: "Multi-branch & inventory" },
  { key: "reports", label: "Reports & P&L dashboard" },
  { key: "reviews", label: "Reviews & ratings" },
  { key: "wishlists", label: "Wishlists" },
  { key: "3d_theme", label: "3D animated themes" },
] as const;
export type FeatureKey = (typeof FEATURE_LIST)[number]["key"];

export const ORDER_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
  "REFUNDED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["RETURN_REQUESTED"],
  CANCELLED: ["REFUNDED"],
  RETURN_REQUESTED: ["RETURNED", "DELIVERED"],
  RETURNED: ["REFUNDED"],
  REFUNDED: [],
};

/** Customer can cancel while in these states. */
export const CUSTOMER_CANCELLABLE: OrderStatus[] = ["PLACED", "CONFIRMED"];

/** purity → fineness in parts-per-thousand */
export const PURITY_FINENESS: Record<string, number> = {
  "24K": 999,
  "22K": 916,
  "18K": 750,
  "14K": 585,
  "925": 925,
  "999": 999,
  "916": 916,
  "750": 750,
};

export const METALS = ["GOLD", "SILVER", "PLATINUM", "DIAMOND", "GEMSTONE"] as const;

export const SAMBOT_NAME = "Sam Bot";

/** 7 assignable theme keys (seeded in DB) */
export const THEME_KEYS = [
  "royal-gold",
  "ivory-heritage",
  "noir-diamond",
  "emerald-classic",
  "rose-blush",
  "ocean-platinum",
  "festive-marigold",
] as const;

export const SLOTS = [
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
];
