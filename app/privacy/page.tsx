import { type Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Sora collects, where your data is hosted, and how to export or delete it.",
};

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-background px-6">
      <header className="border-b bg-card py-8">
        <div className="container">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Privacy</h1>
            <p className="text-muted-foreground">
              Plain language, last updated November 2026
            </p>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <div className="max-w-2xl space-y-8">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">
              What we collect
            </h2>
            <p className="text-muted-foreground">
              To run Sora we store your name and email address (your sign-in),
              your household membership, and the money records you and your
              household add: transactions and categories. We use your email only
              for sign-in, email verification, and password reset. Sora has no
              ads, no third-party analytics, and we never sell your data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">
              Where your data lives
            </h2>
            <p className="text-muted-foreground">
              The app runs on the operator&apos;s Vercel account and the
              database is a Neon Postgres database on the operator&apos;s
              account, both on free tiers. Sora is free forever: no
              subscriptions, no ads, only an optional donation link.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">
              Export your data
            </h2>
            <p className="text-muted-foreground">
              You can download a full JSON export of your household (members,
              transactions, categories, and invite-link history) at any time
              from the{" "}
              <Link href="/manage" className="underline underline-offset-4">
                Manage page
              </Link>{" "}
              or directly from{" "}
              <Link href="/api/export" className="underline underline-offset-4">
                /api/export
              </Link>
              . A CSV export of your transactions is available on the
              transactions page.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">
              Delete your account
            </h2>
            <p className="text-muted-foreground">
              You can permanently delete your account from the{" "}
              <Link href="/manage" className="underline underline-offset-4">
                Manage page
              </Link>
              . Deletion removes your sign-in, your sessions, and every
              household where you are the last member, including its
              transactions and categories. In a household with other members you
              are removed; transactions added by other members stay.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">Contact</h2>
            <p className="text-muted-foreground">
              Questions or requests about your data? Email{" "}
              <a
                href="mailto:privacy@example.com"
                className="underline underline-offset-4"
              >
                privacy@example.com
              </a>
              .
            </p>
          </section>

          <p className="text-sm text-muted-foreground">
            <Link href="/sign-in" className="underline underline-offset-4">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
