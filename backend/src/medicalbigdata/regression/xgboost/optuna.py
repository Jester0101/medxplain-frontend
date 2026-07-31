import numpy as np

import medicalbigdata.regression.xgboost.pipeline as pl
from optuna import create_study

global_X = None
global_y = None
global_n_splits = None
global_results = {}


def objective(trial):
    params = {
        'n_estimators': 100,
        'objective': 'binary:logistic',
        'max_depth': trial.suggest_int('max_depth', 3, 12),
        'learning_rate': trial.suggest_float('learning_rate', 1e-3, 1.0, log=True),
        'subsample': trial.suggest_float('subsample', 0.5, 1.0),
        'colsample_bytree': trial.suggest_float('colsample_bytree', 0.5, 1.0),
        'aft_loss_distribution': trial.suggest_categorical('aft_loss_distribution', ['normal', 'logistic', 'extreme']),
        'aft_loss_distribution_scale': trial.suggest_loguniform('aft_loss_distribution_scale', 0.1, 10.0),
        'tree_method': 'hist',
        'eval_metric': 'aft-nloglik',
        'verbosity': 0,
    }

    try:
        cv_scores, pipeline = pl.run(global_X, global_y, global_n_splits, **params)
        global_results[trial._trial_id] = (cv_scores, pipeline)
        return cv_scores.mean()
    except:
        print("TRIAL FAILED:", params)

    return 0


def run(X, y, n_splits=5):
    global global_X, global_y, global_n_splits, global_results
    global_X = X
    global_y = y
    global_n_splits = n_splits
    global_results = {}

    # Create an Optuna study and optimize the objective function
    study = create_study(direction="maximize")
    study.optimize(objective, n_trials=200)

    # Display the best trial's results
    print(
        f"\nOPTUNA XGBOOST BEST TRIAL AVG AUC: {global_results[study.best_trial._trial_id][0].mean():.3f} (+/- {global_results[study.best_trial._trial_id][0].std():.3f}) PARAMS: {study.best_trial.params}\n")

    return global_results[study.best_trial._trial_id][0].mean(), global_results[
        study.best_trial._trial_id][0].std(), global_results[
        study.best_trial._trial_id][1], study.best_trial.params
