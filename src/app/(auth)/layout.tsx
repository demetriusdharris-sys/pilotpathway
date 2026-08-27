import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="bg-primary flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="text-gold text-sm font-semibold tracking-[0.2em] uppercase"
        >
          PilotPathway.ai
        </Link>
        <div className="bg-card text-card-foreground border-border mt-5 rounded-lg border p-6 shadow-sm">
          {children}
        </div>
      </div>
    </main>
  );
}
