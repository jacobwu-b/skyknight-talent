import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getSearch } from "@/lib/searches";
import { SearchForm } from "../../SearchForm";

export const dynamic = "force-dynamic";

export default async function EditSearchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const { id } = await params;
  const search = await getSearch(id);
  if (!search) notFound();

  return (
    <div className="page-shell">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href={`/searches/${search.id}`} className="back-link">
            ← {search.roleTitle}
          </Link>
          <h1>Edit Search</h1>
        </div>
        <div className="user-chip">
          <span>{user.name}</span>
          <span className={`role-badge ${user.role}`}>{user.role}</span>
        </div>
      </div>

      <div className="form-shell">
        <SearchForm
          mode="edit"
          id={search.id}
          defaultValues={{
            portfolioCompany: search.portfolioCompany,
            roleTitle: search.roleTitle,
            hiringManager: search.hiringManager,
            status: search.status,
          }}
        />
      </div>
    </div>
  );
}
