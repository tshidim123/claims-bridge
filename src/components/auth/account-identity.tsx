"use client";
import { SignedIn, SignedOut, SignOutButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
export function AccountIdentity() { if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <span>Authentication setup required</span>; return <ConfiguredIdentity />; }
function ConfiguredIdentity() { const { user, isLoaded } = useUser(); if (!isLoaded) return <span aria-live="polite">Loading account…</span>; return <><SignedOut><Link href="/sign-in">Sign in</Link></SignedOut><SignedIn><span>{user?.firstName ?? user?.primaryEmailAddress?.emailAddress ?? "Account"}</span><UserButton /><SignOutButton><button type="button">Sign out</button></SignOutButton></SignedIn></>; }
