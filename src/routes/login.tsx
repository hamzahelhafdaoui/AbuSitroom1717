import { createFileRoute, Link } from "@tanstack/react-router";
import { AccountSignIn } from "@/components/control-desk";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  return (
    <main className="grid min-h-dvh place-items-center bg-bg p-6 text-fg">
      <div className="w-full max-w-sm space-y-3 border border-border p-4">
        <p className="font-mono text-[10px] tracking-[0.18em] text-accent">ABU HUREIRAH</p>
        <h1 className="font-mono text-lg">Sign in</h1>
        <p className="text-sm text-muted">The map stays public. Sign in only to lock or edit control.</p>
        {isPending ? <p className="text-sm text-muted">Checking account…</p> : null}
        {!isPending && user ? (
          <p className="text-sm">
            Signed in as {user.displayName || user.primaryEmail || "this account"}.{" "}
            <Link to="/" className="text-accent underline-offset-2 hover:underline">
              Back to the map
            </Link>
          </p>
        ) : null}
        {!isPending && !user ? <AccountSignIn /> : null}
      </div>
    </main>
  );
}
