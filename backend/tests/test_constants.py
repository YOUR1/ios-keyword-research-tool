"""
Tests for app.utils.constants — App Store category/country/term data.
"""

from app.utils.constants import ITUNES_CATEGORIES, SUPPORTED_COUNTRIES, SEARCH_TERMS


class TestITunesCategories:
    def test_not_empty(self):
        assert len(ITUNES_CATEGORIES) > 0

    def test_all_keys_are_ints(self):
        for key in ITUNES_CATEGORIES:
            assert isinstance(key, int), f"Key {key} is not int"

    def test_all_values_are_strings(self):
        for val in ITUNES_CATEGORIES.values():
            assert isinstance(val, str), f"Value {val} is not str"

    def test_ids_are_in_6000_range(self):
        for key in ITUNES_CATEGORIES:
            assert 6000 <= key <= 6999, f"Category ID {key} outside expected range"

    def test_contains_known_categories(self):
        assert 6014 in ITUNES_CATEGORIES  # Games
        assert 6000 in ITUNES_CATEGORIES  # Business
        assert 6015 in ITUNES_CATEGORIES  # Finance

    def test_no_duplicate_names(self):
        names = list(ITUNES_CATEGORIES.values())
        assert len(names) == len(set(names)), "Duplicate category names found"


class TestSupportedCountries:
    def test_not_empty(self):
        assert len(SUPPORTED_COUNTRIES) > 0

    def test_codes_are_uppercase_two_letter(self):
        for code in SUPPORTED_COUNTRIES:
            assert len(code) == 2, f"Code {code} is not 2 chars"
            assert code == code.upper(), f"Code {code} is not uppercase"

    def test_contains_us(self):
        assert "US" in SUPPORTED_COUNTRIES
        assert SUPPORTED_COUNTRIES["US"] == "United States"

    def test_contains_nl(self):
        assert "NL" in SUPPORTED_COUNTRIES
        assert SUPPORTED_COUNTRIES["NL"] == "Netherlands"

    def test_no_duplicate_codes(self):
        codes = list(SUPPORTED_COUNTRIES.keys())
        assert len(codes) == len(set(codes))


class TestSearchTerms:
    def test_not_empty(self):
        assert len(SEARCH_TERMS) > 0

    def test_contains_all_lowercase_letters(self):
        for char in "abcdefghijklmnopqrstuvwxyz":
            assert char in SEARCH_TERMS, f"Missing letter: {char}"

    def test_all_are_strings(self):
        for term in SEARCH_TERMS:
            assert isinstance(term, str)

    def test_all_are_lowercase(self):
        for term in SEARCH_TERMS:
            assert term == term.lower(), f"Term '{term}' is not lowercase"

    def test_contains_common_words(self):
        assert "app" in SEARCH_TERMS
        assert "free" in SEARCH_TERMS
