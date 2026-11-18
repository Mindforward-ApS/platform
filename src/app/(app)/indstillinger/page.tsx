import type { Metadata } from "next";
import { PageHeader } from "@/components/app/ui";
import { Settings } from "@/components/app/Settings";
import { learner } from "@/content/platform";

export const metadata: Metadata = { title: "Indstillinger" };

export default function IndstillingerPage() {
  return (
    <>
      <PageHeader title="Indstillinger" sub="Din profil, dine notifikationer og dit abonnement." />
      <Settings name={learner.name} initials={learner.initials} email="sofie@eksempel.dk" />
    </>
  );
}
