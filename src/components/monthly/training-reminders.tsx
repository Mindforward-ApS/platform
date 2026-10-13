import { setTrainingReminders } from "@/app/(learner)/konto/paamindelser/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { getMessages } from "@/lib/i18n";
import { db } from "@/server/db";
import { trainingRemindersEnabled } from "@/server/modules/monthly-queries";

// /konto setting: monthly training reminders on/off (docs/09 § 4–5). The page has already called requireUser().
export async function TrainingReminders({ userId }: { userId: string }) {
  const t = getMessages().monthly.account;
  const enabled = await trainingRemindersEnabled(db(), userId);
  return (
    <section className="flex flex-col gap-1" data-testid="training-reminders">
      <h2 className="font-semibold">{t.heading}</h2>
      <p className="text-sm">{enabled ? t.on : t.off}</p>
      <form action={setTrainingReminders}>
        <input type="hidden" name="enabled" value={enabled ? "0" : "1"} />
        <SubmitButton variant="secondary">{enabled ? t.turnOff : t.turnOn}</SubmitButton>
      </form>
    </section>
  );
}
