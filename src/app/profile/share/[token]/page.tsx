import { notFound } from "next/navigation";

import { getPublicProfileShare } from "@/lib/clients/shares";

export const metadata = { title: "Shared profile", robots: { index: false, follow: false } };

export default async function SharedProfilePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getPublicProfileShare(token);
  if (!shared) notFound();
  const { fields, profile } = shared;
  const name = [fields.has("first_name") ? profile.firstName : "", fields.has("last_name") ? profile.lastName : ""].filter(Boolean).join(" ") || "Claims Bridge client";
  return <main className="shared-profile"><section><p className="eyebrow">Shared with permission</p><h1>{name}</h1>{fields.has("bio") && profile.bio && <p>{profile.bio}</p>}{fields.has("phone") && profile.phone && <p><strong>Phone</strong><br />{profile.phone}</p>}{fields.has("city_region") && (profile.city || profile.region) && <p><strong>Based in</strong><br />{[profile.city, profile.region].filter(Boolean).join(", ")}</p>}</section></main>;
}
