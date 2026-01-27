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
            { id: "injection-site", label: "Injection site (if applicable)", options: ["Abdomen", "Upper arm", "Thigh", "Buttocks", "Via pump", "N/A"] },
            { id: "insulin-reason", label: "Reason for insulin", options: ["Lunch coverage", "Correction dose", "Snack coverage", "High BG"] },
            { id: "snack-provided", label: "Snack/glucose provided for hypoglycemia", hasInput: true, inputLabel: "What was provided" },
            { id: "orders-checked", label: "Medical orders reviewed and followed", checkbox: true },
            { id: "parent-contact", label: "Parent/guardian contacted", hasInput: true, inputLabel: "Reason for contact" }
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
            { id: "med-class", label: "Medication class", options: ["ADHD stimulant", "ADHD non-stimulant", "Antibiotic", "Asthma/bronchodilator", "Antihistamine/allergy", "Anti-seizure", "Pain reliever", "GI/anti-nausea", "Psychiatric/mood", "Cardiac", "Other"] },
            { id: "dose", label: "Dose administered", hasInput: true, inputLabel: "Dose" },
            { id: "route", label: "Route", options: ["PO (by mouth)", "Inhaled", "Topical", "Sublingual", "Subcutaneous", "Nasal", "Other"] },
            { id: "reason", label: "Reason for medication", hasInput: true, inputLabel: "Indication" },
            { id: "prn-reason", label: "PRN reason (if applicable)", options: ["N/A - Scheduled dose", "Pain", "Fever", "Asthma symptoms/wheezing", "Anxiety", "Nausea", "Allergic reaction", "Breakthrough symptoms", "Other"] },
            { id: "time-since-last", label: "Time since last dose", hasInput: true, inputLabel: "Hours since last dose (if known)" },
            { id: "dose-verification", label: "Dose calculation verified", checkbox: true },
            { id: "witnessed-admin", label: "Witnessed student take medication", checkbox: true },
            { id: "orders-checked", label: "Medical orders reviewed and verified", checkbox: true },
            { id: "parent-contact", label: "Parent/guardian contacted", hasInput: true, inputLabel: "Reason for contact" }
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
            { id: "location", label: "Location of injury", hasInput: true, inputLabel: "Body part/location" },
            { id: "injury-occurred", label: "How injury occurred", options: ["Playground", "PE class", "Classroom", "Hallway", "Cafeteria", "Recess", "Sports/athletics", "Stairs", "Bathroom", "Bus area", "Student reports unknown", "Other"] },
            { id: "injury-mechanism", label: "Mechanism of injury", options: ["Fall from height", "Fall on same level", "Collision with person", "Collision with object", "Struck by object", "Contact with sharp object", "Twisting motion", "Non-traumatic/spontaneous", "Unknown", "Other"] },
            { id: "initial-assessment", label: "Initial assessment", options: ["Alert and oriented", "No visible distress", "Mild distress", "Moderate distress", "Denies loss of consciousness", "Brief LOC reported", "Other"] },
            { id: "ice-applied", label: "Ice pack applied", checkbox: true },
            { id: "ice-duration", label: "Ice application duration", hasInput: true, inputLabel: "Duration (minutes)" },
            { id: "bandaid-applied", label: "Band-aid/dressing applied", checkbox: true },
            { id: "wound-care", label: "Wound care performed", options: ["N/A", "Cleaned with soap and water", "Cleaned with saline", "Antiseptic applied", "Pressure applied for bleeding control", "Gauze dressing applied", "Other"] },
            { id: "rest-provided", label: "Rest period provided", hasInput: true, inputLabel: "Duration (minutes)" },
            { id: "vital-signs", label: "Vital signs assessed", hasInput: true, inputLabel: "Results (if applicable)" },
            { id: "head-injury-screen", label: "Head injury screening", options: ["N/A - Not head injury", "No signs of concussion", "Concussion symptoms present", "LOC reported", "Vomiting present", "Confusion noted", "Headache persists", "Refer for evaluation"] },
            { id: "return-to-activity", label: "Return to activity status", options: ["Returned to class immediately", "Returned to class after rest", "Returned to class with restrictions", "Unable to return to activity", "Parent pickup arranged", "Referred for further evaluation"] },
            { id: "parent-contact", label: "Parent/guardian contacted", hasInput: true, inputLabel: "Reason for contact" }
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
    LAST_ORDER_CHECK: 'pie_last_order_check'
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

function init() {
    setupProblemButtons();
    setupResetButton();
    loadUsageStatistics();
    checkClinicalDecisionSupport();
}

// Problem selection
function setupProblemButtons() {
    const buttons = document.querySelectorAll('.problem-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const problem = btn.dataset.problem;
            currentState.problem = problem;
            displayInterventions(problem);
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
    
    problem.interventions.forEach(intervention => {
        const div = document.createElement('div');
        div.className = 'form-group';
        
        if (intervention.checkbox) {
            div.innerHTML = `
                <div class="checkbox-item">
                    <input type="checkbox" id="${intervention.id}" data-intervention="${intervention.id}">
                    <label for="${intervention.id}">${intervention.label}</label>
                </div>
            `;
        } else if (intervention.options) {
            div.innerHTML = `
                <label>${intervention.label}:</label>
                <select id="${intervention.id}" data-intervention="${intervention.id}">
                    <option value="">-- Select --</option>
                    ${intervention.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                </select>
            `;
        } else if (intervention.textarea) {
            div.innerHTML = `
                <label>${intervention.label}:</label>
                <textarea id="${intervention.id}" data-intervention="${intervention.id}" placeholder="${intervention.inputLabel}"></textarea>
            `;
        } else if (intervention.hasInput) {
            const inputType = intervention.inputType || 'text';
            const minAttr = intervention.min !== undefined ? `min="${intervention.min}"` : '';
            const maxAttr = intervention.max !== undefined ? `max="${intervention.max}"` : '';
            const stepAttr = intervention.step !== undefined ? `step="${intervention.step}"` : '';
            
            div.innerHTML = `
                <label>${intervention.label}:</label>
                <input type="${inputType}" id="${intervention.id}" data-intervention="${intervention.id}" placeholder="${intervention.inputLabel}" ${minAttr} ${maxAttr} ${stepAttr}>
            `;
        }
        
        content.appendChild(div);
    });
    
    // Add event listeners to track inputs
    content.querySelectorAll('[data-intervention]').forEach(el => {
        el.addEventListener('change', updateInterventionState);
        el.addEventListener('input', updateInterventionState);
    });
    
    section.style.display = 'block';
    displayEvaluation(problemKey);
    showFormatOptions();
    section.classList.add('fade-in');
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
        const reason = currentState.interventions['reason'];
        const medClass = currentState.interventions['med-class'];
        const prnReason = currentState.interventions['prn-reason'];
        
        let opening = 'Student presented for medication administration';
        
        if (medName && reason) {
            problemNarrative = `${opening}. ${medName} needed for ${reason}`;
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
        const location = currentState.interventions['location'];
        const occurred = currentState.interventions['injury-occurred'];
        const mechanism = currentState.interventions['injury-mechanism'];
        const assessment = currentState.interventions['initial-assessment'];
        
        let opening = 'Student presented to health office';
        
        if (injuryType && location) {
            problemNarrative = `${opening} with ${injuryType.toLowerCase()} to ${location}`;
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
    
    // INTERVENTION - Build narrative
    const interventionPrefix = usePrefix ? 'I: ' : '';
    const interventionNarrative = [];
    
    problem.interventions.forEach(intervention => {
        const value = currentState.interventions[intervention.id];
        if (!value || value === '' || value === false) return;
        
        // Skip items already mentioned in problem section or BG source items
        if (intervention.id === 'bg-check' || intervention.id === 'carbs-consumed' || 
            intervention.id === 'bg-source-cgm' || intervention.id === 'bg-source-fingerstick' ||
            intervention.id === 'visit-reason' || intervention.id === 'student-symptoms' ||
            intervention.id === 'med-name' || intervention.id === 'reason' || intervention.id === 'med-class' || 
            intervention.id === 'prn-reason' || intervention.id === 'injury-type' || intervention.id === 'location' ||
            intervention.id === 'injury-occurred' || intervention.id === 'injury-mechanism' || 
            intervention.id === 'initial-assessment') return;
        
        if (intervention.checkbox && value === true) {
            interventionNarrative.push(intervention.label.toLowerCase());
        } else if (intervention.hasInput && value) {
            if (intervention.id === 'insulin-admin') {
                interventionNarrative.push(`${value} units of insulin administered`);
            } else if (intervention.id === 'dose') {
                interventionNarrative.push(`dose of ${value} administered`);
            } else if (intervention.id === 'route') {
                interventionNarrative.push(`given ${value}`);
            } else if (intervention.id === 'rest-provided') {
                interventionNarrative.push(`${value} minutes of rest provided`);
            } else if (intervention.id === 'snack-provided') {
                interventionNarrative.push(`${value} provided for hypoglycemia management`);
            } else if (intervention.id === 'vital-signs') {
                interventionNarrative.push(`vital signs assessed: ${value}`);
            } else if (intervention.id === 'time-since-last') {
                interventionNarrative.push(`${value} hours since last dose`);
            } else if (intervention.id === 'ice-duration') {
                interventionNarrative.push(`ice applied for ${value} minutes`);
            } else if (intervention.id === 'parent-contact') {
                interventionNarrative.push(`parent/guardian contacted regarding ${value}`);
            } else {
                interventionNarrative.push(`${intervention.label.toLowerCase()}: ${value}`);
            }
        } else if (intervention.options && value) {
            if (intervention.id === 'insulin-reason') {
                interventionNarrative.push(`indication: ${value.toLowerCase()}`);
            } else if (intervention.id === 'insulin-type') {
                interventionNarrative.push(`insulin type: ${value}`);
            } else if (intervention.id === 'insulin-delivery') {
                interventionNarrative.push(`administered via ${value.toLowerCase()}`);
            } else if (intervention.id === 'injection-site') {
                if (value !== 'N/A' && value !== 'Via pump') {
                    interventionNarrative.push(`injection site: ${value.toLowerCase()}`);
                }
            } else if (intervention.id === 'wound-care') {
                if (value !== 'N/A' && value !== 'Other') {
                    interventionNarrative.push(value.toLowerCase());
                }
            } else if (intervention.id === 'head-injury-screen') {
                if (value !== 'N/A - Not head injury') {
                    interventionNarrative.push(`head injury screening: ${value.toLowerCase()}`);
                }
            } else if (intervention.id === 'return-to-activity') {
                interventionNarrative.push(value.toLowerCase());
            } else if (intervention.id === 'route') {
                interventionNarrative.push(`route: ${value}`);
            } else {
                interventionNarrative.push(value.toLowerCase());
            }
        }
    });
    
    if (interventionNarrative.length > 0) {
        // Capitalize first letter and format as sentence
        let interventionText = interventionNarrative.join(', ');
        interventionText = interventionText.charAt(0).toUpperCase() + interventionText.slice(1);
        noteText += interventionPrefix + interventionText + '.\n\n';
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
    noteContent.textContent = noteText;
    notePreview.style.display = 'block';
    notePreview.classList.add('fade-in');
    
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
            
            // Save this note to history
            saveNoteToHistory();
            
            setTimeout(() => {
                feedback.classList.remove('show');
            }, 3000);
        } catch (error) {
            console.error('Clipboard error:', error);
            feedback.textContent = '✗ Failed to copy. Please select and copy manually.';
            feedback.classList.add('show');
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
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
}

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
        showAlert('warning', '⚕️ Medical Order Review', 
            'Illinois School Code requires annual medical order review. Best practice: verify orders monthly. Document "medical orders reviewed and followed" in diabetes and medication notes.');
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
