import Link from "next/link";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-5">
          <Link
            href="/"
            className="text-sm font-semibold tracking-[0.2em] uppercase"
          >
            PilotPathway.ai
          </Link>
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <article className="flex flex-col gap-5 text-pretty [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-sm [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_ul_li]:text-sm">
          {children}
        </article>
      </div>

      <footer className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex max-w-3xl flex-wrap gap-x-4 gap-y-2 px-6 py-8 text-sm">
          <Link href="/privacy" className="hover:text-foreground underline">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground underline">
            Terms
          </Link>
          <Link href="/contact" className="hover:text-foreground underline">
            Contact
          </Link>
        </div>
      </footer>
    </main>
  );
}
