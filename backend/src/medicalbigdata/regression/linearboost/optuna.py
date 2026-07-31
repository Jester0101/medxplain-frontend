import numpy as np

import medicalbigdata.regression.linearboost.pipeline as pl
from optuna import create_study

global_X = None
global_y = None
global_n_splits = None
global_results = {}


def custom_loss(y_true, y_pred, weights):
    return np.mean(weights * (y_true - y_pred) ** 2)


def objective(trial):
    params = {
        "n_estimators": trial.suggest_int("n_estimators", 10, 500),
        "learning_rate": trial.suggest_float("learning_rate", 0.01, 1.0, log=True),
        "algorithm": trial.suggest_categorical("algorithm", ["SAMME", "SAMME.R"]),
        "scaler": trial.suggest_categorical(
            "scaler", ["minmax", "robust", "quantile-uniform", "quantile-normal"]
        ),
        "kernel": trial.suggest_categorical(
            "kernel", ["linear", "rbf", "poly", "sigmoid"]
        )
    }

    if params["kernel"] != "linear":
        params["gamma"] = trial.suggest_float("gamma", 1e-3, 10.0, log=True)
    if params["kernel"] == "poly":
        params["degree"] = trial.suggest_int("degree", 2, 5)
    if params["kernel"] in ["poly", "sigmoid"]:
        params["coef0"] = trial.suggest_float("coef0", 0.0, 1.0)

    # Using a custom loss function here
    params['loss_function'] = custom_loss

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
        f"\nOPTUNA LINEARBOOST BEST TRIAL AVG AUC: {global_results[study.best_trial._trial_id][0].mean():.3f} (+/- {global_results[study.best_trial._trial_id][0].std():.3f}) PARAMS: {study.best_trial.params}\n")

    return global_results[study.best_trial._trial_id][0].mean(), global_results[
        study.best_trial._trial_id][0].std(), global_results[
        study.best_trial._trial_id][1], study.best_trial.params
