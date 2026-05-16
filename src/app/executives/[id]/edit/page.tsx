import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getExecutive } from "@/lib/executives";
import { ExecutiveForm } from "../../ExecutiveForm";

export const dynamic = "force-dynamic";

export default async function EditExecutivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const { id } = await params;
  const exec = await getExecutive(id);
  if (!exec) notFound();

  return (
    <div className="page-shell">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href={`/executives/${id}`} className="back-link">
            ← {exec.name}
          </Link>
          <h1>Edit Executive</h1>
        </div>
        <div className="user-chip">
          <span>{user.name}</span>
          <span className={`role-badge ${user.role}`}>{user.role}</span>
        </div>
      </div>

      <ExecutiveForm
        mode="edit"
        id={id}
        defaultValues={{
          name: exec.name,
          email: exec.email,
          phone: exec.phone ?? "",
          linkedinUrl: exec.linkedinUrl ?? "",
          currentRole: exec.currentRole ?? "",
          notes: exec.notes ?? "",
          tags: exec.tags.join(", "),
        }}
      />
    </div>
  );
}
