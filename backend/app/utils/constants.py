"""
App Store constants: category IDs, country codes, search terms.

Category IDs sourced from Apple's iTunes genre mapping:
https://affiliate.itunes.apple.com/resources/documentation/genre-mapping/
"""

# iOS App Store top-level categories
ITUNES_CATEGORIES: dict[int, str] = {
    6000: "Business",
    6001: "Weather",
    6002: "Utilities",
    6003: "Travel",
    6004: "Sports",
    6005: "Social Networking",
    6006: "Reference",
    6007: "Productivity",
    6008: "Photo & Video",
    6009: "News",
    6010: "Navigation",
    6011: "Music",
    6012: "Lifestyle",
    6013: "Health & Fitness",
    6014: "Games",
    6015: "Finance",
    6016: "Entertainment",
    6017: "Education",
    6018: "Books",
    6020: "Medical",
    6021: "Magazines & Newspapers",
    6022: "Catalogs",
    6023: "Food & Drink",
    6024: "Shopping",
    6025: "Stickers",
    6026: "Developer Tools",
    6027: "Graphics & Design",
}

# Search terms used for broad category crawling
# Single letters + common app-related terms for maximum coverage
SEARCH_TERMS: list[str] = [
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j",
    "k", "l", "m", "n", "o", "p", "q", "r", "s", "t",
    "u", "v", "w", "x", "y", "z",
    "the", "my", "app", "free", "pro", "best", "new",
]

# Countries with significant App Store presence
SUPPORTED_COUNTRIES: dict[str, str] = {
    "US": "United States",
    "GB": "United Kingdom",
    "CA": "Canada",
    "AU": "Australia",
    "DE": "Germany",
    "FR": "France",
    "JP": "Japan",
    "KR": "South Korea",
    "CN": "China",
    "BR": "Brazil",
    "IN": "India",
    "NL": "Netherlands",
    "ES": "Spain",
    "IT": "Italy",
    "MX": "Mexico",
    "SE": "Sweden",
    "NO": "Norway",
    "DK": "Denmark",
    "FI": "Finland",
    "RU": "Russia",
}
