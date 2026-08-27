"use server";
import { auth } from "@clerk/nextjs/server";
import { createAnonymousHandoff, persistAssessmentForClient } from "./repository";
import { assessmentPayloadSchema } from "./validation";
export async function secureAssessmentHandoff(payload: unknown) { const parsed = assessmentPayloadSchema.safeParse(payload); if (!parsed.success) return { kind: "error" as const, message: "This assessment could not be prepared safely." }; try { const { userId } = await auth(); if (userId) { try { await persistAssessmentForClient(userId, parsed.data); return { kind: "saved" as const }; } catch (error) { if (!(error instanceof Error && error.message === "Client profile not found.")) throw error; } } return { kind: "handoff" as const, token: await createAnonymousHandoff(parsed.data) }; } catch { return { kind: "error" as const, message: "We could not prepare the secure handoff. Please try again." }; } }
