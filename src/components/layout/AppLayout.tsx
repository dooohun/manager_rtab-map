import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { HeaderProvider } from "@/hooks/use-header";

export function AppLayout() {
  return (
    <HeaderProvider>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-4">
          <Outlet />
        </main>
      </div>
    </HeaderProvider>
  );
}
