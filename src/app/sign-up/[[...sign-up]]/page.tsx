import { SignUp } from "@clerk/nextjs";

import { BrandMark } from "@/components/brand/brand-mark";
import { GlassSurface } from "@/components/glass/glass-surface";

import styles from "../../sign-in/auth.module.css";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ handoff?: string }> }) {
  const configured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const { handoff } = await searchParams;
  const redirect = `/account/onboarding${handoff ? `?handoff=${encodeURIComponent(handoff)}` : ""}`;

  return <main className={styles.authPage}><div className={styles.authBrand}><BrandMark /></div><section className={styles.authLayout}><div><p className="eyebrow">Create your secure account</p><h1>Begin the Claims Bridge client journey.</h1><p>An account will eventually let you continue an assessment, manage claims, upload evidence and receive updates. Services are being introduced in stages.</p></div><GlassSurface className={styles.authSurface} strength="strong">{configured ? <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl={redirect} /> : <div className={styles.configNotice}><p className="eyebrow">Development configuration</p><h2>Authentication is not configured yet.</h2><p>Add the Clerk keys to enable secure sign up.</p></div>}</GlassSurface></section></main>;
}
