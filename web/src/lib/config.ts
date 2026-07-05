/** Business rules for Velora Studio plans and free tier. */

export const FREE_IMAGES = 2;

export const PLANS = {
  starter: {
    id: "starter",
    name: "Starter",
    priceInr: 999,
    studioCredits: 40,
    adCredits: 3,
  },
  growth: {
    id: "growth",
    name: "Growth",
    priceInr: 1799,
    studioCredits: 80,
    adCredits: 10,
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceInr: 2999,
    studioCredits: 150,
    adCredits: 20,
  },
} as const;

export type PlanId = keyof typeof PLANS;

export type GenerationType = "studio" | "ad";

/** Background / vibe options shown as WhatsApp buttons. */
export const BACKGROUNDS = [
  { id: "marble", label: "Marble", prompt: "elegant white marble surface" },
  { id: "wood", label: "Wood", prompt: "warm natural wood table" },
  { id: "studio", label: "Soft studio", prompt: "clean soft studio backdrop" },
  { id: "sunlight", label: "Bright sunlight", prompt: "bright natural sunlight scene" },
] as const;
