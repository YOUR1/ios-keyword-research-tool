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
  role: "admin" | "user";
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
  expansion_enabled: boolean;
  sub_keywords: string[] | null;
  is_active: boolean;
  last_crawled_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
  latest_popularity: number | null;
  latest_difficulty: number | null;
  latest_opportunity: number | null;
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

// ODE (Opportunity Discovery Engine) types
export interface ODEKeyword {
  keyword: string;
  frequency: number;
  trend_score: number;
  is_new: boolean;
  source_apps: number[];
  country_id: number | null;
  category_id: number | null;
}

export interface ODEDiscoveryResponse {
  discovered: number;
  saved: number;
  keywords: ODEKeyword[];
}

export interface ODEOpportunity {
  app_id: number;
  app_name: string;
  opportunity_score: number;
  normalized_downloads: number;
  rating_gap: number;
  average_rating: number;
  rating_count: number;
  niche_rank: number;
  category_id: number | null;
}

export interface ODEScanResponse {
  scanned: number;
  saved: number;
  alerts_triggered: number;
  opportunities: ODEOpportunity[];
}

export interface ODETopOpportunity {
  app_id: number;
  app_name: string;
  opportunity_score: number;
  niche_rank: number;
  scan_date: string;
  average_rating: number;
  rating_count: number;
}

export interface ODEAlert {
  id: number;
  alert_type: string;
  priority: string;
  title: string;
  description: string | null;
  app_id: number | null;
  opportunity_score: number | null;
  status: string;
  created_at: string;
}

export interface ODEAlertSummary {
  period_hours: number;
  total: number;
  active: number;
  resolved: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
}

export interface ODEStatus {
  status: string;
  keywords_discovered: number;
  opportunities_scored: number;
  active_alerts: number;
  total_apps: number;
  latest_scan: string | null;
}

// Keyword Research types
export interface TopAppInfo {
  id: number | null;
  itunes_id: number;
  name: string;
  developer: string | null;
  icon_url: string | null;
  average_rating: number | null;
  rating_count: number;
  weighted_score: number | null;
  price: number;
  currency: string;
  title_match: boolean;
  subtitle_match: boolean;
}

export interface KeywordAnalysis {
  keyword_id: number;
  term: string;
  country_code: string;
  popularity_score: number;
  difficulty_score: number;
  opportunity_score: number;
  total_results: number;
  hint_available: boolean;
  avg_top_10_rating_count: number | null;
  avg_top_10_rating: number | null;
  top_10_weighted_score_sum: number | null;
  title_match_count: number;
  subtitle_match_count: number;
  top_apps: TopAppInfo[];
  related_hints: string[];
  data_source: string;
}

export interface KeywordMetrics {
  id: number;
  keyword_id: number;
  popularity_score: number;
  difficulty_score: number;
  opportunity_score: number;
  total_results: number;
  hint_available: boolean;
  avg_top_10_rating_count: number | null;
  avg_top_10_rating: number | null;
  top_10_weighted_score_sum: number | null;
  snapshot_date: string;
  created_at: string;
}

export interface MetricsHistoryItem {
  snapshot_date: string;
  popularity_score: number;
  difficulty_score: number;
  opportunity_score: number;
  total_results: number;
}

export interface KeywordMetricsHistory {
  keyword_id: number;
  term: string;
  days: number;
  items: MetricsHistoryItem[];
}

export interface QuickAnalysis {
  term: string;
  country_code: string;
  popularity_score: number;
  difficulty_score: number;
  opportunity_score: number;
  total_results: number;
  hint_available: boolean;
  top_apps: TopAppInfo[];
  related_hints: string[];
}

export interface KeywordSuggestions {
  term: string;
  country_code: string;
  suggestions: string[];
}

// App Index types
export interface AppIndexItem extends AppListItem {
  rating_trend: 'up' | 'down' | 'stable';
  rating_change_7d: number | null;
  reviews_trend: 'up' | 'down' | 'stable';
  reviews_change_7d: number | null;
  opportunity_score: number | null;
  niche_rank: number | null;
  days_since_update: number | null;
}

export interface PaginatedAppIndex {
  items: AppIndexItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AppIndexFilters {
  sort: SortField;
  country: string;
  category: string;
  min_reviews: number;
  max_rating: number | null;
  min_rating: number | null;
  price_filter: 'all' | 'free' | 'paid';
  min_opportunity: number | null;
  search: string;
  page: number;
  page_size: number;
}
