import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { VectorStoreService } from "@/lib/document-store";

class QuestionGenerator {
  private static questionPrompt =
    PromptTemplate.fromTemplate(`Based on the following educational content, generate {{count}} diverse questions that test comprehension and understanding.

Requirements:
- Include these types of questions:
  - yes-no
  - multiple-choice-single (4 options, one correct)
  - multiple-choice-multi (4-6 options, multiple correct)
  - scale (1-10 self-assessment)
  - rating (1-5 opinion/perception)
- Vary the difficulty levels: easy, medium, hard
- Questions should test understanding, not just memorization
- Cover different aspects of the content (facts, application, analysis, evaluation)
- Output must be a valid JSON array in the format below

Content:
{content}

Output Format Example:
{{"questions": [
  {{
    "type": "yes-no",
    "question": "Does the assignment require an individual report?",
    "correctAnswer": "Yes",
    "difficulty": "easy"
  }},
  {{
    "type": "multiple-choice-single",
    "question": "What percentage of the overall grade does the assignment carry?",
    "options": ["60%", "70%", "80%", "100%"],
    "correctAnswer": "80%",
    "difficulty": "easy"
  }},
  {{
    "type": "multiple-choice-multi",
    "question": "Which items must be included in the appendices?",
    "options": ["SWOT summary", "Financial statements", "Peer evaluation", "Confirmation statement", "NPV calculation"],
    "correctAnswers": ["SWOT summary", "Financial statements", "Confirmation statement", "NPV calculation"],
    "difficulty": "medium"
  }},
  {{
    "type": "scale",
    "question": "How confident are you in applying SWOT analysis to a business case study?",
    "scale": "1-10",
    "difficulty": "medium"
  }},
  {{
    "type": "rating",
    "question": "Rate the fairness of the lateness penalty policy.",
    "scale": "1-5",
    "difficulty": "hard"
  }}
]}}`);

  static async generateQuestions(
    documentId: string,
    count: number = 10
  ): Promise<any[]> {
    try {
      if (!documentId) {
        throw new Error("Document ID is required");
      }

      if (count <= 0 || count > 50) {
        throw new Error("Question count must be between 1 and 50");
      }

      const store = VectorStoreService.getDocumentStore(documentId);
      if (!store) {
        throw new Error("Document not found");
      }

      const content = store.originalContent.substring(0, 4000);

      const llm = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY!,
        modelName: "gpt-4",
        temperature: 0.7,
      });

      const chain = RunnableSequence.from([
        this.questionPrompt,
        llm,
        new StringOutputParser(),
      ]);

      const response = await chain.invoke({
        content,
        count,
      });

      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse.substring(7);
      }
      if (cleanedResponse.endsWith("```")) {
        cleanedResponse = cleanedResponse.substring(
          0,
          cleanedResponse.length - 3
        );
      }

      let result;
      try {
        result = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error("JSON parsing error:", parseError);
        console.error("Raw response:", response);
        throw new Error("Failed to parse questions from AI response");
      }

      if (!result.questions || !Array.isArray(result.questions)) {
        throw new Error("Invalid response format from AI");
      }

      return result.questions.map((q: any, index: number) => ({
        id: `q_${documentId}_${Date.now()}_${index}`,
        ...q,
      }));
    } catch (error) {
      console.error("Error generating questions:", error);
      throw new Error(
        "Failed to generate questions: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "OpenAI API key is not configured",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { documentId, count = 10 } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    const questionCount = parseInt(count as any);
    if (isNaN(questionCount) || questionCount <= 0 || questionCount > 50) {
      return NextResponse.json(
        {
          error: "Question count must be a number between 1 and 50",
        },
        { status: 400 }
      );
    }

    const questions = await QuestionGenerator.generateQuestions(
      documentId,
      questionCount
    );

    return NextResponse.json({
      message: "Questions generated successfully",
      documentId,
      questionsGenerated: questions.length,
      questions,
    });
  } catch (error) {
    console.error("Question generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate questions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
