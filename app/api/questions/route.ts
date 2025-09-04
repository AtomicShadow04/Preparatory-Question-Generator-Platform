import { NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { VectorStoreService } from "@/lib/document-store";
import { randomUUID } from "crypto";

class QuestionGenerator {
  private static readonly questionPrompt = new PromptTemplate({
    template: `
You are a preparation question generator for a specific university module.

Inputs you will receive:
- The module title and description
- A list of official Learning Outcomes
- The Assessment Marking Scheme with weights

{content}

Your tasks:
1. Carefully read the provided learning outcomes.
2. Generate preparatory questions ONLY about the knowledge, skills, and concepts listed in those outcomes.
   - Do not invent unrelated topics (stay within the module).
   - Write questions that a lecturer could ask to test if students have achieved the outcome.
3. Use a mix of formats: "yes-no", "multiple-choice-single", "multiple-choice-multi", "scale", "rating".
   - Yes/No: "Do you know how to calculate NPV?"
   - Multiple-choice: "Which financial ratio measures liquidity?"
   - Scale/Rating: "Rate your confidence in applying SWOT to a case study."
4. Assign weights:
   - Use the marking scheme to distribute weights across outcomes.
   - Higher-weighted assessment sections = higher-weighted questions.
   - Example: if 'Analysis of Current Business' = 25% of grade, questions linked to that outcome should have higher weights (7–10).
5. Group questions by learning outcome, and include the outcome title.

Return JSON ONLY in this structure:

{{
  "categories": [
    {{
      "title": "Learning Outcome Title",
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
  ]
}}
`,
    inputVariables: ["content"],
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
      result = { categories: [] };
    }

    // Ensure unique IDs for all questions
    if (result.categories && Array.isArray(result.categories)) {
      result.categories = result.categories.map((category: any) => ({
        ...category,
        questions: (category.questions || []).map((q: any) => ({
          type: q.type,
          question: q.question,
          options: q.options || undefined,
          correctAnswer: q.correctAnswer || undefined,
          correctAnswers: q.correctAnswers || undefined,
          difficulty: q.difficulty || "medium",
          weight: q.weight || 5,
          id: randomUUID(),
        })),
      }));
    }

    return result;
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
