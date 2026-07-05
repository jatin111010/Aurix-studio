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

/** Studio output style — scene with AI background, or transparent die-cut PNG. */
export type StudioStyle = "scene" | "diecut";

export const STUDIO_STYLE_SCENE: StudioStyle = "scene";
export const STUDIO_STYLE_DIECUT: StudioStyle = "diecut";

/** Sentinel id when the merchant types their own scene description. */
export const BACKGROUND_CUSTOM_ID = "custom" as const;

/** Preset backgrounds for studio shots and ad product photos (max 9 + custom = 10 WhatsApp list rows). */
export const BACKGROUNDS = [
  { id: "marble", label: "Marble", prompt: "elegant white marble surface" },
  { id: "wood", label: "Wood", prompt: "warm natural wood table" },
  { id: "studio", label: "Soft studio", prompt: "clean soft studio backdrop" },
  { id: "sunlight", label: "Bright sunlight", prompt: "bright natural sunlight scene" },
  {
    id: "luxury",
    label: "Dark luxury",
    prompt: "dark black marble surface, premium luxury mood",
  },
  {
    id: "pastel",
    label: "Pastel blush",
    prompt: "soft blush pink backdrop, feminine elegant",
  },
  {
    id: "concrete",
    label: "Modern concrete",
    prompt: "modern grey concrete texture, urban minimalist",
  },
  {
    id: "nature",
    label: "Green nature",
    prompt: "fresh green leaves and plants, outdoor natural light",
  },
  {
    id: "festive",
    label: "Festive lights",
    prompt: "warm golden diwali fairy lights bokeh background",
  },
] as const;

export const CUSTOM_BACKGROUND_CHOICE = {
  id: BACKGROUND_CUSTOM_ID,
  label: "My own idea",
  description: "Describe your own scene in your words",
} as const;
