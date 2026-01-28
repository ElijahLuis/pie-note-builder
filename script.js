// PIE Note Builder - Clinical Documentation Assistant
// Tracks patterns and provides clinical decision support

// Clinical and System Constants
const CLINICAL_LIMITS = {
    // Blood Glucose Thresholds (mg/dL)
    BG_CRITICAL_LOW: 40,
    BG_WARNING_LOW: 70,
    BG_WARNING_HIGH: 250,
    BG_CRITICAL_HIGH: 400,
    
    // Insulin Safety Limits (units)
    INSULIN_WARNING_THRESHOLD: 20,
    INSULIN_CRITICAL_THRESHOLD: 50,
    
    // Carbohydrate Limits (grams)
    CARB_WARNING_THRESHOLD: 150,
    CARB_CRITICAL_THRESHOLD: 250,
    
    // Order Management
    ORDER_CHECK_DAYS: 30,
    
    // Visit Frequency Thresholds
    FREQUENT_VISIT_DAYS: 7,
    FREQUENT_VISIT_COUNT: 3
};

const STORAGE_CONFIG = {
    MAX_HISTORY_NOTES: 100,
    MAX_STORAGE_ITEMS: 1000
};

// Utility Functions

/**
 * Checks if localStorage is available and functional
 * @returns {boolean} True if localStorage is available, false otherwise
 */
function isLocalStorageAvailable() {
    try {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Displays a user-friendly storage error message
 * @param {string} message - The error message to display
 * @returns {void}
 */
function showStorageError(message) {
    const alertsDiv = document.getElementById('cdsAlerts');
    if (!alertsDiv) return;
    
    const alert = document.createElement('div');
    alert.className = 'cds-alert warning';
    alert.innerHTML = `<strong>⚠️ Storage Error</strong><p>${message}</p>`;
    alertsDiv.appendChild(alert);
}

/**
 * Safely creates a text node to prevent XSS
 * @param {string} text - The text content
 * @returns {Text} A text node
 */
function createSafeText(text) {
    return document.createTextNode(text || '');
}

/**
 * Sanitizes HTML input by escaping special characters
 * @param {string} str - The string to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Validates medication name against known medications list
 * @param {string} medName - The medication name to validate
 * @returns {boolean} - True if medication matches known list
 */
function isKnownMedication(medName) {
    if (!medName || medName.trim() === '') return true; // Empty is OK, will be handled elsewhere

    const normalized = medName.trim().toLowerCase();

    // Check for exact matches or partial matches (case-insensitive)
    return COMMON_MEDICATIONS.some(knownMed => {
        const knownNormalized = knownMed.toLowerCase();

        // Exact match
        if (knownNormalized === normalized) return true;

        // Check if typed name is contained in known medication
        // (handles "Tylenol" matching "Acetaminophen (Tylenol)")
        if (knownNormalized.includes(normalized)) return true;

        // Check if known medication name is contained in typed name
        // (handles partial brand names)
        const parts = knownNormalized.split(/[\(\),]/);
        return parts.some(part => {
            const trimmed = part.trim();
            return trimmed && normalized.includes(trimmed);
        });
    });
}

/**
 * Shows or hides medication validation warning
 * @param {boolean} show - Whether to show the warning
 * @returns {void}
 */
function toggleMedicationWarning(show) {
    const warning = document.getElementById('med-name-warning');
    if (warning) {
        warning.style.display = show ? 'flex' : 'none';

        if (show) {
            announceToScreenReader('Warning: This medication name is not recognized. Please verify the spelling.');
        }
    }
}

// Data structures
const problems = {
    diabetes: {
        name: "Diabetes Management",
        interventions: [
            { id: "visit-reason", label: "Reason for visit", options: ["Routine scheduled check", "Student requested check", "Symptoms of low BG", "Symptoms of high BG", "Pre-meal coverage", "Post-activity check", "Teacher concern", "Other"] },
            { id: "student-symptoms", label: "Student reports", options: ["No symptoms", "Feeling shaky/tremulous", "Sweating", "Headache", "Dizziness", "Confusion", "Nausea", "Increased thirst", "Increased urination", "Fatigue/weakness", "Blurred vision", "Multiple symptoms"] },
            { id: "bg-check", label: "Current blood glucose level", hasInput: true, inputLabel: "BG reading (mg/dL)", inputType: "number", min: 0, max: 999 },
            { id: "bg-source-cgm", label: "Dexcom (CGM)", checkbox: true, group: "bg-source" },
            { id: "bg-source-fingerstick", label: "Manual fingerstick", checkbox: true, group: "bg-source" },
            { id: "carbs-consumed", label: "Carbohydrates consumed", hasInput: true, inputLabel: "Grams of carbs", inputType: "number", min: 0, max: 500, step: 1 },
            { id: "insulin-admin", label: "Insulin administered", hasInput: true, inputLabel: "Units given", inputType: "number", min: 0, max: 100, step: 0.5 },
            { id: "insulin-type", label: "Type of insulin", options: ["Rapid-acting (Humalog/Novolog)", "Short-acting (Regular)", "Intermediate-acting (NPH)", "Long-acting (Lantus/Levemir)", "Per student's orders", "Other"] },
            { id: "insulin-delivery", label: "Insulin delivery method", options: ["Insulin pump", "Insulin pen", "Syringe", "Pre-filled syringe from parent"] },
            { id: "injection-site", label: "Injection site (if applicable)", options: ["Abdomen", "Right upper arm", "Left upper arm", "Right thigh", "Left thigh", "Buttocks", "Via pump", "N/A"] },
            { id: "insulin-reason", label: "Reason for insulin", options: ["Lunch coverage", "Correction dose", "Snack coverage", "High BG"] },
            { id: "snack-provided", label: "Snack/glucose provided for hypoglycemia", options: ["None needed", "15g glucose tablets", "4 oz juice (15g carbs)", "4 oz regular soda (15g carbs)", "Graham crackers (3 squares)", "8 oz milk (12g carbs)", "Small fruit (15g carbs)", "Honey/sugar packet", "Other (specify)"] },
            { id: "orders-checked", label: "Medical orders reviewed and followed", checkbox: true },
            { id: "parent-contact", label: "Parent/guardian contacted", options: ["Not contacted", "Critical BG reading", "Hypoglycemia intervention", "Hyperglycemia concern", "Insulin administration issue", "Student request", "Medication side effects", "Injury requiring follow-up", "Illness symptoms", "Other (specify)"] }
        ],
        evaluations: [
            { id: "standard-eval", label: "Standard evaluation", checkbox: true, defaultText: "Tolerated well. No adverse effects noted. Student returned to class." },
            { id: "parent-notified", label: "Parent notified", checkbox: true, hasTimeInput: true },
            { id: "ems-notified", label: "Emergency Services notified", checkbox: true, hasTimeInput: true },
            { id: "additional-eval", label: "Additional evaluation notes", hasInput: true, inputLabel: "Additional details", textarea: true }
        ]
    },
    medication: {
        name: "Medication Administration",
        interventions: [
            { id: "med-name", label: "Medication name", hasInput: true, inputLabel: "Medication" },
            { id: "med-class", label: "Medication class", options: ["Stimulant (ADHD)", "Non-stimulant (ADHD)", "Antibiotic", "Bronchodilator/Inhaled steroid", "Antihistamine", "Antiepileptic/Anticonvulsant", "Analgesic (pain)", "Antiemetic/GI medication", "Antidepressant", "Antianxiety", "Antipsychotic", "Emergency epinephrine", "Antiinflammatory (NSAID)", "Antacid/Reflux medication", "Other"] },
            { id: "dose", label: "Dose administered", hasInput: true, inputLabel: "Amount" },
            { id: "dose-unit", label: "Dose unit", options: ["mg", "mcg", "mL", "g", "units", "puffs", "sprays", "tablets", "capsules"] },
            { id: "route", label: "Route", options: ["PO (by mouth)", "Inhaled", "Topical", "Sublingual", "Subcutaneous", "Nasal", "Other"] },
            { id: "reason", label: "Reason for medication", options: ["ADHD symptom management", "Seizure prevention", "Asthma/breathing support", "Allergy symptoms", "Pain relief", "Infection treatment", "Nausea/GI symptoms", "Anxiety management", "Blood pressure control", "Diabetes management", "Per medical orders", "Other (specify)"] },
            { id: "prn-reason", label: "PRN reason (if applicable)", options: ["N/A - Scheduled dose", "Pain", "Fever", "Asthma symptoms/wheezing", "Anxiety", "Nausea", "Allergic reaction", "Breakthrough symptoms", "Other"] },
            { id: "time-since-last", label: "Time since last dose", options: ["Unknown/Not applicable", "Less than 2 hours", "2-4 hours", "4-6 hours", "6-8 hours", "8-12 hours", "More than 12 hours", "First dose of day"] },
            { id: "dose-verification", label: "Dose calculation verified", checkbox: true },
            { id: "witnessed-admin", label: "Witnessed student take medication", checkbox: true },
            { id: "orders-checked", label: "Medical orders reviewed and verified", checkbox: true },
            { id: "parent-contact", label: "Parent/guardian contacted", options: ["Not contacted", "Critical BG reading", "Hypoglycemia intervention", "Hyperglycemia concern", "Insulin administration issue", "Student request", "Medication side effects", "Injury requiring follow-up", "Illness symptoms", "Other (specify)"] }
        ],
        evaluations: [
            { id: "standard-eval", label: "Standard evaluation", checkbox: true, defaultText: "Tolerated well. No adverse effects noted. Student returned to class." },
            { id: "parent-notified", label: "Parent notified", checkbox: true, hasTimeInput: true },
            { id: "ems-notified", label: "Emergency Services notified", checkbox: true, hasTimeInput: true },
            { id: "additional-eval", label: "Additional evaluation notes", hasInput: true, inputLabel: "Additional details", textarea: true }
        ]
    },
    "first-aid": {
        name: "First Aid / Minor Injury",
        interventions: [
            { id: "injury-type", label: "Type of injury/complaint", options: ["Abrasion/scrape", "Bump/contusion", "Minor cut/laceration", "Headache", "Stomachache", "Nosebleed", "Dental injury", "Sprain/strain", "Insect bite/sting", "Rash/skin irritation", "Other"] },
            { id: "location", label: "Location of injury", options: ["Head", "Forehead", "Face", "Eye", "Ear", "Nose", "Mouth/lips", "Teeth/jaw", "Neck", "Shoulder", "Upper arm", "Elbow", "Forearm", "Wrist", "Hand", "Finger(s)", "Chest", "Abdomen", "Back", "Hip", "Thigh", "Knee", "Lower leg", "Ankle", "Foot", "Toe(s)", "Multiple locations", "Other (specify)"] },
            { id: "injury-occurred", label: "How injury occurred", options: ["Playground", "PE class", "Classroom", "Hallway", "Cafeteria", "Recess", "Sports/athletics", "Stairs", "Bathroom", "Bus area", "Student reports unknown", "Other"] },
            { id: "injury-mechanism", label: "Mechanism of injury", options: ["Fall from height", "Fall on same level", "Collision with person", "Collision with object", "Struck by object", "Contact with sharp object", "Twisting motion", "Non-traumatic/spontaneous", "Unknown", "Other"] },
            { id: "initial-assessment", label: "Initial assessment", options: ["Alert and oriented", "No visible distress", "Mild distress", "Moderate distress", "Denies loss of consciousness", "Brief LOC reported", "Other"] },
            { id: "ice-applied", label: "Ice pack applied", checkbox: true },
            { id: "ice-duration", label: "Ice application duration", options: ["N/A", "5 minutes", "10 minutes", "15 minutes", "20 minutes", "30 minutes"] },
            { id: "bandaid-applied", label: "Band-aid/dressing applied", checkbox: true },
            { id: "wound-care", label: "Wound care performed", options: ["N/A", "Cleaned with soap and water", "Cleaned with saline", "Antiseptic applied", "Pressure applied for bleeding control", "Gauze dressing applied", "Other"] },
            { id: "rest-provided", label: "Rest period provided", options: ["N/A", "5 minutes", "10 minutes", "15 minutes", "20 minutes", "30 minutes", "Remained until dismissal"] },
            { id: "vital-signs", label: "Vital signs assessed", hasInput: true, inputLabel: "Results (if applicable)" },
            { id: "head-injury-screen", label: "Head injury screening", options: ["N/A - Not head injury", "No signs of concussion", "Concussion symptoms present", "LOC reported", "Vomiting present", "Confusion noted", "Headache persists", "Refer for evaluation"] },
            { id: "return-to-activity", label: "Return to activity status", options: ["Returned to class immediately", "Returned to class after rest", "Returned to class with restrictions", "Unable to return to activity", "Parent pickup arranged", "Referred for further evaluation"] },
            { id: "parent-contact", label: "Parent/guardian contacted", options: ["Not contacted", "Critical BG reading", "Hypoglycemia intervention", "Hyperglycemia concern", "Insulin administration issue", "Student request", "Medication side effects", "Injury requiring follow-up", "Illness symptoms", "Other (specify)"] }
        ],
        evaluations: [
            { id: "standard-eval", label: "Standard evaluation", checkbox: true, defaultText: "Tolerated well. No adverse effects noted. Student returned to class." },
            { id: "parent-notified", label: "Parent notified", checkbox: true, hasTimeInput: true },
            { id: "ems-notified", label: "Emergency Services notified", checkbox: true, hasTimeInput: true },
            { id: "additional-eval", label: "Additional evaluation notes", hasInput: true, inputLabel: "Additional details", textarea: true }
        ]
    },
    other: {
        name: "Other",
        interventions: [
            { id: "custom-intervention", label: "Describe intervention", hasInput: true, inputLabel: "Intervention provided", textarea: true }
        ],
        evaluations: [
            { id: "custom-evaluation", label: "Describe evaluation", hasInput: true, inputLabel: "Outcome/evaluation", textarea: true }
        ]
    }
};

// State management
let currentState = {
    problem: null,
    interventions: {},
    evaluation: {},
    usePiePrefix: true
};

// LocalStorage keys
const STORAGE_KEYS = {
    USAGE_PATTERNS: 'pie_usage_patterns',
    NOTE_HISTORY: 'pie_note_history',
    LAST_ORDER_CHECK: 'pie_last_order_check',
    DARK_MODE: 'pie_dark_mode',
    AUTO_SAVE: 'pie_auto_save'
};

// Common school medications for autocomplete and validation
const COMMON_MEDICATIONS = [
    // Pain & Fever
    "Acetaminophen (Tylenol)",
    "Ibuprofen (Advil, Motrin)",
    "Naproxen (Aleve)",

    // ADHD Medications
    "Methylphenidate (Ritalin, Concerta)",
    "Amphetamine/Dextroamphetamine (Adderall)",
    "Lisdexamfetamine (Vyvanse)",
    "Atomoxetine (Strattera)",
    "Guanfacine (Intuniv)",
    "Clonidine (Kapvay)",
    "Dexmethylphenidate (Focalin)",

    // Antibiotics
    "Amoxicillin",
    "Amoxicillin-Clavulanate (Augmentin)",
    "Azithromycin (Z-pack, Zithromax)",
    "Cephalexin (Keflex)",
    "Cefdinir (Omnicef)",

    // Respiratory/Asthma
    "Albuterol inhaler (ProAir, Ventolin, ProAir RespiClick)",
    "Fluticasone inhaler (Flovent)",
    "Budesonide inhaler (Pulmicort)",
    "Levalbuterol (Xopenex)",
    "Albuterol nebulizer solution",
    "Montelukast (Singulair)",

    // Antihistamines/Allergy
    "Diphenhydramine (Benadryl)",
    "Cetirizine (Zyrtec)",
    "Loratadine (Claritin)",
    "Fexofenadine (Allegra)",
    "Chlorpheniramine",

    // Emergency Medications
    "Epinephrine auto-injector (EpiPen, Auvi-Q)",
    "Glucagon emergency kit",
    "Diazepam rectal gel (Diastat)",
    "Midazolam nasal spray (Nayzilam)",

    // Diabetes - Insulin
    "Insulin lispro (Humalog)",
    "Insulin aspart (Novolog)",
    "Insulin glargine (Lantus)",
    "Insulin detemir (Levemir)",
    "Insulin degludec (Tresiba)",
    "NPH insulin (Humulin N, Novolin N)",
    "Regular insulin (Humulin R, Novolin R)",

    // GI/Nausea
    "Ondansetron (Zofran)",
    "Bismuth subsalicylate (Pepto-Bismol)",
    "Calcium carbonate (Tums)",
    "Omeprazole (Prilosec)",
    "Ranitidine (Zantac)",

    // Antiepileptic
    "Levetiracetam (Keppra)",
    "Valproic acid (Depakote)",
    "Lamotrigine (Lamictal)",
    "Carbamazepine (Tegretol)",

    // Other Common
    "Methylprednisolone dose pack (Medrol)",
    "Prednisone",
    "Olopatadine eye drops (Pataday, Patanol)",
    "Erythromycin eye ointment",
    "Hydrocortisone cream",
    "Bacitracin ointment",
    "Mupirocin ointment (Bactroban)"
];

// Auto-save state
let autoSaveTimer = null;
let lastAutoSave = null;

/**
 * Sets up skip to note button to smoothly scroll to note preview
 * @returns {void}
 */
function setupSkipLink() {
    const skipBtn = document.getElementById('skipToNoteBtn');
    if (skipBtn) {
        skipBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const notePreview = document.getElementById('notePreview');
            if (notePreview && notePreview.style.display !== 'none') {
                notePreview.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Focus on the copy button for keyboard accessibility
                setTimeout(() => {
                    const copyBtn = document.getElementById('copyBtn');
                    if (copyBtn) copyBtn.focus();
                }, 500);
                announceToScreenReader('Scrolled to note preview');
            } else {
                announceToScreenReader('No note generated yet. Please complete the form first.');
            }
        });
    }
}

/**
 * Checks if any form fields have data entered
 * @returns {boolean} - True if any fields have data
 */
function hasDataEntered() {
    // Check if a problem is selected
    if (currentState.problem) return true;

    // Check if any interventions have values
    if (Object.keys(currentState.interventions).length > 0) {
        // Check if any values are actually filled (not just empty strings or false)
        for (const key in currentState.interventions) {
            const value = currentState.interventions[key];
            if (value && value !== '' && value !== false) {
                return true;
            }
        }
    }

    // Check if any evaluation fields have values
    if (Object.keys(currentState.evaluation).length > 0) {
        for (const key in currentState.evaluation) {
            const value = currentState.evaluation[key];
            if (value && value !== '' && value !== false) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Sets up home link with data loss warning
 * @returns {void}
 */
function setupHomeLink() {
    const homeLink = document.getElementById('homeLink');
    if (homeLink) {
        homeLink.addEventListener('click', (e) => {
            e.preventDefault();

            if (hasDataEntered()) {
                if (confirm('⚠️ Warning: You have unsaved data.\n\nAll entered information will be lost if you start over.\n\nClick OK to reset and start a new note, or Cancel to continue editing.')) {
                    // User confirmed, reset the form
                    const resetBtn = document.getElementById('resetBtn');
                    if (resetBtn) {
                        resetBtn.click();
                    }
                }
                // If cancelled, do nothing (stay on current state)
            } else {
                // No data entered, safe to reset
                const resetBtn = document.getElementById('resetBtn');
                if (resetBtn) {
                    resetBtn.click();
                }
            }
        });
    }
}

/**
 * Sets up privacy filter button to blur sensitive information
 * @returns {void}
 */
function setupPrivacyFilter() {
    const privacyBtn = document.getElementById('privacyFilterBtn');
    if (privacyBtn) {
        privacyBtn.addEventListener('click', () => {
            const isActive = document.body.classList.toggle('privacy-active');
            privacyBtn.setAttribute('aria-pressed', isActive.toString());

            if (isActive) {
                privacyBtn.querySelector('.sidebar-text').textContent = 'Privacy ON';
                announceToScreenReader('Privacy filter activated. Sensitive information is now hidden.');
            } else {
                privacyBtn.querySelector('.sidebar-text').textContent = 'Privacy';
                announceToScreenReader('Privacy filter deactivated. Sensitive information is now visible.');
            }
        });
    }
}

/**
 * Sets up dark mode toggle with localStorage persistence
 * @returns {void}
 */
function setupDarkMode() {
    const darkModeBtn = document.getElementById('darkModeBtn');
    if (!darkModeBtn) return;

    // Load saved preference
    const savedDarkMode = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    const isDarkMode = savedDarkMode === 'true';

    // Apply saved preference
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeBtn.setAttribute('aria-pressed', 'true');
        darkModeBtn.querySelector('.sidebar-icon').textContent = '☀️';
        darkModeBtn.querySelector('.sidebar-text').textContent = 'Light';
    }

    // Toggle handler
    darkModeBtn.addEventListener('click', () => {
        const isActive = document.body.classList.toggle('dark-mode');
        darkModeBtn.setAttribute('aria-pressed', isActive.toString());

        if (isActive) {
            darkModeBtn.querySelector('.sidebar-icon').textContent = '☀️';
            darkModeBtn.querySelector('.sidebar-text').textContent = 'Light';
            localStorage.setItem(STORAGE_KEYS.DARK_MODE, 'true');
            announceToScreenReader('Dark mode activated. Interface colors adjusted for low light viewing.');
        } else {
            darkModeBtn.querySelector('.sidebar-icon').textContent = '🌙';
            darkModeBtn.querySelector('.sidebar-text').textContent = 'Dark Mode';
            localStorage.setItem(STORAGE_KEYS.DARK_MODE, 'false');
            announceToScreenReader('Light mode activated. Interface colors restored to default.');
        }
    });
}

/**
 * Saves current state to localStorage for auto-recovery
 * @returns {void}
 */
function saveAutoSave() {
    if (!hasDataEntered()) {
        // No data to save, clear any existing auto-save
        clearAutoSave();
        return;
    }

    const autoSaveData = {
        problem: currentState.problem,
        interventions: currentState.interventions,
        evaluation: currentState.evaluation,
        usePiePrefix: currentState.usePiePrefix,
        timestamp: Date.now()
    };

    localStorage.setItem(STORAGE_KEYS.AUTO_SAVE, JSON.stringify(autoSaveData));
    lastAutoSave = Date.now();

    // Show auto-save indicator
    showAutoSaveIndicator('saved');
}

/**
 * Loads auto-saved data from localStorage
 * @returns {Object|null} - Auto-saved data or null if none exists
 */
function loadAutoSave() {
    const autoSaveJSON = localStorage.getItem(STORAGE_KEYS.AUTO_SAVE);
    if (!autoSaveJSON) return null;

    try {
        const autoSaveData = JSON.parse(autoSaveJSON);

        // Check if auto-save is less than 24 hours old
        const age = Date.now() - autoSaveData.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (age > maxAge) {
            // Auto-save too old, clear it
            clearAutoSave();
            return null;
        }

        return autoSaveData;
    } catch (e) {
        console.error('Failed to load auto-save:', e);
        clearAutoSave();
        return null;
    }
}

/**
 * Clears auto-save data from localStorage
 * @returns {void}
 */
function clearAutoSave() {
    localStorage.removeItem(STORAGE_KEYS.AUTO_SAVE);
    lastAutoSave = null;
}

/**
 * Shows auto-save status indicator
 * @param {string} status - 'saving' or 'saved'
 * @returns {void}
 */
function showAutoSaveIndicator(status) {
    const indicator = document.getElementById('autoSaveIndicator');
    if (!indicator) return;

    if (status === 'saving') {
        indicator.classList.add('saving');
        indicator.classList.remove('show');
        indicator.querySelector('.auto-save-text').textContent = 'Saving...';
        // Force reflow to restart animation
        void indicator.offsetWidth;
        indicator.classList.add('show');
    } else if (status === 'saved') {
        indicator.classList.remove('saving');
        indicator.classList.remove('show');
        indicator.querySelector('.auto-save-text').textContent = 'Auto-saved';
        // Force reflow to restart animation
        void indicator.offsetWidth;
        indicator.classList.add('show');

        // Hide after 3 seconds
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 3000);
    }
}

/**
 * Triggers auto-save with debounce
 * @returns {void}
 */
function triggerAutoSave() {
    // Clear existing timer
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }

    // Show saving indicator immediately
    showAutoSaveIndicator('saving');

    // Set new timer for 2 seconds
    autoSaveTimer = setTimeout(() => {
        saveAutoSave();
    }, 2000);
}

/**
 * Restores auto-saved data and prompts user
 * @returns {void}
 */
function restoreAutoSave() {
    const autoSaveData = loadAutoSave();
    if (!autoSaveData) return;

    const timeAgo = getTimeAgo(autoSaveData.timestamp);

    if (confirm(`📝 Auto-saved draft found!\n\nLast saved: ${timeAgo}\n\nWould you like to restore your previous work?\n\nClick OK to restore, or Cancel to start fresh.`)) {
        // Restore the state
        currentState.problem = autoSaveData.problem;
        currentState.interventions = autoSaveData.interventions;
        currentState.evaluation = autoSaveData.evaluation;
        currentState.usePiePrefix = autoSaveData.usePiePrefix;

        // Update UI to match restored state
        if (autoSaveData.problem) {
            // Click the appropriate problem button
            const problemBtn = document.querySelector(`[data-problem="${autoSaveData.problem}"]`);
            if (problemBtn) {
                problemBtn.click();

                // Restore field values after a delay to ensure form is loaded
                setTimeout(() => {
                    restoreFieldValues(autoSaveData);
                    announceToScreenReader('Auto-saved draft restored successfully.');
                }, 500);
            }
        }
    } else {
        // User declined, clear the auto-save
        clearAutoSave();
    }
}

/**
 * Restores field values from auto-save data
 * @param {Object} autoSaveData - The auto-saved data
 * @returns {void}
 */
function restoreFieldValues(autoSaveData) {
    // Restore intervention fields
    for (const [key, value] of Object.entries(autoSaveData.interventions)) {
        const field = document.getElementById(key);
        if (field) {
            if (field.type === 'checkbox') {
                field.checked = value;
            } else {
                field.value = value;
            }
            // Trigger change event to update note
            field.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // Restore evaluation fields
    for (const [key, value] of Object.entries(autoSaveData.evaluation)) {
        const field = document.getElementById(key);
        if (field) {
            if (field.type === 'checkbox') {
                field.checked = value;
            } else {
                field.value = value;
            }
            field.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // Restore PIE prefix setting
    const piePrefixCheckbox = document.getElementById('piePrefix');
    if (piePrefixCheckbox) {
        piePrefixCheckbox.checked = autoSaveData.usePiePrefix;
    }
}

/**
 * Gets human-readable time ago string
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} - Human-readable time ago
 */
function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 120) return '1 minute ago';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 7200) return '1 hour ago';
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;

    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Initialize
document.addEventListener('DOMContentLoaded', init);

function init() {
    setupDarkMode();
    setupProblemButtons();
    setupResetButton();
    setupKeyboardShortcuts();
    setupSkipLink();
    setupHomeLink();
    setupPrivacyFilter();
    loadUsageStatistics();
    checkClinicalDecisionSupport();

    // Check for auto-saved data after a brief delay
    setTimeout(() => {
        restoreAutoSave();
    }, 1000);
}

/**
 * Announces message to screen readers
 * @param {string} message - The message to announce
 * @param {number} delay - Delay before announcement in ms
 * @returns {void}
 */
function announceToScreenReader(message, delay = 100) {
    const announcer = document.getElementById('sr-announcements');
    if (!announcer) return;

    setTimeout(() => {
        announcer.textContent = message;
        // Clear after 3 seconds to allow for re-announcements
        setTimeout(() => {
            announcer.textContent = '';
        }, 3000);
    }, delay);
}

/**
 * Sets up keyboard shortcuts for faster navigation and actions
 * @returns {void}
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Check if Alt key is pressed
        if (!e.altKey) return;

        // Prevent default browser behavior for our shortcuts
        const shortcutKeys = ['1', '2', '3', '4', 'c', 'r'];
        if (shortcutKeys.includes(e.key.toLowerCase())) {
            e.preventDefault();
        }

        // Alt+1-4: Select problem type
        if (e.key === '1') {
            const btn = document.querySelector('[data-problem="diabetes"]');
            if (btn) {
                btn.click();
                btn.focus();
                announceToScreenReader('Diabetes Management selected');
            }
        } else if (e.key === '2') {
            const btn = document.querySelector('[data-problem="medication"]');
            if (btn) {
                btn.click();
                btn.focus();
                announceToScreenReader('Medication Administration selected');
            }
        } else if (e.key === '3') {
            const btn = document.querySelector('[data-problem="first-aid"]');
            if (btn) {
                btn.click();
                btn.focus();
                announceToScreenReader('First Aid selected');
            }
        } else if (e.key === '4') {
            const btn = document.querySelector('[data-problem="other"]');
            if (btn) {
                btn.click();
                btn.focus();
                announceToScreenReader('Other problem type selected');
            }
        }
        // Alt+C: Copy to clipboard
        else if (e.key.toLowerCase() === 'c') {
            const copyBtn = document.getElementById('copyBtn');
            if (copyBtn && copyBtn.offsetParent !== null) { // Check if visible
                copyBtn.click();
            }
        }
        // Alt+R: Reset form
        else if (e.key.toLowerCase() === 'r') {
            const resetBtn = document.getElementById('resetBtn');
            if (resetBtn && resetBtn.offsetParent !== null) { // Check if visible
                if (confirm('Reset form and start a new note?')) {
                    resetBtn.click();
                    announceToScreenReader('Form reset. Ready for new note.');
                }
            }
        }
    });
}

// Problem selection
function setupProblemButtons() {
    const buttons = document.querySelectorAll('.problem-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const newProblem = btn.dataset.problem;

            // Check if switching from a different problem type with data
            if (currentState.problem && currentState.problem !== newProblem && hasDataEntered()) {
                if (!confirm('⚠️ Warning: Switching problem categories will clear your current data.\n\nAll entered information will be lost.\n\nClick OK to switch categories, or Cancel to continue with the current category.')) {
                    // User cancelled, don't switch
                    return;
                }
                // User confirmed, clear current state
                currentState.interventions = {};
                currentState.evaluation = {};
            }

            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentState.problem = newProblem;
            displayInterventions(newProblem);
        });
    });
}

/**
 * Displays intervention form elements based on the selected problem type
 * @param {string} problemKey - The key of the problem type (diabetes, medication, first-aid, other)
 * @returns {void}
 */
function displayInterventions(problemKey) {
    const problem = problems[problemKey];
    const section = document.getElementById('interventionSection');
    const content = document.getElementById('interventionContent');

    content.innerHTML = '';

    // High sensitivity field IDs
    const highSensitivityFields = [
        'bg-check', 'insulin-admin', 'insulin-type', 'insulin-delivery',
        'injection-site', 'insulin-reason', 'orders-checked',
        'med-name', 'dose', 'route', 'dose-verification', 'witnessed-admin'
    ];

    problem.interventions.forEach(intervention => {
        const div = document.createElement('div');
        div.className = 'form-group';

        // Mark high sensitivity fields
        if (highSensitivityFields.includes(intervention.id)) {
            div.classList.add('sensitive-high');
        }

        if (intervention.checkbox) {
            div.innerHTML = `
                <div class="checkbox-item">
                    <input type="checkbox" id="${intervention.id}" data-intervention="${intervention.id}" aria-label="${intervention.label}">
                    <label for="${intervention.id}">${intervention.label}</label>
                </div>
            `;
        } else if (intervention.options) {
            div.innerHTML = `
                <label for="${intervention.id}">${intervention.label}:</label>
                <select id="${intervention.id}" data-intervention="${intervention.id}" aria-label="${intervention.label}">
                    <option value="">-- Select --</option>
                    ${intervention.options.map(opt => `<option value="${sanitizeHTML(opt)}">${sanitizeHTML(opt)}</option>`).join('')}
                </select>
                <input type="text" id="${intervention.id}-other" data-intervention="${intervention.id}-other" placeholder="Please specify" style="display: none; margin-top: 8px;" aria-label="${intervention.label} - specify other">
            `;
        } else if (intervention.textarea) {
            div.innerHTML = `
                <label for="${intervention.id}">${intervention.label}:</label>
                <textarea id="${intervention.id}" data-intervention="${intervention.id}" placeholder="${intervention.inputLabel}" aria-label="${intervention.label}"></textarea>
            `;
        } else if (intervention.hasInput) {
            const inputType = intervention.inputType || 'text';
            const minAttr = intervention.min !== undefined ? `min="${intervention.min}"` : '';
            const maxAttr = intervention.max !== undefined ? `max="${intervention.max}"` : '';
            const stepAttr = intervention.step !== undefined ? `step="${intervention.step}"` : '';
            const ariaRequired = highSensitivityFields.includes(intervention.id) ? 'aria-required="true"' : '';

            // Special handling for medication name field with autocomplete
            if (intervention.id === 'med-name') {
                div.innerHTML = `
                    <label for="${intervention.id}">${intervention.label}:</label>
                    <input
                        type="${inputType}"
                        id="${intervention.id}"
                        list="medication-list"
                        data-intervention="${intervention.id}"
                        placeholder="${intervention.inputLabel}"
                        ${ariaRequired}
                        aria-label="${intervention.label}"
                        autocomplete="off">
                    <datalist id="medication-list">
                        ${COMMON_MEDICATIONS.map(med => `<option value="${sanitizeHTML(med)}">`).join('')}
                    </datalist>
                    <div id="med-name-warning" class="medication-warning" style="display: none;" role="alert">
                        <span class="warning-icon">⚠️</span>
                        <span class="warning-text">This medication is not in our common medications list. Please verify the spelling.</span>
                    </div>
                `;
            } else {
                div.innerHTML = `
                    <label for="${intervention.id}">${intervention.label}:</label>
                    <input type="${inputType}" id="${intervention.id}" data-intervention="${intervention.id}" placeholder="${intervention.inputLabel}" ${minAttr} ${maxAttr} ${stepAttr} ${ariaRequired} aria-label="${intervention.label}">
                `;
            }
        }

        content.appendChild(div);
    });

    // Add event listeners to track inputs
    content.querySelectorAll('[data-intervention]').forEach(el => {
        // Special handling for medication name field
        if (el.id === 'med-name') {
            el.addEventListener('input', (e) => {
                updateInterventionState(e);
            });

            el.addEventListener('blur', (e) => {
                // Validate medication name on blur
                const medName = e.target.value;
                const isKnown = isKnownMedication(medName);
                toggleMedicationWarning(!isKnown && medName.trim() !== '');
            });

            el.addEventListener('focus', () => {
                // Hide warning when user starts typing again
                toggleMedicationWarning(false);
            });
        }
        // For critical clinical fields (BG, insulin), only validate on change/blur, not on every keystroke
        else if (el.id === 'bg-check' || el.id === 'insulin-admin' || el.id === 'carbs-consumed') {
            el.addEventListener('change', updateInterventionState);
            el.addEventListener('blur', updateInterventionState);
        } else {
            el.addEventListener('change', updateInterventionState);
            el.addEventListener('input', updateInterventionState);
        }
    });

    // Add listeners for "Other (specify)" handling
    content.querySelectorAll('select[data-intervention]').forEach(select => {
        select.addEventListener('change', function() {
            const otherInput = document.getElementById(this.id + '-other');
            if (otherInput) {
                if (this.value && this.value.includes('Other (specify)')) {
                    otherInput.style.display = 'block';
                    otherInput.focus();
                } else {
                    otherInput.style.display = 'none';
                    otherInput.value = '';
                }
            }
        });
    });

    section.style.display = 'block';
    displayEvaluation(problemKey);
    showFormatOptions();
    section.classList.add('fade-in');

    // Announce to screen readers and focus first input
    announceToScreenReader(`${problem.name} intervention form loaded. ${content.querySelectorAll('[data-intervention]').length} fields available.`);

    // Focus first input after a brief delay to allow screen reader announcement
    setTimeout(() => {
        const firstInput = content.querySelector('select, input, textarea');
        if (firstInput) {
            firstInput.focus();
        }
    }, 300);
}

/**
 * Updates intervention state when user modifies form inputs
 * Includes validation and safety checks for clinical values
 * @param {Event} e - The DOM event from the input/change
 * @returns {void}
 */
function updateInterventionState(e) {
    const id = e.target.id;
    let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    
    // Type safety and validation for number inputs
    if (e.target.type === 'number' && value !== '') {
        const numValue = parseFloat(value);
        
        // Prevent negative numbers
        if (numValue < 0) {
            e.target.value = 0;
            value = 0;
        }
        
        // Safety checks for carbs
        if (id === 'carbs-consumed' && numValue > 0) {
            // Warning for high but possible carb consumption
            if (numValue > CLINICAL_LIMITS.CARB_WARNING_THRESHOLD && numValue <= CLINICAL_LIMITS.CARB_CRITICAL_THRESHOLD) {
                showCarbWarning('warning', numValue);
            }
            // Critical alert for unreasonably high carbs - require confirmation
            else if (numValue > CLINICAL_LIMITS.CARB_CRITICAL_THRESHOLD) {
                if (!confirm(`⚠️ CRITICAL: Carbohydrate value of ${numValue}g exceeds safe limit (${CLINICAL_LIMITS.CARB_CRITICAL_THRESHOLD}g).\n\nThis is unusually high for a single meal. Please verify:\n- Is this a data entry error?\n- Is this truly the amount consumed?\n\nClick OK to cap at ${CLINICAL_LIMITS.CARB_CRITICAL_THRESHOLD}g, or Cancel to re-enter.`)) {
                    e.target.value = '';
                    value = '';
                    currentState.interventions[id] = value;
                    generateNote();
                    return;
                }
                showCarbWarning('critical', numValue);
                e.target.value = CLINICAL_LIMITS.CARB_CRITICAL_THRESHOLD;
                value = CLINICAL_LIMITS.CARB_CRITICAL_THRESHOLD;
            }
        }
        
        // Safety checks for insulin - hard limit requires confirmation
        if (id === 'insulin-admin' && numValue > CLINICAL_LIMITS.INSULIN_CRITICAL_THRESHOLD) {
            if (!confirm(`🚨 CRITICAL: Insulin dose of ${numValue} units exceeds safe threshold (${CLINICAL_LIMITS.INSULIN_CRITICAL_THRESHOLD} units).\n\nBEFORE PROCEEDING:\n✓ Verify medical orders\n✓ Double-check dose calculation\n✓ Confirm insulin-to-carb ratio\n✓ Verify correction factor\n\nClick OK only if you have verified this dose is correct.\nClick Cancel to re-enter the value.`)) {
                e.target.value = '';
                value = '';
                currentState.interventions[id] = value;
                generateNote();
                return;
            }
            showInsulinWarning(numValue);
        } else if (id === 'insulin-admin' && numValue > CLINICAL_LIMITS.INSULIN_WARNING_THRESHOLD) {
            showInsulinWarning(numValue);
        }
        
        // Safety checks for BG - critical values require acknowledgment
        if (id === 'bg-check') {
            if (numValue < CLINICAL_LIMITS.BG_CRITICAL_LOW && numValue > 0) {
                showBGWarning('critical-low', numValue);
                if (!confirm(`🚨 CRITICAL HYPOGLYCEMIA: BG ${numValue} mg/dL is dangerously low.\n\nIMMEDIATE ACTIONS REQUIRED:\n• Give 15g fast-acting carbs\n• Recheck in 15 minutes\n• Stay with student\n• Notify parent\n• Consider glucagon if unable to swallow\n\nClick OK to confirm you are taking appropriate action.`)) {
                    e.target.value = '';
                    value = '';
                    currentState.interventions[id] = value;
                    generateNote();
                    return;
                }
            } else if (numValue > CLINICAL_LIMITS.BG_CRITICAL_HIGH) {
                showBGWarning('critical-high', numValue);
                if (!confirm(`🚨 CRITICAL HYPERGLYCEMIA: BG ${numValue} mg/dL is dangerously high.\n\nIMMEDIATE ACTIONS REQUIRED:\n• Check for ketones (if available)\n• Verify correction factor per orders\n• Notify parent immediately\n• Consider MD consultation\n• Monitor for DKA symptoms\n\nClick OK to confirm you are taking appropriate action.`)) {
                    e.target.value = '';
                    value = '';
                    currentState.interventions[id] = value;
                    generateNote();
                    return;
                }
            }
        }
    }
    
    currentState.interventions[id] = value;
    generateNote();
    triggerAutoSave();
}

/**
 * Displays the evaluation section based on selected problem type
 * @param {string} problemKey - The key of the problem type
 * @returns {void}
 */
function displayEvaluation(problemKey) {
    const problem = problems[problemKey];
    const section = document.getElementById('evaluationSection');
    const content = document.getElementById('evaluationContent');
    
    content.innerHTML = '';
    
    problem.evaluations.forEach(evaluation => {
        const div = document.createElement('div');
        
        if (evaluation.checkbox) {
            div.className = 'form-group';
            div.innerHTML = `
                <div class="checkbox-item">
                    <input type="checkbox" id="${evaluation.id}" data-evaluation="${evaluation.id}" ${evaluation.id === 'standard-eval' ? 'checked' : ''}>
                    <label for="${evaluation.id}">${evaluation.label}</label>
                </div>
            `;
            if (evaluation.defaultText) {
                div.innerHTML += `<p class="info-text" style="margin-left: 30px; margin-top: 5px;">"${evaluation.defaultText}"</p>`;
            }
            // Add conditional time input for parent/EMS notifications
            if (evaluation.hasTimeInput) {
                const timeLabel = evaluation.id === 'parent-notified' ? 'Time of parent contact' : 'Time EMS notified';
                div.innerHTML += `
                    <div id="${evaluation.id}-time-container" class="input-inline" style="display: none; margin-left: 30px; margin-top: 10px;">
                        <span>${timeLabel}:</span>
                        <input type="time" id="${evaluation.id}-time" data-evaluation-time="${evaluation.id}">
                    </div>
                `;
            }
        } else if (evaluation.textarea) {
            div.className = 'form-group';
            div.innerHTML = `
                <label>${evaluation.label}:</label>
                <textarea id="${evaluation.id}" data-evaluation="${evaluation.id}" placeholder="${evaluation.inputLabel}"></textarea>
            `;
        } else if (evaluation.hasInput) {
            div.className = 'form-group';
            div.innerHTML = `
                <label>${evaluation.label}:</label>
                <input type="text" id="${evaluation.id}" data-evaluation="${evaluation.id}" placeholder="${evaluation.inputLabel}">
            `;
        }
        
        content.appendChild(div);
    });
    
    // Add event listeners for checkboxes and inputs
    content.querySelectorAll('[data-evaluation]').forEach(el => {
        el.addEventListener('change', (e) => {
            updateEvaluationState(e);
            // Show/hide time input for parent-notified and ems-notified
            if (e.target.type === 'checkbox' && (e.target.id === 'parent-notified' || e.target.id === 'ems-notified')) {
                const timeContainer = document.getElementById(`${e.target.id}-time-container`);
                if (timeContainer) {
                    timeContainer.style.display = e.target.checked ? 'flex' : 'none';
                    // Clear time value if unchecked
                    if (!e.target.checked) {
                        const timeInput = document.getElementById(`${e.target.id}-time`);
                        if (timeInput) {
                            timeInput.value = '';
                            currentState.evaluation[`${e.target.id}-time`] = '';
                            generateNote();
                        }
                    }
                }
            }
        });
        el.addEventListener('input', updateEvaluationState);
    });
    
    // Add event listeners for time inputs
    content.querySelectorAll('[data-evaluation-time]').forEach(el => {
        el.addEventListener('change', (e) => {
            const evalId = e.target.dataset.evaluationTime;
            currentState.evaluation[`${evalId}-time`] = e.target.value;
            generateNote();
        });
        el.addEventListener('input', (e) => {
            const evalId = e.target.dataset.evaluationTime;
            currentState.evaluation[`${evalId}-time`] = e.target.value;
            generateNote();
        });
    });
    
    // Auto-check standard evaluation by default
    const standardEval = document.getElementById('standard-eval');
    if (standardEval && standardEval.checked) {
        currentState.evaluation['standard-eval'] = true;
        generateNote();
    }
    
    section.style.display = 'block';
    section.classList.add('fade-in');
}

/**
 * Updates evaluation state when user modifies evaluation form inputs
 * @param {Event} e - The DOM event from the input/change
 * @returns {void}
 */
function updateEvaluationState(e) {
    const id = e.target.id;
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    currentState.evaluation[id] = value;
    generateNote();
    triggerAutoSave();
}

// Show format options section
function showFormatOptions() {
    const section = document.getElementById('formatSection');
    const checkbox = document.getElementById('piePrefix');
    
    // Add event listener for prefix toggle
    checkbox.addEventListener('change', (e) => {
        currentState.usePiePrefix = e.target.checked;
        generateNote();
    });
    
    section.style.display = 'block';
    section.classList.add('fade-in');
}

/**
 * Gets the display value for a field, handling "Other (specify)" options
 * @param {string} fieldId - The field ID
 * @param {string} value - The current field value
 * @returns {string} - The display value to use in the note
 */
function getDisplayValue(fieldId, value) {
    if (value && value.includes('Other (specify)')) {
        const otherValue = currentState.interventions[fieldId + '-other'];
        return otherValue || value;
    }
    return value;
}

/**
 * Generates a PIE-formatted clinical note based on current state
 * Creates Problem, Intervention, and Evaluation sections
 * @returns {void}
 */
function generateNote() {
    const problem = problems[currentState.problem];
    if (!problem) return;
    
    const usePrefix = currentState.usePiePrefix;
    let noteText = '';
    
    // PROBLEM - Build narrative
    const problemPrefix = usePrefix ? 'P: ' : '';
    let problemNarrative = '';
    
    // Build problem statement with context
    if (currentState.problem === 'diabetes') {
        const bgValue = currentState.interventions['bg-check'];
        const carbsValue = currentState.interventions['carbs-consumed'];
        const cgm = currentState.interventions['bg-source-cgm'];
        const fingerstick = currentState.interventions['bg-source-fingerstick'];
        const visitReason = currentState.interventions['visit-reason'];
        const symptoms = currentState.interventions['student-symptoms'];
        
        // Build opening
        let opening = 'Student with diabetes presented to health office';
        if (visitReason && visitReason !== '') {
            opening += ` for ${visitReason.toLowerCase()}`;
        }
        
        // Add symptoms if present
        let symptomText = '';
        if (symptoms && symptoms !== '' && symptoms !== 'No symptoms') {
            symptomText = ` Student reports ${symptoms.toLowerCase()}`;
        }
        
        // Build BG source text
        let bgSourceText = '';
        if (bgValue) {
            if (cgm && fingerstick) {
                bgSourceText = `Blood glucose measured at ${bgValue} mg/dL via Dexcom sensors and verified by fingerstick test via glucometer`;
            } else if (cgm) {
                bgSourceText = `Blood glucose measured at ${bgValue} mg/dL via Dexcom CGM`;
            } else if (fingerstick) {
                bgSourceText = `Blood glucose measured at ${bgValue} mg/dL via fingerstick glucometer`;
            } else {
                bgSourceText = `Blood glucose check: ${bgValue} mg/dL`;
            }
        }
        
        // Combine all parts
        if (bgValue && carbsValue) {
            problemNarrative = `${opening}.${symptomText} ${bgSourceText}. Carbohydrates consumed: ${carbsValue}g.`;
        } else if (bgValue) {
            problemNarrative = `${opening}.${symptomText} ${bgSourceText}.`;
        } else {
            problemNarrative = `${opening}.${symptomText}`;
        }
        
        // Clean up any double spaces
        problemNarrative = problemNarrative.replace(/\s+/g, ' ').replace(/\.\s+\./g, '.');
    } else if (currentState.problem === 'medication') {
        const medName = currentState.interventions['med-name'];
        const reason = getDisplayValue('reason', currentState.interventions['reason']);
        const medClass = currentState.interventions['med-class'];
        const prnReason = currentState.interventions['prn-reason'];

        let opening = 'Student presented for medication administration';

        if (medName && reason) {
            problemNarrative = `${opening}. ${medName} needed for ${reason.toLowerCase()}`;
            if (medClass && medClass !== '') {
                problemNarrative += ` (${medClass.toLowerCase()})`;
            }
            if (prnReason && prnReason !== '' && prnReason !== 'N/A - Scheduled dose') {
                problemNarrative += `. PRN administration indicated for ${prnReason.toLowerCase()}`;
            }
            problemNarrative += '.';
        } else if (medName) {
            problemNarrative = `${opening}. ${medName} administration`;
            if (medClass && medClass !== '') {
                problemNarrative += ` (${medClass.toLowerCase()})`;
            }
            problemNarrative += '.';
        } else {
            problemNarrative = `${opening}.`;
        }
    } else if (currentState.problem === 'first-aid') {
        const injuryType = currentState.interventions['injury-type'];
        const location = getDisplayValue('location', currentState.interventions['location']);
        const occurred = currentState.interventions['injury-occurred'];
        const mechanism = currentState.interventions['injury-mechanism'];
        const assessment = currentState.interventions['initial-assessment'];

        let opening = 'Student presented to health office';

        if (injuryType && location) {
            problemNarrative = `${opening} with ${injuryType.toLowerCase()} to ${location.toLowerCase()}`;
        } else if (injuryType) {
            problemNarrative = `${opening} with ${injuryType.toLowerCase()}`;
        } else {
            problemNarrative = `${opening} with minor injury/discomfort`;
        }
        
        // Add how/where it occurred
        if (occurred && occurred !== '') {
            problemNarrative += ` sustained during ${occurred.toLowerCase()}`;
        }
        
        if (mechanism && mechanism !== '' && mechanism !== 'Other') {
            problemNarrative += ` from ${mechanism.toLowerCase()}`;
        }
        
        problemNarrative += '.';
        
        // Add initial assessment
        if (assessment && assessment !== '') {
            problemNarrative += ` Initial assessment: ${assessment.toLowerCase()}.`;
        }
    } else {
        const customIntervention = currentState.interventions['custom-intervention'];
        problemNarrative = customIntervention || `Student presented to health office.`;
    }
    
    noteText += problemPrefix + problemNarrative + '\n\n';
    
    // INTERVENTION - Build narrative with flowing sentences
    const interventionPrefix = usePrefix ? 'I: ' : '';
    const interventionSentences = [];

    // Build context-aware narrative based on problem type
    if (currentState.problem === 'diabetes') {
        // Insulin administration sentence
        const insulinAmount = currentState.interventions['insulin-admin'];
        const insulinType = currentState.interventions['insulin-type'];
        const insulinDelivery = currentState.interventions['insulin-delivery'];
        const injectionSite = currentState.interventions['injection-site'];
        const insulinReason = currentState.interventions['insulin-reason'];

        if (insulinAmount) {
            let insulinSentence = `Administered ${insulinAmount} units of insulin`;
            if (insulinType) {
                insulinSentence += ` (${insulinType})`;
            }
            if (insulinDelivery) {
                insulinSentence += ` via ${insulinDelivery.toLowerCase()}`;
            }
            if (injectionSite && injectionSite !== 'N/A' && injectionSite !== 'Via pump') {
                insulinSentence += ` to ${injectionSite.toLowerCase()}`;
            }
            if (insulinReason) {
                insulinSentence += ` for ${insulinReason.toLowerCase()}`;
            }
            interventionSentences.push(insulinSentence);
        }

        // Snack/treatment sentence
        const snack = getDisplayValue('snack-provided', currentState.interventions['snack-provided']);
        if (snack && snack !== 'None needed') {
            interventionSentences.push(`Provided ${snack.toLowerCase()} for hypoglycemia management`);
        }

        // Orders and parent contact
        if (currentState.interventions['orders-checked']) {
            interventionSentences.push('Medical orders reviewed and followed');
        }

        const parentContact = getDisplayValue('parent-contact', currentState.interventions['parent-contact']);
        if (parentContact && parentContact !== 'Not contacted') {
            interventionSentences.push(`Parent/guardian contacted regarding ${parentContact.toLowerCase()}`);
        }

    } else if (currentState.problem === 'medication') {
        // Medication administration sentence
        const dose = currentState.interventions['dose'];
        const doseUnit = currentState.interventions['dose-unit'];
        const route = currentState.interventions['route'];
        const timeSinceLast = getDisplayValue('time-since-last', currentState.interventions['time-since-last']);

        if (dose) {
            let medSentence = `Administered dose of ${dose}`;
            if (doseUnit) {
                medSentence += ` ${doseUnit}`;
            }
            if (route) {
                medSentence += ` ${route}`;
            }
            if (timeSinceLast && timeSinceLast !== 'Unknown/Not applicable') {
                medSentence += `. Time since last dose: ${timeSinceLast.toLowerCase()}`;
            }
            interventionSentences.push(medSentence);
        }

        // Verification and safety checks
        const verifications = [];
        if (currentState.interventions['dose-verification']) {
            verifications.push('dose calculation verified');
        }
        if (currentState.interventions['witnessed-admin']) {
            verifications.push('witnessed student take medication');
        }
        if (currentState.interventions['orders-checked']) {
            verifications.push('medical orders reviewed and verified');
        }

        if (verifications.length > 0) {
            const verificationText = verifications.join(', ');
            interventionSentences.push(verificationText.charAt(0).toUpperCase() + verificationText.slice(1));
        }

        const parentContact = getDisplayValue('parent-contact', currentState.interventions['parent-contact']);
        if (parentContact && parentContact !== 'Not contacted') {
            interventionSentences.push(`Parent/guardian contacted regarding ${parentContact.toLowerCase()}`);
        }

    } else if (currentState.problem === 'first-aid') {
        // Treatment actions
        const treatments = [];

        const iceDuration = getDisplayValue('ice-duration', currentState.interventions['ice-duration']);
        if (currentState.interventions['ice-applied'] || (iceDuration && iceDuration !== 'N/A')) {
            if (iceDuration && iceDuration !== 'N/A') {
                treatments.push(`applied ice pack for ${iceDuration.toLowerCase()}`);
            } else {
                treatments.push('applied ice pack');
            }
        }

        const woundCare = currentState.interventions['wound-care'];
        if (woundCare && woundCare !== 'N/A') {
            treatments.push(woundCare.toLowerCase());
        }

        if (currentState.interventions['bandaid-applied']) {
            treatments.push('applied bandage/dressing');
        }

        if (treatments.length > 0) {
            const treatmentText = treatments.join(', then ');
            interventionSentences.push(treatmentText.charAt(0).toUpperCase() + treatmentText.slice(1));
        }

        // Rest and vital signs
        const restProvided = getDisplayValue('rest-provided', currentState.interventions['rest-provided']);
        if (restProvided && restProvided !== 'N/A') {
            interventionSentences.push(`Provided ${restProvided.toLowerCase()} of rest`);
        }

        const vitalSigns = currentState.interventions['vital-signs'];
        if (vitalSigns) {
            interventionSentences.push(`Vital signs assessed: ${vitalSigns}`);
        }

        // Head injury screening
        const headInjury = currentState.interventions['head-injury-screen'];
        if (headInjury && headInjury !== 'N/A - Not head injury') {
            interventionSentences.push(`Head injury screening performed: ${headInjury.toLowerCase()}`);
        }

        // Return to activity
        const returnStatus = currentState.interventions['return-to-activity'];
        if (returnStatus) {
            interventionSentences.push(returnStatus);
        }

        // Parent contact
        const parentContact = getDisplayValue('parent-contact', currentState.interventions['parent-contact']);
        if (parentContact && parentContact !== 'Not contacted') {
            interventionSentences.push(`Parent/guardian contacted regarding ${parentContact.toLowerCase()}`);
        }

    } else {
        // For "other" problem type, use the custom intervention text
        const customIntervention = currentState.interventions['custom-intervention'];
        if (customIntervention) {
            interventionSentences.push(customIntervention);
        }
    }

    if (interventionSentences.length > 0) {
        // Join sentences with proper punctuation
        let interventionText = interventionSentences[0];
        for (let i = 1; i < interventionSentences.length; i++) {
            // Add period if previous sentence doesn't end with punctuation
            if (!interventionText.match(/[.!?]$/)) {
                interventionText += '.';
            }
            interventionText += ' ' + interventionSentences[i];
        }
        // Ensure final period
        if (!interventionText.match(/[.!?]$/)) {
            interventionText += '.';
        }
        noteText += interventionPrefix + interventionText + '\n\n';
    } else {
        noteText += interventionPrefix + '(Complete intervention details)\n\n';
    }
    
    // EVALUATION - Build narrative
    const evaluationPrefix = usePrefix ? 'E: ' : '';
    const evaluationParts = [];
    
    // Standard evaluation (most common)
    if (currentState.evaluation['standard-eval']) {
        const standardText = problem.evaluations.find(e => e.id === 'standard-eval')?.defaultText;
        if (standardText) evaluationParts.push(standardText);
    }
    
    // Parent notification
    if (currentState.evaluation['parent-notified']) {
        const parentTime = currentState.evaluation['parent-notified-time'];
        if (parentTime && parentTime !== '') {
            // Convert 24-hour time to 12-hour format
            const timeFormatted = formatTime(parentTime);
            evaluationParts.push(`Parent notified at ${timeFormatted} via phone`);
        } else {
            evaluationParts.push('Parent notified via phone');
        }
    }
    
    // Emergency services
    if (currentState.evaluation['ems-notified']) {
        const emsTime = currentState.evaluation['ems-notified-time'];
        if (emsTime && emsTime !== '') {
            const timeFormatted = formatTime(emsTime);
            evaluationParts.push(`Emergency Services notified at ${timeFormatted}`);
        } else {
            evaluationParts.push('Emergency Services notified');
        }
    }
    
    // Additional evaluation notes
    const additionalEval = currentState.evaluation['additional-eval'];
    if (additionalEval && additionalEval !== '') {
        evaluationParts.push(additionalEval);
    }
    
    if (evaluationParts.length > 0) {
        // Join parts intelligently - don't add period if last part already has one
        let evaluationText = evaluationParts[0];
        for (let i = 1; i < evaluationParts.length; i++) {
            // Add period if previous part doesn't end with punctuation
            if (!evaluationText.match(/[.!?]$/)) {
                evaluationText += '.';
            }
            evaluationText += ' ' + evaluationParts[i];
        }
        // Ensure final period
        if (!evaluationText.match(/[.!?]$/)) {
            evaluationText += '.';
        }
        noteText += evaluationPrefix + evaluationText;
    } else {
        noteText += evaluationPrefix + '(Complete evaluation details)';
    }
    
    // Display the note
    const noteContent = document.getElementById('noteContent');
    const notePreview = document.getElementById('notePreview');
    const wasHidden = notePreview.style.display === 'none';

    noteContent.textContent = noteText;
    notePreview.style.display = 'block';
    notePreview.classList.add('fade-in');

    // Announce to screen readers only when note is first generated, not on every update
    if (wasHidden) {
        announceToScreenReader('PIE note generated successfully. Review the note below and copy when ready.');
    }

    setupCopyButton(noteText);
}

// Helper function to format time from 24-hour to 12-hour with AM/PM
function formatTime(timeString) {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
    
    return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Sets up copy button functionality with clipboard API
 * @param {string} noteText - The note text to copy
 * @returns {void}
 */
function setupCopyButton(noteText) {
    const copyBtn = document.getElementById('copyBtn');
    const feedback = document.getElementById('copyFeedback');

    copyBtn.onclick = async () => {
        try {
            await navigator.clipboard.writeText(noteText);
            feedback.textContent = '✓ Copied to clipboard!';
            feedback.classList.add('show');

            // Announce to screen readers
            announceToScreenReader('Note successfully copied to clipboard');

            // Save this note to history
            saveNoteToHistory();

            // Clear auto-save since work is complete
            clearAutoSave();

            setTimeout(() => {
                feedback.classList.remove('show');
            }, 3000);
        } catch (error) {
            console.error('Clipboard error:', error);
            feedback.textContent = '✗ Failed to copy. Please select and copy manually.';
            feedback.classList.add('show');

            // Announce error to screen readers
            announceToScreenReader('Failed to copy note. Please try manually selecting and copying the text.');
        }
    };
}

// Reset form
function setupResetButton() {
    const resetBtn = document.getElementById('resetBtn');
    resetBtn.onclick = () => {
        currentState = {
            problem: null,
            interventions: {},
            evaluation: {},
            usePiePrefix: document.getElementById('piePrefix')?.checked || true
        };

        // Reset UI
        document.querySelectorAll('.problem-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('interventionSection').style.display = 'none';
        document.getElementById('evaluationSection').style.display = 'none';
        document.getElementById('formatSection').style.display = 'none';
        document.getElementById('notePreview').style.display = 'none';

        // Announce to screen readers
        announceToScreenReader('Form reset complete. Please select a problem type to begin a new note.');

        // Scroll to top and focus first problem button
        window.scrollTo({ top: 0, behavior: 'smooth' });

        setTimeout(() => {
            const firstProblemBtn = document.querySelector('.problem-btn');
            if (firstProblemBtn) {
                firstProblemBtn.focus();
            }
        }, 500);
    };
}

// Clinical tips for Medical Order Review banner (rotates randomly on page load)
const CLINICAL_TIPS = [
    'Illinois School Code requires annual medical order review. Best practice: verify orders monthly. Document "medical orders reviewed and followed" in diabetes and medication notes.',
    'Always document the 5 Rights: Right Student, Right Medication, Right Dose, Right Route, Right Time. This protects you legally and ensures patient safety.',
    'For PRN medications: Document the specific reason for administration and the student\'s response to treatment within 30-60 minutes.',
    'Delegation of care to unlicensed personnel requires RN assessment, training documentation, and ongoing supervision per Illinois Nurse Practice Act.',
    'Emergency medications (EpiPens, Diastat, glucagon) require staff training documentation. Update emergency action plans annually and after any incident.',
    'FERPA compliance: Never discuss student health information in hallways, staff rooms, or via unsecured email. Use "need to know" principle.',
    'Maintain daily medication logs separate from health office visit logs. Reconcile controlled substance counts monthly for accountability.'
];

// Clinical Decision Support System - School Nursing Best Practices
/**
 * Analyzes usage patterns and generates clinical decision support alerts
 * Provides guidance on medical orders, documentation, and best practices
 * @returns {void}
 */
function checkClinicalDecisionSupport() {
    const alertsDiv = document.getElementById('cdsAlerts');
    if (!alertsDiv) return;
    
    alertsDiv.innerHTML = '';
    
    try {
        if (!isLocalStorageAvailable()) {
            return; // Silently skip CDS if storage unavailable
        }
        
        const patterns = getUsagePatterns();
        const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTE_HISTORY) || '[]');
        
        // 1. Medical Orders Verification (Required for Medicaid billing & liability)
        const lastOrderCheck = localStorage.getItem(STORAGE_KEYS.LAST_ORDER_CHECK);
        const daysSinceCheck = lastOrderCheck ? Math.floor((Date.now() - parseInt(lastOrderCheck)) / (1000 * 60 * 60 * 24)) : null;
        
        if (daysSinceCheck === null || daysSinceCheck > CLINICAL_LIMITS.ORDER_CHECK_DAYS) {
        // Randomly select a clinical tip from the array
        const randomTip = CLINICAL_TIPS[Math.floor(Math.random() * CLINICAL_TIPS.length)];
        showAlert('warning', '⚕️ Medical Order Review', randomTip);
    }
    
        // 2. Documentation Completeness (CPS/IDPH Guidelines)
        if (patterns.totalNotes > 15) {
            const ordersCheckedPercent = (patterns.ordersChecked || 0) / patterns.totalNotes;
            
            if (ordersCheckedPercent < 0.6) {
                showAlert('info', '📋 Documentation Best Practice', 
                    `Order verification documented in ${Math.round(ordersCheckedPercent * 100)}% of notes. Illinois Nurse Practice Act requires following physician orders. Document verification for legal protection.`);
            }
        }
        
        // 3. Frequent Visitor Pattern (Potential Care Plan Need)
        const recentHistory = history.filter(note => Date.now() - note.timestamp < CLINICAL_LIMITS.FREQUENT_VISIT_DAYS * 24 * 60 * 60 * 1000);
        if (recentHistory.length >= 8) {
            showAlert('warning', '🔄 Frequent Office Visits', 
                `${recentHistory.length} notes documented in past ${CLINICAL_LIMITS.FREQUENT_VISIT_DAYS} days. Consider: Is care plan needed? Is there a pattern? Document parent communication and any referrals.`);
        }
        
        // 4. Diabetes Management Alert (ADA/IDPH Guidelines)
        if (patterns.problems.diabetes >= 5) {
            const recentDiabetes = history.filter(note => 
                note.problem === 'diabetes' && 
                Date.now() - note.timestamp < CLINICAL_LIMITS.ORDER_CHECK_DAYS * 24 * 60 * 60 * 1000
            );
            
            if (recentDiabetes.length >= 3) {
                showAlert('info', '🩸 Diabetes Management', 
                    'Multiple diabetes encounters documented. Reminder: Illinois requires Diabetes Care Plan on file. Consider: Are BG logs being reviewed? Is parent communication documented?');
            }
        }
        
        // 5. Assessment Variation (Clinical Growth Opportunity)
        if (patterns.repeatedPatterns && patterns.repeatedPatterns.length > 0) {
            const topPattern = patterns.repeatedPatterns[0];
            if (topPattern.count > 12) {
                const problemName = problems[topPattern.problem]?.name || topPattern.problem;
                showAlert('info', '💡 Clinical Documentation Insight', 
                    `Similar ${problemName} documentation pattern used ${topPattern.count} times. Consider: Are assessments thorough? Does evaluation reflect student-specific response? Varied documentation demonstrates critical thinking.`);
            }
        }
        
        // 6. FERPA/Privacy Reminder (Periodic)
        if (patterns.totalNotes > 0 && patterns.totalNotes % 25 === 0) {
            showAlert('info', '🔒 FERPA Reminder', 
                'Health records are protected by FERPA and HIPAA. Remember: Store notes securely, share only with authorized personnel, obtain consent for external releases. Keep student identifiers private.');
        }
    
    } catch (error) {
        console.error('CDS check failed:', error);
        // Non-critical feature, fail silently
    }
}

/**
 * Displays a clinical decision support alert
 * @param {string} type - Alert type: 'warning', 'info', 'danger'
 * @param {string} title - Alert title
 * @param {string} message - Alert message content
 * @returns {void}
 */
function showAlert(type, title, message) {
    const alertsDiv = document.getElementById('cdsAlerts');
    if (!alertsDiv) return;
    
    const alert = document.createElement('div');
    alert.className = `cds-alert ${type}`;
    alert.innerHTML = `<strong>${sanitizeHTML(title)}</strong><p>${sanitizeHTML(message)}</p>`;
    alertsDiv.appendChild(alert);
}

// Usage tracking and patterns
/**
 * Saves generated note data to localStorage history
 * Tracks problem type, interventions, and order verification
 * @returns {boolean} True if saved successfully, false otherwise
 */
function saveNoteToHistory() {
    try {
        if (!isLocalStorageAvailable()) {
            console.warn('LocalStorage not available, note not saved to history');
            return false;
        }
        
        const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTE_HISTORY) || '[]');
        
        const noteData = {
            timestamp: Date.now(),
            problem: currentState.problem,
            interventions: Object.keys(currentState.interventions),
            ordersChecked: currentState.interventions['orders-checked'] || false
        };
        
        history.push(noteData);
        
        // Keep only last configured maximum notes
        if (history.length > STORAGE_CONFIG.MAX_HISTORY_NOTES) {
            history.shift();
        }
        
        localStorage.setItem(STORAGE_KEYS.NOTE_HISTORY, JSON.stringify(history));
        
        // Update usage patterns
        updateUsagePatterns(noteData);
        
        // Update order check timestamp if orders were checked
        if (noteData.ordersChecked) {
            localStorage.setItem(STORAGE_KEYS.LAST_ORDER_CHECK, Date.now().toString());
        }
        
        // Refresh statistics
        loadUsageStatistics();
        
        return true;
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.error('LocalStorage quota exceeded');
            showStorageError('Storage full. Consider clearing old notes from browser data.');
        } else {
            console.error('Failed to save note to history:', error);
        }
        return false;
    }
}

/**
 * Updates usage patterns for clinical decision support
 * @param {Object} noteData - The note data to track
 * @returns {void}
 */
function updateUsagePatterns(noteData) {
    try {
        if (!isLocalStorageAvailable()) {
            return;
        }
        
        const patterns = getUsagePatterns();
        
        patterns.totalNotes++;
        patterns.problems[noteData.problem] = (patterns.problems[noteData.problem] || 0) + 1;
        
        if (noteData.ordersChecked) {
            patterns.ordersChecked = (patterns.ordersChecked || 0) + 1;
        }
    
        // Track intervention patterns
        const patternKey = `${noteData.problem}-${noteData.interventions.sort().join(',')}`;
        const existing = patterns.repeatedPatterns.find(p => p.key === patternKey);
        if (existing) {
            existing.count++;
        } else {
            patterns.repeatedPatterns.push({
                key: patternKey,
                problem: noteData.problem,
                count: 1
            });
        }
        
        // Sort repeated patterns by count
        patterns.repeatedPatterns.sort((a, b) => b.count - a.count);
        
        localStorage.setItem(STORAGE_KEYS.USAGE_PATTERNS, JSON.stringify(patterns));
    } catch (error) {
        console.error('Failed to update usage patterns:', error);
        // Non-critical, fail silently
    }
}

/**
 * Retrieves usage patterns from localStorage
 * @returns {{totalNotes: number, problems: Object, ordersChecked: number, repeatedPatterns: Array}} Usage patterns object
 */
function getUsagePatterns() {
    const defaultPatterns = {
        totalNotes: 0,
        problems: {},
        ordersChecked: 0,
        repeatedPatterns: []
    };
    
    try {
        if (!isLocalStorageAvailable()) {
            return defaultPatterns;
        }
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.USAGE_PATTERNS) || JSON.stringify(defaultPatterns));
    } catch (error) {
        console.error('Failed to retrieve usage patterns:', error);
        return defaultPatterns;
    }
}

/**
 * Loads and displays usage statistics in the UI
 * @returns {void}
 */
function loadUsageStatistics() {
    try {
        const patterns = getUsagePatterns();
        const statsContent = document.getElementById('statsContent');
        
        if (!statsContent) return;
    
        if (patterns.totalNotes === 0) {
            statsContent.innerHTML = '<p class="info-text">Pattern tracking will appear after you create a few notes.</p>';
            return;
        }
        
        let html = `<p><strong>Total notes created:</strong> ${patterns.totalNotes}</p>`;
        
        html += '<div class="stat-item"><strong>Most Common Problems:</strong><br>';
        const sortedProblems = Object.entries(patterns.problems).sort((a, b) => b[1] - a[1]);
        sortedProblems.forEach(([problem, count]) => {
            const percent = Math.round((count / patterns.totalNotes) * 100);
            html += `${sanitizeHTML(problems[problem].name)}: ${count} (${percent}%)<br>`;
        });
        html += '</div>';
        
        const ordersPercent = Math.round((patterns.ordersChecked / patterns.totalNotes) * 100);
        html += `<div class="stat-item"><strong>Orders verification rate:</strong> ${ordersPercent}%</div>`;
        
        statsContent.innerHTML = html;
        
        // Recheck CDS alerts based on updated patterns
        checkClinicalDecisionSupport();
    } catch (error) {
        console.error('Failed to load usage statistics:', error);
    }
}

// Safety warning functions
/**
 * Displays a carbohydrate warning alert
 * @param {string} level - 'warning' or 'critical'
 * @param {number} value - The carb value in grams
 * @returns {void}
 */
function showCarbWarning(level, value) {
    const alertsDiv = document.getElementById('cdsAlerts');
    // Remove any existing carb warnings
    const existingWarning = alertsDiv.querySelector('.carb-warning');
    if (existingWarning) existingWarning.remove();
    
    const alert = document.createElement('div');
    alert.className = level === 'critical' ? 'cds-alert warning carb-warning' : 'cds-alert info carb-warning';
    
    if (level === 'critical') {
        alert.innerHTML = `<strong>⚠️ Critical: Carbohydrate Value</strong><p>${value}g exceeds reasonable single-meal consumption (max ${CLINICAL_LIMITS.CARB_CRITICAL_THRESHOLD}g). Value capped at ${CLINICAL_LIMITS.CARB_CRITICAL_THRESHOLD}g. Verify this is not a data entry error.</p>`;
    } else {
        alert.innerHTML = `<strong>⚠️ High Carbohydrate Intake</strong><p>${value}g is unusually high for a single meal (typical range: 30-100g). Verify accuracy and document reason if correct.</p>`;
    }
    
    alertsDiv.insertBefore(alert, alertsDiv.firstChild);
}

/**
 * Displays an insulin dose warning alert
 * @param {number} value - The insulin dose in units
 * @returns {void}
 */
function showInsulinWarning(value) {
    const alertsDiv = document.getElementById('cdsAlerts');
    const existingWarning = alertsDiv.querySelector('.insulin-warning');
    if (existingWarning) existingWarning.remove();
    
    const alert = document.createElement('div');
    alert.className = 'cds-alert warning insulin-warning';
    alert.innerHTML = `<strong>⚠️ High Insulin Dose</strong><p>${value} units is a high dose. Verify medical orders, insulin-to-carb ratio, and correction factor. Consider RN consultation.</p>`;
    
    alertsDiv.insertBefore(alert, alertsDiv.firstChild);
}

/**
 * Displays a blood glucose warning alert
 * @param {string} level - 'critical-low' or 'critical-high'
 * @param {number} value - The BG value in mg/dL
 * @returns {void}
 */
function showBGWarning(level, value) {
    const alertsDiv = document.getElementById('cdsAlerts');
    const existingWarning = alertsDiv.querySelector('.bg-warning');
    if (existingWarning) existingWarning.remove();
    
    const alert = document.createElement('div');
    alert.className = 'cds-alert warning bg-warning';
    
    if (level === 'critical-low') {
        alert.innerHTML = `<strong>🚨 Critical Hypoglycemia</strong><p>BG ${value} mg/dL is critically low. Follow hypoglycemia protocol: 15g fast-acting carbs, recheck in 15 min. Consider glucagon if unable to swallow. Document parent notification.</p>`;
    } else if (level === 'critical-high') {
        alert.innerHTML = `<strong>🚨 Critical Hyperglycemia</strong><p>BG ${value} mg/dL is critically high. Check for ketones if able. Verify correction factor per orders. Notify parent and consider MD consultation if >400 mg/dL persists.</p>`;
    }
    
    alertsDiv.insertBefore(alert, alertsDiv.firstChild);
}
