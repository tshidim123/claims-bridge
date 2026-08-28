import "server-only";

import { auth } from "@clerk/nextjs/server";

import { getStaffContext, requirePermission, type StaffContext } from "@/lib/staff/authorization";

function clerkIsConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

export async function getCurrentStaffContext(): Promise<StaffContext | null> {
  if (!clerkIsConfigured()) return null;
  const { userId } = await auth();
  return userId ? getStaffContext(userId) : null;
}

export async function getCurrentStaffPermission(permission: Parameters<typeof requirePermission>[1]): Promise<StaffContext | null> {
  if (!clerkIsConfigured()) return null;
  const { userId } = await auth();
  return userId ? requirePermission(userId, permission) : null;
}
