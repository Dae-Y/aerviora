import { describe, it, expect } from "vitest";
import { AppHeader } from "../app-header";
import { PRODUCT_NAME } from "@/lib/product-copy";

describe("AppHeader component (Task 6.7)", () => {
  it("renders Concept A dark app icon and serif wordmark without redundant background or duplicate brand text", () => {
    const headerElement = AppHeader();
    expect(headerElement).toBeDefined();

    const header = headerElement;
    expect(header.type).toBe("header");

    const container = header.props.children;
    const [homeLink] = container.props.children;

    // 1. Home link accessibility and href
    expect(homeLink.props.href).toBe("/");
    expect(homeLink.props["aria-label"]).toBe(`${PRODUCT_NAME} homepage`);

    const [appIcon, wordmark] = homeLink.props.children;

    // 2. Header icon renders dark green Concept A app icon for light UI contrast
    expect(appIcon.props.src).toBe("/brand/aerviora/app-icons/concept-a-light.svg");
    expect(appIcon.props.width).toBe(32);
    expect(appIcon.props.height).toBe(32);
    expect(appIcon.props.className).toBe("w-8 h-8");

    // 3. Image accessibility (decorative alt="" and aria-hidden="true")
    expect(appIcon.props.alt).toBe("");
    expect(appIcon.props["aria-hidden"]).toBe("true");

    // 4. Serif "Aerviora" wordmark remains unchanged and title-case
    expect(wordmark.props.children).toBe("Aerviora");
    expect(wordmark.props.className).toContain("font-display");
    expect(wordmark.props.children).not.toBe("AERVIORA");
  });
});
