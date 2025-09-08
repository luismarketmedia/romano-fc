// Suppress Chrome's benign "ResizeObserver loop completed with undelivered notifications" noise
// This happens when libraries measure and mutate layout in the same frame (e.g., popovers, dialogs)
// It does not affect functionality; we swallow only these specific messages
const handler = (event: ErrorEvent | PromiseRejectionEvent) => {
  const message =
    (event as any).reason?.message || (event as any).message || "";
  if (
    message ===
      "ResizeObserver loop completed with undelivered notifications." ||
    message === "ResizeObserver loop limit exceeded"
  ) {
    event.preventDefault?.();
    (event as any).stopImmediatePropagation?.();
    return true;
  }
  return false;
};

// Add listeners once
if (typeof window !== "undefined") {
  window.addEventListener("error", handler as any);
  window.addEventListener("unhandledrejection", handler as any);

  // Some browsers log this via console.error only — filter it
  const orig = console.error;
  console.error = function (...args: any[]) {
    const msg = String(args[0] ?? "");
    if (
      msg.includes(
        "ResizeObserver loop completed with undelivered notifications",
      ) ||
      msg.includes("ResizeObserver loop limit exceeded")
    ) {
      return;
    }
    return orig.apply(console, args as any);
  } as any;
}
