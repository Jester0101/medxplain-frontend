import argparse
import logging

from medicalbigdata.settings import *
from medicalbigdata.settings.attica import load_XLS as ATTICA_load_XLS, FEATURES_12 as ATTICA_features_12, \
    contrastive_cohort_1YM as ATTICA_contrastive_cohort_1YM, contrastive_cohort_10YM as ATTICA_contrastive_cohort_10YM, \
    contrastive_cohort_20YM as ATTICA_contrastive_cohort_20YM, labels_1YM as ATTICA_labels_1YM, \
    labels_10YM as ATTICA_labels_10YM, labels_20YM as ATTICA_labels_20YM
from medicalbigdata.settings.luric import load_SAV as LURIC_load_SAV, FEATURES_12 as LURIC_features_12, \
    FEATURES_COROV1 as LURIC_features_COROV1, FEATURES_20 as LURIC_features_20, FEATURES_21 as LURIC_features_21, \
    FEATURES_60 as LURIC_features_60, FEATURES_90 as LURIC_features_90, \
    contrastive_cohort_1YM as LURIC_contrastive_cohort_1YM, contrastive_cohort_10YM as LURIC_contrastive_cohort_10YM, \
    coropredict_cohort as LURIC_coropredict_cohort, smart_cohort as LURIC_smart_cohort, labels_1YM as LURIC_labels_1YM, \
    labels_10YM as LURIC_labels_10YM


# FIXME Switch all print() to logging.info() messages, include W&B logging for all tasks!

def str2bool(v):
    if isinstance(v, bool):
        return v
    elif v.lower() in ('yes', 'true'):
        return True
    elif v.lower() in ('no', 'false'):
        return False
    else:
        raise argparse.ArgumentTypeError('Boolean value expected!')


def main():
    parser = argparse.ArgumentParser(
        description='Run various regression and LLM tasks on the LURIC & ATTICA collections (LURIC is default).',
        epilog='''
Examples:
  Basic SVM regression with LURIC_12 (RiskyCAD) features using fillna(0) already yields 0.828 AUC!
    python src/run.py --collection LURIC --features LURIC_12 --fillna zero --task regression_svm_pl
  
  Single GPU Finetuning (Transformers):
    CUDA_VISIBLE_DEVICES=0 python ./src/run.py --task finetune_tf --load_in_4bit --wandb_tags experiment-1
    CUDA_VISIBLE_DEVICES=0 python ./src/run.py --task finetune_tf --load_in_4bit --wandb_tags experiment-1 baseline ablation

  Multi-GPU Finetuning (DeepSpeed):
    deepspeed --include="localhost:1,2,3" ./src/run.py --task finetune_ds
        ''',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument('--task', type=str, default='show_prompts',
                        choices=[
                            'generate_tf_batch',
                            'generate_unsloth_seq',
                            'generate_unsloth_batch',  # [input: 423118.65 toks/s, output: 8033.89 toks/s] on 8B !!
                            'generate_vllm_seq',
                            'generate_vllm_batch',  # [input: 1629535.67 toks/s, output: 30940.38 toks/s] on 8B !!!
                            'generate_gemini_seq',
                            'generate_gemini_async',
                            'generate_claude',
                            'generate_claude_async',
                            'generate_openai',
                            'finetune_tf',
                            'finetune_ds',
                            'regression_svm_pl',
                            'regression_svm_op',
                            'regression_linearboost_pl',
                            'regression_linearboost_op',
                            'regression_catboost_pl',
                            'regression_catboost_op',
                            'regression_xgboost_pl',
                            'regression_xgboost_op',
                            'regression_realmlp_pl',
                            'regression_realmlp_op',
                            'regression_all',
                            'ensemble_svm_pl',
                            'ensemble_svm_op',
                            'ensemble_catboost_pl',
                            'ensemble_catboost_op',
                            'show_prompts'
                        ],
                        help='The task to perform (default: test_prompt)')
    parser.add_argument('--collection', type=str, default='LURIC',
                        choices=['LURIC', 'ATTICA'],
                        help='The input collection (default: LURIC)')  # collections need specific settings!
    parser.add_argument('--cohort', type=str, default='full',
                        choices=['full', 'contrastive_1YM', 'contrastive_10YM', 'contrastive_20YM', 'coropredict',
                                 'smart'],
                        help='Cohort selection (default: full)')
    parser.add_argument('--features', type=str, default='LURIC_60',
                        choices=['LURIC_12', 'LURIC_COROV1', 'LURIC_20', 'LURIC_21', 'LURIC_60', 'LURIC_90',
                                 'ATTICA_12'],
                        help='Feature set to use (default: LURIC_60)')
    parser.add_argument('--subsample', type=int, nargs=2, metavar=('POS', 'NEG'),
                        help='Subsample dataset: --subsample 50 50 (default: none)')
    parser.add_argument('--labels', type=str, default='1YM',
                        choices=['1YM', '10YM', '20YM'],
                        help='The labels to train & predict (default: 1YM)')
    parser.add_argument('--fillna', type=str, default='none',
                        choices=['median', 'mean', 'zero', 'none'],
                        help='The automatic Pandas way of filling missing values (default: none). Note that various regression pipelines use their own Sklearn imputers.')
    parser.add_argument('--model', type=str, default='m42-health/Llama3-Med42-8B',
                        # choices=[
                        #    'meta-llama/Meta-Llama-3-8B',
                        #    'meta-llama/Llama-3.1-70B',
                        #    'aaditya/Llama3-OpenBioLLM-8B',
                        #    'aaditya/Llama3-OpenBioLLM-70B',
                        #    'Henrychur/MMed-Llama-3-8B',
                        #    'Henrychur/MMed-Llama3.1-70B',
                        #    'm42-health/Llama3-Med42-8B',
                        #    'm42-health/Llama3-Med42-70B',
                        # ],
                        help='Open or commercial model for LLM-based tasks (HuggingFace default: m42-health/Llama3-Med42-8B)')
    parser.add_argument('--load_in_4bit', type=str2bool, nargs='?', default=False,
                        help='Use 4-bit quantization (default: False/No)')
    parser.add_argument('--n_splits', type=int, default=5,
                        help='Number of CV folds (default: 5)')
    parser.add_argument('--n_epochs', type=int, default=10,
                        help='Maximum number of epochs for finetuning tasks (default: 10)')
    parser.add_argument('--eval_strat', type=str, default='BEST_AFTER_5',
                        choices=['BEST', 'BEST_AFTER_6', 'LAST', 'TRIPLE_BEST', 'TRIPLE_EARLY'],
                        help='Evaluation strategy (default: BEST_AFTER_5)')
    parser.add_argument('--wandb_tags', type=str, nargs='+', default=None,
                        help='W&B experiment tags (can specify multiple)')
    parser.add_argument('--log_level', type=str, default='WARNING',
                        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
                        help='Logging level (default: WARNING)')
    parser.add_argument('--include_age', type=str2bool, nargs='?', default=True,
                        help='Include \'age\' in all feature sets (default: True/Yes)')
    parser.add_argument('--include_sex', type=str2bool, nargs='?', default=True,
                        help='Include \'sex\' in all feature sets (default: True/Yes)')
    parser.add_argument('--local_rank', type=int, default=-1)  # NOTE: required by DeepSpeed!
    args = parser.parse_args()
    if args.local_rank < 1:
        for attr in vars(args):
            print("> %s = %r" % (attr, getattr(args, attr)))
    logging.basicConfig(level=getattr(logging, args.log_level))

    COHORT = None
    LABELS = None

    # Load collection into initial dataframe & select (sub-)cohort
    if args.collection == 'LURIC':
        COLLECTION = LURIC_load_SAV(filename="LURIC_firstobs_2025-03-08.sav")
        if args.cohort == 'full':
            COHORT = COLLECTION
        elif args.cohort == 'contrastive_1YM':
            COHORT = LURIC_contrastive_cohort_1YM(COLLECTION)
        elif args.cohort == 'contrastive_10YM':
            COHORT = LURIC_contrastive_cohort_10YM(COLLECTION)
        elif args.cohort == 'coropredict':
            COHORT = LURIC_coropredict_cohort(COLLECTION)
        elif args.cohort == 'smart':
            COHORT = LURIC_smart_cohort(COLLECTION)
        if args.labels == '1YM':
            LABELS = LURIC_labels_1YM(COHORT)
        elif args.labels == '10YM':
            LABELS = LURIC_labels_10YM(COHORT)
    elif args.collection == 'ATTICA':
        COLLECTION = ATTICA_load_XLS(filename="ATTICA_Study_20_yr_FU_Data_Analysis_Shared.xls")
        if args.cohort == 'full':
            COHORT = COLLECTION
        elif args.cohort == 'contrastive_1YM':
            COHORT = ATTICA_contrastive_cohort_1YM(COLLECTION)
        elif args.cohort == 'contrastive_10YM':
            COHORT = ATTICA_contrastive_cohort_10YM(COLLECTION)
        elif args.cohort == 'contrastive_20YM':
            COHORT = ATTICA_contrastive_cohort_20YM(COLLECTION)
        if args.labels == '1YM':
            LABELS = ATTICA_labels_1YM(COHORT)
        elif args.labels == '10YM':
            LABELS = ATTICA_labels_10YM(COHORT)
        elif args.labels == '20YM':
            LABELS = ATTICA_labels_20YM(COHORT)

    feature_sets = {
        'LURIC_12': LURIC_features_12,
        'LURIC_COROV1': LURIC_features_COROV1,
        'LURIC_20': LURIC_features_20,
        'LURIC_21': LURIC_features_21,
        'LURIC_60': LURIC_features_60,
        'LURIC_90': LURIC_features_90,
        'ATTICA_12': ATTICA_features_12
    }

    FEATURES = feature_sets[args.features]

    if args.include_sex and not 'sex' in FEATURES:
        FEATURES = ['sex'] + FEATURES
    elif not args.include_sex and 'sex' in FEATURES:
        FEATURES.remove('sex')
    if args.include_age and not 'age' in FEATURES:
        FEATURES = ['age'] + FEATURES
    elif not args.include_age and 'age' in FEATURES:
        FEATURES.remove('age')

    if 'regression' in args.task or 'ensemble' in args.task:  # using Pandas Dataframe API for regression/ensemble tasks
        cat_features = None
        from medicalbigdata.features.ensemble import extract_cat_features
        if 'ensemble_svm' in args.task:  # SVM with only numerical columns
            X, _ = extract_cat_features(transform_categorical(COHORT, to_numeric=True))
            X['label'] = LABELS  # needed inside DF for feature selection
        elif 'ensemble_catboost' in args.task:  # CatBoost with both numerical & categorical columns
            X, cat_features = extract_cat_features(COHORT)
            X['label'] = LABELS  # needed inside DF for feature selection
        else:
            X = COHORT[FEATURES]  # select your feature set for all regression tasks
            if args.collection == 'ATTICA':
                X = transform_categorical(X, to_numeric=True)  # need to transform categorical to numeric for ATTICA!
        if args.fillna == 'median':
            X = X.fillna(X.median())
        elif args.fillna == 'mean':
            X = X.fillna(X.mean())
        elif args.fillna == 'zero':  # default Pandas completion of NaNs (+1% for SVMs!)
            X = X.fillna(0)
        if args.subsample:
            pos, neg = args.subsample
            X, LABELS = get_sample_df(X, LABELS, pos=pos, neg=neg)
        print(X.info())
        print(X)
        print("CATEGORICAL FEATURES: " + str(cat_features))  # all predefined LURIC features are currently numeric!
        if 'regression_svm_pl' in args.task or '_all' in args.task:
            import medicalbigdata.regression.svm.pipeline as svm_pl
            svm_pl.run(X, LABELS, args.n_splits)  # single run with default hyperparameters
        if 'regression_svm_op' in args.task or '_all' in args.task:
            import medicalbigdata.regression.svm.optuna as svm_op
            svm_op.run(X, LABELS, args.n_splits)  # run with optuna-optimized range of hyperparameters
        if 'regression_linearboost_pl' in args.task or '_all' in args.task:
            import medicalbigdata.regression.linearboost.pipeline as lin_pl
            lin_pl.run(X, LABELS, args.n_splits)  # single run with default hyperparameters
        if 'regression_linearboost_op' in args.task or '_all' in args.task:
            import medicalbigdata.regression.linearboost.optuna as lin_op
            lin_op.run(X, LABELS, args.n_splits)  # run with optuna-optimized range of hyperparameters
        if 'regression_catboost_pl' in args.task or '_all' in args.task:
            import medicalbigdata.regression.catboost.pipeline as cat_pl
            cat_pl.run(X, LABELS, args.n_splits, cat_features)  # single run with default hyperparameters
        if 'regression_catboost_op' in args.task or '_all' in args.task:
            import medicalbigdata.regression.catboost.optuna as cat_op
            cat_op.run(X, LABELS, args.n_splits, cat_features)  # run with optuna-optimized range of hyperparameters
        if 'regression_xgboost_pl' in args.task or '_all' in args.task:
            import medicalbigdata.regression.xgboost.pipeline as xgb_pl
            xgb_pl.run(X, LABELS, args.n_splits)  # single run with default hyperparameters
        if 'regression_xgboost_op' in args.task or '_all' in args.task:
            import medicalbigdata.regression.xgboost.optuna as xgb_op
            xgb_op.run(X, LABELS, args.n_splits)  # run with optuna-optimized range of hyperparameters
        if 'regression_realmlp_pl' in args.task or '_all' in args.task:
            import medicalbigdata.regression.realmlp.pipeline as realmlp_pl
            realmlp_pl.run(X, LABELS, args.n_splits)  # single run with default hyperparameters
        if 'regression_realmlp_op' in args.task or '_all' in args.task:
            import medicalbigdata.regression.realmlp.optuna as realmlp_op
            realmlp_op.run(X, LABELS, args.n_splits)  # run with optuna-optimized range of hyperparameters
        if 'ensemble_svm' in args.task:  # SVM with numerical columns
            from medicalbigdata.features.ensemble import get_lowcorr_features, get_significant_features
            significant_features = get_significant_features(X, p_thresh=0.01)
            print("SIGNIFICANT FEATURES: " + str(significant_features))
            significant_lowcorr_features = get_lowcorr_features(X, significant_features, target='label', c_thresh=0.36)
            print("SIGNIFICANT LOWCORR FEATURES: " + str(significant_lowcorr_features))
            if args.task == 'ensemble_svm_pl':
                import medicalbigdata.regression.svm.pipeline as svm_pl
                svm_pl.run(X[significant_lowcorr_features], LABELS,
                           args.n_splits)  # single run with default hyperparameters
            elif args.task == 'ensemble_svm_op':
                import medicalbigdata.regression.svm.optuna as svm_op
                svm_op.run(X[significant_lowcorr_features], LABELS, args.n_splits)  # optuna-optimized runs
        if 'ensemble_catboost' in args.task:  # CatBoost with both numerical & categorical columns
            from medicalbigdata.features.ensemble import get_lowcorr_features, get_significant_features
            significant_features = get_significant_features(X, cat_features, p_thresh=0.01)
            print("SIGNIFICANT FEATURES: " + str(significant_features))
            significant_cat_features = list(set(significant_features).intersection(set(cat_features)))
            print("SIGNIFICANT CATEGORICAL FEATURES: " + str(significant_cat_features))
            significant_lowcorr_features = get_lowcorr_features(X, significant_features, target='label', c_thresh=0.36)
            print("SIGNIFICANT LOWCORR FEATURES: " + str(significant_lowcorr_features))
            if args.task == 'ensemble_catboost_pl':
                import medicalbigdata.regression.catboost.pipeline as cat_pl
                cat_pl.run(X[significant_lowcorr_features + significant_cat_features], LABELS, args.n_splits,
                           significant_cat_features)  # single run with default hyperparameters
            elif args.task == 'ensemble_catboost_op':
                import medicalbigdata.regression.catboost.optuna as cat_op
                cat_op.run(X[significant_lowcorr_features + significant_cat_features], LABELS, args.n_splits,
                           significant_cat_features)  # optuna-optimized runs
    else:  # using HF Dataset API for LLMs; prompting is not yet supported for ATTICA!
        from medicalbigdata.llm.prompting import get_prompts_ds
        dataset = get_prompts_ds(COHORT, FEATURES, LABELS, sys_msg='generate' in args.task or 'test' in args.task)
        if args.subsample:
            pos, neg = args.subsample
            dataset = get_sample_ds(dataset, pos=pos, neg=neg)
        if args.local_rank < 1:
            print(dataset)
        if args.task == 'generate_tf_batch':
            from medicalbigdata.llm.generating.transformers import generate_tf_batch
            generate_tf_batch(args.model, dataset, load_in_4bit=args.load_in_4bit)
        if args.task == 'generate_unsloth_seq':
            from medicalbigdata.llm.generating.unsloth import generate_unsloth_seq
            generate_unsloth_seq(args.model, dataset, load_in_4bit=args.load_in_4bit)
        if args.task == 'generate_unsloth_batch':
            from medicalbigdata.llm.generating.unsloth import generate_unsloth_batch
            generate_unsloth_batch(args.model, dataset, load_in_4bit=args.load_in_4bit)
        if args.task == 'generate_vllm_seq':
            from medicalbigdata.llm.generating.vllm import generate_vllm_seq
            generate_vllm_seq(args.model, dataset, load_in_4bit=args.load_in_4bit)
        if args.task == 'generate_vllm_batch':
            from medicalbigdata.llm.generating.vllm import generate_vllm_batch
            generate_vllm_batch(args.model, dataset, load_in_4bit=args.load_in_4bit, wandb_tags=args.wandb_tags)
        if args.task == 'generate_gemini_seq':
            from medicalbigdata.llm.client.gemini import generate_seq as generate_gemini
            generate_gemini(args.model, dataset)
        if args.task == 'generate_gemini_async':
            from medicalbigdata.llm.client.gemini import generate_async as generate_gemini
            generate_gemini(args.model, dataset, wandb_tags=args.wandb_tags)
        if args.task == 'generate_claude':
            from medicalbigdata.llm.client.claude import generate as generate_claude
            generate_claude(args.model, dataset)
        if args.task == 'generate_claude_async':
            from medicalbigdata.llm.client.claude import generate_async as generate_claude
            generate_claude(args.model, dataset, wandb_tags=args.wandb_tags)
        if args.task == 'generate_openai':
            from medicalbigdata.llm.client.chatgpt import generate as generate_openai
            generate_openai(args.model, dataset)
        if args.task == 'finetune_tf':
            from medicalbigdata.llm.finetuning.transformers import finetune_tf
            finetune_tf(args.model, dataset, n_splits=args.n_splits, n_epochs=args.n_epochs,
                        load_in_4bit=args.load_in_4bit, eval_strat=args.eval_strat, wandb_tags=args.wandb_tags)
        if args.task == 'finetune_ds':
            from medicalbigdata.llm.finetuning.deepspeed import finetune_ds
            finetune_ds(args.model, dataset, load_in_4bit=args.load_in_4bit, n_splits=args.n_splits,
                        n_epochs=args.n_epochs, eval_strat=args.eval_strat)
        if args.task == 'show_prompts':
            for d in dataset:
                print("\n--- ONESHOT ------------")
                print(d['oneshot'])
                print("------------------------\n")
                print("\n--- FEWSHOT ------------")
                print(d['fewshot'])
                print("------------------------\n")


if __name__ == "__main__":
    main()
