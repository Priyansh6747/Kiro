import { AppShell } from "@/components/nav";
import ConsentDialog from "@/components/ConsentDialog";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      <ConsentDialog />
    </AppShell>
  );
}
