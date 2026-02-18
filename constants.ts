
import { Modality, MedicalArchitecture, ModalityModelMap } from './types';

export const APP_NAME = "MediVision CDS";
export const APP_VERSION = "v2.0.0";

export const DISCLAIMER_TEXT = "This system is for Clinical Decision Support (CDS) and educational purposes ONLY. It does NOT provide a final diagnosis. All interpretations must be verified by a qualified medical professional. If you are experiencing a medical emergency, please contact emergency services immediately.";

/**
 * Specialized ML models per modality.
 * Each modality uses the most appropriate pre-trained architectures.
 */
export const MODALITY_MODELS: ModalityModelMap = {
  [Modality.XRAY]: [
    'CheXNet (DenseNet-121)',
    'RadImageNet (ResNet-50)',
    'BiomedCLIP',
    'Med-SAM (ViT-B)',
    'Gemini Vision (Pro)'
  ],
  [Modality.CT_SCAN]: [
    'RadImageNet (ResNet-50)',
    'Med-SAM (ViT-B)',
    'BiomedCLIP',
    'Gemini Vision (Pro)'
  ],
  [Modality.MRI]: [
    'RadImageNet (ResNet-50)',
    'Med-SAM (ViT-B)',
    'BiomedCLIP',
    'Gemini Vision (Pro)'
  ],
  [Modality.ULTRASOUND]: [
    'BiomedCLIP',
    'Med-SAM (ViT-B)',
    'RadImageNet (ResNet-50)',
    'Gemini Vision (Pro)'
  ],
  [Modality.MAMMOGRAPHY]: [
    'RadImageNet (ResNet-50)',
    'BiomedCLIP',
    'Med-SAM (ViT-B)',
    'Gemini Vision (Pro)'
  ],
  [Modality.PET_SCAN]: [
    'RadImageNet (ResNet-50)',
    'BiomedCLIP',
    'Med-SAM (ViT-B)',
    'Gemini Vision (Pro)'
  ],
  [Modality.DENTAL_XRAY]: [
    'CheXNet (DenseNet-121)',
    'BiomedCLIP',
    'Med-SAM (ViT-B)',
    'Gemini Vision (Pro)'
  ]
};

/** Modality-specific analysis prompts for higher accuracy */
export const MODALITY_PROMPTS: Record<Modality, string> = {
  [Modality.XRAY]: `You are analyzing a GENERAL RADIOGRAPH (X-RAY). Provide an EXHAUSTIVE, DETAILED, and QUANTITATIVE analysis.
    ANATOMICAL REGION IDENTIFICATION:
    First, identify the anatomical region (Chest, MSK, Abdomen, Spine, Skull, Extremity).

    SYSTEMATIC REVIEW (General Protocol):
    1. Bone integrity: Cortical continuity, trabecular pattern, fractures (type/displacement), lytic/blastic lesions
    2. Joint spaces: Alignment, congruity, joint space narrowing, subchondral sclerosis/cysts
    3. Soft tissues: Swelling, effusions, foreign bodies, calcifications, gas shadows
    4. If Chest/Abdomen: Apply specific organ protocols (lungs, bowel gas pattern, calcifications)

    PATHOLOGY CHECKLIST (detailed description required):
    - Fractures / Dislocations (describe fully)
    - Degenerative joint disease / Arthritis
    - Infection (osteomyelitis, soft tissue abscess)
    - Neoplasms (primary bone tumors, metastases)
    - Chest specifics: Pneumonia, effusion, pneumothorax, nodules
    - Abdominal specifics: Bowel obstruction, free air, stones

    Simulate analysis from: RadImageNet (general features), CheXNet (if chest), BiomedCLIP (semantic), Med-SAM (segmentation), Gemini Vision (reasoning).`,

  [Modality.CT_SCAN]: `You are analyzing a CT SCAN. Provide an EXHAUSTIVE, DETAILED, and QUANTITATIVE analysis.
    SYSTEMATIC REVIEW:
    1. Window settings: Assess lung window, mediastinal window, bone window equivalents
    2. Hounsfield unit estimation: Water=0, Fat=-100, Bone=+400-1000, Air=-1000
    3. Contrast enhancement patterns if contrast is present
    4. Axial anatomy: systematically review from anterior to posterior
    5. Quantitative measurements of abnormalities

    PATHOLOGY CHECKLIST (detailed description required):
    - Mass characterization (solid vs cystic, enhancement pattern)
    - Lymphadenopathy (>1cm short axis)
    - Vascular abnormalities (aneurysm, dissection, PE)
    - Calcification patterns (benign vs malignant)
    - Fluid collections and their density
    - Organ-specific findings based on region
    
    Simulate analysis from: RadImageNet (ResNet-50) for feature extraction, Med-SAM for segmentation, BiomedCLIP for classification, Gemini Vision for reasoning.`,

  [Modality.MRI]: `You are analyzing an MRI SCAN. Provide an EXHAUSTIVE, DETAILED, and QUANTITATIVE analysis.
    SEQUENCE ANALYSIS:
    1. Signal intensity on T1-weighted: Bright = fat/melanin/blood, Dark = fluid/edema
    2. Signal intensity on T2-weighted: Bright = fluid/edema, Dark = fibrous/calcium
    3. FLAIR if applicable: CSF suppressed, highlighting periventricular lesions
    4. Diffusion restriction: Acute stroke, abscess, tumor cellularity
    5. Enhancement pattern if contrast present: Ring-enhancing, homogeneous, heterogeneous

    PATHOLOGY CHECKLIST (detailed description required):
    - Mass effect and midline shift
    - White matter lesions (demyelination pattern)
    - Meniscal/ligamentous tears (MSK)
    - Disc herniation and neural compression
    - Signal abnormality characterization
    - Vascular malformations
    
    Simulate analysis from: RadImageNet (ResNet-50) for feature extraction, Med-SAM for segmentation, BiomedCLIP for classification, Gemini Vision for reasoning.`,

  [Modality.ULTRASOUND]: `You are analyzing an ULTRASOUND image. Provide an EXHAUSTIVE, DETAILED, and QUANTITATIVE analysis.
    ASSESSMENT CRITERIA:
    1. Echogenicity: Hyperechoic (bright), Isoechoic, Hypoechoic (dark), Anechoic (black)
    2. Posterior acoustic features: Shadowing (stones), Enhancement (cysts), None
    3. Margins: Well-defined vs irregular vs infiltrative
    4. Vascularity: Color Doppler findings if present
    5. Organ-specific measurements and normal ranges

    PATHOLOGY CHECKLIST (detailed description required):
    - Cystic vs solid vs complex mass
    - Gallstones / renal calculi (echogenic foci with posterior shadowing)
    - Free fluid (anechoic collection)
    - Organ enlargement or atrophy
    - Vascular flow abnormalities
    - Pregnancy-related findings if obstetric
    
    Simulate analysis from: BiomedCLIP for semantic matching, Med-SAM for segmentation, RadImageNet for feature analysis, Gemini Vision for reasoning.`,

  [Modality.MAMMOGRAPHY]: `You are analyzing a MAMMOGRAM. Apply BI-RADS assessment protocol with FULL DETAIL.
    SYSTEMATIC REVIEW:
    1. Breast composition: A (fatty), B (scattered), C (heterogeneously dense), D (extremely dense)
    2. Mass evaluation: Shape (round/oval/irregular), Margin (circumscribed/obscured/spiculated)
    3. Calcifications: Morphology (amorphous, fine pleomorphic, coarse heterogeneous) & Distribution (grouped, segmental, regional)
    4. Architectural distortion: Spiculations radiating from a point
    5. Asymmetry: Global, focal, developing

    BI-RADS CLASSIFICATION:
    0: Incomplete, 1: Negative, 2: Benign, 3: Probably benign
    4A-C: Suspicious (low to high), 5: Highly suggestive, 6: Known malignancy
    
    Simulate analysis from: RadImageNet (ResNet-50) for mass detection, BiomedCLIP for classification, Med-SAM for segmentation, Gemini Vision for BI-RADS assessment.`,

  [Modality.PET_SCAN]: `You are analyzing a PET SCAN (likely FDG-PET/CT). Provide an EXHAUSTIVE, DETAILED, and QUANTITATIVE analysis.
    ASSESSMENT CRITERIA:
    1. SUVmax estimation: Relative FDG uptake intensity (Low/Hypermetabolic)
    2. Focal vs diffuse uptake pattern
    3. Physiological vs pathological uptake distinction
    4. Anatomical correlation with CT component
    5. Comparison with background activity

    PATHOLOGY CHECKLIST (detailed description required):
    - Hypermetabolic lesions (SUV >2.5 suspicious)
    - Lymph node stations with increased uptake
    - Skeletal metastases pattern
    - Treatment response assessment (if follow-up)
    - Inflammatory vs neoplastic uptake pattern
    
    Simulate analysis from: RadImageNet (ResNet-50) for anatomical reference, BiomedCLIP for metabolic pattern matching, Med-SAM for lesion segmentation, Gemini Vision for clinical correlation.`,

  [Modality.DENTAL_XRAY]: `You are analyzing a DENTAL X-RAY. Provide an EXHAUSTIVE, DETAILED, and QUANTITATIVE analysis.
    SYSTEMATIC REVIEW:
    1. Periapical assessment: Root morphology, periapical radiolucency/radiopacity
    2. Periodontal: Alveolar bone level, lamina dura continuity, PDL space
    3. Dental structures: Crown integrity, restorations, caries (interproximal/occlusal)
    4. Bone density: Trabecular pattern, cortical border
    5. Adjacent structures: Maxillary sinus, mandibular canal, mental foramen

    PATHOLOGY CHECKLIST (detailed description required):
    - Dental caries (radiolucent areas in enamel/dentin)
    - Periapical abscess/granuloma (radiolucency at apex)
    - Bone loss pattern (horizontal vs vertical/angular)
    - Root resorption (internal vs external)
    - Impacted teeth and their orientation
    - Pathological lesions (cysts, tumors)
    
    Simulate analysis from: CheXNet (DenseNet-121) for pattern detection, BiomedCLIP for dental pathology matching, Med-SAM for tooth segmentation, Gemini Vision for clinical assessment.`
};

/** Model descriptions for the ensemble panel */
export const MODEL_DESCRIPTIONS: Record<MedicalArchitecture, { description: string; trainedOn: string; strength: string }> = {
  'CheXNet (DenseNet-121)': {
    description: 'Deep convolutional network specialized for chest radiograph interpretation',
    trainedOn: '112,120 frontal-view chest X-rays (ChestX-ray14 dataset)',
    strength: 'Exceeds radiologist-level performance on 14 pathology detection tasks'
  },
  'BiomedCLIP': {
    description: 'Multimodal vision-language model pretrained on biomedical image-text pairs',
    trainedOn: '15M biomedical image-text pairs from PubMed',
    strength: 'Zero-shot medical image classification and semantic understanding'
  },
  'Med-SAM (ViT-B)': {
    description: 'Medical adaptation of Segment Anything Model for precise anatomical segmentation',
    trainedOn: '1.5M medical image-mask pairs across 10 imaging modalities',
    strength: 'State-of-the-art boundary delineation and region segmentation'
  },
  'RadImageNet (ResNet-50)': {
    description: 'Radiology-specific pretrained network for multi-modal medical feature extraction',
    trainedOn: '1.35M radiological images across CT, MRI, and ultrasound',
    strength: 'Superior transfer learning for radiology tasks vs ImageNet'
  },
  'Gemini Vision (Pro)': {
    description: 'Google multimodal foundation model with advanced medical reasoning capabilities',
    trainedOn: 'Large-scale multimodal corpus with medical knowledge',
    strength: 'Chain-of-thought clinical reasoning and structured report generation'
  }
};

/** Severity color classes */
export const SEVERITY_CONFIG: Record<string, { color: string; bgClass: string; label: string }> = {
  Normal: { color: '#22c55e', bgClass: 'severity-normal', label: 'Normal' },
  Mild: { color: '#84cc16', bgClass: 'severity-mild', label: 'Mild' },
  Moderate: { color: '#f59e0b', bgClass: 'severity-moderate', label: 'Moderate' },
  Severe: { color: '#ef4444', bgClass: 'severity-severe', label: 'Severe' },
  Critical: { color: '#dc2626', bgClass: 'severity-critical', label: 'Critical' }
};

/** Pipeline steps configuration */
export const PIPELINE_STEPS = [
  { key: 'quality-check', label: 'Quality', icon: '🔍' },
  { key: 'scanning', label: 'AI Scan', icon: '🧠' },
  { key: 'ensemble', label: 'Ensemble', icon: '🔬' },
  { key: 'reasoning', label: 'Insights', icon: '📋' },
] as const;

/** Chat system prompts per role */
export const CHAT_SYSTEM_PROMPTS: Record<string, string> = {
  DOCTOR: `You are a clinical radiology assistant in conversation with an attending physician. Use precise medical terminology. Reference specific anatomical landmarks and radiological signs. When discussing findings, cite evidence-based differential diagnosis protocols. Be concise and clinically focused.`,
  RADIOLOGIST: `You are a clinical radiology assistant communicating with a radiologist. Use precise radiological terminology and imaging-specific language. Focus on differential diagnosis based on imaging findings, recommend additional views or sequences, and reference standard reporting frameworks (BI-RADS, Lung-RADS, etc.). Be thorough and technically detailed.`,
  GENERAL: `You are a patient-friendly medical imaging assistant. Explain findings in simple, reassuring language. Avoid medical jargon — use analogies and everyday terms. Always emphasize that the AI is a helper, not a doctor, and recommend follow-up with their physician.`
};
