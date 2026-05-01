## Notebooks

This folder is for exploratory analysis, model experiments, and one-off investigations that do not belong in the production package.

Recommended notebook flow:

1. Load data from `data/raw/` or regenerate it with the package CLI.
2. Explore features, model choices, and evaluation ideas.
3. Save only the findings that are useful for the codebase, reports, or README updates.

Keep notebooks focused and reproducible:

- Use clear names like `eda_aapl.ipynb` or `feature_experiments.ipynb`.
- Prefer small, self-contained cells that can be rerun from top to bottom.
- Avoid committing large generated outputs, temporary scratch cells, or duplicate datasets.

If a notebook produces a result worth keeping, move the logic into `src/stock_future_analysis/` and store any summary artifacts in `reports/`.
