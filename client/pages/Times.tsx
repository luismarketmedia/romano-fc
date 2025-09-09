import { Header, TimesTable } from "./Index";

export default function TimesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">
        <TimesTable />
      </main>
    </div>
  );
}
