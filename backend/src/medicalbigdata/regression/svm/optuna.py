import numpy as np

import medicalbigdata.regression.svm.pipeline as pl
from optuna import create_study

global_X = None
global_y = None
global_n_splits = None
global_results = {}


def custom_loss(y_true, y_pred, weights):
    return np.mean(weights * (y_true - y_pred) ** 2)


def objective(trial):
    params = {"C": trial.suggest_float("C", 1e-10, 1e2), "dual": "auto",
              "random_state": 42}  # no need to optimize the LinearSVC much!

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
    study.optimize(objective, n_trials=10)

    # Display the best trial's results
    print(
        f"\nOPTUNA SVM BEST TRIAL AVG AUC: {global_results[study.best_trial._trial_id][0].mean():.3f} (+/- {global_results[study.best_trial._trial_id][0].std():.3f}) PARAMS: {study.best_trial.params}\n")

    return global_results[study.best_trial._trial_id][0].mean(), global_results[
        study.best_trial._trial_id][0].std(), global_results[
        study.best_trial._trial_id][1], study.best_trial.params
