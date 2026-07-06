import type { VeloraLang } from "@/lib/velora-voice";
import type { AdTemplateId } from "@/lib/ad-templates";

export const AD_STYLES = [
  {
    id: "luxury" as AdTemplateId,
    label: "Luxury",
    description: "Gold & black premium look",
  },
  {
    id: "minimal" as AdTemplateId,
    label: "Minimal",
    description: "Clean white, elegant spacing",
  },
  {
    id: "festival" as AdTemplateId,
    label: "Festival",
    description: "Warm festive sale vibe",
  },
  {
    id: "grocery" as AdTemplateId,
    label: "Grocery",
    description: "Fresh green, food & essentials",
  },
  {
    id: "fashion" as AdTemplateId,
    label: "Fashion",
    description: "Editorial blush & rose tones",
  },
  {
    id: "electronics" as AdTemplateId,
    label: "Electronics",
    description: "Tech blue, bold & modern",
  },
];

export const AD_PURPOSES = [
  {
    id: "festival",
    label: "Festival offer",
    description: "Diwali, Rakhi, seasonal sale",
  },
  {
    id: "launch",
    label: "New product launch",
    description: "Highlight something new",
  },
  {
    id: "clearance",
    label: "Clearance / sale",
    description: "Discount or stock clear",
  },
  {
    id: "daily",
    label: "Everyday promo",
    description: "Regular shop promotion",
  },
];

export const AD_OFFERS = [
  { id: "20off", label: "20% OFF", badge: "20% OFF" },
  { id: "15off", label: "15% OFF", badge: "15% OFF" },
  { id: "10off", label: "10% OFF", badge: "10% OFF" },
  { id: "bestseller", label: "Best Seller", badge: "BEST SELLER" },
  { id: "newarrival", label: "New Arrival", badge: "NEW ARRIVAL" },
  { id: "freeship", label: "Free delivery", badge: "FREE DELIVERY" },
  { id: "none", label: "No offer badge", badge: "" },
];

export const AD_CTAS = [
  { id: "whatsapp", label: "Order on WhatsApp", text: "Order on WhatsApp" },
  { id: "shop", label: "Shop now", text: "Shop Now" },
  { id: "dm", label: "DM to order", text: "DM to Order" },
  { id: "call", label: "Call us", text: "Call Now" },
];

export type AdChoices = {
  mode: "ad";
  lang?: VeloraLang;
  templateId?: AdTemplateId;
  purposeId?: string;
  offerId?: string;
  ctaId?: string;
  headlineMode?: "ai" | "custom";
  headline?: string;
  messageMode?: "ai" | "custom" | "short";
  subheadline?: string;
  backgroundId?: string;
  customBackgroundPrompt?: string;
};

export function getStyleLabel(templateId?: string): string {
  return AD_STYLES.find((s) => s.id === templateId)?.label ?? "Minimal";
}

export function getOfferBadge(offerId?: string): string {
  return AD_OFFERS.find((o) => o.id === offerId)?.badge ?? "20% OFF";
}

export function getCtaText(ctaId?: string): string {
  return AD_CTAS.find((c) => c.id === ctaId)?.text ?? "Order on WhatsApp";
}

export function getPurposeLabel(purposeId?: string): string {
  return AD_PURPOSES.find((p) => p.id === purposeId)?.label ?? "Shop promotion";
}
