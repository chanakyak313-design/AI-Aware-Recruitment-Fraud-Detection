from typing import Any

from pydantic import BaseModel, Field


class ComparisonSource(BaseModel):
    platform: str = Field(default="Other source", max_length=100)
    title: str = Field(default="", max_length=500)
    company: str = Field(default="", max_length=500)
    location: str = Field(default="", max_length=500)
    salary: str = Field(default="", max_length=500)
    url: str = Field(default="", max_length=2000)


class JobPayload(BaseModel):
    title: str = Field(default="", max_length=500)
    company: str = Field(default="", max_length=500)
    description: str = Field(default="", max_length=20000)
    salary: str = Field(default="", max_length=500)
    location: str = Field(default="", max_length=500)
    email: str = Field(default="", max_length=500)
    website: str = Field(default="", max_length=2000)
    application_url: str = Field(default="", max_length=2000)
    employment_type: str = Field(default="", max_length=500)
    experience: str = Field(default="", max_length=500)
    requirements: str = Field(default="", max_length=10000)
    benefits: str = Field(default="", max_length=10000)
    comparison_sources: list[ComparisonSource] = Field(default_factory=list, max_length=5)


class AnalysisResponse(BaseModel):
    fraud_probability: float
    ai_generation_probability: float | None
    risk_level: str
    fraud_indicators: list[str]
    ai_indicators: list[str]
    explanation: dict[str, Any]
