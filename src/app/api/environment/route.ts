import { NextResponse } from "next/server";
import { validateEnvironmentRequest } from "@/lib/environment-api";
import { getOpenMeteoEnvironmentalSnapshot } from "@/lib/providers/open-meteo";
import { getDemoEnvironmentalForecast } from "@/lib/demo/environmental-scenarios";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "invalid-request",
          message: "The location request body must be valid JSON.",
          retryable: false,
        },
      },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const validation = validateEnvironmentRequest(body);
  if (!validation.isValid || !validation.request) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "invalid-request",
          message:
            validation.errorReason ||
            "The location request was not valid. Return and check the location.",
          retryable: false,
        },
      },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const retrievedAt = new Date().toISOString();

  if (validation.request.demoScenarioId) {
    const demoResult = getDemoEnvironmentalForecast({
      scenario: validation.request.demoScenarioId,
      location: validation.request.location,
      prototypeLocationId: validation.request.prototypeLocationId,
      now: retrievedAt,
    });
    return NextResponse.json(demoResult, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const result = await getOpenMeteoEnvironmentalSnapshot({
      location: validation.request.location,
      prototypeLocationId: validation.request.prototypeLocationId,
      forceRefresh: validation.request.forceRefresh,
      latitude: validation.request.latitude,
      longitude: validation.request.longitude,
      locationSource: validation.request.locationSource,
      retrievedAt,
    });

    if (result.ok) {
      return NextResponse.json(result, {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    }

    let status = 502;
    if (result.error.code === "invalid-request") status = 400;
    else if (result.error.code === "location-not-found") status = 404;
    else if (result.error.code === "provider-timeout") status = 504;

    return NextResponse.json(result, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "unexpected-error",
          message: "Something went wrong while retrieving environmental data.",
          retryable: true,
        },
      },
      {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
