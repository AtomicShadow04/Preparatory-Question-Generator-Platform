"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QuestionDisplay } from "@/components/question-display";

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

interface Category {
  title: string;
  questions: Question[];
}

interface UserAnswer {
  questionId: string;
  answer: string;
}

export default function TestPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const documentId = urlParams.get("documentId");

    if (documentId) {
      fetchQuestions(documentId);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchQuestions = async (documentId: string) => {
    try {
      setLoading(true);
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documentId, count: 10 }),
      });

      const data = await response.json();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => {
      const existingAnswerIndex = prev.findIndex(
        (a) => a.questionId === questionId
      );
      if (existingAnswerIndex >= 0) {
        const newAnswers = [...prev];
        newAnswers[existingAnswerIndex] = { questionId, answer };
        return newAnswers;
      }
      return [...prev, { questionId, answer }];
    });
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const urlParams = new URLSearchParams(window.location.search);
      const documentId = urlParams.get("documentId") || "unknown";

      const response = await fetch("/api/grade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "user123",
          testId: `test_${documentId}`,
          questions: categories.flatMap((cat) => cat.questions),
          answers,
        }),
      });

      const data = await response.json();

      // Check if the response is an error
      if (data.error) {
        console.error("API Error:", data.error);
        // Set results to show the error
        setResults({ error: data.error, details: data.details });
      } else {
        setResults(data);
      }
    } catch (error) {
      console.error("Network Error:", error);
      setResults({
        error: "Network error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (results) {
    // Check if we have an error response
    if (results.error) {
      return (
        <div className="min-h-screen bg-background p-4">
          <div className="mx-auto max-w-2xl space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Error</CardTitle>
                <CardDescription>Failed to grade test</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-red-500">Error: {results.error}</p>
                  {results.details && (
                    <p className="text-red-500">Details: {results.details}</p>
                  )}
                  <Button onClick={() => setResults(null)}>Retake Test</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Display normal results
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="text-center py-6">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              Test Results
            </h1>
            <p className="text-slate-600">
              Your score:{" "}
              <span className="font-bold text-2xl text-blue-600">
                {results.testResult.percentage.toFixed(1)}%
              </span>
            </p>
          </div>

          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="bg-blue-50 p-6 rounded-xl">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">
                    Score Summary
                  </h3>
                  <p className="text-3xl font-bold text-blue-600">
                    {results.testResult.totalScore} /{" "}
                    {results.testResult.maxPossibleScore}
                  </p>
                  <p className="text-blue-700 mt-2">Total Points</p>
                </div>
                <div className="bg-green-50 p-6 rounded-xl">
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    Performance
                  </h3>
                  <p className="text-2xl font-bold text-green-600">
                    {results.testResult.percentage.toFixed(1)}%
                  </p>
                  <p className="text-green-700 mt-2">Percentage Score</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-xl">
                  <h3 className="text-xl font-semibold text-slate-800 mb-4">
                    Analysis
                  </h3>
                  <p className="text-slate-700 mb-3">
                    <strong>Correlation:</strong>{" "}
                    {results.comparison.correlation}
                  </p>
                  <p className="text-slate-700">
                    {results.comparison.analysis}
                  </p>
                </div>

                <div className="bg-slate-50 p-6 rounded-xl">
                  <h3 className="text-xl font-semibold text-slate-800 mb-4">
                    Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {results.comparison.recommendations.map(
                      (rec: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                            {index + 1}
                          </span>
                          <span className="text-slate-700">{rec}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-2xl font-semibold text-slate-800">
                    Detailed Feedback
                  </h3>
                  {results.testResult.gradingResults.map(
                    (result: any, index: number) => (
                      <Card
                        key={index}
                        className="border-0 shadow-md bg-white/80"
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg text-slate-800">
                            Question {index + 1}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-lg font-semibold">
                              Score:{" "}
                              <span className="text-blue-600">
                                {result.score} / {result.maxScore}
                              </span>
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${
                                result.isCorrect
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {result.isCorrect ? "Correct" : "Incorrect"}
                            </span>
                          </div>
                          <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">
                            {result.feedback}
                          </p>
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>

                <div className="flex gap-4 pt-6 border-t border-slate-200">
                  <Button
                    onClick={() => setResults(null)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Retake Test
                  </Button>
                  <Button
                    onClick={() => (window.location.href = "/")}
                    variant="outline"
                    className="px-6 py-3 rounded-lg font-medium border-slate-300 hover:bg-slate-50"
                  >
                    Home Page
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Knowledge Test
          </h1>
          <p className="text-slate-600">
            Answer all questions to the best of your ability
          </p>
        </div>

        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="space-y-8">
              {categories.length > 0 ? (
                <QuestionDisplay
                  categories={categories}
                  onAnswerChange={handleAnswerChange}
                />
              ) : (
                <p className="text-center text-slate-500 py-8">
                  No questions available
                </p>
              )}

              <div className="pt-6 border-t border-slate-200">
                <Button
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    answers.length !==
                      categories.flatMap((cat) => cat.questions).length
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  {submitting ? "Submitting..." : "Submit Answers"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
