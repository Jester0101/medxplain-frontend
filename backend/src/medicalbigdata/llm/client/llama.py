# Add all Llama-specific settings & functions here
import os

os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"

import torch
from peft import LoraConfig, prepare_model_for_kbit_training, get_peft_model
from transformers import (
    AutoModelForCausalLM,
    AutoModelForSequenceClassification,
    AutoTokenizer,
    BitsAndBytesConfig,
)

from medicalbigdata.settings import local_rank

if local_rank < 1:
    print(f"CUDA DEVICES:",
          "; ".join(
              f"GPU {i}: {torch.cuda.get_device_properties(i).name}@{torch.cuda.get_device_properties(i).total_memory // 1024 ** 3}|{torch.cuda.memory_reserved(i) // 1024 ** 3}|{torch.cuda.memory_allocated(i) // 1024 ** 3}GB"
              for i in range(torch.cuda.device_count())))

# =============================================================================
# BITS&BYTES CONFIGURATION
# =============================================================================

quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,  # enable 4-bit quantization
    bnb_4bit_quant_type='nf4',  # information theoretically optimal dtype for normally distributed weights
    bnb_4bit_use_double_quant=True,  # quantized weights
    bnb_4bit_compute_dtype=torch.bfloat16  # optimized fp format for ML
)

# =============================================================================
# LORA CONFIGURATION
# =============================================================================

lora_config = LoraConfig(
  r=16, # good value for start
  lora_alpha=16, # best to use <r> or <2*r>
  #   target_modules=["q_proj", "k_proj", "v_proj", "o_proj"], # target attention modules
  target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"], # target major modules
  lora_dropout=0.10, # dropout not as important
  bias="none",
  task_type="SEQ_CLS",
  modules_to_save=["score"],
  use_rslora=True
)


def load_model_for_generation(model_name, load_in_4bit=False):
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = 'left'  # needed for batching!

    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        quantization_config=quantization_config if load_in_4bit else None,
        low_cpu_mem_usage=True if load_in_4bit else None,
        device_map="auto"
    )

    model.config.pad_token_id = tokenizer.eos_token_id
    model.use_cache = False
    # model.gradient_checkpointing_enable()

    if load_in_4bit:
        model = prepare_model_for_kbit_training(model)
    model = get_peft_model(model, lora_config)

    return model, tokenizer


def load_model_for_classification(model_name, num_labels=2, load_in_4bit=False):
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = 'left'  # needed for batching!

    model = AutoModelForSequenceClassification.from_pretrained(
        model_name,
        num_labels=num_labels,
        quantization_config=quantization_config if load_in_4bit else None,
        low_cpu_mem_usage=True if load_in_4bit else None,
        device_map="auto"
    )

    model.config.pad_token_id = tokenizer.eos_token_id
    model.use_cache = False
    # model.gradient_checkpointing_enable() # saves some memory but increases runtime

    if load_in_4bit:
        model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=False)
    model = get_peft_model(model, lora_config)

    return model, tokenizer
