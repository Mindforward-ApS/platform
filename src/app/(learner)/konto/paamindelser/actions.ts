"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth/authz";
import { db } from "@/server/db";
import { setTrainingRemindersEnabled } from "@/server/modules/monthly-queries";

// /konto: the learner turns the monthly SERVICE reminders (day 1/14/25) on or off for their own account.
export async function setTrainingReminders(formData: FormData) {
  const ctx = await requireUser();
  const enabled = z.enum(["0", "1"]).parse(formData.get("enabled")) === "1";
  await setTrainingRemindersEnabled(db(), ctx.user.id, enabled);
  redirect("/konto");
}
