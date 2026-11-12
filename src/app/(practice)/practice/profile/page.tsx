import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/ui";
import { CredentialsManager, PhotoForm, ProfileForm } from "@/components/practice/ProfileForms";
import { requireRole } from "@/lib/server/auth";
import { getActiveSpecializations, LANGUAGES } from "@/lib/server/catalog";
import { getPractice } from "@/lib/server/practice";

export const metadata: Metadata = { title: "Public profile" };

export default async function ProfilePage() {
  const me = await requireRole("psychologist", "/practice/profile");
  const [practice, specs] = await Promise.all([getPractice(me.id), getActiveSpecializations()]);
  return (
    <>
      <PageHeader
        title="Public profile"
        description="This is what clients see when they discover you. Registration details are reviewed by CalMe and can only be changed through Verification."
        actions={
          <Link href={`/psychologists/${me.id}`} className="btn btn-white btn-sm">
            Preview profile
          </Link>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="grid content-start gap-6">
          <PhotoForm name={practice.name} fileId={practice.avatarFileId} />
          <ProfileForm
            specializations={specs}
            languages={LANGUAGES}
            defaults={{
              title: practice.title,
              bio: practice.bio,
              yearsExperience: practice.yearsExperience,
              location: practice.location ?? "",
              languages: practice.languages,
              specializationIds: practice.specializationIds,
              licenseExpiresOn: practice.licenseExpiresOn ?? "",
            }}
          />
        </div>
        <div className="grid content-start gap-6">
          <section className="panel p-5">
            <h2 className="!text-xl">Registration</h2>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-2">Register</dt>
                <dd className="font-semibold">{practice.licensingBody}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-2">Category</dt>
                <dd className="font-semibold">{practice.licenseCategory}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-2">Registration no.</dt>
                <dd className="font-semibold">{practice.licenseNumber}</dd>
              </div>
            </dl>
          </section>
          <CredentialsManager credentials={practice.credentials} />
        </div>
      </div>
    </>
  );
}
