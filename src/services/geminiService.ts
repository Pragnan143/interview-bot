import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(
  import.meta.env.VITE_GEMINI_API_KEY || "YOUR_GEMINI_API_KEY"
);
function cleanMarkdown(text: string): string {
  return text
    .replace(/[*_~`#>]+/g, "") // Remove *, _, ~, `, #, > symbols
    .replace(/\n{3,}/g, "\n\n") // Reduce multiple blank lines to max two
    .replace(/^- /gm, "") // Remove list dashes if needed
    .trim();
}
/**
 * Generate a practical coding question based on the test topics and role
 */
export async function generatePracticalQuestion(
  topics: string[],
  role: string,
  duration: number
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });
    const prompt = `
Generate a **practical coding problem** for a **${role}** interview. It should assess the candidate’s knowledge of the following topics: ${topics.join(
      ", "
    )}.

**Requirements:**
1. Solvable within 10 minutes
2. Tests multiple relevant skills
3. Clear problem statement and acceptance criteria
4. Relates to real-world scenarios
5. Includes all necessary context/setup

**Format:** Markdown with the following sections:
- Problem Statement
- Requirements
- Example Input/Output (if applicable)
- Constraints
- Hints (optional)
    `;

    const result = await model.generateContent(prompt);
    return cleanMarkdown(result.response.text());
  } catch (error) {
    console.error("Error generating practical question:", error);
    return "Failed to generate a question. Please contact an administrator.";
  }
}

/**
 * Generate viva questions based on test topics and role
 */
// export async function generateVivaQuestions(
//   topics: string[],
//   role: string
// ): Promise<string[]> {
//   try {
//     const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

//     const prompt = `
// Generate 10 **viva (verbal interview)** questions for a **${role}** role that assess understanding of the following topics: ${topics.join(
//       ", "
//     )}.

// **Guidelines:**
// 1. Vary in complexity (basic to medium)
// 2. Include theoretical and practical aspects
// 3. Cover a variety of topics
// 4. Mix open-ended and specific questions
// 5. Include a few behavioral/situational questions
// 6. Avoid ambiguity or excessive complexity

// Return ONLY a JSON array of 10 questions, no extra text.
//     `;

//     const result = await model.generateContent(prompt);
//     const text = result.response.text();
//     try {
//       const parsed = JSON.parse(text);
//       if (Array.isArray(parsed)) {return parsed;}
//       throw new Error("Parsed content is not an array");
//     } catch {
//       // Fallback extraction if JSON parsing fails
//       const lines = text
//         .split("\n")
//         .map((line) => line.trim())
//         .filter((line) => /^(\d+\.|-)/.test(line))
//         .map((line) => line.replace(/^(\d+\.|-)\s*/, "").trim());

//       if (lines.length >= 5) {return lines;}

//       // Last resort: extract sentences ending in '?'
//       return text
//         .split(/(?<=[?.!])\s+/)
//         .filter((sentence) => sentence.trim().endsWith("?"))
//         .slice(0, 10);
//     }
//   } catch (error) {
//     console.error("Error generating viva questions:", error);
//     return [
//       "What are your strengths in the technologies mentioned?",
//       "How do you approach debugging complex issues?",
//       "Explain your experience with these technologies.",
//       "What's a challenging technical problem you've solved recently?",
//     ];
//   }
// }
export async function generateVivaQuestions(
  topics: string[],
  role: string
): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

    const prompt = `
Generate 5 **viva (verbal interview)** questions for a **${role}** role that assess understanding of the following topics: ${topics.join(
      ", "
    )}.

**Guidelines:**
1. Vary in complexity (basic to medium)
2. Include mandatory two behavioral/situational questions which are releated to softskills
3. Cover a variety of topics
4. Mix open-ended and specific questions
6. Avoid ambiguity or excessive complexity

Return ONLY a JSON array of 10 questions, no extra text.
    `;

    const result = await model.generateContent(prompt);
    // Assume result.response.text() returns a Promise<string>
    const text = await result.response.text();

    // Since no access to headers, skip content-type check

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      throw new Error("Parsed content is not an array");
    } catch (jsonError) {
      console.warn(
        "JSON parsing failed, applying fallback parsing. Error:",
        jsonError
      );
      // Fallback extraction: parse lines starting with number or dash
      const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => /^(\d+\.|-)/.test(line))
        .map((line) => line.replace(/^(\d+\.|-)\s*/, "").trim());

      if (lines.length >= 5) {
        return lines;
      }

      // Last resort: extract sentences ending with '?'
      return text
        .split(/(?<=[?.!])\s+/)
        .filter((sentence) => sentence.trim().endsWith("?"))
        .slice(0, 10);
    }
  } catch (error) {
    console.error("Error generating viva questions:", error);
    return [
      "What are your strengths in the technologies mentioned?",
      "How do you approach debugging complex issues?",
      "Explain your experience with these technologies.",
      "What's a challenging technical problem you've solved recently?",
    ];
  }
}

/**
 * Generate a summary report after the test is completed
 */
export async function generateSummaryReport(
  testTitle: string,
  role: string,
  topics: string[],
  question: string,
  code: string,
  vivaAnswers: Array<{ question: string; answer: string }> = [],
  warnings: Array<{ type: string; timestamp: string }> = []
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

    const vivaAnswersText = vivaAnswers.length
      ? vivaAnswers.map((v) => `Q: ${v.question}\nA: ${v.answer}`).join("\n\n")
      : "No viva responses provided.";

    const warningsText = warnings.length
      ? warnings
          .map(
            (w) =>
              `- ${w.type} at ${new Date(w.timestamp).toLocaleTimeString()}`
          )
          .join("\n")
      : "No warnings recorded.";

    const prompt = `
Generate a **comprehensive interview report** for a candidate applying for the role of **${role}**.

**Test Information:**
- Title: ${testTitle}
- Topics: ${topics.join(", ")}

**Coding Question:**
${question}

**Candidate Code:**
\`\`\`
${code}
\`\`\`

**Viva Responses:**
${vivaAnswersText}

**Test Integrity:**
${warningsText}

**Assessment Sections:**
1. **Technical Skills Assessment**
   - Code quality and readability
   - Problem-solving approach
   - Technical knowledge demonstrated
   - Strengths and improvement areas

2. **Behavioral Assessment**
   - Communication skills
   - Integrity during test
   - Professionalism

3. **Overall Summary**
   - Key strengths
   - Gaps identified
   - Recommendation (Strongly Recommend / Recommend / Neutral / Do Not Recommend)
   - Suitable role fit

Format the report in Markdown with clear headers.
    `;

    const result = await model.generateContent(prompt);
    return cleanMarkdown(result.response.text());
  } catch (error) {
    console.error("Error generating summary report:", error);
    return "Failed to generate a summary report. Please contact an administrator.";
  }
}

/**
 * Generate an ATS-compatible resume for the candidate
 */
export async function generateAtsResume(
  role: string,
  testTitle: string,
  topics: string[],
  code: string,
  summaryReport: string
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
Create an **ATS-compatible resume** based on the candidate’s performance in a technical interview for the role of **${role}**.

**Details:**
- Test Title: ${testTitle}
- Topics: ${topics.join(", ")}
- Code Sample (excerpt):
\`\`\`
${code.substring(0, 500)}...
\`\`\`

**Assessment Summary (excerpt):**
${summaryReport.substring(0, 1000)}...

**Instructions:**
- Highlight skills shown during the interview
- Include a tailored professional summary
- Mention relevant tech skills and soft skills
- Suggest logical experience and education based on test performance
- Format in Markdown with clear sections

Resume should pass ATS filters and follow standard structure.
    `;

    const result = await model.generateContent(prompt);
    return cleanMarkdown(result.response.text())
  } catch (error) {
    console.error("Error generating ATS resume:", error);
    return "Failed to generate an ATS-compatible resume. Please contact an administrator.";
  }
}
