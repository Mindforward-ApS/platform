import { Suspense } from "react";
import { AuthMain, AuthWelcome } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getMessages } from "@/lib/i18n";

async function Content({ searchParams }: { searchParams: Promise<{ fejl?: string; next?: string; error?: string }> }) {
  const sp = await searchParams;
  return <LoginForm error={sp.fejl ?? (sp.error ? "link" : undefined)} next={sp.next} />;
}

export default function LoginPage(props: PageProps<"/log-ind">) {
  const t = getMessages();
  return (
    <AuthMain aside={<AuthWelcome greeting={t.auth.welcomeBack} />}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ fejl?: string; next?: string; error?: string }>} />
      </Suspense>
    </AuthMain>
  );
}
