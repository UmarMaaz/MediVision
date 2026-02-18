
import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, ChatMessage, UserRole } from "../types";
import { CHAT_SYSTEM_PROMPTS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Interactive chat service for follow-up Q&A on analysis results.
 * Maintains context about the current analysis and adapts responses to user role.
 */
export async function sendChatMessage(
    message: string,
    analysis: AnalysisResult,
    role: UserRole,
    chatHistory: ChatMessage[] = []
): Promise<string> {
    const systemPrompt = CHAT_SYSTEM_PROMPTS[role];

    // Build conversation context
    const contextMessages = chatHistory.slice(-8).map(msg =>
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n');

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `${systemPrompt}

CURRENT ANALYSIS CONTEXT:
${JSON.stringify({
            modality: analysis.modality,
            primaryClinicalDriver: analysis.primaryClinicalDriver,
            findings: analysis.findings.map(f => ({
                region: f.region,
                pattern: f.pattern,
                confidence: f.confidence,
                severity: f.severityLevel,
                description: f.description
            })),
            ensembleConfidence: analysis.ensembleConfidence,
            modelAgreement: analysis.modelAgreement,
            limitations: analysis.limitations
        }, null, 2)}

CONVERSATION HISTORY:
${contextMessages || 'No previous messages.'}

USER'S QUESTION: ${message}

Respond naturally and helpfully. If the question is about a specific finding, reference the relevant data. If asked about something beyond the analysis scope, acknowledge limitations. Keep responses focused and concise (2-4 paragraphs max).`
    });

    return response.text?.trim() || "I'm sorry, I couldn't process that question. Could you try rephrasing it?";
}

/** Generate suggested follow-up questions based on the analysis */
export function getSuggestedQuestions(analysis: AnalysisResult, role: UserRole): string[] {
    const isGeneral = role === UserRole.GENERAL;

    const questions: string[] = [];

    if (analysis.findings.length > 0) {
        const mainFinding = analysis.findings[0];
        if (isGeneral) {
            questions.push(`What does "${mainFinding.pattern}" mean for me?`);
            questions.push(`Should I be worried about this result?`);
            questions.push(`What should I tell my doctor about these findings?`);
        } else {
            questions.push(`Elaborate on the ${mainFinding.region} finding`);
            questions.push(`What additional imaging would help confirm this?`);
            questions.push(`Discuss the differential for ${analysis.primaryClinicalDriver}`);
        }
    }

    if (analysis.modelAgreement === 'low') {
        questions.push(isGeneral
            ? 'Why is the AI less confident about this result?'
            : 'Explain the model disagreement in the ensemble'
        );
    }

    if (analysis.limitations.length > 0) {
        questions.push(isGeneral
            ? 'What are the limitations of this analysis?'
            : 'What clinical context would improve this analysis?'
        );
    }

    return questions.slice(0, 3);
}
