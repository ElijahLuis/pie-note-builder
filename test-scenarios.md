# Test Scenarios for PIE Note Builder

## Scenario 1: Diabetes with Insulin Administration
**Inputs:**
- Problem: Diabetes Management
- BG Check: 245 mg/dL
- Insulin administered: 3 units
- Reason for insulin: Correction dose
- Orders checked: Yes
- Standard evaluation: Yes (checked by default)
- Parent notified: Yes, at 11:30

**Expected Output:**
```
P: Student with diabetes presented to health office. Blood glucose check: 245 mg/dL.

I: 3 units of insulin administered, indication: correction dose, medical orders reviewed and followed.

E: Tolerated well. No adverse effects noted. Student returned to class. Parent notified at 11:30 AM via phone.
```

## Scenario 2: Medication Administration (Inhaler)
**Inputs:**
- Problem: Medication Administration
- Medication name: Albuterol
- Dose: 2 puffs
- Route: Inhaled
- Reason: Shortness of breath
- Orders checked: Yes
- Standard evaluation: Yes

**Expected Output:**
```
P: Student presented for medication administration. Albuterol needed for Shortness of breath.

I: Dose of 2 puffs administered, route: Inhaled, medical orders reviewed and verified.

E: Tolerated well. No adverse effects noted. Student returned to class.
```

## Scenario 3: First Aid with Parent and EMS Notification
**Inputs:**
- Problem: First Aid / Minor Injury
- Type of injury: Bump/contusion
- Location: forehead
- Ice pack applied: Yes
- Rest provided: 15 minutes
- Standard evaluation: No (unchecked)
- Parent notified: Yes, at 10:15
- EMS notified: Yes, at 10:20
- Additional notes: Student experienced dizziness and vomiting

**Expected Output:**
```
P: Student presented with Bump/contusion to forehead.

I: Ice pack applied, 15 minutes of rest provided.

E: Parent notified at 10:15 AM via phone. Emergency Services notified at 10:20 AM. Student experienced dizziness and vomiting.
```

## Scenario 4: Simple Headache (Most common scenario)
**Inputs:**
- Problem: First Aid / Minor Injury
- Type of injury: Headache
- Rest provided: 10 minutes
- Standard evaluation: Yes (default)

**Expected Output:**
```
P: Student presented with Headache.

I: 10 minutes of rest provided.

E: Tolerated well. No adverse effects noted. Student returned to class.
```

## Scenario 5: Diabetes - Hypoglycemia Management
**Inputs:**
- Problem: Diabetes Management
- BG Check: 62 mg/dL
- Snack provided: 15g fast-acting carbohydrates (juice and crackers)
- Orders checked: Yes
- Standard evaluation: Yes
- Additional notes: Will recheck BG in 15 minutes per protocol

**Expected Output:**
```
P: Student with diabetes presented to health office. Blood glucose check: 62 mg/dL.

I: 15g fast-acting carbohydrates (juice and crackers) provided for hypoglycemia management, medical orders reviewed and followed.

E: Tolerated well. No adverse effects noted. Student returned to class. Will recheck BG in 15 minutes per protocol.
```

## Grammar and Syntax Checks:

✓ Sentences properly capitalized
✓ Periods at end of sentences
✓ Commas used correctly in lists
✓ "via phone" (not "by phone" or "on phone")
✓ Time format: "10:30 AM" or "2:15 PM" (not 24-hour format)
✓ Medical abbreviations: "BG" for blood glucose, "mg/dL" for units
✓ Professional medical language throughout
✓ No redundant punctuation (e.g., "..  " or ".,")
✓ Proper spacing between sections
✓ PIE prefixes optional and properly formatted when enabled
