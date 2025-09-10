import { NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { VectorStoreService } from "@/lib/document-store";
import { randomUUID } from "crypto";

class QuestionGenerator {
  private static readonly questionPrompt = new PromptTemplate({
    template: `You are an expert educator. Given an assignment brief: \${content}, produce a concise JSON object with an assessment name, description, groups with weights summing roughly to 100, and questions with type and weight.\n\nSTRICT TYPE RULES:\n- Each question.type MUST be one of exactly: "radio-options" | "checkboxes" | "yes/no" | "scaled" | "rating".\n- Use "yes/no" for strictly binary questions.\n- Use "radio-options" for single-choice among several options; include an "options" array.\n- Use "checkboxes" for multiple selection questions; include an "options" array.\n- Use "scaled" for numeric range questions; include "min" and "max" (dynamic).\n- Use "rating" for 1–5 star style questions (always 5 max).\n- Provide a MIX of question types across the assessment.\n- Generate a concise, professional assessment name (2-6 words) that reflects the assignment topic.\n\nOutput ONLY JSON (no markdown, no prose).`,
    inputVariables: ["content"],
    templateFormat: "f-string",
  });

  // Generate questions
  static async generateQuestions(content: string, count: number = 10) {
    const model = new ChatOpenAI({
      modelName: "gpt-4o-mini", // lightweight, fast model
      temperature: 0.3,
    });

    // Update content with explicit instruction for number of questions
    const updatedContent = `${content}\n\nGenerate questions for all learning outcomes as described above. Each learning outcome must have its own category with 5–7 questions.`;

    const parser = new StringOutputParser();
    const chain = this.questionPrompt.pipe(model).pipe(parser);

    const response = await chain.invoke({ content: updatedContent });
    console.log("OpenAI response:", response);

    // Clean response (remove markdown code fences if any)
    const cleanedResponse = response.replace(/```json|```/g, "").trim();

    let result;
    try {
      result = JSON.parse(cleanedResponse);
      console.log("Parsed result:", result);
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      console.error("Raw response:", response);

      // fallback
      result = { groups: [] };
    }

    // Ensure unique IDs for all questions
    if (result.groups && Array.isArray(result.groups)) {
      result.groups = result.groups.map((group: any, index: number) => ({
        ...group,
        title: group.name || `Assessment Group ${index + 1}`,
        questions: (group.questions || []).map((q: any) => {
          let type = q.type;
          if (type === "radio-options") type = "multiple-choice-single";
          else if (type === "checkboxes") type = "multiple-choice-multi";
          else if (type === "yes/no") type = "yes-no";
          else if (type === "scaled") type = "scale";
          // rating remains the same
          return {
            type,
            question: q.question,
            options: q.options || undefined,
            correctAnswer: q.correctAnswer || undefined,
            correctAnswers: q.correctAnswers || undefined,
            difficulty: q.difficulty || "medium",
            weight: q.weight || 5,
            id: randomUUID(),
          };
        }),
      }));
    }

    return { categories: result.groups };
  }
}

// API route
export async function POST(req: Request) {
  try {
    const { documentId, count = 10 } = await req.json();
    console.log("Received documentId:", documentId);
    if (!documentId) {
      return NextResponse.json(
        { error: "No documentId provided" },
        { status: 400 }
      );
    }

    // Retrieve document content using documentId
    const documentStore = VectorStoreService.getDocumentStore(documentId);
    console.log("Document store found:", !!documentStore);
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
    console.log("Generated questions:", questions);
    return NextResponse.json(questions);
  } catch (error) {
    console.error("Error in POST /api/questions:", error);
    return NextResponse.json(
      { error: "Failed to generate questions" },
      { status: 500 }
    );
  }
}
