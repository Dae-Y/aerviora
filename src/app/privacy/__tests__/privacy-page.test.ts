import { describe, it, expect } from "vitest";
import React from "react";
import PrivacyPage, { metadata } from "../page";

type ElementWithChildren = React.ReactElement<{
  children?: React.ReactNode;
  id?: string;
  className?: string;
  href?: string;
}>;

describe("PrivacyPage component and metadata (Task 9)", () => {
  it("defines metadata title and description", () => {
    expect(metadata.title).toContain("Privacy and Data Use");
    expect(metadata.description).toContain("Aerviora");
  });

  it("renders main heading, intro, and all required sections", () => {
    const mainElement = PrivacyPage();
    expect(mainElement).not.toBeNull();
    expect(mainElement.type).toBe("main");

    const mainChildren = React.Children.toArray(
      mainElement.props.children
    ) as ElementWithChildren[];

    const header = mainChildren[0];
    const headerChildren = React.Children.toArray(
      header.props.children
    ) as ElementWithChildren[];

    const h1 = headerChildren[1];
    expect(h1.props.children).toBe("Privacy and data use");

    const intro = headerChildren[2];
    expect(intro.props.children).toContain(
      "Aerviora is currently a prototype designed to provide personalised environmental guidance."
    );

    const contentContainer = mainChildren[1];
    const sections = React.Children.toArray(
      contentContainer.props.children
    ) as ElementWithChildren[];

    // Section C: data-sources anchor & scroll-margin styling
    const dataSourcesSection = sections.find(
      (s) => s.props && s.props.id === "data-sources"
    );
    expect(dataSourcesSection).toBeDefined();
    expect(dataSourcesSection?.props.className).toContain("scroll-mt");

    // Section D: limitations anchor & scroll-margin styling
    const limitationsSection = sections.find(
      (s) => s.props && s.props.id === "limitations"
    );
    expect(limitationsSection).toBeDefined();
    expect(limitationsSection?.props.className).toContain("scroll-mt");

    // Section F: Last updated date
    const lastUpdatedDiv = sections[sections.length - 1];
    expect(lastUpdatedDiv.props.children).toBe("Last updated: 5 August 2026");
  });

  it("includes provider links for Open-Meteo, Copernicus, and GeoNames", () => {
    const mainElement = PrivacyPage();
    const mainChildren = React.Children.toArray(
      mainElement.props.children
    ) as ElementWithChildren[];
    const contentContainer = mainChildren[1];
    const sections = React.Children.toArray(
      contentContainer.props.children
    ) as ElementWithChildren[];

    const dataSourcesSection = sections.find(
      (s) => s.props && s.props.id === "data-sources"
    )!;

    const sectionChildren = React.Children.toArray(
      dataSourcesSection.props.children
    ) as ElementWithChildren[];

    const ul = sectionChildren.find((c) => c.type === "ul")!;
    const liItems = React.Children.toArray(
      ul.props.children
    ) as ElementWithChildren[];

    const links = liItems.flatMap((li) => {
      const liChildren = React.Children.toArray(
        li.props.children
      ) as ElementWithChildren[];
      return liChildren.filter((child) => child.type === "a");
    });

    const hrefs = links.map((link) => link.props.href);
    expect(hrefs).toContain("https://open-meteo.com");
    expect(hrefs).toContain("https://atmosphere.copernicus.eu");
    expect(hrefs).toContain("https://www.geonames.org");
  });

  it("uses Australian English spellings across privacy page content", () => {
    function extractText(node: React.ReactNode): string {
      if (typeof node === "string" || typeof node === "number") return String(node);
      if (!node) return "";
      if (Array.isArray(node)) return node.map(extractText).join(" ");
      if (React.isValidElement(node)) return extractText((node.props as { children?: React.ReactNode }).children);
      return "";
    }

    const mainElement = PrivacyPage();
    const pageText = extractText(mainElement);

    expect(pageText).toContain("personalised");
    expect(pageText).not.toContain("personalized");

    expect(pageText).toContain("monetise");
    expect(pageText).not.toContain("monetize");

    expect(pageText).toContain("behavioural");
    expect(pageText).not.toContain("behavioral");

    expect(pageText).toContain("localised");
    expect(pageText).not.toContain("localized");
  });
});
