import { Header, Sorteio as SorteioSection } from "./Index";

export default function SorteioPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">
        <SorteioSection />
      </main>
    </div>
  );
}
