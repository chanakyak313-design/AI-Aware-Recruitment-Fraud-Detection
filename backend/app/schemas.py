from typing import Any

from pydantic import BaseModel, Field


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


class AnalysisResponse(BaseModel):
    fraud_probability: float
    ai_generation_probability: float | None
    risk_level: str
    fraud_indicators: list[str]
    ai_indicators: list[str]
    explanation: dict[str, Any]
