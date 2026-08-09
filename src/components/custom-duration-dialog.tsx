"use client";

import { useState, useEffect, useRef } from "react";
import {
  MIN_DURATION_MINUTES,
  MAX_DURATION_MINUTES,
  DURATION_STEPPER_INCREMENT,
  isDurationPreset,
  validateCustomDurationString,
} from "@/lib/duration";

interface CustomDurationDialogProps {
  isOpen: boolean;
  committedDuration: number | null;
  onApply: (duration: number) => void;
  onCancel: () => void;
}

export function CustomDurationDialog({
  isOpen,
  committedDuration,
  onApply,
  onCancel,
}: CustomDurationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive initial draft value
  const initialDraft =
    committedDuration !== null && !isDurationPreset(committedDuration)
      ? String(committedDuration)
      : "60";

  // Temporary draft state for the dialog
  const [draft, setDraft] = useState<string>(initialDraft);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const [prevOpen, setPrevOpen] = useState<boolean>(isOpen);

  // Sync draft state when dialog opens
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setDraft(initialDraft);
      setHasInteracted(false);
    }
  }

  // Synchronize React isOpen state with native HTML dialog modal state
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      // Focus input on open
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const validation = validateCustomDurationString(draft);

  const handleApply = () => {
    setHasInteracted(true);
    if (validation.isValid && validation.value !== null) {
      onApply(validation.value);
    }
  };

  const handleCloseAndCancel = () => {
    onCancel();
  };

  const handleNativeCancel = (
    e: React.SyntheticEvent<HTMLDialogElement, Event>
  ) => {
    e.preventDefault();
    handleCloseAndCancel();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      handleCloseAndCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleApply();
    }
  };

  const handleStepperChange = (delta: number) => {
    setHasInteracted(true);
    if (!validation.isValid || validation.value === null) {
      setDraft("5");
      return;
    }

    const currentVal = validation.value;
    let nextVal = currentVal + delta;
    if (nextVal < MIN_DURATION_MINUTES) nextVal = MIN_DURATION_MINUTES;
    if (nextVal > MAX_DURATION_MINUTES) nextVal = MAX_DURATION_MINUTES;

    setDraft(String(nextVal));
  };

  if (!isOpen) {
    return null;
  }

  const isMinusDisabled =
    validation.isValid &&
    validation.value !== null &&
    validation.value <= MIN_DURATION_MINUTES;
  const isPlusDisabled =
    validation.isValid &&
    validation.value !== null &&
    validation.value >= MAX_DURATION_MINUTES;

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleNativeCancel}
      onClick={handleBackdropClick}
      aria-labelledby="custom-duration-heading"
      aria-describedby="custom-duration-description"
      className="fixed inset-0 z-50 m-0 w-full max-w-none h-full max-h-none bg-transparent backdrop:bg-[#0A2928]/40 backdrop:backdrop-blur-xs p-0 overflow-y-auto flex items-end sm:items-center justify-center border-none"
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl border border-[#0A2928]/10 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1.5 text-left">
          <h2
            id="custom-duration-heading"
            className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A2928]"
          >
            Set a custom duration
          </h2>
          <p
            id="custom-duration-description"
            className="text-sm text-[#0A2928]/80 leading-relaxed"
          >
            Choose how long you expect to be outside.
          </p>
        </div>

        {/* Stepper and Numeric Input Controls */}
        <div className="space-y-3">
          <label
            htmlFor="custom-duration-input"
            className="block text-sm font-semibold text-[#0A2928]"
          >
            Minutes
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Decrease duration by 5 minutes"
              disabled={isMinusDisabled}
              onClick={() => handleStepperChange(-DURATION_STEPPER_INCREMENT)}
              className="w-12 h-12 rounded-xl bg-white border border-[#0A2928]/20 hover:bg-[#1F5A55]/5 text-[#1F5A55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white flex-shrink-0"
            >
              <svg
                className="w-5 h-5 stroke-current fill-none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            <input
              ref={inputRef}
              id="custom-duration-input"
              type="number"
              min={MIN_DURATION_MINUTES}
              max={MAX_DURATION_MINUTES}
              step={1}
              inputMode="numeric"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setHasInteracted(true);
              }}
              onKeyDown={handleKeyDown}
              className="w-full h-12 px-4 text-center rounded-xl bg-white border border-[#0A2928]/20 text-[#0A2928] text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] transition-colors shadow-xs"
            />

            <button
              type="button"
              aria-label="Increase duration by 5 minutes"
              disabled={isPlusDisabled}
              onClick={() => handleStepperChange(DURATION_STEPPER_INCREMENT)}
              className="w-12 h-12 rounded-xl bg-white border border-[#0A2928]/20 hover:bg-[#1F5A55]/5 text-[#1F5A55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white flex-shrink-0"
            >
              <svg
                className="w-5 h-5 stroke-current fill-none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          <p className="text-xs text-[#4E7C77]">
            Enter a whole number from {MIN_DURATION_MINUTES} to{" "}
            {MAX_DURATION_MINUTES} minutes.
          </p>

          {/* Validation Feedback */}
          {hasInteracted && !validation.isValid && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-950">
              {validation.errorMessage}
            </div>
          )}
        </div>

        {/* Dialog Actions */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            disabled={!validation.isValid}
            onClick={handleApply}
            className="w-full h-12 rounded-xl font-semibold text-white bg-[#1F5A55] hover:bg-[#184743] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] transition-all shadow-xs text-center text-base disabled:bg-[#0A2928]/10 disabled:text-[#0A2928]/40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            Apply duration
          </button>

          <button
            type="button"
            onClick={handleCloseAndCancel}
            className="w-full py-2.5 rounded-xl font-semibold text-[#1F5A55] hover:text-[#184743] hover:bg-[#1F5A55]/5 text-center text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
}
