import { setTrainingReminders } from "@/app/(learner)/konto/paamindelser/actions";
import { Badge, Card } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { getMessages } from "@/lib/i18n";
import { db } from "@/server/db";
import { trainingRemindersEnabled } from "@/server/modules/monthly-queries";

// /konto setting: monthly training reminders on/off (docs/09 § 4–5). The page has already called requireUser().
export async function TrainingReminders({ userId }: { userId: string }) {
  const t = getMessages().monthly.account;
  const enabled = await trainingRemindersEnabled(db(), userId);
  return (
    <Card
      data-testid="training-reminders"
      title={t.heading}
      description={t.description}
      actions={
        <Badge tone={enabled ? "success" : "neutral"} icon={enabled ? "check" : "dash"}>
          {enabled ? t.statusOn : t.statusOff}
        </Badge>
      }
      footer={
        <form action={setTrainingReminders}>
          <input type="hidden" name="enabled" value={enabled ? "0" : "1"} />
          <SubmitButton variant="secondary">
            {enabled ? t.turnOff : t.turnOn}
          </SubmitButton>
        </form>
      }
    >
      <p className="text-body-sm text-ink-muted">{enabled ? t.on : t.off}</p>
    </Card>
  );
}
