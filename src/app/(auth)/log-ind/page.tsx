import { Suspense } from "react";
import { AuthMain, AuthValue } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getMessages } from "@/lib/i18n";

async function Content({ searchParams }: { searchParams: Promise<{ fejl?: string; next?: string; error?: string }> }) {
  const sp = await searchParams;
  return <LoginForm mode="log-ind" error={sp.fejl ?? (sp.error ? "link" : undefined)} next={sp.next} />;
}

export default function LoginPage(props: PageProps<"/log-ind">) {
  const t = getMessages();
  return (
    <AuthMain aside={<AuthValue eyebrow={t.brand} title={t.auth.valueTitle} points={t.auth.valuePoints} />}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ fejl?: string; next?: string; error?: string }>} />
      </Suspense>
    </AuthMain>
  );
}
