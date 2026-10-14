import { Suspense } from "react";
import { AuthMain, AuthValue } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getMessages } from "@/lib/i18n";

// The optional, unticked marketing checkbox (docs/01 § 4.1) arrives with the consent engine in M5.
async function Content({ searchParams }: { searchParams: Promise<{ fejl?: string; next?: string }> }) {
  const sp = await searchParams;
  return <LoginForm mode="opret" error={sp.fejl} next={sp.next} />;
}

export default function SignupPage(props: PageProps<"/opret">) {
  const t = getMessages();
  return (
    <AuthMain aside={<AuthValue eyebrow={t.brand} title={t.auth.valueTitle} points={t.auth.valuePoints} />}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ fejl?: string; next?: string }>} />
      </Suspense>
    </AuthMain>
  );
}
