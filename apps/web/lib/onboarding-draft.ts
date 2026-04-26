import type { OnboardingPayload } from '@/lib/api';

const ONBOARDING_DRAFT_KEY = 'xiaojian-onboarding-draft-v1';

export type OnboardingDraft = {
  form: OnboardingPayload;
  currentStep: number;
  savedAt: string;
};

function hasWindow() {
  return typeof window !== 'undefined';
}

export function readOnboardingDraft() {
  if (!hasWindow()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(ONBOARDING_DRAFT_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as OnboardingDraft;
  } catch {
    return null;
  }
}

export function saveOnboardingDraft(draft: OnboardingDraft) {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
}

export function clearOnboardingDraft() {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.removeItem(ONBOARDING_DRAFT_KEY);
}
