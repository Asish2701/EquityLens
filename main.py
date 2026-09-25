"""Compatibility entrypoint for local tooling and Vercel auto-detection.

The production API lives in api/index.py. Keeping this module as a thin
re-export prevents accidental Vercel imports from pulling in frontend-serving
code or optional dependencies during function initialization.
"""

from api.index import app

__all__ = ["app"]
