# Controlled AI-labeled corpus

This corpus is separate from EMSCAD and does not modify its `fraudulent` labels.
It is a reproducible, controlled synthetic research corpus with four independent
groups:

- AI-generated legitimate
- AI-generated fraudulent (synthetic scenario only)
- Human-authored legitimate control
- Human-authored fraudulent (synthetic scenario only)

`ai_generated=1` means the text was produced from the deterministic template
workflow in `backend/app/create_ai_corpus.py`. `ai_generated=0` means the text
was manually authored as a researcher control template; it is not a claim about
an unknown internet posting. `fraudulent` is an independent scenario label.
No real people, credentials, or organizations are used.

The corpus is suitable for demonstrating the independent-signal experiment. It
does not establish performance on real-world AI-written job postings.
