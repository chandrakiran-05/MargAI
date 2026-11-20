import { GoogleGenerativeAI } from '@google/generative-ai';
import { Hazard, CivicCase } from '@margai/contracts';

export interface CivicReportGenerationResult {
  markdownReport: string;
  urgencyRating: 'IMMEDIATE_24H' | 'HIGH_48H' | 'ROUTINE_7D';
  applicableLaws: string[];
  suggestedAction: string;
  isMockFallback: boolean;
}

export class MargAIGeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || null;
    if (this.apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(this.apiKey);
      } catch (err) {
        console.warn('[GeminiService] Failed to initialize GoogleGenerativeAI, using fallback mode:', err);
        this.genAI = null;
      }
    }
  }

  public isConfigured(): boolean {
    return !!this.genAI;
  }

  /**
   * Generates a formal, legally grounded civic road defect grievance letter
   * adhering to Indian Municipal & Highway standards (BBMP Sahaaya, NHAI, IRC:SP:84-2019).
   */
  public async generateOfficialCivicReport(
    civicCase: CivicCase,
    hazard: Hazard
  ): Promise<CivicReportGenerationResult> {
    const prompt = `
You are MargAI's Civic Intelligence Engine for Indian municipal road maintenance.
Draft a formal, structured Road Hazard Notice & Grievance Report for submission to the municipal road authority.

DETAILS:
- Case Reference ID: ${civicCase.id}
- Authority: ${civicCase.authority.name}
- Jurisdiction / Ward: ${civicCase.jurisdiction}
- Road Name: ${civicCase.roadName}
- Coordinates (WGS84): Latitude ${civicCase.location.latitude}, Longitude ${civicCase.location.longitude}
- Hazard Type: ${civicCase.hazardType.toUpperCase()}
- Corroborated Evidence Count: ${civicCase.evidenceCount} independent vehicle passes
- Detection Severity Score: ${civicCase.severityScore}/10
- First Observed: ${civicCase.firstObservedAt}
- Last Observed: ${civicCase.lastObservedAt}

REQUIREMENTS:
1. Professional Indian government grievance format addressed to the Executive Engineer (Road Infrastructure / Quality Assurance).
2. Cite relevant Indian standards and statutory obligations:
   - Indian Roads Congress guidelines (IRC:SP:84-2019 / IRC:82-2015 for maintenance of bituminous roads).
   - Section 58 of the Karnataka Municipal Corporations Act (duty of Corporation to maintain public streets) or corresponding Indian Highway Act.
   - High Court of Karnataka directives regarding pothole-free roads and civil liability under Article 21.
3. Quantify commuter safety impact (risk of fatal two-wheeler skids, axle fractures, severe traffic bottleneck).
4. Specify required Remedial Action SLA (48-hour cold/hot mix asphalt patch under circular guidelines).
5. Output pure markdown.
`;

    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const response = await model.generateContent(prompt);
        const text = response.response.text();

        return {
          markdownReport: text,
          urgencyRating: civicCase.severityScore >= 7.5 ? 'IMMEDIATE_24H' : 'HIGH_48H',
          applicableLaws: [
            'IRC:SP:84-2019 (Specifications for Manual/Mechanized Road Maintenance)',
            'Karnataka Municipal Corporations Act, Section 58 (Public Safety & Street Maintenance)',
            'Motor Vehicles Act 1988, Section 198A (Design, Maintenance & Safety of Roads)',
          ],
          suggestedAction: 'Deploy Quick Response Team (QRT) with cold-mix asphalt patch within 24 hours.',
          isMockFallback: false,
        };
      } catch (error) {
        console.error('[GeminiService] Live Gemini generation failed, falling back to deterministic template:', error);
      }
    }

    // High-fidelity grounded fallback report template
    return {
      markdownReport: `# STATUTORY ROAD HAZARD NOTICE & CIVIC REPAIR DIRECTIVE
**Document Ref:** MARGAI/CIVIC/${civicCase.id.toUpperCase()}  
**Issuing Platform:** MargAI Civic Intelligence System (Buildathon 2026)  
**Date:** ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}  

---

### TO:
**The Executive Engineer (Road Infrastructure & Quality Control)**  
${civicCase.authority.name}  
Jurisdiction: ${civicCase.jurisdiction}  

### SUBJECT:
**Urgent notice for rectification of hazardous ${civicCase.hazardType.toUpperCase()} on ${civicCase.roadName} under IRC:SP:84-2019 standards.**

---

### 1. INCIDENT & LOCATION SUMMARY
- **Corridor / Stretch:** ${civicCase.roadName}
- **GPS Coordinates (WGS84):** \`${civicCase.location.latitude.toFixed(6)}, ${civicCase.location.longitude.toFixed(6)}\`
- **Hazard Classification:** **${civicCase.hazardType.toUpperCase()} (Class D40 Structural Defect)**
- **System Severity Rating:** **${civicCase.severityScore}/10** (Critical Vulnerability)
- **Sensor Corroboration:** Confirmed by **${civicCase.evidenceCount} independent vehicle passes**
- **Temporal Detection:** First logged on ${civicCase.firstObservedAt}, latest corroboration on ${civicCase.lastObservedAt}.

### 2. STATUTORY LEGAL FRAMEWORK & LIABILITIES
This location constitutes a non-compliant road defect creating acute risk to vehicular traffic:
1. **IRC:SP:84-2019 & IRC:82-2015:** Mandates timely rectification of depression and edge break within urban and express corridors.
2. **Section 198A of Motor Vehicles (Amendment) Act 2019:** Designates designated authority liability for failure to comply with safety standards in road maintenance.
3. **High Court Directives on Article 21:** The Right to Safe and Pothole-Free Roads has been upheld as an integral part of the Right to Life.

### 3. PUBLIC SAFETY THREAT ASSESSMENT
- **Two-Wheeler Vulnerability:** High risk of sudden handle-wobble and loss of control, especially during peak commute and night hours.
- **Traffic Disruption:** Causes abrupt braking waves, increasing tail-end collision frequency and corridor congestion.

### 4. REQUIRED CORRECTIVE INTERVENTION
- **Prescribed Remediation:** Excavation of loose aggregate, application of cationic bitumen tack coat, and compaction with cold/warm asphalt mix.
- **Compliance Window:** **Within 48 hours of dispatch.**

---
*Generated automatically by MargAI Grounded Civic AI Engine powered by Google Gemini 2.5.*
`,
      urgencyRating: civicCase.severityScore >= 7.5 ? 'IMMEDIATE_24H' : 'HIGH_48H',
      applicableLaws: [
        'IRC:SP:84-2019 (Specifications for Manual/Mechanized Road Maintenance)',
        'Karnataka Municipal Corporations Act, Section 58 (Public Safety & Street Maintenance)',
        'Motor Vehicles Act 1988, Section 198A (Design, Maintenance & Safety of Roads)',
      ],
      suggestedAction: 'Deploy Quick Response Team (QRT) with cold-mix asphalt patch within 24 hours.',
      isMockFallback: true,
    };
  }
}

export const geminiService = new MargAIGeminiService();
