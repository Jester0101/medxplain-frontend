# Run as: nohup python -u ./src/runall_regression_LURIC.py > ./docs/runall_regression_LURIC.txt &

import wandb

import medicalbigdata.regression.catboost.optuna as cat_op
import medicalbigdata.regression.linearboost.optuna as lin_op
import medicalbigdata.regression.realmlp.optuna as realmlp_op
import medicalbigdata.regression.svm.optuna as svm_op
import medicalbigdata.regression.xgboost.optuna as xgb_op
from medicalbigdata.settings.luric import *


# Caution: the full script over all cohorts, features & regressors takes about 1 week to finish!

def main():
    LURIC = load_SAV(filename="LURIC_firstobs_2025-03-08.sav")  # load into dataframe

    COHORTS = []
    COHORTS.append(LURIC)  # 3316
    COHORTS.append(smart_cohort(LURIC))  # 2475
    COHORTS.append(coropredict_cohort(LURIC))  # 2112
    COHORTS.append(contrastive_cohort_1YM(LURIC))  # 2668

    FEATURE_SETS = []
    FEATURE_SETS.append(FEATURES_COROV1)  # 11
    FEATURE_SETS.append(['age', 'sex'] + FEATURES_12)  # 15
    FEATURE_SETS.append(['age', 'sex'] + FEATURES_20)  # 24
    FEATURE_SETS.append(['age', 'sex'] + FEATURES_21)  # 25
    FEATURE_SETS.append(FEATURES_60)  # 64
    FEATURE_SETS.append(FEATURES_90)  # 94

    SVM = True
    LINEARBOOST = True
    CATBOOST = True
    XGBOOST = True
    REALMLP = True

    for COHORT in COHORTS:

        y = labels_1YM(COHORT)  # get the 1YM labels for the cohort

        for FEATURES in FEATURE_SETS:

            print("\n*********************************")
            print("*** COHORT:", len(COHORT), "FEATURES:", len(FEATURES), "***")
            print("*********************************\n")

            X = COHORT[FEATURES]
            X = X.fillna(X.median())
            X.info()

            if SVM:
                wandb.init(
                    project="medical-research",
                    config={
                        "data": "LURIC",
                        "target": "1YM",
                        "cohort": len(COHORT),
                        "features": len(FEATURES),
                        "algorithm": "OPTUNA/SVC",
                        "fillna": "MEDIAN",
                    }
                )

                mean, std, pipeline, params = svm_op.run(X, y)
                wandb.log({'auc': {'mean': mean, 'std': std}, 'pipeline': str(pipeline), 'params': str(params)})
                wandb.finish()

            if LINEARBOOST:
                wandb.init(
                    project="medical-research",
                    config={
                        "data": "LURIC",
                        "target": "1YM",
                        "cohort": len(COHORT),
                        "features": len(FEATURES),
                        "algorithm": "OPTUNA/LINEARBOOST",
                        "fillna": "MEDIAN",
                    }
                )

                mean, std, pipeline, params = lin_op.run(X, y)
                wandb.log({'auc': {'mean': mean, 'std': std}, 'pipeline': str(pipeline), 'params': str(params)})
                wandb.finish()

            if CATBOOST:
                wandb.init(
                    project="medical-research",
                    config={
                        "data": "LURIC",
                        "target": "1YM",
                        "cohort": len(COHORT),
                        "features": len(FEATURES),
                        "algorithm": "OPTUNA/CATBOOST",
                        "fillna": "MEDIAN",
                    }
                )

                mean, std, pipeline, params = cat_op.run(X, y)
                wandb.log({'auc': {'mean': mean, 'std': std}, 'pipeline': str(pipeline), 'params': str(params)})
                wandb.finish()

            if XGBOOST:
                wandb.init(
                    project="medical-research",
                    config={
                        "data": "LURIC",
                        "target": "1YM",
                        "cohort": len(COHORT),
                        "features": len(FEATURES),
                        "algorithm": "OPTUNA/XGBOOST",
                        "fillna": "MEDIAN",
                    }
                )

                mean, std, pipeline, params = xgb_op.run(X, y)
                wandb.log({'auc': {'mean': mean, 'std': std}, 'pipeline': str(pipeline), 'params': str(params)})
                wandb.finish()

            if REALMLP:
                wandb.init(
                    project="medical-research",
                    config={
                        "data": "LURIC",
                        "target": "1YM",
                        "cohort": len(COHORT),
                        "features": len(FEATURES),
                        "algorithm": "OPTUNA/REALMLP",
                        "fillna": "MEDIAN",
                    }
                )

                mean, std, pipeline, params = realmlp_op.run(X, y)
                wandb.log({'auc': {'mean': mean, 'std': std}, 'pipeline': str(pipeline), 'params': str(params)})
                wandb.finish()


if __name__ == "__main__":
    main()
