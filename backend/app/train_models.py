from __future__ import annotations

import json
import sys
from pathlib import Path

if __package__:
    from .config import EMSCAD_DATA_PATH, RESULTS_DIR
    from .model_service import FraudAIAnalyzer
else:
    repo_backend = Path(__file__).resolve().parents[1]
    if str(repo_backend) not in sys.path:
        sys.path.insert(0, str(repo_backend))
    from app.config import EMSCAD_DATA_PATH, RESULTS_DIR
    from app.model_service import FraudAIAnalyzer


def run_training(data_path: str | None = None):
    path = Path(data_path) if data_path else EMSCAD_DATA_PATH
    analyzer = FraudAIAnalyzer(path)
    analyzer.train_models(path)
    result = analyzer.get_research_results()
    output_path = RESULTS_DIR / "experiment_summary.json"
    output_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


if __name__ == "__main__":
    data_path = sys.argv[1] if len(sys.argv) > 1 else None
    run_training(data_path)
