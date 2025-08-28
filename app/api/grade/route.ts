import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

interface Question {
  id: string;
  type:
    | "yes-no"
    | "multiple-choice-single"
    | "multiple-choice-multi"
    | "scale"
    | "rating";
  question: string;
  options?: string[];
  correctAnswer?: string;
  correctAnswers?: string[];
  rubric?: string;
  difficulty: "easy" | "medium" | "hard";
}

interface UserAnswer {
  questionId: string;
  answer: string;
  timestamp?: Date;
}

interface GradingResult {
  questionId: string;
  score: number;
  maxScore: number;
  feedback: string;
  isCorrect: boolean;
}

interface TestResult {
  userId: string;
  testId: string;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  gradingResults: GradingResult[];
  completedAt: Date;
}

class GradingService {
  private static gradingPrompt = PromptTemplate.fromTemplate(`
Grade the following student answer based on the question, type, and rubric provided.

Requirements:
- Provide a detailed evaluation explaining the reasoning for the score.
- Scoring rules:
  - yes-no: Score 1 for correct, 0 for incorrect
  - multiple-choice-single: Score 1 for correct, 0 for incorrect
  - multiple-choice-multi: Score based on the proportion of correct answers selected (max 1 point)
  - scale: Score out of 5 points based on how well the explanation aligns with the rubric
  - rating: Score out of 5 points based on justification and completeness
- Feedback should be constructive, specific, and explain what was done well and what could be improved.
- Output must be a valid JSON object in the format below.

Question: {question}
Type: {type}
Rubric: {rubric}
Student Answer: {answer}

Output Format Example:
{
  "score": 4,
  "maxScore": 5,
  "feedback": "The student identified key elements correctly but missed deeper explanation. Next time, provide more detail on how ratios link to strategic analysis.",
  "isCorrect": true
}
`);

  static async gradeAnswer(
    question: Question,
    userAnswer: string
  ): Promise<GradingResult> {
    // Validate inputs
    if (!question) {
      return {
        questionId: "unknown",
        score: 0,
        maxScore: 1,
        feedback: "Invalid question provided.",
        isCorrect: false,
      };
    }

    if (userAnswer === undefined || userAnswer === null) {
      return {
        questionId: question.id,
        score: 0,
        maxScore: 1,
        feedback: "No answer provided.",
        isCorrect: false,
      };
    }

    switch (question.type) {
      case "yes-no":
      case "multiple-choice-single":
        return this.gradeSingleChoice(question, userAnswer);

      case "multiple-choice-multi":
        return this.gradeMultiChoice(question, userAnswer);

      case "scale":
      case "rating":
        return await this.gradeOpenEnded(question, userAnswer);

      default:
        return {
          questionId: question.id,
          score: 0,
          maxScore: 1,
          feedback: "Unsupported question type.",
          isCorrect: false,
        };
    }
  }

  private static gradeSingleChoice(
    question: Question,
    userAnswer: string
  ): GradingResult {
    // Validate that we have a correct answer
    if (!question.correctAnswer) {
      return {
        questionId: question.id,
        score: 0,
        maxScore: 1,
        feedback: "No correct answer defined for this question.",
        isCorrect: false,
      };
    }

    const isCorrect =
      userAnswer.trim().toLowerCase() ===
      question.correctAnswer?.trim().toLowerCase();

    return {
      questionId: question.id,
      score: isCorrect ? 1 : 0,
      maxScore: 1,
      feedback: isCorrect
        ? "Correct!"
        : `Incorrect. The correct answer is: ${question.correctAnswer}`,
      isCorrect,
    };
  }

  private static gradeMultiChoice(
    question: Question,
    userAnswer: string
  ): GradingResult {
    const correctAnswers: string[] = question.correctAnswers || [];

    if (!Array.isArray(correctAnswers) || correctAnswers.length === 0) {
      return {
        questionId: question.id,
        score: 0,
        maxScore: 1,
        feedback: "No correct answers provided for this question.",
        isCorrect: false,
      };
    }

    // Handle empty answers
    if (!userAnswer || userAnswer.trim() === "") {
      return {
        questionId: question.id,
        score: 0,
        maxScore: 1,
        feedback: "No answer provided.",
        isCorrect: false,
      };
    }

    const userSelections = userAnswer
      .split(",")
      .map((ans) => ans.trim().toLowerCase());

    const correctSet = new Set(correctAnswers.map((ans) => ans.toLowerCase()));

    let correctCount = 0;
    userSelections.forEach((ans) => {
      if (correctSet.has(ans)) correctCount++;
    });

    // Avoid division by zero
    const precision =
      userSelections.length > 0 ? correctCount / userSelections.length : 0;
    const recall = correctSet.size > 0 ? correctCount / correctSet.size : 0;

    const f1Score =
      precision + recall > 0
        ? (2 * precision * recall) / (precision + recall)
        : 0;
    const score = Math.min(Math.round(f1Score * 10) / 10, 1); // max 1 point, rounded to 1 decimal

    return {
      questionId: question.id,
      score: Math.min(score, 1),
      maxScore: 1,
      feedback: `You selected ${correctCount} correct options out of ${correctSet.size} total correct options.`,
      isCorrect: score === 1,
    };
  }

  private static async gradeOpenEnded(
    question: Question,
    userAnswer: string
  ): Promise<GradingResult> {
    try {
      // Handle empty answers
      if (!userAnswer || userAnswer.trim() === "") {
        return {
          questionId: question.id,
          score: 0,
          maxScore: 5,
          feedback: "No answer provided.",
          isCorrect: false,
        };
      }

      const maxScore = 5;

      const llm = new OpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY!,
        modelName: "gpt-4",
        temperature: 0.2,
      });

      const chain = RunnableSequence.from([
        this.gradingPrompt,
        llm,
        new StringOutputParser(),
      ]);

      const response = await chain.invoke({
        question: question.question,
        type: question.type,
        rubric:
          question.rubric ||
          "Grade based on accuracy, completeness, justification, and depth of understanding.",
        answer: userAnswer,
      });

      // Clean up the response to ensure valid JSON
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

      // Try to parse the JSON
      let result;
      try {
        result = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error("JSON parsing error:", parseError);
        console.error("Raw response:", response);
        return {
          questionId: question.id,
          score: 0,
          maxScore: 5,
          feedback: "Unable to parse AI response. Please try again.",
          isCorrect: false,
        };
      }

      return {
        questionId: question.id,
        score: Math.min(result.score, maxScore),
        maxScore,
        feedback: result.feedback,
        isCorrect: result.score >= maxScore * 0.7,
      };
    } catch (error) {
      console.error("Error grading open-ended answer:", error);
      return {
        questionId: question.id,
        score: 0,
        maxScore: 5,
        feedback: "Unable to grade this answer. Please try again.",
        isCorrect: false,
      };
    }
  }

  static calculateOverallScore(gradingResults: GradingResult[]): {
    totalScore: number;
    maxPossibleScore: number;
    percentage: number;
  } {
    // Handle empty results
    if (!gradingResults || gradingResults.length === 0) {
      return { totalScore: 0, maxPossibleScore: 0, percentage: 0 };
    }

    const totalScore = gradingResults.reduce((sum, r) => sum + r.score, 0);
    const maxPossibleScore = gradingResults.reduce(
      (sum, r) => sum + r.maxScore,
      0
    );
    const percentage =
      maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

    return { totalScore, maxPossibleScore, percentage };
  }
}

class ScoreComparison {
  static analyzePerformance(
    aiTestResult: TestResult,
    realWorldScore?: number
  ): {
    correlation: string;
    analysis: string;
    recommendations: string[];
  } {
    if (!realWorldScore) {
      return {
        correlation: "No real-world score provided",
        analysis: `AI assessment score: ${aiTestResult.percentage.toFixed(1)}%`,
        recommendations: [
          "Take a real assessment to compare results",
          "Continue studying the material",
          "Review areas where you scored lower",
        ],
      };
    }

    const aiScore = aiTestResult.percentage;
    const difference = Math.abs(aiScore - realWorldScore);

    let correlation: string;
    let analysis: string;
    const recommendations: string[] = [];

    if (difference <= 5) {
      correlation = "Excellent correlation";
      analysis = `AI assessment closely matches real-world performance (${difference.toFixed(
        1
      )}% difference)`;
      recommendations.push(
        "The AI assessment is accurately measuring your knowledge"
      );
      recommendations.push("Continue with your current study approach");
    } else if (difference <= 15) {
      correlation = "Good correlation";
      analysis = `AI assessment shows good alignment with real-world performance (${difference.toFixed(
        1
      )}% difference)`;
      recommendations.push(
        "Minor discrepancies may be due to question style differences"
      );
      recommendations.push(
        "Focus on areas where you struggled in both assessments"
      );
    } else if (difference <= 25) {
      correlation = "Moderate correlation";
      analysis = `AI assessment shows some alignment with real-world performance (${difference.toFixed(
        1
      )}% difference)`;

      if (aiScore > realWorldScore) {
        recommendations.push(
          "AI test may be easier - focus more on practical application"
        );
        recommendations.push(
          "Practice with more challenging real-world scenarios"
        );
      } else {
        recommendations.push(
          "AI test may be harder - you might perform better in real scenarios"
        );
        recommendations.push("Build confidence through additional practice");
      }
    } else {
      correlation = "Poor correlation";
      analysis = `Significant difference between AI and real-world scores (${difference.toFixed(
        1
      )}% difference)`;
      recommendations.push(
        "Consider reviewing the study material and testing approach"
      );
      recommendations.push(
        "The AI assessment may not fully capture the real-world test format"
      );
      recommendations.push("Seek additional resources or tutoring");
    }

    if (aiScore < 60) {
      recommendations.push(
        "Focus on fundamental concepts - review the source material thoroughly"
      );
      recommendations.push(
        "Consider breaking down complex topics into smaller sections"
      );
    } else if (aiScore < 80) {
      recommendations.push(
        "Good foundation - work on more challenging aspects of the material"
      );
      recommendations.push("Practice applying concepts in different contexts");
    } else {
      recommendations.push(
        "Excellent understanding - consider advanced topics in this area"
      );
      recommendations.push("Help others to reinforce your knowledge");
    }

    return { correlation, analysis, recommendations };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "OpenAI API key is not configured",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { userId, testId, questions, answers, realWorldScore } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!testId) {
      return NextResponse.json(
        { error: "Test ID is required" },
        { status: 400 }
      );
    }

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: "Questions array is required" },
        { status: 400 }
      );
    }

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "Answers array is required" },
        { status: 400 }
      );
    }

    // Validate that we have questions to grade
    if (questions.length === 0) {
      return NextResponse.json(
        {
          error: "No questions provided for grading",
        },
        { status: 400 }
      );
    }

    const gradingResults: GradingResult[] = [];

    for (const answer of answers as UserAnswer[]) {
      const question = questions.find(
        (q: Question) => q.id === answer.questionId
      );
      if (question) {
        const result = await GradingService.gradeAnswer(
          question,
          answer.answer
        );
        gradingResults.push(result);
      }
    }

    const overallScore = GradingService.calculateOverallScore(gradingResults);

    const testResult: TestResult = {
      userId,
      testId,
      ...overallScore,
      gradingResults,
      completedAt: new Date(),
    };

    const comparison = ScoreComparison.analyzePerformance(
      testResult,
      realWorldScore
    );

    return NextResponse.json({
      testResult,
      comparison,
      message: "Test graded successfully",
    });
  } catch (error) {
    console.error("Grading error:", error);
    return NextResponse.json(
      {
        error: "Failed to grade test",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
