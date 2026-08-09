import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { AppFooter, SiteFooter } from "../app-footer";

let currentPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}));

type TestElement = React.ReactElement<{
  children?: React.ReactNode;
  href?: string;
}>;

describe("AppFooter and SiteFooter component (Task 9)", () => {
  beforeEach(() => {
    currentPathname = "/";
  });

  it("exports SiteFooter as an alias of AppFooter", () => {
    expect(SiteFooter).toBe(AppFooter);
  });

  it("renders brand name, tagline, copyright, and privacy links on public routes", () => {
    currentPathname = "/check";
    const element = AppFooter();
    expect(element).not.toBeNull();
    expect(element?.type).toBe("footer");

    const container = element?.props.children as TestElement;
    const [brandSection, linksSection] = React.Children.toArray(
      container.props.children
    ) as TestElement[];

    // Brand section
    const brandChildren = React.Children.toArray(
      brandSection.props.children
    ) as TestElement[];
    expect(brandChildren[0].props.href).toBe("/");
    expect(brandChildren[0].props.children).toBe("Aerviora");
    expect(brandChildren[1].props.children).toContain(
      "Personalised environmental guidance"
    );

    // Links section
    const [navElement, copyrightP] = React.Children.toArray(
      linksSection.props.children
    ) as TestElement[];

    expect(copyrightP.props.children).toBe("© 2026 Aerviora");

    const navLinks = React.Children.toArray(
      navElement.props.children
    ) as TestElement[];

    expect(navLinks.length).toBe(5);

    // Privacy Dashboard link
    expect(navLinks[0].props.href).toBe("/privacy-dashboard");
    expect(navLinks[0].props.children).toBe("Privacy Dashboard");

    // Privacy link
    expect(navLinks[2].props.href).toBe("/privacy");
    expect(navLinks[2].props.children).toBe("Privacy");

    // Data sources link
    expect(navLinks[4].props.href).toBe("/privacy#data-sources");
    expect(navLinks[4].props.children).toBe("Data sources");

    // Confirm Not medical advice link is removed from footer
    const hasLimitationsLink = navLinks.some(
      (node) => node.props && node.props.href === "/privacy#limitations"
    );
    expect(hasLimitationsLink).toBe(false);
  });

  it("returns null on /dev and /dev/* routes", () => {
    currentPathname = "/dev";
    expect(AppFooter()).toBeNull();

    currentPathname = "/dev/illustrations";
    expect(AppFooter()).toBeNull();

    currentPathname = "/dev/seed-test";
    expect(AppFooter()).toBeNull();
  });
});
