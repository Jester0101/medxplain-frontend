import numpy as np

import medicalbigdata.regression.catboost.pipeline as pl
from optuna import create_study

global_X = None
global_y = None
global_n_splits = None
global_cat_features = None
global_results = {}


def custom_loss(y_true, y_pred, weights):
    return np.mean(weights * (y_true - y_pred) ** 2)


def objective(trial):
    params = {
        "objective": trial.suggest_categorical("objective", ["Logloss", "CrossEntropy"]),
        "colsample_bylevel": trial.suggest_float("colsample_bylevel", 0.01, 0.1),
        "depth": trial.suggest_int("depth", 3, 12),
        "boosting_type": trial.suggest_categorical("boosting_type", ["Ordered", "Plain"]),
        "bootstrap_type": trial.suggest_categorical(
            "bootstrap_type", ["Bayesian", "Bernoulli", "MVS"]
        ),
        "used_ram_limit": "32gb"
    }

    if params["bootstrap_type"] == "Bayesian":
        params["bagging_temperature"] = trial.suggest_float("bagging_temperature", 0, 10)
    elif params["bootstrap_type"] == "Bernoulli":
        params["subsample"] = trial.suggest_float("subsample", 0.1, 1)

    # Using a custom loss function here
    params['loss_function'] = custom_loss

    try:
        cv_scores, pipeline = pl.run(global_X, global_y, global_n_splits, global_cat_features, **params)
        global_results[trial._trial_id] = (cv_scores, pipeline)
        return cv_scores.mean()
    except:
        print("TRIAL FAILED:", params)

    return 0


def run(X, y, n_splits=5, cat_features=None):
    global global_X, global_y, global_n_splits, global_cat_features, global_results
    global_X = X
    global_y = y
    global_n_splits = n_splits
    global_cat_features = cat_features
    global_results = {}

    # Create an Optuna study and optimize the objective function
    study = create_study(direction="maximize")
    study.optimize(objective, n_trials=200)

    # Display the best trial's results
    print(
        f"\nOPTUNA CATBOOST BEST TRIAL AVG AUC: {global_results[study.best_trial._trial_id][0].mean():.3f} (+/- {global_results[study.best_trial._trial_id][0].std():.3f}) PARAMS: {study.best_trial.params}\n")

    return global_results[study.best_trial._trial_id][0].mean(), global_results[
        study.best_trial._trial_id][0].std(), global_results[
        study.best_trial._trial_id][1], study.best_trial.params
