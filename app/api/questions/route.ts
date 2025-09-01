import { NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { VectorStoreService } from "@/lib/document-store";
import { randomUUID } from "crypto";

class QuestionGenerator {
  // Reusable prompt template
  private static readonly questionPrompt = PromptTemplate.fromTemplate(`
You are a question generator.
Given the following content section, create a list of diverse question types in **strict JSON format only**.

Content Section:
{content}

Return JSON in the exact format below (no explanations, no markdown, no text outside JSON):
Each question MUST include ALL of these fields:
- type: Must be one of "yes-no", "multiple-choice-single", "multiple-choice-multi", "scale", or "rating"
- question: The actual question text
- options: Array of string options (include for multiple-choice and scale questions, omit for yes-no)
- correctAnswer: The correct answer (optional)
- difficulty: Must be one of "easy", "medium", or "hard"
- weight: A number between 1-10 representing the question's importance

{{
  "questions": [
    {{
      "type": "yes-no" | "multiple-choice-single" | "multiple-choice-multi" | "scale" | "rating",
      "question": string,
      "options": string[] (optional),
      "correctAnswer": string | string[] (optional),
      "difficulty": "easy" | "medium" | "hard",
      "weight": number
    }}
  ]
}}
`);

  // Generate questions
  static async generateQuestions(content: string, count: number = 10) {
    const model = new ChatOpenAI({
      modelName: "gpt-4o-mini", // lightweight, fast model
      temperature: 0.3,
    });

    // Update the prompt to specify the number of questions
    const updatedContent = `${content}\n\nGenerate exactly ${count} diverse questions based on the content above.`;

    const parser = new StringOutputParser();
    const chain = this.questionPrompt.pipe(model).pipe(parser);

    const response = await chain.invoke({ content: updatedContent });

    // Clean response (remove markdown code fences if any)
    const cleanedResponse = response.replace(/```json|```/g, "").trim();

    let result;
    try {
      result = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      console.error("Raw response:", response);

      // fallback
      result = { questions: [] };
    }

    // Add unique IDs to each question and ensure all required fields are present
    if (result.questions && Array.isArray(result.questions)) {
      result.questions = result.questions.map((question: any) => ({
        // Ensure all required fields are present
        type: question.type,
        question: question.question,
        options: question.options || undefined,
        correctAnswer: question.correctAnswer || undefined,
        correctAnswers: question.correctAnswers || undefined,
        difficulty: question.difficulty || "medium",
        weight: question.weight || 5, // Default weight if not provided
        id: randomUUID(),
      }));
    }

    return result;
  }
}

// API route
export async function POST(req: Request) {
  try {
    const { documentId, count = 10 } = await req.json();
    if (!documentId) {
      return NextResponse.json(
        { error: "No documentId provided" },
        { status: 400 }
      );
    }

    // Retrieve document content using documentId
    const documentStore = VectorStoreService.getDocumentStore(documentId);
    if (!documentStore || !documentStore.originalContent) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const questions = await QuestionGenerator.generateQuestions(
      documentStore.originalContent,
      count
    );
    return NextResponse.json(questions);
  } catch (error) {
    console.error("Error in POST /api/questions:", error);
    return NextResponse.json(
      { error: "Failed to generate questions" },
      { status: 500 }
    );
  }
}
