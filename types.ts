
export enum AppView {
  ONBOARDING = 'onboarding',
  HOME = 'home',
  LIVE_SESSION = 'live_session',
  SUMMARY = 'summary'
}

export interface UserPreferences {
  notificationTime: string;
  setupComplete: boolean;
  lastSessionDate: string | null;
}

export interface SessionSummary {
  quote: string;
  theme: string;
}
