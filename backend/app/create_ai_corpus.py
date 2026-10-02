from __future__ import annotations

import csv
from datetime import date
from pathlib import Path

from .config import AI_CORPUS_DIR, AI_CORPUS_PATH


FIELDS = [
    "id", "title", "company", "description", "location", "salary",
    "source_type", "fraudulent", "ai_generated", "generation_method",
    "provenance", "generation_date", "prompt_template_id",
]


def _record(index: int, ai_generated: int, fraudulent: int, description: str) -> dict:
    group = f"{'ai' if ai_generated else 'human'}_{'fraudulent' if fraudulent else 'legitimate'}"
    return {
        "id": f"controlled-{index:03d}",
        "title": "Operations Coordinator" if not fraudulent else "Remote Hiring Coordinator",
        "company": "Example Research Cooperative" if not fraudulent else "Synthetic Hiring Scenario",
        "description": description,
        "location": "Remote",
        "salary": "$70,000-$90,000" if not fraudulent else "$2,000 per day",
        "source_type": "controlled_synthetic_corpus",
        "fraudulent": fraudulent,
        "ai_generated": ai_generated,
        "generation_method": "deterministic_template_v1" if ai_generated else "researcher_authored_template_v1",
        "provenance": (
            "Generated from a deterministic template for this research corpus; no real person or organization."
            if ai_generated else
            "Manually authored control text by the project researcher; no real person or organization."
        ),
        "generation_date": str(date.today()),
        "prompt_template_id": f"{group}_v1",
    }


def create_corpus(records_per_group: int = 10, output_path: Path = AI_CORPUS_PATH) -> Path:
    """Create a balanced, provenance-labeled corpus without using EMSCAD labels."""
    ai_legitimate = (
        "The team is seeking an operations coordinator to support scheduling, vendor "
        "communication, and process documentation. The successful candidate will "
        "collaborate with colleagues, maintain clear records, and improve routine workflows."
    )
    ai_fraudulent = (
        "We are seeking motivated remote applicants for immediate placement. Successful "
        "candidates will receive guaranteed daily payments after completing a small "
        "registration step. Contact the fictional hiring desk for onboarding details."
    )
    human_legitimate = (
        "We need someone organized to keep our small operations team on track. You will "
        "book meetings, follow up with suppliers, and tidy up our shared records. "
        "There is room to learn the business and take on more responsibility."
    )
    human_fraudulent = (
        "This fictional advert describes a risky offer: unusually high pay, no experience "
        "needed, and a request for an upfront registration payment. It is included only "
        "as a controlled synthetic fraud scenario, not as a real opportunity."
    )
    templates = [
        (1, 0, ai_legitimate), (1, 1, ai_fraudulent),
        (0, 0, human_legitimate), (0, 1, human_fraudulent),
    ]
    rows = []
    index = 1
    for ai_generated, fraudulent, text in templates:
        for _ in range(records_per_group):
            rows.append(_record(index, ai_generated, fraudulent, text))
            index += 1
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    return output_path


if __name__ == "__main__":
    print(create_corpus())
