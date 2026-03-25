import { HashRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import BuildingsPage from "@/pages/BuildingsPage";
import BuildingDetailPage from "@/pages/BuildingDetailPage";

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="indoor-nav-theme">
      <TooltipProvider>
        <HashRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<BuildingsPage />} />
              <Route path="/buildings/:id" element={<BuildingDetailPage />} />
            </Route>
          </Routes>
        </HashRouter>
        <Toaster richColors position="bottom-center" style={{ bottom: "60px" }} />
      </TooltipProvider>
    </ThemeProvider>
  );
}
