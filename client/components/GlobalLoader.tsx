import { useIsFetching, useIsMutating } from "@tanstack/react-query";

export default function GlobalLoader() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const active = fetching + mutating > 0;
  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[1000]">
      <div className="fixed right-4 bottom-4 flex items-center gap-2 rounded-full bg-background/80 px-3 py-2 shadow border">
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
        <span className="text-xs text-muted-foreground">Carregando…</span>
      </div>
    </div>
  );
}
