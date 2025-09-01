import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
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
  difficulty: "easy" | "medium" | "hard";
  weight: number;
  scale?: string;
}

interface UserAnswer {
  questionId: string;
  answer: string;
}

interface GradingResult {
  questionId: string;
  score: number;
  maxScore: number;
  feedback: string;
  isCorrect: boolean;
}

// Function to calculate score for a single question
function calculateScore(
  question: Question,
  userAnswer: UserAnswer
): { score: number; maxScore: number; isCorrect: boolean } {
  // Validate inputs
  if (!question || !userAnswer) {
    return { score: 0, maxScore: 1, isCorrect: false };
  }

  const maxScore = Math.max(1, question.weight || 1); // Ensure maxScore is at least 1

  // For questions with correct answers
  if (question.correctAnswer || question.correctAnswers) {
    // Handle case where user didn't provide an answer
    if (!userAnswer.answer) {
      return { score: 0, maxScore, isCorrect: false };
    }

    switch (question.type) {
      case "yes-no":
      case "multiple-choice-single":
      case "scale":
      case "rating":
        // Handle case where correctAnswer is not defined
        if (!question.correctAnswer) {
          return { score: 0, maxScore, isCorrect: false };
        }

        const correct =
          (typeof question.correctAnswer === "string"
            ? question.correctAnswer.toLowerCase()
            : "") ===
          (typeof userAnswer.answer === "string"
            ? userAnswer.answer.toLowerCase()
            : "");
        return {
          score: correct ? maxScore : 0,
          maxScore,
          isCorrect: correct,
        };

      case "multiple-choice-multi":
        // For multi-select, partial credit is possible
        const correctAnswers = Array.isArray(question.correctAnswers)
          ? question.correctAnswers
          : question.correctAnswer
          ? [question.correctAnswer]
          : [];

        // Handle case where there are no correct answers defined
        if (correctAnswers.length === 0) {
          return { score: 0, maxScore, isCorrect: false };
        }

        const userAnswers = userAnswer.answer.split(",").map((a) => a.trim());

        const correctCount = userAnswers.filter((answer) => {
          // Ensure answer is a string before calling toLowerCase
          const normalizedAnswer =
            typeof answer === "string" ? answer.toLowerCase() : "";

          return correctAnswers.some((correct) => {
            // Ensure correct is a string before calling toLowerCase
            const normalizedCorrect =
              typeof correct === "string" ? correct.toLowerCase() : "";
            return normalizedCorrect === normalizedAnswer;
          });
        }).length;

        const incorrectCount = userAnswers.length - correctCount;
        const score = Math.max(
          0,
          (correctCount * maxScore) / correctAnswers.length -
            (incorrectCount * maxScore) / correctAnswers.length
        );

        return {
          score: Math.round(score * 100) / 100, // Round to 2 decimal places
          maxScore,
          isCorrect: score === maxScore,
        };

      default:
        // Handle unknown question types
        return { score: 0, maxScore, isCorrect: false };
    }
  }

  // For questions without predefined correct answers, return full score
  return {
    score: maxScore,
    maxScore,
    isCorrect: true,
  };
}

// Function to generate feedback using AI
async function generateFeedback(
  question: Question,
  userAnswer: UserAnswer,
  score: number,
  maxScore: number
): Promise<string> {
  // Validate inputs
  if (!question || !userAnswer) {
    return "Unable to generate feedback due to missing data.";
  }

  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      // Fallback feedback when API key is not configured
      if (score === maxScore) {
        return "Great job! Your answer is correct.";
      } else {
        return "Good effort. Review the material to improve your understanding.";
      }
    }

    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-4o-mini",
      temperature: 0.3,
    });

    const feedbackPrompt = PromptTemplate.fromTemplate(`
      You are an educational feedback generator. Provide constructive feedback for a student's answer to a question.
      
      Question: {question}
      Question Type: {type}
      Correct Answer: {correctAnswer}
      Student's Answer: {userAnswer}
      Score Achieved: {score} out of {maxScore}
      
      Provide brief, helpful feedback that:
      1. Acknowledges what the student did well if they scored points
      2. Gently corrects any misconceptions if they lost points
      3. Encourages learning and improvement
      4. Is appropriate for the question type and difficulty level
      
      Keep your feedback concise (1-2 sentences).
    `);

    const parser = new StringOutputParser();
    const chain = feedbackPrompt.pipe(llm).pipe(parser);

    const correctAnswer =
      question.correctAnswer ||
      (question.correctAnswers ? question.correctAnswers.join(", ") : "N/A");

    const feedback = await chain.invoke({
      question: question.question || "Unknown question",
      type: question.type || "unknown",
      correctAnswer,
      userAnswer: userAnswer.answer || "No answer provided",
      score: score.toString(),
      maxScore: maxScore.toString(),
    });

    return feedback.trim() || "No feedback available.";
  } catch (error) {
    console.error("Error generating feedback:", error);
    // Fallback feedback
    if (score === maxScore) {
      return "Great job! Your answer is correct.";
    } else {
      return "Good effort. Review the material to improve your understanding.";
    }
  }
}

// Function to generate overall test comparison using AI
async function generateComparison(
  questions: Question[],
  answers: UserAnswer[],
  gradingResults: GradingResult[]
): Promise<{
  correlation: string;
  analysis: string;
  recommendations: string[];
}> {
  try {
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: "gpt-4o-mini",
      temperature: 0.3,
    });

    const comparisonPrompt = PromptTemplate.fromTemplate(`
      You are an educational assessment expert. Analyze a student's test performance and provide insights.
      
      Questions and Answers:
      {qaPairs}
      
      Grading Results:
      {gradingResults}
      
      Total Score: {totalScore} out of {maxScore}
      Percentage: {percentage}%
      
      Provide:
      1. A brief correlation analysis (1 sentence) between question difficulty and student performance
      2. A detailed performance analysis (2-3 sentences) highlighting strengths and areas for improvement
      3. 3 specific, actionable recommendations for improvement
      
      Format your response as JSON:
      {
        "correlation": "string",
        "analysis": "string",
        "recommendations": ["string", "string", "string"]
      }
    `);

    const parser = new StringOutputParser();
    const chain = comparisonPrompt.pipe(llm).pipe(parser);

    // Prepare data for the prompt
    const qaPairs = questions
      .map((q) => {
        const answer = answers.find((a) => a.questionId === q.id);
        return `Q: ${q.question}\nA: ${answer?.answer || "No answer"}\nType: ${
          q.type
        }\nDifficulty: ${q.difficulty}`;
      })
      .join("\n\n");

    const totalScore = gradingResults.reduce(
      (sum, result) => sum + result.score,
      0
    );
    const maxScore = gradingResults.reduce(
      (sum, result) => sum + result.maxScore,
      0
    );
    const percentage =
      maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 0;

    const response = await chain.invoke({
      qaPairs,
      gradingResults: JSON.stringify(gradingResults, null, 2),
      totalScore: totalScore.toString(),
      maxScore: maxScore.toString(),
      percentage: percentage.toString(),
    });

    // Clean and parse the response
    const cleanedResponse = response.replace(/```json|```/g, "").trim();

    try {
      const result = JSON.parse(cleanedResponse);
      return {
        correlation: result.correlation || "N/A",
        analysis: result.analysis || "No analysis available.",
        recommendations: Array.isArray(result.recommendations)
          ? result.recommendations
          : [
              "Review the material regularly",
              "Practice more questions",
              "Seek help on difficult topics",
            ],
      };
    } catch (parseError) {
      console.error("Error parsing comparison response:", parseError);
      return {
        correlation: "N/A",
        analysis: "Performance analysis could not be generated.",
        recommendations: [
          "Review the material regularly",
          "Practice more questions",
          "Seek help on difficult topics",
        ],
      };
    }
  } catch (error) {
    console.error("Error generating comparison:", error);
    return {
      correlation: "N/A",
      analysis: "Performance analysis could not be generated due to an error.",
      recommendations: [
        "Review the material regularly",
        "Practice more questions",
        "Seek help on difficult topics",
      ],
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();

    // Validate body structure
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { questions, answers } = body;

    // Validate questions and answers arrays
    if (!Array.isArray(questions) || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "Questions and answers must be arrays" },
        { status: 400 }
      );
    }

    // Validate that questions array is not empty
    if (questions.length === 0) {
      return NextResponse.json(
        { error: "At least one question is required" },
        { status: 400 }
      );
    }

    // Validate question structure
    for (const question of questions) {
      if (
        !question ||
        typeof question !== "object" ||
        !question.id ||
        !question.type ||
        !question.question
      ) {
        return NextResponse.json(
          { error: "Invalid question structure" },
          { status: 400 }
        );
      }
    }

    // Validate answer structure
    for (const answer of answers) {
      if (
        !answer ||
        typeof answer !== "object" ||
        !answer.questionId ||
        typeof answer.answer !== "string"
      ) {
        return NextResponse.json(
          { error: "Invalid answer structure" },
          { status: 400 }
        );
      }
    }

    // Grade each question
    const gradingResults: GradingResult[] = [];

    for (const question of questions) {
      const userAnswer = answers.find(
        (a: UserAnswer) => a.questionId === question.id
      );

      if (!userAnswer) {
        // No answer provided for this question
        gradingResults.push({
          questionId: question.id,
          score: 0,
          maxScore: question.weight || 1,
          feedback: "No answer provided",
          isCorrect: false,
        });
        continue;
      }

      // Calculate score
      const { score, maxScore, isCorrect } = calculateScore(
        question,
        userAnswer
      );

      // Generate feedback
      const feedback = await generateFeedback(
        question,
        userAnswer,
        score,
        maxScore
      );

      gradingResults.push({
        questionId: question.id,
        score,
        maxScore,
        feedback,
        isCorrect,
      });
    }

    // Calculate total scores
    const totalScore = gradingResults.reduce(
      (sum, result) => sum + result.score,
      0
    );
    const maxPossibleScore = gradingResults.reduce(
      (sum, result) => sum + result.maxScore,
      0
    );
    const percentage =
      maxPossibleScore > 0
        ? Math.round((totalScore / maxPossibleScore) * 1000) / 10
        : 0;

    // Generate comparison/analysis
    const comparison = await generateComparison(
      questions,
      answers,
      gradingResults
    );

    // Return the response in the format expected by the frontend
    return NextResponse.json({
      testResult: {
        percentage,
        totalScore,
        maxPossibleScore,
        gradingResults,
      },
      comparison,
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
