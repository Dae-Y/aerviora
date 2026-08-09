"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FlowScreen,
  OutdoorCheckInput,
  PROTOTYPE_LOCATIONS,
  SENSITIVITY_CATEGORIES,
  DEFAULT_SENSITIVITY_PROFILE,
  getSensitivityIntensityLabel,
  ACTIVITY_OPTIONS,
  getActivityTitle,
  isMatchingPrototypeCity,
} from "@/lib/check-options";
import { SensitivityIntensitySelector } from "@/components/sensitivity-intensity-selector";
import {
  DURATION_PRESETS_MINUTES,
  isDurationPreset,
  formatDurationCompact,
} from "@/lib/duration";
import {
  EnvironmentApiSuccess,
  EnvironmentApiFailure,
  EnvironmentRequest,
  isEnvironmentApiResponse,
} from "@/lib/environment-api";
import { CheckProgress } from "@/components/check-progress";
import { CustomDurationDialog } from "@/components/custom-duration-dialog";
import { EnvironmentSnapshotView } from "@/components/environment-snapshot";
import { evaluatePersonalisedRisk, type PersonalisedRiskResult } from "@/lib/risk";
import { PersonalisedRiskResultView } from "@/components/risk/personalised-risk-result";
import { UseCurrentLocationButton } from "@/components/location/use-current-location-button";
import { SelectedLocationCard } from "@/components/location/selected-location-card";
import type {
  BrowserLocationStatus,
  CheckLocation,
  SelectedLocationState,
} from "@/lib/location/types";
import { resolveLowerRiskWindow } from "@/lib/risk/forecast-window";
import { PersonalisedOutlookPage } from "@/components/risk/personalised-outlook-page";
import {
  assessDataReadiness,
  isStaleOnlyReadinessFailure,
  isFutureCurrentTimestampFailure,
  isRetriableAirQualityOnlyFailure,
} from "@/lib/risk/data-readiness";
import { formatLocalTime } from "@/lib/risk/personalised-outlook";
import { DemoScenarioControls } from "@/components/demo/demo-scenario-controls";
import type { DemoScenarioId } from "@/lib/demo/environmental-scenarios";

export type AirQualityRecoveryState =
  | { status: "idle" }
  | { status: "waiting"; requestKey: string }
  | { status: "retrying"; requestKey: string }
  | { status: "failed"; requestKey: string };

export type RequestOrigin =
  | "initial"
  | "stale-auto-refresh"
  | "future-auto-refresh"
  | "automatic-air-recovery"
  | "manual-refresh";

const AIR_QUALITY_RECOVERY_DELAY_MS = 10_000;

export function CheckFlow() {
  const searchParams = useSearchParams();
  const isDemoModeInUrl = searchParams?.get("demo") === "1";
  const [selectedDemoScenario, setSelectedDemoScenario] =
    useState<DemoScenarioId | null>(isDemoModeInUrl ? "improving-day" : null);

  const [screen, setScreen] = useState<FlowScreen>("location");
  const [isEditingFromReview, setIsEditingFromReview] = useState<boolean>(false);
  const [announcedMessage, setAnnouncedMessage] = useState<string>(
    "Step 1 of 3: Location"
  );

  const [input, setInput] = useState<OutdoorCheckInput>({
    location: "",
    sensitivities: { ...DEFAULT_SENSITIVITY_PROFILE },
    activity: null,
    durationMinutes: null,
  });

  const [browserLocationStatus, setBrowserLocationStatus] =
    useState<BrowserLocationStatus>("idle");
  const [deviceLocation, setDeviceLocation] = useState<CheckLocation | null>(null);
  const [selectedLocationState, setSelectedLocationState] =
    useState<SelectedLocationState>({ source: "none" });

  const handleLocationStatusChange = (
    status: BrowserLocationStatus,
    location?: CheckLocation
  ) => {
    setBrowserLocationStatus(status);
    if (status === "resolved" && location) {
      setDeviceLocation(location);
      setInput((prev) => ({ ...prev, location: location.displayName }));
      setSelectedLocationState({ source: "device", location });
    } else if (
      status === "denied" ||
      status === "unavailable" ||
      status === "timed-out" ||
      status === "error"
    ) {
      setDeviceLocation(null);
      if (selectedLocationState.source === "device") {
        setSelectedLocationState({ source: "none" });
      }
    }
  };

  const handleChangeLocation = () => {
    setSelectedLocationState({ source: "none" });
    setDeviceLocation(null);
    setBrowserLocationStatus("idle");
    setInput((prev) => ({ ...prev, location: "" }));
  };

  const handleSearchInputChange = (val: string) => {
    if (selectedLocationState.source === "device") return;
    setInput((prev) => ({ ...prev, location: val }));
    if (val.trim()) {
      setSelectedLocationState({ source: "search", query: val.trim() });
    } else {
      setSelectedLocationState({ source: "none" });
    }
  };

  const handlePrototypeCityClick = (
    city: string,
    countryLabel: string,
    prototypeId: string
  ) => {
    if (
      selectedLocationState.source === "device" ||
      browserLocationStatus === "requesting"
    )
      return;
    const label = `${city}, ${countryLabel}`;
    setInput((prev) => ({ ...prev, location: label }));
    setSelectedLocationState({
      source: "prototype",
      city,
      label,
      prototypeId,
    });
  };

  const getContinueButtonLabel = () => {
    if (isEditingFromReview) return "Done editing";

    if (selectedLocationState.source === "device") {
      const name = selectedLocationState.location.displayName;
      return name.length <= 35 ? `Continue with ${name}` : "Continue to sensitivities";
    }

    if (selectedLocationState.source === "prototype") {
      return `Continue with ${selectedLocationState.city}`;
    }

    if (selectedLocationState.source === "search" && selectedLocationState.query) {
      return selectedLocationState.query.length <= 30
        ? `Continue with ${selectedLocationState.query}`
        : "Continue to sensitivities";
    }

    return "Continue to sensitivities";
  };

  const [apiSuccess, setApiSuccess] = useState<EnvironmentApiSuccess | null>(null);
  const [apiError, setApiError] = useState<EnvironmentApiFailure["error"] | null>(
    null
  );
  const [personalisedResult, setPersonalisedResult] = useState<PersonalisedRiskResult | null>(null);
  const [resultView, setResultView] = useState<"current" | "outlook">("current");
  const [justCalculated, setJustCalculated] = useState<boolean>(false);
  const previousResultViewRef = useRef(resultView);

  useLayoutEffect(() => {
    if (previousResultViewRef.current !== resultView) {
      if (typeof window !== "undefined") {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "auto",
        });
      }
    }
    previousResultViewRef.current = resultView;
  }, [resultView]);

  const [isFetchingEnvironment, setIsFetchingEnvironment] = useState<boolean>(false);
  const isFetchingEnvironmentRef = useRef<boolean>(false);

  const [refreshNotice, setRefreshNotice] = useState<{
    isFailed: boolean;
    lastUpdatedTime?: string;
  } | null>(null);

  const [airQualityRecovery, setAirQualityRecovery] = useState<AirQualityRecoveryState>({
    status: "idle",
  });
  const fetchAbortControllerRef = useRef<AbortController | null>(null);
  const autoRefreshedKeysRef = useRef<Set<string>>(new Set());
  const futureAutoRefreshedKeysRef = useRef<Set<string>>(new Set());
  const airQualityAutoRefreshedKeysRef = useRef<Set<string>>(new Set());
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState<boolean>(false);
  const customTriggerRef = useRef<HTMLButtonElement>(null);

  const clearAirQualityRecoveryTimer = () => {
    if (recoveryTimerRef.current) {
      clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearAirQualityRecoveryTimer();
    };
  }, []);

  const navigateTo = (nextScreen: FlowScreen, announcedMsg: string) => {
    setScreen(nextScreen);
    setAnnouncedMessage(announcedMsg);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  };

  const getCheckKey = (checkInput: OutdoorCheckInput): string => {
    const loc = checkInput.location.trim().toLowerCase();
    const act = checkInput.activity || "";
    const dur = checkInput.durationMinutes || 0;
    const profile = checkInput.sensitivities;
    const sens = `respiratory:${profile.respiratory}|hayFever:${profile.hayFever}|heat:${profile.heat}`;
    return `${loc}:${act}:${dur}:${sens}`;
  };

  const handleCalculatePersonalisedGuidance = () => {
    if (!apiSuccess) return;
    const result = evaluatePersonalisedRisk({
      snapshot: apiSuccess.snapshot,
      input,
      referenceTime: apiSuccess.retrievedAt,
    });
    setPersonalisedResult(result);
    setJustCalculated(true);
  };

  const executeEnvironmentFetch = async (options: {
    isManualRefresh?: boolean;
    requestOrigin?: RequestOrigin;
    skipAirQualityRecovery?: boolean;
    targetInput?: OutdoorCheckInput;
  } = {}) => {
    // In-flight request protection: guard against repeated overlapping requests
    if (isFetchingEnvironmentRef.current) {
      return;
    }

    const {
      isManualRefresh = false,
      requestOrigin = "initial",
      skipAirQualityRecovery = false,
      targetInput = input,
    } = options;

    const trimmedLoc = targetInput.location.trim();
    if (!trimmedLoc) return;

    isFetchingEnvironmentRef.current = true;
    setIsFetchingEnvironment(true);

    clearAirQualityRecoveryTimer();

    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
    }

    const controller = new AbortController();
    fetchAbortControllerRef.current = controller;

    const matchedProto = PROTOTYPE_LOCATIONS.find((loc) =>
      isMatchingPrototypeCity(trimmedLoc, loc.city)
    );

    const checkKey = getCheckKey(targetInput);

    if (isManualRefresh || requestOrigin === "manual-refresh") {
      airQualityAutoRefreshedKeysRef.current.add(checkKey);
    }

    const shouldForce =
      isManualRefresh ||
      requestOrigin === "manual-refresh" ||
      requestOrigin === "automatic-air-recovery" ||
      requestOrigin === "future-auto-refresh" ||
      requestOrigin === "stale-auto-refresh";

    const payload: EnvironmentRequest = {
      location: trimmedLoc,
      prototypeLocationId: matchedProto?.id,
      ...(selectedDemoScenario ? { demoScenarioId: selectedDemoScenario } : {}),
      ...(shouldForce ? { forceRefresh: true } : {}),
      ...(deviceLocation &&
      deviceLocation.source === "device-location" &&
      deviceLocation.latitude !== undefined &&
      deviceLocation.longitude !== undefined
        ? {
            latitude: deviceLocation.latitude,
            longitude: deviceLocation.longitude,
            locationSource: "device-location" as const,
          }
        : {}),
    };

    const isAirRecoveryContext =
      requestOrigin === "automatic-air-recovery" ||
      (requestOrigin === "manual-refresh" && screen === "environment-success" && airQualityRecovery.status !== "idle");

    const hasPreviousSuccess = Boolean(apiSuccess);

    // Stale-while-revalidate preservation: do not erase previous success on refresh
    if (
      !isAirRecoveryContext &&
      requestOrigin !== "stale-auto-refresh" &&
      requestOrigin !== "future-auto-refresh" &&
      !hasPreviousSuccess
    ) {
      setApiSuccess(null);
      setApiError(null);
      setAirQualityRecovery({ status: "idle" });
      navigateTo("environment-loading", `Checking current conditions for ${trimmedLoc}`);
    }

    try {
      const response = await fetch("/api/environment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data: unknown = await response.json();
      if (isEnvironmentApiResponse(data)) {
        if (data.ok) {
          const readiness = assessDataReadiness({
            snapshot: data.snapshot,
            input: targetInput,
            referenceTime: data.retrievedAt,
          });

          const isStaleOnly = isStaleOnlyReadinessFailure(readiness);
          const isFutureCurrent = isFutureCurrentTimestampFailure(readiness);
          const isRetriableAir = isRetriableAirQualityOnlyFailure({
            snapshot: data.snapshot,
            readiness,
            referenceTime: data.retrievedAt,
          });

          // 1. Stale-only recovery
          const hasAlreadyStaleRefreshed = autoRefreshedKeysRef.current.has(checkKey);
          if (
            isStaleOnly &&
            !hasAlreadyStaleRefreshed &&
            requestOrigin === "initial" &&
            !isManualRefresh
          ) {
            autoRefreshedKeysRef.current.add(checkKey);
            setAnnouncedMessage(
              "Updating environmental conditions… Checking for a more current environmental snapshot."
            );

            isFetchingEnvironmentRef.current = false;
            setIsFetchingEnvironment(false);
            await executeEnvironmentFetch({
              isManualRefresh: true,
              requestOrigin: "stale-auto-refresh",
              skipAirQualityRecovery: false,
              targetInput,
            });
            return;
          }

          // 2. Future-current-timestamp recovery
          const hasAlreadyFutureRefreshed = futureAutoRefreshedKeysRef.current.has(checkKey);
          if (
            isFutureCurrent &&
            !hasAlreadyFutureRefreshed &&
            requestOrigin === "initial" &&
            !isManualRefresh
          ) {
            futureAutoRefreshedKeysRef.current.add(checkKey);
            setAnnouncedMessage(
              "Updating environmental conditions… Checking for a current environmental snapshot."
            );

            isFetchingEnvironmentRef.current = false;
            setIsFetchingEnvironment(false);
            await executeEnvironmentFetch({
              isManualRefresh: true,
              requestOrigin: "future-auto-refresh",
              skipAirQualityRecovery: false,
              targetInput,
            });
            return;
          }

          // 3. Transient air-quality-only recovery
          const hasAlreadyAirRefreshed = airQualityAutoRefreshedKeysRef.current.has(checkKey);

          if (
            isRetriableAir &&
            !hasAlreadyAirRefreshed &&
            !skipAirQualityRecovery &&
            (requestOrigin === "initial" ||
              requestOrigin === "future-auto-refresh" ||
              requestOrigin === "stale-auto-refresh") &&
            !isManualRefresh
          ) {
            airQualityAutoRefreshedKeysRef.current.add(checkKey);

            setApiSuccess(data);
            setAirQualityRecovery({ status: "waiting", requestKey: checkKey });
            navigateTo("environment-success", "Updating air and exposure data.");

            recoveryTimerRef.current = setTimeout(() => {
              setAirQualityRecovery({ status: "retrying", requestKey: checkKey });
              executeEnvironmentFetch({
                isManualRefresh: false,
                requestOrigin: "automatic-air-recovery",
                skipAirQualityRecovery: true,
                targetInput,
              });
            }, AIR_QUALITY_RECOVERY_DELAY_MS);

            return;
          }

          // 4. Completed or non-retriable response: update state and clear refresh notice
          setApiSuccess(data);
          setRefreshNotice(null);

          if (personalisedResult) {
            const updatedResult = evaluatePersonalisedRisk({
              snapshot: data.snapshot,
              input: targetInput,
              referenceTime: data.retrievedAt,
            });
            setPersonalisedResult(updatedResult);
          }

          if (isRetriableAir) {
            setAirQualityRecovery({ status: "failed", requestKey: checkKey });
            navigateTo(
              "environment-success",
              "Air and exposure data are temporarily unavailable"
            );
          } else {
            setAirQualityRecovery({ status: "idle" });
            navigateTo(
              "environment-success",
              data.sourceMode === "demo"
                ? "Simulated environmental scenario loaded"
                : "Current environmental snapshot loaded"
            );
          }
        } else {
          // Response not OK: Handle stale preservation on refresh failure
          if (hasPreviousSuccess && apiSuccess) {
            const lastTimeStr = formatLocalTime(
              apiSuccess.retrievedAt,
              apiSuccess.resolvedLocation.timezone
            );
            setRefreshNotice({ isFailed: true, lastUpdatedTime: lastTimeStr });
            setAnnouncedMessage(
              "Using the most recently retrieved environmental data. The latest refresh was unsuccessful."
            );
          } else if (isAirRecoveryContext && apiSuccess) {
            setAirQualityRecovery({ status: "failed", requestKey: checkKey });
            navigateTo(
              "environment-success",
              "Air and exposure data are temporarily unavailable"
            );
          } else {
            setApiError(data.error);
            setAirQualityRecovery({ status: "idle" });
            navigateTo("environment-error", "We couldn’t load current conditions");
          }
        }
      } else {
        if (hasPreviousSuccess && apiSuccess) {
          const lastTimeStr = formatLocalTime(
            apiSuccess.retrievedAt,
            apiSuccess.resolvedLocation.timezone
          );
          setRefreshNotice({ isFailed: true, lastUpdatedTime: lastTimeStr });
        } else if (isAirRecoveryContext && apiSuccess) {
          setAirQualityRecovery({ status: "failed", requestKey: checkKey });
          navigateTo(
            "environment-success",
            "Air and exposure data are temporarily unavailable"
          );
        } else {
          setApiError({
            code: "unexpected-error",
            message: "Something went wrong while retrieving environmental data.",
            retryable: true,
          });
          setAirQualityRecovery({ status: "idle" });
          navigateTo("environment-error", "We couldn’t load current conditions");
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      if (hasPreviousSuccess && apiSuccess) {
        const lastTimeStr = formatLocalTime(
          apiSuccess.retrievedAt,
          apiSuccess.resolvedLocation.timezone
        );
        setRefreshNotice({ isFailed: true, lastUpdatedTime: lastTimeStr });
      } else if (isAirRecoveryContext && apiSuccess) {
        setAirQualityRecovery({ status: "failed", requestKey: checkKey });
        navigateTo(
          "environment-success",
          "Air and exposure data are temporarily unavailable"
        );
      } else {
        setApiError({
          code: "unexpected-error",
          message: "Something went wrong while retrieving environmental data.",
          retryable: true,
        });
        setAirQualityRecovery({ status: "idle" });
        navigateTo("environment-error", "We couldn’t load current conditions");
      }
    } finally {
      isFetchingEnvironmentRef.current = false;
      setIsFetchingEnvironment(false);
      if (fetchAbortControllerRef.current === controller) {
        fetchAbortControllerRef.current = null;
      }
    }
  };

  const handleConfirmSetup = (isManualRefresh = false) => {
    if (!isManualRefresh) {
      setPersonalisedResult(null);
      setResultView("current");
    }
    executeEnvironmentFetch({
      isManualRefresh,
      requestOrigin: isManualRefresh ? "manual-refresh" : "initial",
      skipAirQualityRecovery: isManualRefresh,
    });
  };

  const handleRetryAirQuality = () => {
    executeEnvironmentFetch({
      isManualRefresh: true,
      requestOrigin: "manual-refresh",
      skipAirQualityRecovery: true,
    });
  };

  const handleCancelLoading = () => {
    clearAirQualityRecoveryTimer();
    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
      fetchAbortControllerRef.current = null;
    }
    setAirQualityRecovery({ status: "idle" });
    navigateTo("review", "Review your outdoor check");
  };

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.location.trim().length === 0) return;

    if (isEditingFromReview) {
      setIsEditingFromReview(false);
      navigateTo("review", "Review your outdoor check");
    } else {
      navigateTo("sensitivities", "Step 2 of 3: Sensitivities");
    }
  };

  const handleSensitivitiesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditingFromReview) {
      setIsEditingFromReview(false);
      navigateTo("review", "Review your outdoor check");
    } else {
      navigateTo("activity", "Step 3 of 3: Activity and duration");
    }
  };

  const handleActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.activity || !input.durationMinutes) return;

    setIsEditingFromReview(false);
    navigateTo("review", "Review your outdoor check");
  };

  const goToEditScreen = (targetScreen: FlowScreen) => {
    clearAirQualityRecoveryTimer();
    setAirQualityRecovery({ status: "idle" });
    setPersonalisedResult(null);
    setIsEditingFromReview(true);
    const stepLabel =
      targetScreen === "location"
        ? "Editing Location"
        : targetScreen === "sensitivities"
        ? "Editing Sensitivities"
        : "Editing Activity and Duration";
    navigateTo(targetScreen, stepLabel);
  };

  const handleReset = () => {
    clearAirQualityRecoveryTimer();
    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
      fetchAbortControllerRef.current = null;
    }
    autoRefreshedKeysRef.current.clear();
    futureAutoRefreshedKeysRef.current.clear();
    airQualityAutoRefreshedKeysRef.current.clear();
    setApiSuccess(null);
    setApiError(null);
    setPersonalisedResult(null);
    setResultView("current");
    setRefreshNotice(null);
    setAirQualityRecovery({ status: "idle" });
    setDeviceLocation(null);
    setBrowserLocationStatus("idle");
    setSelectedLocationState({ source: "none" });
    setInput({
      location: "",
      sensitivities: { ...DEFAULT_SENSITIVITY_PROFILE },
      activity: null,
      durationMinutes: null,
    });
    setIsCustomDialogOpen(false);
    setIsEditingFromReview(false);
    navigateTo("location", "Step 1 of 3: Location");
  };

  const handleCustomDurationClick = (triggerEl: HTMLButtonElement | null) => {
    customTriggerRef.current = triggerEl;
    setIsCustomDialogOpen(true);
  };

  const handleApplyCustomDuration = (minutes: number) => {
    setInput((prev) => ({ ...prev, durationMinutes: minutes }));
    setIsCustomDialogOpen(false);
    if (customTriggerRef.current) {
      customTriggerRef.current.focus();
    }
  };

  const handleCancelCustomDuration = () => {
    setIsCustomDialogOpen(false);
    if (customTriggerRef.current) {
      customTriggerRef.current.focus();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <CheckProgress currentScreen={screen} />

      {/* Screen Announcement Region */}
      <div className="sr-only" aria-live="polite">
        {announcedMessage}
      </div>

      {/* LOCATION SCREEN */}
      {screen === "location" && (
        <div className="space-y-6">
          {isDemoModeInUrl && (
            <DemoScenarioControls
              selectedScenario={selectedDemoScenario}
              onSelectScenario={setSelectedDemoScenario}
            />
          )}

          <form onSubmit={handleLocationSubmit} className="space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#1F5A55]/10 text-[#1F5A55] border border-[#1F5A55]/20">
                Step 1 of 3
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#0A2928]">
                Where are you checking conditions?
              </h1>
              <p className="text-sm sm:text-base text-[#0A2928]/80 leading-relaxed max-w-2xl">
                Enter a location name or choose a prototype city.
              </p>
            </div>

          <div className="space-y-3">
            <label
              htmlFor="location-input"
              className="block text-sm font-semibold text-[#0A2928]"
            >
              Location
            </label>
            <input
              id="location-input"
              type="text"
              value={input.location}
              disabled={selectedLocationState.source === "device" || browserLocationStatus === "requesting"}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              placeholder="e.g. Perth, Western Australia"
              className={`w-full px-4 py-3 rounded-xl border border-[#0A2928]/20 bg-white text-[#0A2928] placeholder-[#0A2928]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] focus-visible:border-transparent transition-all shadow-xs ${
                selectedLocationState.source === "device" || browserLocationStatus === "requesting"
                  ? "bg-slate-100 dark:bg-slate-900/60 opacity-60 cursor-not-allowed"
                  : ""
              }`}
              autoFocus={selectedLocationState.source !== "device"}
            />

            {selectedLocationState.source === "device" && deviceLocation ? (
              <SelectedLocationCard
                location={deviceLocation}
                onChangeLocation={handleChangeLocation}
              />
            ) : (
              <UseCurrentLocationButton
                status={browserLocationStatus}
                location={deviceLocation}
                disabled={browserLocationStatus === "requesting"}
                onStatusChange={handleLocationStatusChange}
              />
            )}
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between gap-2">
              <span className="block text-xs font-semibold uppercase tracking-wider text-[#4E7C77]">
                Or select a prototype city
              </span>
              {selectedLocationState.source === "device" && (
                <span className="text-xs font-semibold text-[#1F5A55]">
                  Change location to select a different city.
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PROTOTYPE_LOCATIONS.map((loc) => {
                const isSelected =
                  selectedLocationState.source === "prototype" &&
                  selectedLocationState.prototypeId === loc.id;
                const isDisabled =
                  selectedLocationState.source === "device" || browserLocationStatus === "requesting";

                return (
                  <button
                    key={loc.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handlePrototypeCityClick(loc.city, loc.countryLabel, loc.id)}
                    className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                      isSelected
                        ? "bg-[#1F5A55] text-white border-[#1F5A55] shadow-xs"
                        : isDisabled
                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50"
                        : "bg-white text-[#0A2928] border-[#0A2928]/15 hover:border-[#1F5A55]/40 hover:bg-[#1F5A55]/5 cursor-pointer"
                    }`}
                  >
                    {loc.city}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={
                browserLocationStatus === "requesting" ||
                input.location.trim().length === 0
              }
              className="w-full min-h-[48px] py-3.5 px-6 rounded-xl font-semibold text-white bg-[#1F5A55] hover:bg-[#184743] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] focus-visible:ring-offset-2 transition-all shadow-xs text-center text-base cursor-pointer"
            >
              {getContinueButtonLabel()}
            </button>
          </div>
        </form>
        </div>
      )}

      {/* SENSITIVITIES SCREEN */}
      {screen === "sensitivities" && (
        <form onSubmit={handleSensitivitiesSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#1F5A55]/10 text-[#1F5A55] border border-[#1F5A55]/20">
              Step 2 of 3
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#0A2928]">
              Personal environmental sensitivities
            </h1>
            <p className="text-sm sm:text-base text-[#0A2928]/80 leading-relaxed max-w-2xl">
              Specify your sensitivity intensity for each category. All categories default to “Not affected”.
            </p>
          </div>

          <div className="space-y-4">
            {SENSITIVITY_CATEGORIES.map((cat) => (
              <SensitivityIntensitySelector
                key={cat.key}
                categoryKey={cat.key}
                title={cat.title}
                description={cat.description}
                example={cat.example}
                note={cat.note}
                value={input.sensitivities[cat.key]}
                onChange={(newIntensity) =>
                  setInput((prev) => ({
                    ...prev,
                    sensitivities: {
                      ...prev.sensitivities,
                      [cat.key]: newIntensity,
                    },
                  }))
                }
              />
            ))}
          </div>

          <div className="space-y-3 pt-4">
            <button
              type="submit"
              className="w-full min-h-[48px] py-3.5 px-6 rounded-xl font-semibold text-white bg-[#1F5A55] hover:bg-[#184743] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] focus-visible:ring-offset-2 transition-all shadow-xs text-center text-base"
            >
              {isEditingFromReview ? "Done editing" : "Continue to activity"}
            </button>

            {!isEditingFromReview && (
              <button
                type="button"
                onClick={() =>
                  navigateTo("location", "Step 1 of 3: Location")
                }
                className="w-full py-3 px-6 rounded-xl font-semibold text-[#1F5A55] hover:text-[#184743] hover:bg-[#1F5A55]/5 text-center text-sm transition-colors"
              >
                Back
              </button>
            )}
          </div>
        </form>
      )}

      {/* ACTIVITY SCREEN */}
      {screen === "activity" && (
        <form onSubmit={handleActivitySubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#1F5A55]/10 text-[#1F5A55] border border-[#1F5A55]/20">
              Step 3 of 3
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#0A2928]">
              Activity and duration
            </h1>
            <p className="text-sm sm:text-base text-[#0A2928]/80 leading-relaxed max-w-2xl">
              Select your planned outdoor activity and expected duration.
            </p>
          </div>

          {/* Activity Category Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-[#0A2928]">
              Planned activity
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ACTIVITY_OPTIONS.map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() =>
                    setInput((prev) => ({ ...prev, activity: act.id }))
                  }
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    input.activity === act.id
                      ? "bg-[#1F5A55] text-white border-[#1F5A55] shadow-xs"
                      : "bg-white text-[#0A2928] border-[#0A2928]/15 hover:border-[#1F5A55]/40 hover:bg-[#1F5A55]/5"
                  }`}
                >
                  <span className="font-bold text-base">{act.title}</span>
                  <span
                    className={`text-xs mt-1 leading-relaxed ${
                      input.activity === act.id
                        ? "text-white/90"
                        : "text-[#0A2928]/70"
                    }`}
                  >
                    {act.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration Selection */}
          <div className="space-y-3 pt-2">
            <label className="block text-sm font-semibold text-[#0A2928]">
              Expected duration
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DURATION_PRESETS_MINUTES.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() =>
                    setInput((prev) => ({ ...prev, durationMinutes: mins }))
                  }
                  className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                    input.durationMinutes === mins
                      ? "bg-[#1F5A55] text-white border-[#1F5A55] shadow-xs"
                      : "bg-white text-[#0A2928] border-[#0A2928]/15 hover:border-[#1F5A55]/40 hover:bg-[#1F5A55]/5"
                  }`}
                >
                  {formatDurationCompact(mins)}
                </button>
              ))}
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={(e) => handleCustomDurationClick(e.currentTarget)}
                className={`w-full py-2.5 px-4 rounded-xl border text-xs font-semibold transition-all text-center ${
                  input.durationMinutes !== null &&
                  !isDurationPreset(input.durationMinutes)
                    ? "bg-[#1F5A55]/10 text-[#1F5A55] border-[#1F5A55]/30 font-bold"
                    : "bg-white text-[#0A2928]/80 border-[#0A2928]/15 hover:bg-[#1F5A55]/5"
                }`}
              >
                {input.durationMinutes !== null &&
                !isDurationPreset(input.durationMinutes)
                  ? `Custom duration: ${formatDurationCompact(
                      input.durationMinutes
                    )}`
                  : "Specify custom duration…"}
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <button
              type="submit"
              disabled={!input.activity || !input.durationMinutes}
              className="w-full min-h-[48px] py-3.5 px-6 rounded-xl font-semibold text-white bg-[#1F5A55] hover:bg-[#184743] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] focus-visible:ring-offset-2 transition-all shadow-xs text-center text-base"
            >
              {isEditingFromReview ? "Done editing" : "Review outdoor check"}
            </button>

            {!isEditingFromReview && (
              <button
                type="button"
                onClick={() =>
                  navigateTo("sensitivities", "Step 2 of 3: Sensitivities")
                }
                className="w-full py-3 px-6 rounded-xl font-semibold text-[#1F5A55] hover:text-[#184743] hover:bg-[#1F5A55]/5 text-center text-sm transition-colors"
              >
                Back
              </button>
            )}
          </div>
        </form>
      )}

      {/* REVIEW SCREEN */}
      {screen === "review" && (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#1F5A55]/10 text-[#1F5A55] border border-[#1F5A55]/20">
              Review setup
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#0A2928]">
              Review your outdoor check
            </h1>
            <p className="text-sm sm:text-base text-[#0A2928]/80 leading-relaxed max-w-2xl">
              Check the details below before confirming this check setup.
            </p>
          </div>

          <div className="bg-white/80 rounded-2xl border border-[#0A2928]/10 divide-y divide-[#0A2928]/10 shadow-xs">
            {/* Summary Row 1: Location */}
            <div className="p-5 flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-wider text-[#4E7C77]">
                  Location
                </span>
                <p className="text-base font-semibold text-[#0A2928] min-w-0 break-words">
                  {input.location.trim()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => goToEditScreen("location")}
                aria-label="Edit location"
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1F5A55] bg-[#1F5A55]/10 hover:bg-[#1F5A55]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] transition-colors"
              >
                Edit
              </button>
            </div>

            {/* Summary Row 2: Sensitivities */}
            <div className="p-5 flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-wider text-[#4E7C77]">
                  Relevant sensitivities
                </span>
                {Object.values(input.sensitivities).some((v) => v !== "not-affected") ? (
                  <ul className="space-y-1 text-sm font-semibold text-[#0A2928]">
                    {SENSITIVITY_CATEGORIES.map((cat) => {
                      const val = input.sensitivities[cat.key];
                      if (val === "not-affected") return null;
                      return (
                        <li key={cat.key} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1F5A55]" />
                          <span>{cat.title}:</span>
                          <span className="font-normal text-[#0A2928]/80">
                            {getSensitivityIntensityLabel(val)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm font-medium text-[#0A2928]/70 italic">
                    Environmental sensitivities: None selected
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => goToEditScreen("sensitivities")}
                aria-label="Edit sensitivities"
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1F5A55] bg-[#1F5A55]/10 hover:bg-[#1F5A55]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] transition-colors"
              >
                Edit
              </button>
            </div>

            {/* Summary Row 3: Activity & Duration */}
            <div className="p-5 flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-wider text-[#4E7C77]">
                  Activity and duration
                </span>
                <p className="text-base font-semibold text-[#0A2928]">
                  {input.activity ? getActivityTitle(input.activity) : "—"} (
                  {input.durationMinutes
                    ? formatDurationCompact(input.durationMinutes)
                    : "—"}
                  )
                </p>
              </div>
              <button
                type="button"
                onClick={() => goToEditScreen("activity")}
                aria-label="Edit activity and duration"
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1F5A55] bg-[#1F5A55]/10 hover:bg-[#1F5A55]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] transition-colors"
              >
                Edit
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-amber-950 leading-relaxed text-center">
            No environmental recommendation has been calculated yet.
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              disabled={isFetchingEnvironment}
              aria-busy={isFetchingEnvironment}
              onClick={() => handleConfirmSetup(false)}
              className="w-full min-h-[48px] py-3.5 px-6 rounded-xl font-semibold text-white bg-[#1F5A55] hover:bg-[#184743] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] focus-visible:ring-offset-2 transition-all shadow-xs text-center text-base"
            >
              {isFetchingEnvironment ? "Retrieving conditions…" : "Confirm setup"}
            </button>

            <button
              type="button"
              disabled={isFetchingEnvironment}
              onClick={() =>
                navigateTo("activity", "Step 3 of 3: Activity and duration")
              }
              className="w-full py-3 px-6 rounded-xl font-semibold text-[#1F5A55] hover:text-[#184743] hover:bg-[#1F5A55]/5 text-center text-sm transition-colors disabled:opacity-50"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* ENVIRONMENT LOADING SCREEN */}
      {screen === "environment-loading" && (
        <div className="space-y-6 text-center sm:text-left" aria-busy="true">
          <div className="space-y-2">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#1F5A55]/10 text-[#1F5A55] border border-[#1F5A55]/20">
              Retrieving conditions
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#0A2928]">
              Checking current conditions
            </h1>
            <p className="text-sm sm:text-base text-[#0A2928]/80 leading-relaxed max-w-2xl">
              Resolving {input.location.trim()} and retrieving modelled weather
              and air-quality data.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white/80 border border-[#0A2928]/10 flex flex-col items-center justify-center space-y-4 shadow-xs">
            <div className="w-10 h-10 rounded-full border-3 border-[#1F5A55]/20 border-t-[#1F5A55] animate-spin" />
            <p className="text-sm font-semibold text-[#1F5A55]">
              Fetching provider data…
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleCancelLoading}
              className="w-full min-h-[48px] py-3.5 px-6 rounded-xl font-semibold text-[#1F5A55] bg-white border border-[#0A2928]/15 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] transition-colors text-center text-base"
            >
              Cancel and return to review
            </button>
          </div>
        </div>
      )}

      {/* ENVIRONMENT SUCCESS SNAPSHOT / PERSONALISED RESULT SCREEN */}
      {screen === "environment-success" && apiSuccess && (
        <div className="space-y-4">
          {/* Stale-while-revalidate / Refresh Failure Notice */}
          {refreshNotice?.isFailed && (
            <div
              role="status"
              aria-live="polite"
              className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs sm:text-sm text-amber-950 space-y-1 shadow-xs animate-in fade-in"
            >
              <p className="font-bold text-[#0A2928]">
                Using the most recently retrieved environmental data.
              </p>
              <p className="font-medium">
                The latest refresh was unsuccessful. Try again in a moment.
                {refreshNotice.lastUpdatedTime
                  ? ` Last updated ${refreshNotice.lastUpdatedTime}.`
                  : ""}
              </p>
            </div>
          )}

          {personalisedResult ? (
            resultView === "outlook" ? (
              <PersonalisedOutlookPage
                apiResponse={apiSuccess}
                input={input}
                currentResult={personalisedResult}
                onBack={() => setResultView("current")}
                onEditCheck={() => navigateTo("review", "Review your outdoor check")}
                onRefresh={() => handleConfirmSetup(true)}
              />
            ) : (
              (() => {
                const lowerRiskResolution =
                  apiSuccess.forecast && apiSuccess.forecast.status === "available"
                    ? resolveLowerRiskWindow({
                        snapshot: apiSuccess.snapshot,
                        input,
                        forecastPoints: apiSuccess.forecast.points,
                        referenceTime: apiSuccess.retrievedAt,
                      })
                    : null;

                return (
                  <PersonalisedRiskResultView
                    result={personalisedResult}
                    apiResponse={apiSuccess}
                    input={input}
                    lowerRiskResolution={lowerRiskResolution}
                    isDeviceLocation={deviceLocation?.source === "device-location"}
                    latitude={deviceLocation?.latitude}
                    longitude={deviceLocation?.longitude}
                    justCalculated={justCalculated}
                    onFocusAcknowledged={() => setJustCalculated(false)}
                    onRefresh={() => handleConfirmSetup(true)}
                    onEditCheck={() => navigateTo("review", "Review your outdoor check")}
                    onReset={handleReset}
                    onViewOutlook={() => setResultView("outlook")}
                  />
                );
              })()
            )
          ) : (
            <EnvironmentSnapshotView
              apiResponse={apiSuccess}
              input={input}
              isRefreshing={isFetchingEnvironment}
              airQualityRecoveryStatus={airQualityRecovery.status}
              onRetryAirQuality={handleRetryAirQuality}
              onRefresh={() => handleConfirmSetup(true)}
              onEditCheck={() => navigateTo("review", "Review your outdoor check")}
              onReset={handleReset}
              onCalculatePersonalisedGuidance={handleCalculatePersonalisedGuidance}
            />
          )}
        </div>
      )}

      {/* ENVIRONMENT ERROR SCREEN */}
      {screen === "environment-error" && (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-700/10 text-red-900 border border-red-700/20">
              Request failed
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#0A2928]">
              We couldn’t load current conditions.
            </h1>
            <p className="text-sm sm:text-base text-[#0A2928]/80 leading-relaxed max-w-2xl">
              {apiError?.code === "invalid-request"
                ? "The location request was not valid. Return and check the location."
                : apiError?.code === "location-not-found"
                ? "We couldn’t resolve that location. Try a city name with a country, such as “Perth, Australia”."
                : apiError?.code === "geocoding-unavailable"
                ? "Location lookup is temporarily unavailable."
                : apiError?.code === "environment-data-unavailable"
                ? "Weather and air-quality data are temporarily unavailable."
                : apiError?.code === "provider-timeout"
                ? "The environmental data request took too long."
                : "Something went wrong while retrieving environmental data."}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {apiError?.code === "location-not-found" ||
            apiError?.code === "invalid-request" ? (
              <>
                <button
                  type="button"
                  onClick={() => goToEditScreen("location")}
                  className="w-full min-h-[48px] py-3.5 px-6 rounded-xl font-semibold text-white bg-[#1F5A55] hover:bg-[#184743] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] focus-visible:ring-offset-2 transition-all shadow-xs text-center text-base"
                >
                  Edit location
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigateTo("review", "Review your outdoor check")
                  }
                  className="w-full py-3 px-6 rounded-xl font-semibold text-[#1F5A55] hover:text-[#184743] hover:bg-[#1F5A55]/5 text-center text-sm transition-colors"
                >
                  Back to review
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isFetchingEnvironment}
                  aria-busy={isFetchingEnvironment}
                  onClick={() => handleConfirmSetup(false)}
                  className="w-full min-h-[48px] py-3.5 px-6 rounded-xl font-semibold text-white bg-[#1F5A55] hover:bg-[#184743] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] focus-visible:ring-offset-2 transition-all shadow-xs text-center text-base"
                >
                  {isFetchingEnvironment ? "Trying again…" : "Try again"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigateTo("review", "Review your outdoor check")
                  }
                  className="w-full py-3 px-6 rounded-xl font-semibold text-[#1F5A55] hover:text-[#184743] hover:bg-[#1F5A55]/5 text-center text-sm transition-colors"
                >
                  Back to review
                </button>
              </>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleReset}
                className="py-2.5 px-4 rounded-xl font-semibold text-xs text-[#0A2928] bg-white border border-[#0A2928]/15 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] transition-colors text-center"
              >
                Start another check
              </button>
              <Link
                href="/"
                className="py-2.5 px-4 rounded-xl font-semibold text-xs text-[#0A2928] bg-white border border-[#0A2928]/15 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] transition-colors text-center inline-flex items-center justify-center"
              >
                Back to home
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETION SCREEN */}
      {screen === "completion" && (
        <div className="space-y-6">
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-700/10 text-emerald-900 border border-emerald-700/20">
              <span className="w-2 h-2 rounded-full bg-emerald-700" />
              Setup ready
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#0A2928]">
              Your outdoor check setup is ready.
            </h1>
            <p className="text-sm sm:text-base text-[#0A2928]/80 leading-relaxed max-w-2xl">
              Your choices are ready for the next prototype stage. No
              environmental recommendation has been calculated yet.
            </p>
          </div>

          <div className="bg-white/80 rounded-2xl p-6 border border-[#0A2928]/10 space-y-4 shadow-xs">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#4E7C77]">
              Configured outdoor check
            </h2>
            <div className="grid gap-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-[#0A2928]/10 pb-2.5">
                <span className="font-medium text-[#4E7C77]">Location</span>
                <span className="font-semibold text-[#0A2928] min-w-0 break-words">
                  {input.location.trim()}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-[#0A2928]/10 pb-2.5">
                <span className="font-medium text-[#4E7C77]">
                  Planned activity
                </span>
                <span className="font-semibold text-[#0A2928]">
                  {input.activity ? getActivityTitle(input.activity) : "—"} (
                  {input.durationMinutes
                    ? formatDurationCompact(input.durationMinutes)
                    : "—"}
                  )
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <span className="font-medium text-[#4E7C77]">
                  Selected sensitivities
                </span>
                <span className="font-semibold text-[#0A2928]">
                  {(() => {
                    const count = Object.values(input.sensitivities).filter(
                      (v) => v !== "not-affected"
                    ).length;
                    return count > 0
                      ? `${count} category ${
                          count === 1 ? "" : "ies"
                        } specified`
                      : "None selected";
                  })()}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="w-full min-h-[48px] py-3.5 px-6 rounded-xl font-semibold text-white bg-[#1F5A55] hover:bg-[#184743] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] focus-visible:ring-offset-2 transition-all shadow-xs text-center text-base"
            >
              Start another check
            </button>

            <Link
              href="/"
              className="w-full inline-flex items-center justify-center py-3 px-6 rounded-xl font-semibold text-[#1F5A55] hover:text-[#184743] hover:bg-[#1F5A55]/5 text-center text-sm transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      )}

      {/* Custom Duration Dialog */}
      <CustomDurationDialog
        isOpen={isCustomDialogOpen}
        committedDuration={input.durationMinutes}
        onApply={handleApplyCustomDuration}
        onCancel={handleCancelCustomDuration}
      />
    </div>
  );
}
