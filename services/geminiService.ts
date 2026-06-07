
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, MedicalInsight, UserRole, Modality, SeverityLevel } from "../types";
import { MODALITY_PROMPTS, MODALITY_MODELS } from "../constants";

const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : '');
const ai = new GoogleGenAI({ apiKey });

/**
 * Helper to retry Gemini API calls with exponential backoff on 503 or 429 errors.
 */
async function generateContentWithRetry(params: any, maxRetries = 3, baseDelayMs = 1500) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      const message = error?.message || '';
      if ((status === 503 || status === 429 || message.includes('503') || message.includes('429')) && attempt < maxRetries - 1) {
        attempt++;
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`Gemini API overloaded (503/429). Retrying in \${Math.round(delay)}ms... (Attempt \${attempt}/\${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

/**
 * 3-Pass Medical Image Analysis Pipeline
 * ────────────────────────────────────────
 * Pass 1: Rapid pre-screening (quality, anatomy, prominent patterns)
 * Pass 2: Deep ensemble analysis (detailed findings from simulated specialist models)
 * Pass 3: Verification & plain-language (cross-checks findings against image, assigns verified confidence, writes plain descriptions)
 */
export async function analyzeMedicalImage(
  base64Image: string,
  selectedModality: Modality,
  patientHistory: string = ""
): Promise<AnalysisResult> {
  const base64Data = base64Image.split(',')[1] || base64Image;
  const modalityPrompt = MODALITY_PROMPTS[selectedModality];
  const modalityModels = MODALITY_MODELS[selectedModality];

  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Data
    }
  };

  // ═══════════════════════════════════════════
  // PASS 1: Deep Ensemble Analysis & Image Quality
  // ═══════════════════════════════════════════
  const deepAnalysis = await generateContentWithRetry({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          imagePart,
          {
            text: `${modalityPrompt}

            PATIENT HISTORY / CLINICAL CONTEXT:
            "${patientHistory || "No prior history provided."}"

            INSTRUCTIONS:
            1. First, assess the overall image quality, identifying any artifacts or exposure issues.
            2. Note the anatomical region visible.
            3. Then, simulate analysis contributions from these specialized medical ML models:
            ${modalityModels.map((m, i) => `${i + 1}. ${m}`).join('\n')}

            Each model should contribute its unique perspective. Key models include:
            - CheXNet (DenseNet-121): Pattern recognition from 112K chest X-ray training, 14-pathology detection
            - TorchXRayVision: Multi-dataset 18-pathology classifier trained on 820K+ CXRs from 8 datasets
            - DenseNet-BC (RSNA): Pneumonia detection specialist from RSNA challenge (30K CXRs)
            - BiomedCLIP: Semantic medical image-text understanding from 15M biomedical pairs
            - MedCLIP (Swin-T): Decoupled contrastive medical VLP with robust zero-shot classification
            - Med-SAM (ViT-B): Precise anatomical boundary segmentation from 1.5M medical masks
            - RadImageNet (ResNet-50): Radiology-specific feature extraction from 1.35M multi-modal images
            - MONAI SegResNet: NVIDIA 3D volumetric organ/tumor segmentation from Medical Decathlon
            - CT-ORG (nnU-Net): Self-configuring organ segmentation for CT (liver, lungs, kidneys, bones)
            - InceptionV3 (CBIS-DDSM): Mammography mass/calcification classifier from 2,620 cases
            - Gemini Vision (Pro): Chain-of-thought clinical reasoning and report synthesis

            ── ACCURACY GUARDRAILS ──
            CRITICAL: You MUST follow these rules to maximize accuracy:
            1. OBSERVATION vs INFERENCE: Clearly separate what you LITERALLY SEE from what you INFER. 
               - If you see a white opacity in the right lower lung zone, say exactly that.
               - Only THEN interpret it (e.g., "consistent with consolidation").
            2. NEVER HALLUCINATE: If you are uncertain about a finding, report it with LOW confidence (0.3-0.5). 
               A 50% confidence finding is infinitely more useful than a fabricated 95% one.
            3. QUANTITATIVE: Provide size estimates, density descriptions, Hounsfield equivalents where applicable.
            4. CALIBRATE: If you only see one finding, report ONE finding. Do not pad the results.
            5. LOCATION ACCURACY: The x,y coordinates MUST correspond to where the finding actually is in the image (0-1 normalized).

            CHAIN-OF-THOUGHT INSTRUCTIONS:
            Before making any prediction, you MUST:
            1. DESCRIBE what you literally see in the image (visual observations) with EXTREME DETAIL.
            2. CORRELATE observations with the provided PATIENT HISTORY.
            3. ASSESS confidence calibration — how certain are you and why?
            4. LIST what additional views or clinical data would help.

            IMPORTANT:
            - Be EXHAUSTIVE and THOROUGH. Do not be brief.
            - Use professional radiological terminology.
            - Describe the exact location, shape, margins, and texture of every finding.
            - Explicitly link findings to the clinical history where appropriate.

            SEVERITY GRADING (assign to each finding):
            - Normal: No pathological significance
            - Mild: Minor finding, may not require immediate action
            - Moderate: Clinically significant, warrants attention
            - Severe: Requires urgent clinical evaluation
            - Critical: Immediate medical attention needed

            Return structured JSON matching the schema.`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          modality: { type: Type.STRING },
          primaryClinicalDriver: { type: Type.STRING, description: "The most significant finding detected." },
          overallSeverity: { type: Type.STRING, enum: ["Normal", "Mild", "Moderate", "Severe", "Critical"] },
          findings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                region: { type: Type.STRING },
                pattern: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                precisionScore: { type: Type.NUMBER },
                description: { type: Type.STRING },
                evidenceBasis: { type: Type.STRING },
                severityLevel: { type: Type.STRING, enum: ["Normal", "Mild", "Moderate", "Severe", "Critical"] },
                suggestedFollowUp: { type: Type.STRING },
                anatomicalReference: { type: Type.STRING },
                location: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                    radius: { type: Type.NUMBER }
                  },
                  required: ["x", "y", "radius"]
                }
              },
              required: ["region", "pattern", "confidence", "precisionScore", "description", "evidenceBasis", "severityLevel", "suggestedFollowUp", "anatomicalReference", "location"]
            }
          },
          ensembleContributions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                modelName: { type: Type.STRING },
                prediction: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                logic: { type: Type.STRING },
                specialization: { type: Type.STRING }
              },
              required: ["modelName", "prediction", "confidence", "logic", "specialization"]
            }
          },
          modelAgreement: { type: Type.STRING, enum: ["low", "moderate", "high"] },
          imageQuality: { type: Type.STRING, enum: ["poor", "acceptable", "excellent"] },
          qualityIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
          qualityRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          isAnalyzable: { type: Type.BOOLEAN },
          anatomicalRegion: { type: Type.STRING },
          limitations: { type: Type.ARRAY, items: { type: Type.STRING } },
          ensembleConfidence: { type: Type.NUMBER }
        },
        required: ["modality", "primaryClinicalDriver", "overallSeverity", "findings", "ensembleContributions", "modelAgreement", "imageQuality", "qualityIssues", "qualityRecommendations", "isAnalyzable", "anatomicalRegion", "limitations", "ensembleConfidence"]
      }
    }
  });

  const analysisData = JSON.parse(deepAnalysis.text!);

  // ═══════════════════════════════════════════
  // PASS 2: Verification & Plain Language
  // ═══════════════════════════════════════════
  // This pass re-examines the image against the findings from Pass 2.
  // It acts as a "second radiologist" that confirms or downgrades each finding.
  const verificationPass = await generateContentWithRetry({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          imagePart,
          {
            text: `You are a SENIOR VERIFICATION RADIOLOGIST performing a second-read quality check.

            A junior AI system produced the following findings from this ${selectedModality} image:
            ${JSON.stringify(analysisData.findings.map((f: any, i: number) => ({
              index: i,
              region: f.region,
              pattern: f.pattern,
              description: f.description,
              confidence: f.confidence,
              severityLevel: f.severityLevel
            })), null, 2)}

            YOUR TASK:
            For EACH finding (by index), you must:

            1. RE-EXAMINE the image independently and determine if the finding is ACTUALLY VISIBLE.
            2. Assign a "verifiedConfidence" score (0.0 to 1.0):
               - If you independently confirm the finding: give it EQUAL or HIGHER confidence than the original.
               - If you see something but it's ambiguous: give 0.4-0.6.
               - If you CANNOT confirm the finding at all (likely hallucinated): give 0.1-0.3.
            3. Write a "plainDescription" — a simple, NON-MEDICAL explanation of this finding that a regular person with NO medical background could understand. Use analogies, everyday language, and be reassuring where appropriate. Example: "There is a cloudy area in the lower part of your right lung, which could mean there is some fluid or infection there. Your doctor will want to check this further."

            CRITICAL RULES:
            - Do NOT invent new findings. Only verify the ones listed above.
            - Be HONEST. If you cannot see what was described, say so with low verifiedConfidence.
            - The plainDescription should be 1-2 sentences maximum, warm and clear.
            - Do NOT use markdown formatting in the text fields.

            Return a JSON array with one object per finding.`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            index: { type: Type.NUMBER },
            verifiedConfidence: { type: Type.NUMBER },
            plainDescription: { type: Type.STRING },
            verificationNote: { type: Type.STRING }
          },
          required: ["index", "verifiedConfidence", "plainDescription", "verificationNote"]
        }
      }
    }
  });

  const verificationData = JSON.parse(verificationPass.text!);

  // Merge verification data into findings
  const verifiedFindings = analysisData.findings.map((finding: any, i: number) => {
    const verification = verificationData.find((v: any) => v.index === i);
    return {
      ...finding,
      verifiedConfidence: verification?.verifiedConfidence ?? finding.confidence,
      plainDescription: verification?.plainDescription ?? finding.description,
    };
  });

  // Recalculate ensemble confidence as average of verified confidences
  const avgVerified = verifiedFindings.length > 0
    ? verifiedFindings.reduce((sum: number, f: any) => sum + f.verifiedConfidence, 0) / verifiedFindings.length
    : analysisData.ensembleConfidence;

  return {
    ...analysisData,
    findings: verifiedFindings,
    overallSeverity: analysisData.overallSeverity as SeverityLevel,
    ensembleConfidence: Math.round(avgVerified * 100) / 100,
    qualityReport: {
      overallQuality: analysisData.imageQuality,
      issues: analysisData.qualityIssues || [],
      recommendations: analysisData.qualityRecommendations || [],
      isAnalyzable: analysisData.isAnalyzable ?? true
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate role-aware medical insights with enhanced clinical context.
 */
export async function generateMedicalInsights(
  analysis: AnalysisResult,
  role: UserRole,
  history: string = ""
): Promise<MedicalInsight> {
  const response = await generateContentWithRetry({
    model: "gemini-2.5-flash",
    contents: `You are a clinical radiology reporting system. Synthesize a formal radiology report for a ${role} based on this clinical data: ${JSON.stringify(analysis)}.
    
    PATIENT HISTORY CONTEXT:
    ${history || "No prior history provided."}
    
    SPECIAL INSTRUCTIONS FOR GENERAL USERS:
    - Avoid complex medical jargon where possible, but maintain professional structure.
    - Focus on educational context.
    - Always reassure and recommend follow-up with their doctor.
    - The patientExplanation should be warm, supportive, and in simple everyday language.
    
    SPECIAL INSTRUCTIONS FOR DOCTORS & RADIOLOGISTS:
    - Use precise radiological terminology and standard reporting language.
    - Reference standard classification systems when applicable.
    - Be brief and objective. Avoid verbosity and "fluff".
    
    CRITICAL: The output MUST strictly follow standard American College of Radiology (ACR) structured reporting format.
    - 'indication': The clinical reason for the exam based on patient history. Keep it to 1 sentence.
    - 'technique': The simulated modality and technique used (e.g., "AI-assisted ${analysis.modality} analysis").
    - 'comparison': Reference to any prior studies mentioned in history, or "None provided".
    - 'findings': Short, factual, bullet-like observations (but format as standard prose). Do not use markdown bullet points. Be concise.
    - 'impression': The summarized clinical conclusion and diagnosis. This is the most important part.
    - 'recommendations': Specific clinical recommendations and follow-up actions.
    - 'patientExplanation' should be a brief, accessible summary for the patient. Use warm, everyday language.
    
    DO NOT use Markdown formatting (**, *) inside the JSON values. Keep it clean text.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          indication: { type: Type.STRING },
          technique: { type: Type.STRING },
          comparison: { type: Type.STRING },
          findings: { type: Type.STRING },
          impression: { type: Type.STRING },
          recommendations: { type: Type.STRING },
          patientExplanation: { type: Type.STRING },
          dominantObservation: { type: Type.STRING },
          differentialDiagnosis: { type: Type.ARRAY, items: { type: Type.STRING } },
          uncertaintyNotes: { type: Type.STRING },
          suggestedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
          criticalFindings: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["indication", "technique", "comparison", "findings", "impression", "recommendations", "patientExplanation", "dominantObservation", "differentialDiagnosis", "uncertaintyNotes", "suggestedActions", "criticalFindings"]
      }
    }
  });

  return JSON.parse(response.text!.trim());
}
