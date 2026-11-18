import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { RoleSwitcher } from "./RoleBits";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app flex min-h-svh">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-3 lg:px-3 lg:pr-3">
        <TopBar />
        <div className="pt-3 pb-6">{children}</div>
      </main>
      <RoleSwitcher />
    </div>
  );
}
