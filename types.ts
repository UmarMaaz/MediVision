
export enum UserRole {
  DOCTOR = 'DOCTOR',
  RADIOLOGIST = 'RADIOLOGIST',
  GENERAL = 'GENERAL'
}

export enum Modality {
  XRAY = 'X-Ray',
  CT_SCAN = 'CT Scan',
  MRI = 'MRI',
  ULTRASOUND = 'Ultrasound',
  MAMMOGRAPHY = 'Mammography',
  PET_SCAN = 'PET Scan',
  DENTAL_XRAY = 'Dental X-ray'
}

export enum SeverityLevel {
  NORMAL = 'Normal',
  MILD = 'Mild',
  MODERATE = 'Moderate',
  SEVERE = 'Severe',
  CRITICAL = 'Critical'
}

/** Specialized medical imaging ML models */
export type MedicalArchitecture =
  | 'CheXNet (DenseNet-121)'     // Chest X-ray specialist — trained on 112k CXR images
  | 'BiomedCLIP'                  // Multimodal medical vision-language model
  | 'Med-SAM (ViT-B)'            // Medical Segment Anything Model for segmentation
  | 'RadImageNet (ResNet-50)'     // Radiology-specific pretrained features
  | 'Gemini Vision (Pro)';        // Google Gemini multimodal reasoning

/** Models mapped per modality for precision */
export type ModalityModelMap = {
  [key in Modality]: MedicalArchitecture[];
};

export interface ModelContribution {
  modelName: MedicalArchitecture;
  prediction: string;
  confidence: number;
  logic: string;
  specialization: string;
}

export interface Finding {
  region: string;
  pattern: string;
  confidence: number;
  precisionScore: number;
  description: string;
  evidenceBasis: string;
  severityLevel: SeverityLevel;
  suggestedFollowUp: string;
  anatomicalReference: string;
  location: {
    x: number;
    y: number;
    radius: number;
  };
}

export interface ImageQualityReport {
  overallQuality: 'poor' | 'acceptable' | 'excellent';
  issues: string[];
  recommendations: string[];
  isAnalyzable: boolean;
}

export interface AnalysisResult {
  modality: Modality;
  findings: Finding[];
  ensembleContributions: ModelContribution[];
  primaryClinicalDriver: string;
  modelAgreement: 'low' | 'moderate' | 'high';
  imageQuality: 'poor' | 'acceptable' | 'excellent';
  limitations: string[];
  timestamp: string;
  ensembleConfidence: number;
  qualityReport: ImageQualityReport;
  overallSeverity: SeverityLevel;
}

export interface MedicalInsight {
  technicalReport: string;
  patientExplanation: string;
  dominantObservation: string;
  differentialDiagnosis: string[];
  uncertaintyNotes: string;
  suggestedActions: string[];
  criticalFindings: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export type PipelineStep = 'idle' | 'uploading' | 'quality-check' | 'scanning' | 'ensemble' | 'reasoning' | 'complete' | 'error';

export type ActiveTab = 'findings' | 'ensemble' | 'report' | 'chat';

/** Annotation drawn on the image viewer */
export interface Annotation {
  id: string;
  type: 'circle' | 'arrow' | 'text';
  x: number; // % of image width
  y: number; // % of image height
  radius?: number; // for circle (%)
  endX?: number; // for arrow (%)
  endY?: number; // for arrow (%)
  label?: string; // for text annotations
  color: string;
}

/** Saved analysis session for History Timeline */
export interface AnalysisSession {
  id: string;
  timestamp: string;
  modality: Modality;
  primaryFinding: string;
  severity: SeverityLevel;
  confidence: number;
  imageThumb: string; // small base64 thumbnail
  findings: Finding[];
  analysis: AnalysisResult;
  insight: MedicalInsight | null;
}

/** Onboarding tour step */
export interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

/** Image adjustment controls */
export interface ImageAdjustments {
  brightness: number;   // -100 to 100, default 0
  contrast: number;     // -100 to 100, default 0
}
