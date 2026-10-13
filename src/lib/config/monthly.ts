// Monthly training (docs/00 § 3, docs/09 § 5, docs/02 § 5). Config, not code at call sites.
export const monthlyConfig = {
  /** Target size of a personal monthly package (estimated minutes, NEWS + refresher). */
  maxMinutes: 15,
  /** SERVICE reminders: Copenhagen calendar days of the cycle month (max 3/month, docs/09 § 4). */
  reminderDays: [1, 14, 25] as const,
  /** monthly.assign-users batch size (docs/02 § 5). */
  assignBatchSize: 500,
  /** Learner-facing link in reminders. */
  packagePath: "/moduler",
  settingsPath: "/konto",
} as const;

export type ReminderDay = (typeof monthlyConfig.reminderDays)[number];
