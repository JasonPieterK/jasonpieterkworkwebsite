import { Suspense } from "react";
import { getSubjects } from "@/lib/github";
import SearchResults from "@/components/SearchResults";

export default async function SearchPage() {
  const subjects = await getSubjects();

  return (
    <main className="container">
      <h1 style={{ padding: "var(--s-7) 0 var(--s-5)" }}>Search</h1>
      <Suspense fallback={null}>
        <SearchResults subjects={subjects} />
      </Suspense>
    </main>
  );
}
