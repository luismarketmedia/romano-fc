import "./global.css";
import "./polyfills/resize-observer-error";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MatchManage from "./pages/MatchManage";
import Pessoas from "./pages/Pessoas";
import Times from "./pages/Times";
import Sorteio from "./pages/Sorteio";
import Jogos from "./pages/Jogos";
import GlobalLoader from "./components/GlobalLoader";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <GlobalLoader />
        <Routes>
          <Route path="/" element={<Pessoas />} />
          <Route path="/pessoas" element={<Pessoas />} />
          <Route path="/times" element={<Times />} />
          <Route path="/sorteio" element={<Sorteio />} />
          <Route path="/jogos" element={<Jogos />} />
          <Route path="/jogos/:id" element={<MatchManage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
