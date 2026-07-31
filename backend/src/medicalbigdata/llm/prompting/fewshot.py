# Define few-shot template (keep the line breaks!)
FEWSHOT_PROMPT_TEMPLATE = """{system_message}Patient: The patient is a 75-year-old male who underwent coronary angiography, presenting with Cardiac: NT-proBNP level of 2000.0 ng/ml; troponin T level of 0.08 μg/L; Inflammatory: CRP level of 5.2 mg/dL; Renal: creatinine level of 1.8 mg/dL; Hematologic: hemoglobin level of 10.2 g/dL, having a history of coronary artery disease (CAD); heart failure; type-2 diabetes.
Question: What is the 1-year mortality risk?
Answer: The 1-year mortality risk is 18% (age 75 increases baseline risk, NT-proBNP 2000 ng/ml indicates severe heart failure, elevated troponin suggests cardiac damage, CRP 5.2 mg/dL shows high inflammation, creatinine 1.8 mg/dL suggests kidney dysfunction, mild anemia compounds risk)

Patient: The patient is a 58-year-old male who underwent coronary angiography, presenting with Cardiac: NT-proBNP level of 450.0 ng/ml; Inflammatory: CRP level of 2.1 mg/dL; Renal: creatinine level of 1.3 mg/dL; Hematologic: hemoglobin level of 11.8 g/dL; Metabolic: HbA1c level of 7.2%, having a history of hypertension; type-2 diabetes.
Question: What is the 1-year mortality risk?
Answer: The 1-year mortality risk is 6% (age 58 moderate baseline risk, NT-proBNP 450 ng/ml suggests mild heart dysfunction, CRP 2.1 mg/dL indicates moderate inflammation, creatinine 1.3 mg/dL shows mild kidney impairment, mild anemia and suboptimal diabetes control add incremental risk)

Patient: The patient is a 40-year-old female who underwent coronary angiography, presenting with Cardiac: NT-proBNP level of 45.0 ng/ml; Inflammatory: CRP level of 0.2 mg/dL; Renal: creatinine level of 0.9 mg/dL; Hematologic: hemoglobin level of 13.5 g/dL; Metabolic: cholesterol level of 180 mg/dL, having a history of smoking.
Question: What is the 1-year mortality risk?
Answer: The 1-year mortality risk is 0.5% (age 40 confers low baseline risk, all biomarkers within normal ranges, smoking history only modest risk factor at this age)

Patient: {patient_data}
Question: What is the 1-year mortality risk?
Answer: """
