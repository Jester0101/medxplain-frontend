import medicalbigdata.regression.realmlp.pipeline as pl
from optuna import create_study

global_X = None
global_y = None
global_n_splits = None
global_results = {}


def objective(trial):
    params = {
        "random_state": 42,
        "n_cv": trial.suggest_categorical("n_cv", [1, 3, 5]),  # n_cv>1: "bagging"
        "n_refit": trial.suggest_int("n_refit", 0, 2),
        "n_epochs": 256,
        "batch_size": 256,
        "hidden_sizes_l": trial.suggest_categorical("hidden_sizes_l", [128, 256, 512]),
        "hidden_sizes_k": trial.suggest_categorical("hidden_sizes_k", [2, 3, 4, 5]),
        "val_metric_name": "cross_entropy",
        "use_ls": trial.suggest_categorical("use_ls", [False, True]),
        "lr": 0.04,
        "verbosity": 0
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
        f"\nOPTUNA REALMLP BEST TRIAL AVG AUC: {global_results[study.best_trial._trial_id][0].mean():.3f} (+/- {global_results[study.best_trial._trial_id][0].std():.3f}) PARAMS: {study.best_trial.params}\n")

    return global_results[study.best_trial._trial_id][0].mean(), global_results[
        study.best_trial._trial_id][0].std(), global_results[
        study.best_trial._trial_id][1], study.best_trial.params
