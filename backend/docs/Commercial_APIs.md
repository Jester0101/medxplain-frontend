# Generating with Commercial APIs

Run `src/generate_LURIC.py` with your chosen provider, e.g.:

```python
from medicalbigdata.llm.client.gemini import generate_async
from medicalbigdata.llm.prompting import *
from medicalbigdata.settings.luric import *


def main():
    LURIC = load_SAV(filename="LURIC_firstobs_2025-03-08.sav")
    COHORT = coropredict_cohort(LURIC)
    labels = label_1YM(COHORT)
    dataset = get_sample_ds(get_prompts_ds(COHORT, FEATURES_60, labels), pos=50, neg=50)

    # Choose your model:
    generate_async("gemini-flash-latest", dataset)


if __name__ == "__main__":
    main()
```


**Requirements:**
- Set `GEMINI_API_KEY` environment variable