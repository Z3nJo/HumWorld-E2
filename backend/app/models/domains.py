from enum import StrEnum


class Continent(StrEnum):
    AFRICA = "Africa"
    AMERICA = "America"
    ANTARCTICA = "Antartida"
    ASIA = "Asia"
    EUROPE = "Europa"
    OCEANIA = "Oceania"


class Language(StrEnum):
    SPANISH = "es"
    ENGLISH = "en"


class IptcCategory(StrEnum):
    ARTS_CULTURE_ENTERTAINMENT_MEDIA = "arts/culture/entertainment/media"
    CONFLICT_WAR_PEACE = "conflict/war/peace"
    CRIME_LAW_JUSTICE = "crime/law/justice"
    DISASTER_ACCIDENT = "disaster/accident"
    ECONOMY_BUSINESS_FINANCE = "economy/business/finance"
    EDUCATION = "education"
    ENVIRONMENT = "environment"
    HEALTH = "health"
    HUMAN_INTEREST = "human interest"
    LABOUR = "labour"
    LIFESTYLE_LEISURE = "lifestyle/leisure"
    POLITICS = "politics"
    RELIGION = "religion"
    SCIENCE_TECHNOLOGY = "science/technology"
    SOCIETY = "society"
    SPORT = "sport"
    WEATHER = "weather"
