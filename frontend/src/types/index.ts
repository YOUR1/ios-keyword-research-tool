export interface AppListItem {
  id: number;
  itunes_id: number;
  name: string;
  developer: string | null;
  category_name: string | null;
  country_code: string;
  average_rating: number | null;
  rating_count: number;
  weighted_score: number | null;
  price: number;
  currency: string;
  icon_url: string | null;
  store_url: string | null;
  current_version: string | null;
}

export interface AppDetail {
  id: number;
  itunes_id: number;
  bundle_id: string | null;
  name: string;
  developer: string | null;
  category: Category | null;
  country: Country;
  average_rating: number | null;
  rating_count: number;
  weighted_score: number | null;
  current_version: string | null;
  price: number;
  currency: string;
  icon_url: string | null;
  store_url: string | null;
  description: string | null;
  content_rating: string | null;
  release_date: string | null;
  updated_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedApps {
  items: AppListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Category {
  id: number;
  itunes_id: number;
  name: string;
  parent_id: number | null;
}

export interface Country {
  id: number;
  code: string;
  name: string;
}

export interface RatingHistoryItem {
  snapshot_date: string;
  average_rating: number | null;
  rating_count: number;
  weighted_score: number | null;
}

export interface IndexStats {
  total_apps: number;
  total_countries: number;
  total_categories: number;
  last_crawl: string | null;
  global_mean_rating: number | null;
  min_rating_threshold: number;
}

export type SortField =
  | "lowest_rating"
  | "lowest_weighted"
  | "highest_rating"
  | "most_reviews"
  | "fewest_reviews"
  | "name";

export interface AppFilters {
  sort: SortField;
  country: string;
  category: string;
  min_reviews: number;
  max_rating: number | null;
  search: string;
  page: number;
  page_size: number;
}

// Auth types
export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  plan: Plan;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
}

export interface Plan {
  id: number;
  name: string;
  max_keywords: number;
  max_crawls_per_day: number;
  max_results_stored: number;
  price_cents_monthly: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// Keyword types
export interface Keyword {
  id: number;
  term: string;
  country_code: string;
  category_id: number | null;
  crawl_frequency: string;
  is_active: boolean;
  last_crawled_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface KeywordDetail extends Keyword {
  total_apps_found: number;
  total_crawl_jobs: number;
}

export interface PaginatedKeywords {
  items: Keyword[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CrawlJob {
  id: number;
  keyword_id: number;
  keyword_term: string | null;
  status: string;
  apps_found: number;
  apps_new: number;
  error_message: string | null;
  duration_seconds: number | null;
  proxy_used: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface PaginatedCrawlJobs {
  items: CrawlJob[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ResultItem extends AppListItem {
  keywords: string[];
}

export interface PaginatedResults {
  items: ResultItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ResultStats {
  total_apps: number;
  total_keywords: number;
  active_keywords: number;
  total_crawl_jobs: number;
  last_crawl_at: string | null;
}

export interface UsageInfo {
  keywords_used: number;
  keywords_limit: number;
  crawls_today: number;
  crawls_limit: number;
  results_stored: number;
  results_limit: number;
  plan: Plan;
}

// Review types
export interface Review {
  id: number;
  app_id: number;
  author_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  review_date: string | null;
  language: string | null;
}

export interface ReviewSummary {
  total_reviews: number;
  rating_distribution: Record<string, number>;
  average_review_rating: number | null;
}

export interface PaginatedReviews {
  items: Review[];
  summary: ReviewSummary;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export type ReviewSort = "newest" | "oldest" | "lowest" | "highest";

// Discover types
export interface SearchSuggestion {
  term: string;
}

export interface SearchSuggestionsResponse {
  term: string;
  country: string;
  suggestions: SearchSuggestion[];
}

export interface TrendingApp {
  itunes_id: string;
  name: string;
  developer: string | null;
  icon_url: string | null;
  genres: string[];
  store_url: string | null;
}

export interface TrendingResponse {
  country: string;
  chart: string;
  apps: TrendingApp[];
  count: number;
}
