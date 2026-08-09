import { describe, it, expect } from "vitest";
import React from "react";
import { PreparationSuggestions } from "../preparation-suggestions";
import type { PreparationSuggestion } from "@/lib/preparation/types";

type TestElement = React.ReactElement<{
  children?: React.ReactNode;
  "aria-labelledby"?: string;
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
}>;

describe("PreparationSuggestions component", () => {
  const sampleSuggestions: PreparationSuggestion[] = [
    {
      id: "sunscreen",
      label: "Sunscreen",
      reason: "Elevated UV conditions",
      iconKey: "sun",
      priority: 100,
    },
    {
      id: "water",
      label: "Water bottle",
      reason: "Warm outdoor conditions",
      iconKey: "droplets",
      priority: 95,
    },
    {
      id: "sunglasses",
      label: "Sunglasses",
      reason: "Bright outdoor conditions",
      iconKey: "glasses",
      priority: 90,
    },
    {
      id: "protective-mask",
      label: "Well-fitting mask",
      reason: "Elevated particulate conditions",
      iconKey: "shield",
      priority: 85,
    },
  ];

  it("returns null when suggestions array is empty", () => {
    const result = PreparationSuggestions({ suggestions: [] });
    expect(result).toBeNull();
  });

  it("returns null when suggestions is undefined", () => {
    const result = PreparationSuggestions({
      suggestions: undefined as unknown as PreparationSuggestion[],
    });
    expect(result).toBeNull();
  });

  it("renders a semantic section with heading and items list", () => {
    const element = PreparationSuggestions({ suggestions: sampleSuggestions });
    expect(element).not.toBeNull();
    expect(element?.type).toBe("section");
    expect(element?.props["aria-labelledby"]).toBe("preparation-heading");

    const childrenArray = React.Children.toArray(element?.props.children);
    expect(childrenArray.length).toBe(2);

    const headerContainer = childrenArray[0] as TestElement;
    const headerChildren = React.Children.toArray(headerContainer.props.children);
    const heading = headerChildren[0] as TestElement;
    expect(heading.props.children).toBe("Consider these items");

    const subtitle = headerChildren[1] as TestElement;
    expect(subtitle.props.children).toBe(
      "Based on the current conditions and your planned activity."
    );

    const list = childrenArray[1] as TestElement;
    expect(list.type).toBe("ul");
    const listItems = React.Children.toArray(list.props.children);
    expect(listItems.length).toBe(4);
  });

  it("renders Next.js Image components with custom WebP source, width 96, height 96, and alt ''", () => {
    const element = PreparationSuggestions({ suggestions: sampleSuggestions });
    const list = React.Children.toArray(element?.props.children)[1] as TestElement;
    const listItems = React.Children.toArray(list.props.children);

    const firstCard = listItems[0] as TestElement;
    const cardChildren = React.Children.toArray(firstCard.props.children);
    const stageDiv = cardChildren[0] as TestElement;
    expect(stageDiv.props.className).toContain("rounded-full");

    const imgElement = React.Children.toArray(stageDiv.props.children)[0] as TestElement;
    expect(imgElement.props.src).toBe("/preparation-items/aerviora-sunscreen-v01.webp");
    expect(imgElement.props.width).toBe(96);
    expect(imgElement.props.height).toBe(96);
    expect(imgElement.props.alt).toBe("");
    expect(imgElement.props.className).toContain("object-contain");
  });

  it("defensively enforces maximum four items even if 5 items are supplied", () => {
    const fiveSuggestions: PreparationSuggestion[] = [
      ...sampleSuggestions,
      {
        id: "sun-shade",
        label: "Sun hat or shade",
        reason: "Useful in strong sun or heat",
        iconKey: "sun-shade",
        priority: 80,
      },
    ];

    const element = PreparationSuggestions({ suggestions: fiveSuggestions });
    const list = React.Children.toArray(element?.props.children)[1] as TestElement;
    const listItems = React.Children.toArray(list.props.children);
    expect(listItems.length).toBe(4);
  });

  it("renders item labels and reasons accurately", () => {
    const element = PreparationSuggestions({ suggestions: sampleSuggestions });
    const list = React.Children.toArray(element?.props.children)[1] as TestElement;
    const listItems = React.Children.toArray(list.props.children);

    const firstCard = listItems[0] as TestElement;
    const cardContent = React.Children.toArray(firstCard.props.children);
    const cardTextGroup = cardContent[1] as TestElement;
    const textChildren = React.Children.toArray(
      cardTextGroup.props.children
    ) as TestElement[];

    expect(textChildren[0].props.children).toBe("Sunscreen");
    expect(textChildren[1].props.children).toBe("Elevated UV conditions");
  });
});
