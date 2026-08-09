export const PRODUCT_NAME = "Aerviora";
export const PROTOTYPE_BADGE = "Prototype";
export const TAGLINE = "Mobile-first environmental decision support for heat, air quality, dust and pollen.";
export const FOOTER_DISCLAIMER = "Environmental decision support — not medical advice.";

export const HOME_COPY = {
  eyebrow: "Personalised outdoor guidance",
  heading: "Know your lower-risk time outside.",
  supporting: "Aerviora brings heat, air quality, dust and pollen into one clear, explainable outdoor decision.",
  primaryCta: "Start an outdoor check",
  secondaryText: "No detailed medical history required.",
  threeValues: [
    {
      id: "value-environment",
      title: "Understand your environment",
      description: "Heat, air quality, dust and pollen in one place.",
    },
    {
      id: "value-context",
      title: "Add only relevant context",
      description: "Optional sensitivity categories and your planned activity.",
    },
    {
      id: "value-decision",
      title: "Make a clearer decision",
      description: "See whether to go now, delay, or modify the plan.",
    },
  ],
  safetyPanel: {
    heading: "Designed with privacy and caution",
    items: [
      "No detailed medical history required or stored.",
      "Not for diagnosis, treatment, or clinical assessment.",
      "No AI model processing personal health details.",
      "Future recommendations will use transparent, deterministic rules.",
      "Always follow official local environmental warnings and healthcare advice.",
    ],
  },
} as const;

export const CHECK_COPY = {
  stepBadge: "Step 1 of 3",
  heading: "Build your outdoor check",
  supporting: "Future checks will combine your location, optional sensitivities, and planned activity to identify lower-risk outdoor windows.",
  cards: [
    {
      id: "card-location",
      title: "Location and conditions",
      subtitle: "Local environmental factors",
      detail: "Heat index, PM2.5, PM10, dust, pollen, UV exposure & wind",
    },
    {
      id: "card-sensitivities",
      title: "Relevant sensitivities",
      subtitle: "Optional broad categories",
      detail: "Respiratory sensitivity, hay fever or pollen sensitivity, heat sensitivity",
    },
    {
      id: "card-activity",
      title: "Activity and duration",
      subtitle: "Planned outdoor activity",
      detail: "Intended effort level and planned time outside",
    },
  ],
  continueButton: "Continue",
  inputNotice: "Input controls will be added in the next development step.",
  safetyNote: "Aerviora provides decision support based on environmental factor forecasts, not medical diagnosis.",
} as const;
