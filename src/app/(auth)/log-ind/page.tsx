import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Page } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";

async function Content({ searchParams }: { searchParams: Promise<{ fejl?: string; next?: string; error?: string }> }) {
  const sp = await searchParams;
  return <LoginForm mode="log-ind" error={sp.fejl ?? (sp.error ? "link" : undefined)} next={sp.next} />;
}

export default function LoginPage(props: PageProps<"/log-ind">) {
  return (
    <Page title={getMessages().auth.loginTitle}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ fejl?: string; next?: string; error?: string }>} />
      </Suspense>
    </Page>
  );
}
