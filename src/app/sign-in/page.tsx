import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { BrandMark } from "@/components/brand/brand-mark";
import { GlassSurface } from "@/components/glass/glass-surface";
import styles from "./auth.module.css";
export default function SignInPage() { const configured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY); return <main className={styles.authPage}><div className={styles.authAtmosphere} aria-hidden="true" /><div className={styles.authBrand}><BrandMark /></div><section className={styles.authLayout}><div><p className="eyebrow">Client access</p><h1>Return to a clearer claims journey.</h1><p>Sign in to continue a future Claims Bridge client experience. Your public eligibility assessment remains separate until secure persistence is available.</p><Link className="text-link" href="/check-eligibility">Start with the public assessment</Link></div><GlassSurface className={styles.authSurface} strength="strong">{configured ? <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/account" /> : <ConfigNotice />}</GlassSurface></section></main>; }
function ConfigNotice() { return <div className={styles.configNotice}><p className="eyebrow">Development configuration</p><h2>Authentication is not configured yet.</h2><p>Add the Clerk publishable and secret keys to the environment to enable secure sign in.</p></div>; }
