import localFont from "next/font/local";

export const manrope = localFont({
  src: "./fonts/manrope/manrope-variable.woff2",
  variable: "--font-manrope",
  display: "swap",
  fallback: ["system-ui", "Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});

export const fraunces = localFont({
  src: "./fonts/fraunces/fraunces-variable.woff2",
  variable: "--font-fraunces",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});
