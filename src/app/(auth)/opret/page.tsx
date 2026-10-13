import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Page } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";

// The optional, unticked marketing checkbox (docs/01 § 4.1) arrives with the consent engine in M5.
async function Content({ searchParams }: { searchParams: Promise<{ fejl?: string; next?: string }> }) {
  const sp = await searchParams;
  return <LoginForm mode="opret" error={sp.fejl} next={sp.next} />;
}

export default function SignupPage(props: PageProps<"/opret">) {
  return (
    <Page title={getMessages().auth.signupTitle}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ fejl?: string; next?: string }>} />
      </Suspense>
    </Page>
  );
}
