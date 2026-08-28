"use client";

import { SignOutButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

export function AccountIdentity() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <span>Authentication setup required</span>;
  }

  return <ConfiguredIdentity />;
}

function ConfiguredIdentity() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <span aria-live="polite">
        Loading account...
      </span>
    );
  }

  if (!user) {
    return <Link href="/sign-in">Sign in</Link>;
  }

  const displayName =
    user.firstName ??
    user.primaryEmailAddress?.emailAddress ??
    "Account";

  return (
    <>
      <span>{displayName}</span>

      <UserButton />

      <SignOutButton>
        <button type="button">
          Sign out
        </button>
      </SignOutButton>
    </>
  );
}