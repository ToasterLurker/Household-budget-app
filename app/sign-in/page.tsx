import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signInAction, signUpAction, resendConfirmationAction } from "./actions";

export const dynamic = "force-dynamic";
const errors: Record<string, string> = {
  "not-configured": "Secure authentication has not been connected yet.",
  "invalid-input": "Please use a valid email and a password of at least 8 characters.",
  "sign-in-failed": "We could not sign you in. Check your credentials.",
  "email-not-confirmed": "Your account exists, but your email is not confirmed yet. Open the verification email, then sign in. If it did not arrive, use Resend confirmation below.",
  "invalid-email": "Enter a valid email address.",
  "send-rate-limited": "A confirmation email was requested too recently. Check your inbox, then try again after a minute.",
  "sign-up-failed": "Registration could not be completed. Try again or check your email.",
  "callback": "Your email verification link was invalid or expired.",
};
const notices: Record<string, string> = {
  "check-email": "Check your inbox for a confirmation link before signing in.",
  "signed-out": "You have been signed out.",
  "confirmation-requested": "If this email address has an unconfirmed account, a new confirmation email has been requested. Check your inbox and spam folder.",
};

export default async function SignInPage({ searchParams }: {
  searchParams: Promise<{ error?: string; notice?: string }>
}) {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (configured) {
    const client = await createSupabaseServerClient();
    const { data } = await client!.auth.getClaims();
    if (data?.claims?.sub) redirect("/secure");
  }
  const query = await searchParams;
  return <div className="auth-wrap">
    <div className="panel auth-panel">
      <p className="eyebrow">SECURE HOUSEHOLD</p>
      <h1>Separate accounts. One household.</h1>
      <p className="muted">This is the upcoming secure workspace. The original demo remains available.</p>
      {!configured ? <>
        <div className="demo-warning"><strong>Backend setup required.</strong> Supabase credentials and the
          access-control migration have not been configured for this deployment. Sign-in is disabled.</div>
        <Link className="text-link" href="/">Return to the demonstration →</Link>
      </> : <>
        {query.error && errors[query.error] && <p className="auth-error" role="alert">{errors[query.error]}</p>}
        {query.notice && notices[query.notice] && <p className="auth-notice" role="status">{notices[query.notice]}</p>}
        <form action={signInAction} className="auth-form">
          <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" minLength={8} required /></label>
          <button className="action-button" type="submit">Sign in</button>
        </form>
        <details className="signup-details" open={query.error === "email-not-confirmed"}>
          <summary>Resend email confirmation</summary>
          <p className="muted">Already registered but cannot sign in? Enter the same email address
            to request another verification link. You do not need to register again.</p>
          <form action={resendConfirmationAction} className="auth-form">
            <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
            <button className="action-button secondary-action" type="submit">Resend confirmation email</button>
          </form>
        </details>
        <details className="signup-details"><summary>Create an account</summary>
          <form action={signUpAction} className="auth-form">
            <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
            <label>Password<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
            <button className="action-button secondary-action" type="submit">Sign up</button>
          </form>
        </details>
        <p className="footnote">Do not enter real financial information until the database privacy tests are complete.</p>
      </>}
    </div>
  </div>;
}
