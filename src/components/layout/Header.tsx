import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHeader } from "@/hooks/use-header";

export function Header() {
  const { title, subtitle, backTo, actions } = useHeader();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-blur:bg-background/60">
      <div className="flex h-11 items-center gap-2 px-3 sm:px-6">
        {backTo ? (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8"
            aria-label="돌아가기"
            onClick={() => navigate(backTo)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : (
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Navigation className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold tracking-tight">Indoor Nav</span>
          </Link>
        )}

        {title && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{title}</p>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground truncate hidden sm:block">{subtitle}</p>
            )}
          </div>
        )}

        {!title && <div className="flex-1" />}

        {actions}
      </div>
    </header>
  );
}
