import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import {
  RecommendationFeedback,
  resolveFeedbackSelection,
} from "../risk/recommendation-feedback";

describe("RecommendationFeedback Component (UI-only Feedback)", () => {
  const componentPath = path.resolve(__dirname, "../risk/recommendation-feedback.tsx");
  const componentSource = fs.readFileSync(componentPath, "utf-8");

  it("exports RecommendationFeedback component function and selection resolver", () => {
    expect(typeof RecommendationFeedback).toBe("function");
    expect(typeof resolveFeedbackSelection).toBe("function");
  });

  it("initial state: renders neither Yes nor No as pressed (aria-pressed='false')", () => {
    const html = renderToString(<RecommendationFeedback />);

    expect(html).toContain("Recommendation feedback");
    expect(html).toContain("Was this recommendation effective?");
    expect(html).toContain("Prototype feedback only. Your selection is not saved.");
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toContain('aria-pressed="true"');
  });

  it("verifies state transition logic: click Yes -> select yes; click No -> select no (unselect yes)", () => {
    // Initial state
    let state = null;
    expect(state).toBeNull();

    // Click Yes
    state = resolveFeedbackSelection(state, "yes");
    expect(state).toBe("yes");
    expect(state === "yes").toBe(true);
    expect(state === "no").toBe(false);

    // Click No -> No becomes pressed and Yes becomes unpressed
    state = resolveFeedbackSelection(state, "no");
    expect(state).toBe("no");
    expect(state === "yes").toBe(false);
    expect(state === "no").toBe(true);
  });

  it("renders custom question prop when provided", () => {
    const customQuestion = "Was this time block recommendation useful?";
    const html = renderToString(<RecommendationFeedback question={customQuestion} />);

    expect(html).toContain(customQuestion);
  });

  it("guarantees strictly UI-only state without backend, persistence, or network side effects", () => {
    expect(componentSource).toContain('useState<FeedbackSelection>(null)');
    expect(componentSource).not.toContain("fetch(");
    expect(componentSource).not.toContain("localStorage");
    expect(componentSource).not.toContain("sessionStorage");
    expect(componentSource).not.toContain("axios");
    expect(componentSource).not.toContain("onSubmit");
    expect(componentSource).not.toContain("post");
  });
});
