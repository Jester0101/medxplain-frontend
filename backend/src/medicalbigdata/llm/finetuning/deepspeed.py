import gc, json, wandb
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold
from medicalbigdata.llm.client.llama import *
from medicalbigdata.settings import *
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    TrainerCallback,
    EarlyStoppingCallback,
    DataCollatorWithPadding,
    set_seed)


def finetune_ds(model_name, dataset, load_in_4bit=False, n_splits=5, n_epochs=5, eval_strat="LAST", custom_loss=False,
                wandb_tags=None):
    global global_metrics
    global_metrics = []

    # =============================================================================
    # WANDB INITIALIZATION
    # =============================================================================

    if local_rank < 1 and wandb_tags:
        wandb.init(
            project="medical-research",
            config={
                "target": "1y mort risk",
                "model_name": model_name,
                "load_in_4bit": load_in_4bit,
                "folds": n_splits,
                "epochs": n_epochs,
                "deepspeed": json.load(open(os.path.join(WORK_DIRECTORY, "config/ds_config.json")))
            },
            tags=["fine-tuned", "LoRA", "deepspeed"] + wandb_tags
        )
        wandb.define_metric("eval/auc", summary=eval_strat)

    best_aucs_per_fold = []  # final AUCs per fold

    # =============================================================================
    # TOKENIZER & PADDING SETUP
    # =============================================================================

    tokenizer = AutoTokenizer.from_pretrained(model_name)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    # =============================================================================
    # DATASET CREATION & TOKENIZATION
    # =============================================================================

    dataset = Dataset.from_dict({'text': dataset['oneshot'], 'labels': dataset['label']})

    def tokenize(examples):
        return tokenizer(examples['text'],
                         truncation=True,
                         max_length=2048,  # adjust as needed
                         )

    dataset = dataset.map(tokenize, batched=True)
    data_collator = DataCollatorWithPadding(tokenizer=tokenizer)

    # =============================================================================
    # DEFINE BASIC METRIC
    # =============================================================================

    def compute_metrics(eval_pred):
        predictions, labels = eval_pred
        probs = torch.sigmoid(torch.Tensor(predictions)).numpy()
        return {"auc": roc_auc_score(labels, probs[:, 1])}

    # =============================================================================
    # CROSS-VALIDATION SETUP
    # =============================================================================

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=13)
    splits = list(cv.split(range(len(dataset)), dataset['labels']))

    for fold_idx in range(len(splits)):

        global_metrics = []  # reset the metrics for every fold
        set_seed(42)  # set global seed in torch for better reproducibility
        train_idxs, test_idxs = splits[fold_idx]

        if local_rank < 1:
            print("\nPROCESSING FOLD:", fold_idx)
        if "TRIPLE" in eval_strat:
            split = dataset.select(train_idxs).train_test_split(test_size=0.2)
            ds_train = split['train']
            ds_val = split['test']
        else:
            ds_train = dataset.select(train_idxs)
            ds_val = dataset.select(test_idxs)
        ds_test = dataset.select(test_idxs)

        n_pos_train = sum([l for l in ds_train['labels']])
        n_neg_train = len(ds_train) - n_pos_train
        if local_rank < 1:
            print("TRAIN:", n_pos_train, "POS /", n_neg_train, "NEG /", len(ds_train), "TOTAL")

        n_pos_val = sum([l for l in ds_val['labels']])
        n_neg_val = len(ds_val) - n_pos_val
        if local_rank < 1:
            print("VAL:  ", n_pos_val, "POS /", n_neg_val, "NEG /", len(ds_val), "TOTAL")

        n_pos_test = sum([l for l in ds_test['labels']])
        n_neg_test = len(test_idxs) - n_pos_test
        if local_rank < 1 and "TRIPLE" in eval_strat:
            print("TEST: ", n_pos_test, "POS /", n_neg_test, "NEG /", len(ds_test), "TOTAL")
            print()

        # =============================================================================
        # RELOAD MODEL FOR EVERY FOLD
        # =============================================================================

        model = AutoModelForSequenceClassification.from_pretrained(
            model_name,
            num_labels=2,
            torch_dtype=torch.bfloat16,
            quantization_config=quantization_config if load_in_4bit else None,
            low_cpu_mem_usage=True if load_in_4bit else None,
        )

        # model.gradient_checkpointing_enable()
        model.config.use_cache = False
        model.config.pad_token_id = tokenizer.pad_token_id

        if load_in_4bit:
            model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=False)
        model = get_peft_model(model, lora_config)

        # =============================================================================
        # TRAINING ARGUMENTS
        # =============================================================================

        args = TrainingArguments(
            output_dir=os.path.join(DATA_DIRECTORY, model_name + "-ckpts-" + str(fold_idx)),
            load_best_model_at_end=True,
            metric_for_best_model='eval_auc',
            num_train_epochs=n_epochs,
            per_device_train_batch_size=2,
            gradient_accumulation_steps=2,
            learning_rate=1e-4,
            weight_decay=1e-2,
            lr_scheduler_type="cosine",
            warmup_steps=150,
            max_grad_norm=1.0,
            deepspeed=os.path.join(WORK_DIRECTORY, "config/ds_config.json"),
            optim="adamw_torch_fused",
            bf16=True,
            eval_strategy="epoch",
            save_strategy="epoch",
            dataloader_pin_memory=True,
            gradient_checkpointing=False,
            ddp_find_unused_parameters=False,
            report_to=["wandb"] if wandb_tags else [],
            # logging_steps=100,
            # logging_strategy="epoch"  # or use this to log only at epoch end
        )

        # =============================================================================
        # TRAINING
        # =============================================================================

        if custom_loss:

            if local_rank < 1:
                print("USING CLASS WEIGHTS:", [n_neg_train / len(train_idxs), n_pos_train / len(train_idxs)])

            import torch.nn.functional as F

            class CustomTrainer(Trainer):
                def __init__(self, *args, class_weights=None, **kwargs):
                    super().__init__(*args, **kwargs)
                    if class_weights is not None:
                        self.class_weights = torch.tensor(class_weights, dtype=torch.bfloat16).detach().clone().to(
                            self.args.device)
                    else:
                        self.class_weights = None

                def compute_loss(self, model, inputs, num_items_in_batch=None, return_outputs=False):
                    labels = inputs.pop('labels')
                    outputs = model(**inputs)
                    logits = outputs.get('logits')
                    if self.class_weights is not None:
                        loss = F.cross_entropy(logits, labels, weight=self.class_weights)
                    else:
                        loss = F.cross_entropy(logits, labels)
                    return (loss, outputs) if return_outputs else loss

            trainer = CustomTrainer(
                model=model,
                args=args,
                train_dataset=ds_train,
                eval_dataset=ds_val,
                tokenizer=tokenizer,
                data_collator=data_collator,
                compute_metrics=compute_metrics,
                class_weights=[n_neg_train / len(train_idxs), n_pos_train / len(train_idxs)],
            )

        else:

            trainer = Trainer(
                model=model,
                args=args,
                train_dataset=ds_train,
                eval_dataset=ds_val,
                processing_class=tokenizer,
                data_collator=data_collator,
                compute_metrics=compute_metrics,
            )

        # =============================================================================
        # CALLBACKS
        # =============================================================================

        class CustomTrainerCallback(TrainerCallback):
            def on_epoch_end(self, args, state, control, **kwargs):
                if "TRIPLE" in eval_strat:  # we call evaluate() twice: test & val splits
                    test_metrics = trainer.evaluate(ds_test)
                    val_metrics = trainer.evaluate(ds_val)
                    if local_rank < 1:
                        print("           VAL AUC:", val_metrics['eval_auc'], "TEST AUC:", test_metrics['eval_auc'],
                              "\n")
                    global_metrics.append(
                        {'val_metrics': val_metrics, 'test_metrics': test_metrics})
                else:
                    val_metrics = trainer.evaluate(ds_val)
                    if local_rank < 1:
                        print("\nVAL AUC:", val_metrics['eval_auc'], "\n")
                    global_metrics.append({'val_metrics': val_metrics})

        class CustomEarlyStoppingCallback(EarlyStoppingCallback):
            def __init__(self, min_epochs: int = 4, early_stopping_patience: int = 1,
                         early_stopping_threshold: float = 0.0):
                self.early_stopping_patience = early_stopping_patience
                self.early_stopping_threshold = early_stopping_threshold
                self.early_stopping_patience_counter = 0
                self.min_epochs = min_epochs
                self.best_metric = None

            def check_metric_value(self, args, state, control, metric_value):
                if len(state.log_history) % 2 == 0:  # every second call is the one for the val split!
                    if self.best_metric is None or metric_value - self.best_metric > self.early_stopping_threshold:
                        self.early_stopping_patience_counter = 0
                    else:
                        self.early_stopping_patience_counter += 1
                    if local_rank < 1:
                        print("\nEARLY-STOP VAL AUC:", metric_value, "BEST AUC:", self.best_metric, "COUNTER:",
                              self.early_stopping_patience_counter, "EPOCHS:", state.epoch, "MIN_EPOCHS:",
                              self.min_epochs, "STATE:", len(state.log_history))
                    self.best_metric = max(metric_value, self.best_metric if self.best_metric else 0.0)

            def on_evaluate(self, args, state, control, metrics, **kwargs):
                metric_to_check = args.metric_for_best_model
                if not metric_to_check.startswith("eval_"):
                    metric_to_check = f"eval_{metric_to_check}"
                metric_value = metrics.get(metric_to_check)
                self.check_metric_value(args, state, control, metric_value)
                if state.epoch >= self.min_epochs and self.early_stopping_patience_counter >= self.early_stopping_patience:
                    control.should_training_stop = True

        trainer.add_callback(CustomTrainerCallback())
        if eval_strat == "TRIPLE_EARLY":
            trainer.add_callback(CustomEarlyStoppingCallback(5, 2, 0.01))

        # =============================================================================
        # EXECUTION
        # =============================================================================

        torch.cuda.empty_cache()
        result = trainer.train()

        if local_rank < 1:
            trainer.model.save_pretrained(os.path.join(DATA_DIRECTORY, model_name + "-final-" + str(fold_idx)),
                                          save_adapter=True,
                                          save_config=True)
            print("\nRESULT METRICS:", result.metrics)
            print()

        # flush before next iteration
        del model
        del result
        del trainer
        del args

        gc.collect()

        if eval_strat == "BEST":
            best_aucs_per_fold.append(max([r['val_metrics']['eval_auc'] for r in global_metrics]))
        elif eval_strat == "BEST_AFTER_5":
            best_aucs_per_fold.append(max([r['val_metrics']['eval_auc'] for r in global_metrics[5:]]))
        elif eval_strat == "LAST":
            best_aucs_per_fold.append([r['val_metrics']['eval_auc'] for r in global_metrics][-1])
        elif eval_strat == "TRIPLE_BEST" or eval_strat == "TRIPLE_EARLY":
            best_epoch = np.argmax(
                [r['val_metrics']['eval_auc'] for r in global_metrics])  # we pick the best 'val_metrics'
            test_auc = global_metrics[best_epoch]['test_metrics'][
                'eval_auc']  # and we report the corresp. 'test_metrics'
            if local_rank < 1:
                print("STOP AFTER", len(global_metrics), "EPOCHS; VAL_AUC =", global_metrics[best_epoch]['val_metrics'][
                    'eval_auc'], "TEST_AUC =", test_auc, "@ BEST EPOCH", (best_epoch + 1))
            best_aucs_per_fold.append(test_auc)
        else:
            print("WARNING: UNKNOWN EVAL STRATEGY [", eval_strat, "] !")
            best_aucs_per_fold.append(0.0)

    best_aucs_per_fold = np.array(best_aucs_per_fold)
    if local_rank < 1:
        print(
            f"\nFINETUNING DS {model_name} {n_splits}-FOLD CV AVG AUC: {best_aucs_per_fold.mean():.3f} (+/- {best_aucs_per_fold.std():.3f}) {eval_strat}\n")

    if local_rank < 1 and wandb_tags:
        wandb.log({'auc': {'mean': best_aucs_per_fold.mean(), 'std': best_aucs_per_fold.std()}})
        artifact = wandb.Artifact('training-code', type='code')  # log code as artifact
        artifact.add_file(__file__)
        wandb.log_artifact(artifact)
        wandb.finish()
