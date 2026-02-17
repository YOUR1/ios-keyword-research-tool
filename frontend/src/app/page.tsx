import HomeClient from "@/components/HomeClient";
import { getApps, getCategories, getCountries } from "@/lib/api";
import { PaginatedApps, Category, Country } from "@/types";

const EMPTY_APPS: PaginatedApps = { items: [], total: 0, page: 1, page_size: 50, total_pages: 0 };

export default async function HomePage() {
  let apps: PaginatedApps = EMPTY_APPS;
  let categories: Category[] = [];
  let countries: Country[] = [];

  try {
    [apps, categories, countries] = await Promise.all([
      getApps({ sort: "lowest_weighted", page: 1, page_size: 50 }),
      getCategories(),
      getCountries(),
    ]);
  } catch {
    // SSR fetch may fail if backend is unreachable; client will refetch
  }

  return (
    <HomeClient
      initialApps={apps}
      categories={categories}
      countries={countries}
    />
  );
}
