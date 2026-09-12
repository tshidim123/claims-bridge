import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { saveStaffPreference } from "@/app/admin/communications-actions";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getDb } from "@/lib/db";
import { staffNotificationPreferences } from "@/lib/db/schema/communications";
import { getStaffRecordByClerkId } from "@/lib/staff/authorization";
import { getCurrentStaffContext } from "@/lib/staff/request";

const categories = [
  ["CLIENTS", "New clients", "Alerts when a new client completes account setup."],
  [
    "ASSESSMENTS",
    "Assessments",
    "New eligibility assessments relevant to your operational role.",
  ],
  ["CLAIMS", "Claims", "New claims and important operational case updates."],
  [
    "MESSAGES",
    "Messages",
    "Client secure-message alerts for teams allowed to handle them.",
  ],
  [
    "EVIDENCE",
    "Evidence",
    "Evidence uploaded for claims you are permitted to review.",
  ],
  ["ASSIGNMENTS", "Assignments", "Claims that are assigned to you."],
  ["PRIORITY", "Priority alerts", "High-priority operational case alerts."],
] as const;

export default async function PreferencesPage() {
  const context = await getCurrentStaffContext();
  const { userId } = await auth();
  if (!context || !userId) return <AdminAccessDenied forbidden />;

  const staff = await getStaffRecordByClerkId(userId);
  if (!staff || staff.status !== "ACTIVE")
    return <AdminAccessDenied forbidden />;

  const rows = await getDb()
    .select()
    .from(staffNotificationPreferences)
    .where(eq(staffNotificationPreferences.staffUserId, staff.id));

  return (
    <div className="admin-page">
      <AdminPageHeader
        eyebrow="Operations / preferences"
        title="Communication preferences"
        description="Choose delivery channels for alerts that are already relevant to your active staff role, permissions and assignments."
      />
      <section className="admin-control-panel">
        <p className="eyebrow">Channel controls</p>
        <h2>Keep operational alerts useful</h2>
        <p>
          Preferences control delivery channels only. They never grant access to
          a claim, client, message or evidence that your role cannot access.
        </p>
      </section>
      <div className="admin-info-grid">
        {categories.map(([category, title, description]) => {
          const row = rows.find((item) => item.category === category);
          return (
            <form
              className="admin-control-panel"
              key={category}
              action={saveStaffPreference}
            >
              <input type="hidden" name="category" value={category} />
              <p className="eyebrow">{category.replaceAll("_", " ")}</p>
              <h2>{title}</h2>
              <p>{description}</p>
              <fieldset className="admin-preference-channels">
                <legend className="is-hidden">{title} delivery channels</legend>
                <label>
                  <input
                    type="checkbox"
                    name="inApp"
                    defaultChecked={row?.inAppEnabled !== false}
                  />{" "}
                  In-app
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="email"
                    defaultChecked={row?.emailEnabled !== false}
                  />{" "}
                  Email
                </label>
              </fieldset>
              <button
                className="button button--small button--primary"
                type="submit"
              >
                Save {title.toLowerCase()}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
