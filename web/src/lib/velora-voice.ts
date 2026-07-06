/** Velora Studio WhatsApp persona — warm salesperson, not a robot. */

export type VeloraLang = "en" | "hi" | "hinglish";

export const DEFAULT_LANG: VeloraLang = "hinglish";

export function isVeloraLang(value: unknown): value is VeloraLang {
  return value === "en" || value === "hi" || value === "hinglish";
}

/** Guess language from what the customer typed. */
export function detectLanguage(text: string): VeloraLang | null {
  const trimmed = text.trim();
  if (/[\u0900-\u097F]/.test(trimmed)) return "hi";

  const lower = trimmed.toLowerCase();
  const hinglishHints = [
    "namaste",
    "namaskar",
    "kya",
    "hai",
    "hain",
    "aap",
    "mujhe",
    "bhejo",
    "bhej",
    "photo",
    "accha",
    "achha",
    "theek",
    "haan",
    "han",
    "nahi",
    "nahin",
    "kaise",
    "kitna",
    "chahiye",
    "karo",
    "karna",
    "bhai",
    "didi",
    "ji",
    "pls",
    "plz",
  ];

  if (hinglishHints.some((w) => lower.includes(w))) return "hinglish";
  return null;
}

export function langLabel(lang: VeloraLang): string {
  if (lang === "hi") return "हिंदी";
  if (lang === "hinglish") return "Hinglish";
  return "English";
}

export function openAiLanguageInstruction(lang: VeloraLang): string {
  if (lang === "hi") {
    return "Write headline and subheadline in Hindi (Devanagari script). Warm, local shop tone.";
  }
  if (lang === "hinglish") {
    return "Write headline and subheadline in natural Hinglish (Hindi + English mix, Roman script). Sound like a friendly WhatsApp message to Indian customers — not formal, not corporate.";
  }
  return "Write headline and subheadline in simple English for Indian shop customers. Warm and local — not US marketing speak.";
}

type Vars = Record<string, string | number | undefined>;

function fill(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`,
  );
}

const COPY = {
  ask_language: {
    en: "Quick one before we start — which language feels most comfortable for you?",
    hi: "शुरू करने से पहले एक छोटा सवाल — आप किस भाषा में बात करना पसंद करेंगे?",
    hinglish:
      "Shuru karne se pehle ek quick sawaal — aap kis language mein comfortable ho?",
  },
  photo_received: {
    en: "Nice photo — got it! 📸\n\nI'm here from *Velora Studio*. I'll help you turn this into a clean product image or a social ad. Just a few easy taps, nothing complicated.",
    hi: "बहुत अच्छी फोटो — मिल गई! 📸\n\nमैं *Velora Studio* से हूँ। इसे professional studio shot या social ad में बदलने में मदद करूँगी — बस कुछ आसान चुनाव।",
    hinglish:
      "Photo aa gayi — bahut acchi hai! 📸\n\nMain *Velora Studio* se hoon. Isko clean studio shot ya social ad banane mein help karungi — bas kuch easy taps, zyada detail nahi.",
  },
  ask_mode: {
    en: "What would you like to make today?",
    hi: "आज आप क्या बनाना चाहेंगे?",
    hinglish: "Aaj aap kya banana chahenge?",
  },
  ask_studio_style: {
    en: "For the studio shot — do you want a nice background scene, or a clean cut-out (transparent PNG)?",
    hi: "Studio shot के लिए — background scene चाहिए या साफ cut-out (transparent PNG)?",
    hinglish:
      "Studio shot ke liye — background scene chahiye ya clean cut-out (transparent PNG)?",
  },
  ask_studio_background: {
    en: "Which background vibe suits your product? Pick one — or describe your own idea at the end.",
    hi: "आपके product के लिए कौन सा background ठीक रहेगा? एक चुनें — या आखिर में अपना idea लिख सकते हैं।",
    hinglish:
      "Aapke product ke liye kaun sa background theek rahega? Ek pick karo — ya last mein apna idea bhi likh sakte ho.",
  },
  ask_custom_background: {
    en: "Tell me the scene you have in mind — one short line is enough.\n\nFor example: *wooden kitchen counter* or *soft blue minimalist backdrop*",
    hi: "जो scene सोचा है, एक छोटी लाइन में बता दीजिए।\n\nजैसे: *लकड़ी की किचन काउंटर* या *हल्का नीला minimal backdrop*",
    hinglish:
      "Jo scene dimaag mein hai, ek short line mein bata do.\n\nJaise: *wooden kitchen counter* ya *soft blue minimalist backdrop*",
  },
  studio_generating: {
    en: "Perfect — I'm working on your studio shot now. Give me about 15–30 seconds ⏳",
    hi: "बढ़िया — आपका studio shot बना रही हूँ। लगभग 15–30 सेकंड ⏳",
    hinglish: "Theek hai — studio shot bana rahi hoon. 15–30 second lagenge ⏳",
  },
  diecut_generating: {
    en: "On it — creating your die-cut (transparent PNG). About 10–20 seconds ⏳",
    hi: "ठीक है — die-cut (transparent PNG) बना रही हूँ। लगभग 10–20 सेकंड ⏳",
    hinglish: "Chal raha hai — die-cut PNG bana rahi hoon. 10–20 second ⏳",
  },
  ad_start: {
    en: "Lovely — let's design your ad together. I'll ask a few simple things (just tap the options). You stay in control.",
    hi: "बढ़िया — चलिए आपका ad साथ में बनाते हैं। कुछ आसान सवाल पूछूँगी — बस option tap करें।",
    hinglish:
      "Badhiya — chalo aapka ad saath mein banate hain. Kuch easy sawaal poochungi — bas option tap karna. Aap control mein rahoge.",
  },
  ad_style: {
    en: "First — what *look* should your ad have?",
    hi: "पहले — ad का *look* कैसा हो?",
    hinglish: "Pehle — ad ka *look* kaisa chahiye?",
  },
  ad_purpose: {
    en: "Got it. What's this ad mainly *about*?",
    hi: "ठीक है। यह ad मुख्य रूप से *किस बारे में* है?",
    hinglish: "Theek hai. Yeh ad mainly *kis baare mein* hai?",
  },
  ad_offer: {
    en: "Should we show an *offer* on the image?",
    hi: "क्या image पर कोई *offer* दिखाएँ?",
    hinglish: "Image par koi *offer* dikhayein?",
  },
  ad_cta: {
    en: "When customers see the ad — how should they *reach you*? (button text)",
    hi: "ग्राहक ad देखें — तो आप तक *कैसे पहुँचें*? (बटन पर लिखावट)",
    hinglish: "Customer ad dekhe — to aap tak *kaise aayein*? (button text)",
  },
  ad_headline_mode: {
    en: "For the big *headline* on top — should I write it, or do you have your own line?",
    hi: "ऊपर की *headline* — मैं लिखूँ या आपकी अपनी लाइन है?",
    hinglish: "Upar wali *headline* — main likhun ya aapki apni line hai?",
  },
  ad_headline_text: {
    en: "Type your headline — one short line is perfect.\n\nExample: *GroAurum Raisins — Farm Fresh*",
    hi: "अपनी headline लिखें — एक छोटी लाइन काफी है।\n\nउदाहरण: *GroAurum Kishmish — ताज़ा quality*",
    hinglish:
      "Apni headline likho — ek short line kaafi hai.\n\nExample: *GroAurum Raisins — farm fresh quality*",
  },
  ad_message_mode: {
    en: "Under the headline — what *message* should customers read?",
    hi: "Headline के नीचे — ग्राहकों को क्या *message* पढ़ना चाहिए?",
    hinglish: "Headline ke neeche — customer ko kya *message* padhna chahiye?",
  },
  ad_message_text: {
    en: "Type that message in one line.\n\nExample: *Free delivery today — order on WhatsApp*",
    hi: "वह message एक लाइन में लिखें।\n\nउदाहरण: *आज free delivery — WhatsApp पर order करें*",
    hinglish:
      "Woh message ek line mein likho.\n\nExample: *Aaj free delivery — WhatsApp par order karo*",
  },
  ad_background: {
    en: "Almost done! Pick a *background* for your product photo in the ad.",
    hi: "लगभग हो गया! Ad में product photo के लिए *background* चुनें।",
    hinglish: "Almost done! Ad mein product photo ke liye *background* pick karo.",
  },
  ad_custom_background: {
    en: "Describe the background scene for your ad — short line is fine.\n\nExample: *Diwali lights and marigolds*",
    hi: "Ad के लिए background scene बताएँ — छोटी लाइन ठीक है।\n\nउदाहरण: *दिवाली lights और गेंदे*",
    hinglish:
      "Ad ke liye background scene batao — short line chalegi.\n\nExample: *Diwali lights aur marigold*",
  },
  ad_summary_title: {
    en: "*Quick check before I create your ad:*",
    hi: "*Ad बनाने से पहले एक बार देख लीजिए:*",
    hinglish: "*Ad banane se pehle ek baar dekh lo:*",
  },
  ad_confirm: {
    en: "Looks good? I can create it now, or we start fresh.",
    hi: "ठीक लग रहा है? अभी बना दूँ, या फिर से शुरू करें?",
    hinglish: "Theek lag raha hai? Abhi bana doon, ya fresh start?",
  },
  ad_generating: {
    en: "On it — designing your ad from your choices. About 20–40 seconds ⏳",
    hi: "ठीक है — आपके choices से ad बना रही हूँ। लगभग 20–40 सेकंड ⏳",
    hinglish: "Theek hai — aapke choices se ad bana rahi hoon. 20–40 second ⏳",
  },
  done_more: {
    en: "Done! Hope you like it 😊\n\nSend another product photo anytime.\n\n{quota}",
    hi: "हो गया! उम्मीद है पसंद आएगा 😊\n\nकभी भी दूसरी product photo भेज सकते हैं।\n\n{quota}",
    hinglish:
      "Ho gaya! Umeed hai pasand aayega 😊\n\nKabhi bhi aur product photo bhej sakte ho.\n\n{quota}",
  },
  welcome_back: {
    en: "Welcome back! Good to see you again 😊\n\n{quota}\n\nSend a product photo whenever you're ready.",
    hi: "वापसी पर स्वागत है! 😊\n\n{quota}\n\nजब चाहें product photo भेजें।",
    hinglish:
      "Welcome back! Phir se accha laga 😊\n\n{quota}\n\nJab ready ho, product photo bhej dena.",
  },
  welcome_new: {
    en: "Hi! I'm from *Velora Studio* — we help shops make professional product photos on WhatsApp.\n\n{quota}\n\nSend a product photo to start. Ad posts unlock with a plan.",
    hi: "नमस्ते! मैं *Velora Studio* से हूँ — shops के लिए professional product photos WhatsApp पर।\n\n{quota}\n\nशुरू करने के लिए product photo भेजें। Ad posts plan के साथ।",
    hinglish:
      "Namaste! Main *Velora Studio* se hoon — shops ke liye professional product photos WhatsApp par.\n\n{quota}\n\nShuru karne ke liye product photo bhejo. Ad posts plan ke saath unlock hote hain.",
  },
  welcome_paywall: {
    en: "Hi from Velora Studio!\n\n{quota}\n\nType *plans* when you're ready to subscribe.",
    hi: "Velora Studio से नमस्ते!\n\n{quota}\n\nSubscribe के लिए *plans* लिखें।",
    hinglish:
      "Velora Studio se namaste!\n\n{quota}\n\nSubscribe ke liye *plans* likho.",
  },
  paywall_studio: {
    en: "You've used your free studio images — no worries! Pick a plan and we'll keep going.",
    hi: "Free studio images खत्म हो गईं — कोई बात नहीं! Plan चुनें, आगे बढ़ते हैं।",
    hinglish:
      "Free studio images khatam ho gayi — koi baat nahi! Plan pick karo, aage badhte hain.",
  },
  paywall_ad: {
    en: "Social *ad posts* need ad credits (subscription). Free trial covers *studio shots* only.\n\nYou can subscribe for ads, or continue with a studio shot — your call.",
    hi: "Social *ad posts* के लिए ad credits (subscription) चाहिए। Free trial में सिर्फ *studio shots*।\n\nAds के लिए plan लें, या studio shot जारी रखें।",
    hinglish:
      "Social *ad posts* ke liye ad credits chahiye (subscription). Free trial mein sirf *studio shots*.\n\nAds ke liye plan lo, ya studio shot continue karo — aapki marzi.",
  },
  err_headline_short: {
    en: "Could you write a little more? At least 3 characters for the headline.",
    hi: "थोड़ा और लिखें — headline के लिए कम से कम 3 अक्षर।",
    hinglish: "Thoda aur likho — headline ke liye kam se kam 3 characters.",
  },
  err_message_short: {
    en: "A bit longer please — at least 3 characters for the message.",
    hi: "थोड़ा लंबा लिखें — message के लिए कम से कम 3 अक्षर।",
    hinglish: "Thoda lamba likho — message ke liye kam se kam 3 characters.",
  },
  err_scene_short: {
    en: "Just a few more words — describe the scene in at least 5 characters.",
    hi: "कुछ और शब्द — scene कम से कम 5 अक्षरों में।",
    hinglish: "Kuch aur words — scene kam se kam 5 characters mein.",
  },
  err_pick_option: {
    en: "Please tap one of the options above — that helps me get it right 🙂",
    hi: "ऊपर का कोई option tap करें — इससे सही बनेगा 🙂",
    hinglish: "Upar wala koi option tap karo — sahi banega 🙂",
  },
  err_generating_wait: {
    en: "Still working on your last image — just a moment please ⏳",
    hi: "पिछली image अभी बन रही है — एक पल रुकिए ⏳",
    hinglish: "Pichli image abhi ban rahi hai — ek second ⏳",
  },
  err_generation_failed: {
    en: "Sorry — that didn't work this time. No credit was used. Please send your product photo once more and we'll try again.",
    hi: "माफ़ कीजिए — इस बार नहीं बना। कोई credit नहीं कटा। Product photo फिर भेजें, फिर कोशिश करेंगे।",
    hinglish:
      "Sorry — is baar nahi bana. Koi credit nahi kata. Product photo dubara bhejo, phir try karenge.",
  },
  hint_balance: {
    en: "Type *balance* anytime to check credits, or *plans* for subscription.",
    hi: "Credits देखने के लिए *balance* लिखें, plan के लिए *plans*।",
    hinglish: "Credits check ke liye *balance* likho, plan ke liye *plans*.",
  },
  payment_success: {
    en: "Payment done — thank you! 🙏\n\nYour *{plan}* plan is active.\n+{studio} studio · +{ad} ad credits added.\n\n{quota}\n\nSend a product photo whenever you're ready.",
    hi: "भुगतान हो गया — धन्यवाद! 🙏\n\nआपका *{plan}* plan active है।\n+{studio} studio · +{ad} ad credits add हो गए।\n\n{quota}\n\nजब चाहें product photo भेजें।",
    hinglish:
      "Payment ho gaya — thank you! 🙏\n\nAapka *{plan}* plan active hai.\n+{studio} studio · +{ad} ad credits add ho gaye.\n\n{quota}\n\nJab ready ho, product photo bhej dena.",
  },
} as const satisfies Record<string, Record<VeloraLang, string>>;

export type VoiceKey = keyof typeof COPY;

export function say(
  lang: VeloraLang,
  key: VoiceKey,
  vars?: Vars,
): string {
  const block = COPY[key];
  const text = block[lang] ?? block[DEFAULT_LANG];
  return fill(text, vars);
}

/** Softer step prefix — not robotic "Step 3/8". */
export function adStepIntro(lang: VeloraLang, n: number, total: number): string {
  if (lang === "hi") return `(${n}/${total}) `;
  if (lang === "hinglish") return `(${n}/${total}) `;
  return `(${n}/${total}) `;
}
