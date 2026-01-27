# PIE Note Builder 🏥

**Problem → Intervention → Evaluation Documentation Tool for School Nurses**

A streamlined web application designed to help school nurses create legally defensible, FERPA-compliant clinical documentation in PIE format (Problem, Intervention, Evaluation). Built specifically to reduce redundant data entry and improve documentation efficiency for SSM (Student Services Management) systems.

## 🎯 Purpose

School nurses spend valuable time repeatedly selecting the same dropdowns and typing similar documentation patterns. This tool:
- **Saves time** by providing click-through templates for common conditions
- **Ensures consistency** with standardized PIE format documentation
- **Tracks patterns** to identify documentation habits and clinical decision opportunities
- **Provides clinical decision support** with reminders for order verification and assessment variation
- **Smart defaults** pre-select common values (In-Person, Non-Integrated, Individual)

## 🚀 Quick Start

1. **Open the tool**: Simply open `index.html` in any modern web browser
2. **Select a problem**: Choose from Diabetes Management, Medication Administration, First Aid, or Other
3. **Document interventions**: Fill in relevant interventions using checkboxes, dropdowns, and text fields
4. **Add evaluation**: Select or describe the student's response and follow-up needs
5. **Review & copy**: The PIE-formatted note generates automatically - click "Copy to Clipboard"
6. **Paste into SSM**: Paste the formatted note directly into your SSM free text box

## 📋 Features

### Core Functionality
- **PIE Format Generation**: Automatically structures notes in Problem, Intervention, Evaluation format
- **Common Condition Templates**:
  - **Diabetes Management**: Blood glucose checks, insulin administration, snack provision
  - **Medication Administration**: Dose tracking, route documentation, order verification
  - **First Aid/Minor Injury**: Ice packs, band-aids, rest periods, vital signs
- **Smart Service Details**: Pre-filled with common defaults (In-Person, Non-Integrated, Individual)

### Clinical Decision Support (CDS)
- **Order Verification Reminders**: Alerts when medical orders haven't been reviewed in 30+ days
- **Pattern Recognition**: Identifies repetitive documentation patterns that might indicate learning opportunities
- **Documentation Rate Tracking**: Shows percentage of notes with order verification

### Usage Analytics
- **Pattern Tracking**: Stores last 100 notes locally (browser storage only - no PHI to servers)
- **Problem Distribution**: Shows which conditions you document most frequently
- **Documentation Insights**: Identifies opportunities to improve assessment variation

## 🔒 Privacy & Security

- **No PHI Storage**: This tool does NOT store any protected health information or student data
- **Local Processing Only**: All data stays in your browser's localStorage
- **Template Generator**: Generates text templates only - you add student-specific details in SSM
- **FERPA Compliant**: No student identifiers are captured or transmitted

## 🛠️ Technical Details

- **Technology**: Pure HTML, CSS, and JavaScript (no dependencies)
- **Storage**: Browser localStorage for pattern tracking only
- **Compatibility**: Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- **Offline Capable**: Works without internet connection once loaded

## 📖 Usage Tips

1. **Always verify orders**: Even though templates speed up documentation, always confirm medical orders before documenting interventions
2. **Customize as needed**: Use the "Other" option for cases that don't fit standard templates
3. **Review patterns monthly**: Check the statistics section to identify documentation habits
4. **Add student-specific details**: The generated note is a template - always add student name, ID, specific vital signs, and context before submitting to SSM

## 🔄 Workflow Integration

**Before (Traditional SSM Entry):**
1. Log into SSM
2. Search for student
3. Open service note
4. Manually type entire note
5. Select dropdown for service location (In-Person)
6. Select dropdown for integration status (Non-Integrated)
7. Select dropdown for service type (Individual)

**After (With PIE Note Builder):**
1. Open PIE Note Builder (keep open in separate tab)
2. Click through problem/intervention/evaluation
3. Copy generated note
4. Log into SSM, search student, open service note
5. Paste formatted note (service details already included)
6. Add student-specific identifiers
7. Submit

## 🤝 Contributing

This tool is designed for school health service professionals. Suggestions for additional:
- Common conditions/problems
- Intervention templates
- Clinical decision support rules
- Documentation best practices

...are always welcome!

## 📝 License

Created for educational and clinical documentation purposes. Use in accordance with your school district's policies and nursing practice guidelines.

## ⚠️ Disclaimer

This tool is a documentation assistant and does not replace professional nursing judgment. Always follow your scope of practice, medical orders, and district policies. The generated notes are templates and must be customized with student-specific information and clinical context before use.
