-- =============================================================================
-- Worst Rated iOS Apps Index — Weighted Rating SQL Examples
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. COMPUTE GLOBAL MEAN RATING
-- ---------------------------------------------------------------------------
-- Only considers apps with at least 'm' ratings (configurable threshold)
SELECT
    AVG(average_rating) AS global_mean_rating,
    COUNT(*) AS qualifying_apps,
    MIN(average_rating) AS min_rating,
    MAX(average_rating) AS max_rating
FROM apps
WHERE rating_count >= 100           -- m = minimum ratings threshold
  AND average_rating IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 2. UPDATE ALL WEIGHTED SCORES (Bayesian Average)
-- ---------------------------------------------------------------------------
-- Formula: W = (v / (v + m)) * R + (m / (v + m)) * C
--
-- Where:
--   R = average_rating (this app's average)
--   v = rating_count   (this app's number of ratings)
--   m = 100            (minimum ratings threshold — configurable)
--   C = global mean    (from query above)
--
WITH global AS (
    SELECT AVG(average_rating) AS C
    FROM apps
    WHERE rating_count >= 100
      AND average_rating IS NOT NULL
)
UPDATE apps
SET weighted_score = (
    (rating_count::float / (rating_count + 100)) * average_rating
    + (100.0 / (rating_count + 100)) * global.C
)
FROM global
WHERE apps.average_rating IS NOT NULL
  AND apps.rating_count > 0;


-- ---------------------------------------------------------------------------
-- 3. TOP 50 WORST RATED APPS (by weighted score)
-- ---------------------------------------------------------------------------
SELECT
    ROW_NUMBER() OVER (ORDER BY weighted_score ASC) AS rank,
    name,
    developer,
    average_rating,
    rating_count,
    ROUND(weighted_score::numeric, 4) AS weighted_score,
    (SELECT c.name FROM categories c WHERE c.id = apps.category_id) AS category,
    (SELECT co.code FROM countries co WHERE co.id = apps.country_id) AS country
FROM apps
WHERE rating_count >= 100           -- Only apps with meaningful sample size
  AND weighted_score IS NOT NULL
ORDER BY weighted_score ASC
LIMIT 50;


-- ---------------------------------------------------------------------------
-- 4. WORST APPS BY CATEGORY
-- ---------------------------------------------------------------------------
SELECT
    cat.name AS category,
    apps.name AS app_name,
    apps.average_rating,
    apps.rating_count,
    ROUND(apps.weighted_score::numeric, 4) AS weighted_score,
    ROW_NUMBER() OVER (
        PARTITION BY cat.name
        ORDER BY apps.weighted_score ASC
    ) AS rank_in_category
FROM apps
JOIN categories cat ON apps.category_id = cat.id
WHERE apps.rating_count >= 100
  AND apps.weighted_score IS NOT NULL
ORDER BY cat.name, apps.weighted_score ASC;


-- ---------------------------------------------------------------------------
-- 5. APPS WITH MOST DRAMATIC RATING DROPS (from history)
-- ---------------------------------------------------------------------------
WITH first_last AS (
    SELECT
        app_id,
        FIRST_VALUE(average_rating) OVER (
            PARTITION BY app_id ORDER BY snapshot_date ASC
        ) AS first_rating,
        FIRST_VALUE(average_rating) OVER (
            PARTITION BY app_id ORDER BY snapshot_date DESC
        ) AS latest_rating,
        FIRST_VALUE(snapshot_date) OVER (
            PARTITION BY app_id ORDER BY snapshot_date ASC
        ) AS first_date,
        FIRST_VALUE(snapshot_date) OVER (
            PARTITION BY app_id ORDER BY snapshot_date DESC
        ) AS latest_date
    FROM ratings_history
    WHERE average_rating IS NOT NULL
)
SELECT DISTINCT
    a.name,
    fl.first_rating,
    fl.latest_rating,
    ROUND((fl.latest_rating - fl.first_rating)::numeric, 2) AS rating_change,
    fl.first_date,
    fl.latest_date
FROM first_last fl
JOIN apps a ON a.id = fl.app_id
WHERE fl.first_date != fl.latest_date
ORDER BY (fl.latest_rating - fl.first_rating) ASC
LIMIT 20;


-- ---------------------------------------------------------------------------
-- 6. RATING DISTRIBUTION HISTOGRAM
-- ---------------------------------------------------------------------------
SELECT
    CASE
        WHEN weighted_score < 1.0 THEN '0.0 - 0.9'
        WHEN weighted_score < 1.5 THEN '1.0 - 1.4'
        WHEN weighted_score < 2.0 THEN '1.5 - 1.9'
        WHEN weighted_score < 2.5 THEN '2.0 - 2.4'
        WHEN weighted_score < 3.0 THEN '2.5 - 2.9'
        WHEN weighted_score < 3.5 THEN '3.0 - 3.4'
        WHEN weighted_score < 4.0 THEN '3.5 - 3.9'
        WHEN weighted_score < 4.5 THEN '4.0 - 4.4'
        ELSE '4.5 - 5.0'
    END AS score_bucket,
    COUNT(*) AS app_count,
    ROUND(AVG(rating_count)::numeric, 0) AS avg_reviews
FROM apps
WHERE weighted_score IS NOT NULL
GROUP BY score_bucket
ORDER BY score_bucket;


-- ---------------------------------------------------------------------------
-- 7. INDEX STATISTICS
-- ---------------------------------------------------------------------------
SELECT
    COUNT(*) AS total_apps,
    COUNT(DISTINCT country_id) AS countries,
    COUNT(DISTINCT category_id) AS categories,
    ROUND(AVG(average_rating)::numeric, 2) AS avg_rating,
    ROUND(AVG(weighted_score)::numeric, 2) AS avg_weighted,
    SUM(rating_count) AS total_reviews,
    COUNT(*) FILTER (WHERE rating_count >= 100) AS apps_with_100_plus_reviews,
    COUNT(*) FILTER (WHERE weighted_score < 2.0) AS apps_below_2_stars
FROM apps
WHERE average_rating IS NOT NULL;
