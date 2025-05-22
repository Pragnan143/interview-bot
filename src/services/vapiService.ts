// import Vapi from "@vapi-ai/web";

// // Initialize Vapi with your API key
// const vapi = new Vapi(import.meta.env.VITE_VAPI_API_KEY || "YOUR_VAPI_API_KEY");

// interface VivaQuestion {
//   id: string;
//   question: string;
// }

// /**
//  * Start a viva session with the candidate
//  * @param questions List of questions to ask
//  * @param onQuestion Callback function when a new question is asked
//  * @returns A cleanup function to stop the session
//  */
// export async function startVivaSession(
//   questions: string[],
//   onQuestion: (question: string) => void
// ): Promise<() => void> {
//   try {
//     // Format questions
//     const vivaQuestions: VivaQuestion[] = questions.map((q, index) => ({
//       id: `q${index + 1}`,
//       question: q,
//     }));

//     // Create assistant configuration
//     const assistantOverrides = {
//       firstMessage:
//         "I'll be asking you some technical questions during your coding test. Please answer verbally while you continue coding.",
//       model: {
//         provider: "google",
//         model: "gemini-2.0-flash-001",
//         temperature: 0.7,
//       },
//       voice: {
//         provider: "11labs",
//         voiceId: "rachel",
//       },
//       conversationId: `viva-session-${Date.now()}`,
//       noResponseTimeoutMs: 120000,
//       functions: [
//         {
//           name: "ask_viva_question",
//           description: "Ask a technical viva question from the predefined list",
//           parameters: {
//             type: "object",
//             properties: {
//               questionId: {
//                 type: "string",
//                 description: "The ID of the question to ask",
//               },
//             },
//             required: ["questionId"],
//           },
//         },
//       ],
//       messages: [
//         {
//           role: "system",
//           content: `
//             You are an interview assistant that asks technical questions during a coding interview.

//             You have the following questions to ask:
//             ${vivaQuestions
//               .map((q) => `- ID: ${q.id}, Question: ${q.question}`)
//               .join("\n")}

//             Ask these questions one at a time, with 2-3 minutes between questions.
//             Start with a brief introduction, then ask the first question.

//             After asking a question, wait for the candidate to answer verbally before asking the next one.

//             Do not explain the answer or give feedback — just ask the questions.
//             Keep your messages brief and to the point.
//           `,
//         },
//       ],
//     };

//     // Initialize assistant
//     // const assistant = vapi.assistant(assistantConfig);

//     // Start the assistant
//     await vapi.start("1468d949-47c9-4f29-ae37-3f7b8b6b1f57", {
//       firstMessage:
//         "I'll be asking you some technical questions during your coding test. Please answer verbally while you continue coding.",
//       model: {
//         provider: "google",
//         model: "gemini-2.0-flash",
//         temperature: 0.7,
//       },
//       voice: {
//         provider: "11labs",
//         voiceId: "rachel",
//       },
//       conversationId: `viva-session-${Date.now()}`,
//       noResponseTimeoutMs: 120000,
//       functions: [
//         {
//           name: "ask_viva_question",
//           description: "Ask a technical viva question from the predefined list",
//           parameters: {
//             type: "object",
//             properties: {
//               questionId: {
//                 type: "string",
//                 description: "The ID of the question to ask",
//               },
//             },
//             required: ["questionId"],
//           },
//         },
//       ],
//       messages: [
//         {
//           role: "system",
//           content: `
//             You are an interview assistant that asks technical questions during a coding interview.

//             You have the following questions to ask:
//             ${vivaQuestions
//               .map((q) => `- ID: ${q.id}, Question: ${q.question}`)
//               .join("\n")}

//             Ask these questions one at a time, with 2-3 minutes between questions.
//             Start with a brief introduction, then ask the first question.

//             After asking a question, wait for the candidate to answer verbally before asking the next one.

//             Do not explain the answer or give feedback — just ask the questions.
//             Keep your messages brief and to the point.
//           `,
//         },
//       ],
//     });

//     // Set up event listeners
//     vapi.on("message", (message) => {
//       if (message?.content) {
//         for (const q of vivaQuestions) {
//           if (message.content.includes(q.question)) {
//             onQuestion(q.question);
//             break;
//           }
//         }
//       }
//     });

//     vapi.on("call-end", () => {
//       console.log("Viva session ended.");
//     });

//     vapi.on("error", (err) => {
//       console.error("Error during viva session:", err);
//     });

//     // Return a cleanup function to stop the vapi
//     return () => {
//       vapi.stop();
//     };
//   } catch (error) {
//     console.error("Error starting viva session:", error);
//     throw error;
//   }
// }


import Vapi from "@vapi-ai/web";
import { generateVivaQuestions, generateSummaryReport } from "./geminiService";

// Initialize Vapi with your API key
const vapi = new Vapi(import.meta.env.VITE_VAPI_API_KEY || "YOUR_VAPI_API_KEY");

interface VivaQuestion {
  id: string;
  question: string;
  asked: boolean;
  answer?: string;
  timestamp?: number;
}

interface VivaSession {
  sessionId: string;
  questions: VivaQuestion[];
  currentQuestionIndex: number;
  startTime: number;
  topics: string[];
  role: string;
  status: 'active' | 'completed' | 'stopped';
}

/**
 * VapiService - Handles all voice interaction for viva interviews
 */
export class VapiService {
  private currentSession: VivaSession | null = null;
  private questionTimer: NodeJS.Timeout | null = null;
  private cleanup: (() => void) | null = null;

  /**
   * Start a complete viva session with question generation and voice interaction
   * @param topics List of topics for question generation
   * @param role Role for question generation
   * @param onQuestion Callback when a question is asked
   * @param onAnswer Callback when an answer is received
   * @returns Session ID for tracking
   */
  async startVivaSession(
    topics: string[],
    role: string,
    onQuestion?: (question: string, index: number) => void,
    onAnswer?: (question: string, answer: string, index: number) => void
  ): Promise<string> {
    try {
      // Step 1: Generate questions using your Gemini service
      console.log(`Generating viva questions for ${role} role with topics:`, topics);
      const questions = await generateVivaQuestions(topics, role);
      
      if (questions.length === 0) {
        throw new Error("No questions generated");
      }

      // Step 2: Initialize session
      const sessionId = `viva-session-${Date.now()}`;
      this.currentSession = {
        sessionId,
        questions: questions.map((q, index) => ({
          id: `q${index + 1}`,
          question: q,
          asked: false,
        })),
        currentQuestionIndex: 0,
        startTime: Date.now(),
        topics,
        role,
        status: 'active'
      };

      // Save initial session to localStorage
      this.saveSession();

      // Step 3: Start Vapi voice session
      await this.initializeVapiSession(onQuestion, onAnswer);

      // Step 4: Start question timer
      this.startQuestionTimer(onQuestion, onAnswer);

      console.log(`Viva session started with ${questions.length} questions`);
      return sessionId;

    } catch (error) {
      console.error("Error starting viva session:", error);
      throw error;
    }
  }

  /**
   * Initialize the Vapi voice session
   */
  private async initializeVapiSession(
    onQuestion?: (question: string, index: number) => void,
    onAnswer?: (question: string, answer: string, index: number) => void
  ): Promise<void> {
    if (!this.currentSession) {throw new Error("No active session");}

    const assistantConfig = {
      firstMessage: "Hello! I'm starting your technical viva interview. I'll ask you 10 questions, one every minute. Please answer verbally while you continue coding. Let's begin with the first question.",
      model: {
        provider: "google",
        model: "gemini-2.0-flash",
        temperature: 0.3,
      },
      voice: {
        provider: "11labs",
        voiceId: "rachel",
      },
      conversationId: this.currentSession.sessionId,
      noResponseTimeoutMs: 65000, // 65 seconds timeout per question
      messages: [
        {
          role: "system",
          content: `
            You are a technical interview assistant conducting a viva session.
            
            Your role:
            1. Ask questions from the provided list exactly as given
            2. Wait for verbal responses from the candidate
            3. Acknowledge briefly and move to the next question
            4. Do NOT provide feedback, corrections, or explanations
            5. Keep responses brief and professional
            6. Ask questions at 1-minute intervals

            Questions to ask:
            ${this.currentSession.questions.map((q, i) => `${i + 1}. ${q.question}`).join('\n')}

            Remember: You are evaluating the candidate's knowledge, not teaching.
          `,
        },
      ],
    };

    // Start Vapi session
    await vapi.start("e2f8f46e-9c31-44d0-926a-5fca091364ae", assistantConfig);

    // Set up event listeners
    vapi.on("message", (message) => {
      this.handleVapiMessage(message, onAnswer);
    });

    vapi.on("speech-start", () => {
      console.log("Candidate started speaking");
    });

    vapi.on("speech-end", () => {
      console.log("Candidate finished speaking");
    });

    vapi.on("call-end", () => {
      console.log("Vapi call ended");
      this.handleSessionEnd();
    });

    vapi.on("error", (error) => {
      console.error("Vapi error:", error);
      this.handleError(error);
    });
  }

  /**
   * Start the question timer (1 minute intervals)
   */
  private startQuestionTimer(
    onQuestion?: (question: string, index: number) => void,
    onAnswer?: (question: string, answer: string, index: number) => void
  ): void {
    if (!this.currentSession) {return;}

    // Ask first question after 5 seconds
    setTimeout(() => {
      this.askNextQuestion(onQuestion);
    }, 5000);

    // Set up recurring timer for subsequent questions
    this.questionTimer = setInterval(() => {
      this.askNextQuestion(onQuestion);
    }, 60000); // 1 minute intervals
  }

  /**
   * Ask the next question in sequence
   */
  private askNextQuestion(onQuestion?: (question: string, index: number) => void): void {
    if (!this.currentSession || this.currentSession.status !== 'active') {return;}

    const currentIndex = this.currentSession.currentQuestionIndex;
    
    if (currentIndex >= this.currentSession.questions.length) {
      // All questions asked, end session
      this.completeSession();
      return;
    }

    const currentQuestion = this.currentSession.questions[currentIndex];
    
    // Mark question as asked
    currentQuestion.asked = true;
    currentQuestion.timestamp = Date.now();
    
    // Update session
    this.currentSession.currentQuestionIndex++;
    this.saveSession();
    
    // Notify callback
    onQuestion?.(currentQuestion.question, currentIndex);
    
    console.log(`Asked question ${currentIndex + 1}: ${currentQuestion.question}`);
  }

  /**
   * Handle incoming Vapi messages (potential answers)
   */
  private handleVapiMessage(
    message: any,
    onAnswer?: (question: string, answer: string, index: number) => void
  ): void {
    if (!this.currentSession || !message?.content) {return;}

    // Find the most recent asked question without an answer
    const questionIndex = this.currentSession.questions.findIndex(
      q => q.asked && !q.answer
    );

    if (questionIndex !== -1) {
      const question = this.currentSession.questions[questionIndex];
      question.answer = message.content;
      
      this.saveSession();
      
      // Notify callback
      onAnswer?.(question.question, message.content, questionIndex);
      
      console.log(`Answer received for question ${questionIndex + 1}`);
    }
  }

  /**
   * Complete the current session
   */
  private completeSession(): void {
    if (!this.currentSession) {return;}

    this.currentSession.status = 'completed';
    this.saveSession();

    // Clean up timers and Vapi
    if (this.questionTimer) {
      clearInterval(this.questionTimer);
      this.questionTimer = null;
    }

    // Stop Vapi with a closing message
    setTimeout(() => {
      vapi.stop();
    }, 3000);

    console.log("Viva session completed");
  }

  /**
   * Stop the current session manually
   */
  stopSession(): void {
    if (!this.currentSession) {return;}

    this.currentSession.status = 'stopped';
    this.saveSession();

    // Clean up
    if (this.questionTimer) {
      clearInterval(this.questionTimer);
      this.questionTimer = null;
    }

    vapi.stop();
    console.log("Viva session stopped manually");
  }

  /**
   * Handle session end
   */
  private handleSessionEnd(): void {
    if (this.currentSession) {
      this.currentSession.status = 'completed';
      this.saveSession();
    }

    // Clean up
    if (this.questionTimer) {
      clearInterval(this.questionTimer);
      this.questionTimer = null;
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: any): void {
    console.error("Vapi service error:", error);
    
    // Clean up on error
    if (this.questionTimer) {
      clearInterval(this.questionTimer);
      this.questionTimer = null;
    }
  }

  /**
   * Save current session to localStorage
   */
  private saveSession(): void {
    if (!this.currentSession) return;
    
    localStorage.setItem(
      `viva_session_${this.currentSession.sessionId}`, 
      JSON.stringify(this.currentSession)
    );
  }

  /**
   * Get session data by ID
   */
  getSession(sessionId: string): VivaSession | null {
    try {
      const sessionData = localStorage.getItem(`viva_session_${sessionId}`);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error("Error retrieving session:", error);
      return null;
    }
  }

  /**
   * Get formatted answers for report generation
   */
  getFormattedAnswers(sessionId: string): Array<{ question: string; answer: string }> {
    const session = this.getSession(sessionId);
    if (!session) return [];

    return session.questions
      .filter(q => q.asked && q.answer)
      .map(q => ({
        question: q.question,
        answer: q.answer || "No response provided"
      }));
  }

  /**
   * Generate complete interview report
   */
  async generateInterviewReport(
    sessionId: string,
    testTitle: string,
    codingQuestion: string,
    candidateCode: string,
    warnings: Array<{ type: string; timestamp: string }> = []
  ): Promise<string> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const vivaAnswers = this.getFormattedAnswers(sessionId);

    return await generateSummaryReport(
      testTitle,
      session.role,
      session.topics,
      codingQuestion,
      candidateCode,
      vivaAnswers,
      warnings
    );
  }

  /**
   * Get current session status
   */
  getCurrentSessionStatus(): {
    sessionId: string | null;
    isActive: boolean;
    currentQuestionIndex: number;
    totalQuestions: number;
    currentQuestion: string | null;
  } {
    if (!this.currentSession) {
      return {
        sessionId: null,
        isActive: false,
        currentQuestionIndex: 0,
        totalQuestions: 0,
        currentQuestion: null
      };
    }

    const currentIndex = Math.max(0, this.currentSession.currentQuestionIndex - 1);
    const currentQuestion = this.currentSession.questions[currentIndex];

    return {
      sessionId: this.currentSession.sessionId,
      isActive: this.currentSession.status === 'active',
      currentQuestionIndex: this.currentSession.currentQuestionIndex,
      totalQuestions: this.currentSession.questions.length,
      currentQuestion: currentQuestion?.question || null
    };
  }

  /**
   * Get all stored sessions
   */
  getAllSessions(): VivaSession[] {
    const sessions: VivaSession[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('viva_session_')) {
        try {
          const sessionData = localStorage.getItem(key);
          if (sessionData) {
            sessions.push(JSON.parse(sessionData));
          }
        } catch (error) {
          console.error("Error parsing session:", error);
        }
      }
    }
    
    return sessions.sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Clear a specific session
   */
  clearSession(sessionId: string): void {
    localStorage.removeItem(`viva_session_${sessionId}`);
  }

  /**
   * Clear all sessions
   */
  clearAllSessions(): void {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('viva_session_')) {
        keys.push(key);
      }
    }
    
    keys.forEach(key => localStorage.removeItem(key));
  }
}

// Export singleton instance
export const vapiService = new VapiService();

// Export types for use in other files
export type { VivaSession, VivaQuestion };