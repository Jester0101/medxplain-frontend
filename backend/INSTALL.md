# Installation Instructions

Install Pyenv by following its installation instructions:
https://github.com/pyenv/pyenv

```bash
pyenv install 3.12
pyenv global 3.12
pip install --upgrade pip
```

Then simply install the latest versions of the following Python packages (as of Dec. 2025):

```bash
pip install vllm unsloth deepspeed numpy==2.2.0 scipy scikit-learn==1.5.2 datasets pyreadstat tableone optuna catboost linearboost xgboost pytabkit umap-learn shap wandb google-genai httpx==0.27.2 openai pandas jupyter
``` 

Alternatively, you can get the exact versions from our requirements.txt:

```bash
pip install -r ./requirements.txt 
```

Optionally, you can then perform the following step to upgrade to the latest PyTorch 2.9 for CUDA 13:

```bash
pip install --force-reinstall torch==2.9.0 torchvision==0.24.0 torchaudio==2.9.0 --index-url https://download.pytorch.org/whl/cu130
```

Finally, uninstall PyTorch/AO to avoid an incompatibility warning (torchao is not yet compatible with the latest torch release, and we do not use it anyway):


```bash
pip uninstall torchao
```