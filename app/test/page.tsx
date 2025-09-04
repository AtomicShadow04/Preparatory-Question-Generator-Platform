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
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <p>Loading questions...</p>
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
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto max-w-2xl space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                Your score: {results.testResult.percentage.toFixed(1)}%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>
                  Total Score: {results.testResult.totalScore} /{" "}
                  {results.testResult.maxPossibleScore}
                </p>
                <p>Correlation: {results.comparison.correlation}</p>
                <p>Analysis: {results.comparison.analysis}</p>

                <div>
                  <h3 className="font-bold mb-2">Recommendations:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {results.comparison.recommendations.map(
                      (rec: string, index: number) => (
                        <li key={index}>{rec}</li>
                      )
                    )}
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold">Detailed Feedback:</h3>
                  {results.testResult.gradingResults.map(
                    (result: any, index: number) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-md">
                            Question {index + 1}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p>
                            Score: {result.score} / {result.maxScore}
                          </p>
                          <p>Feedback: {result.feedback}</p>
                          <p>
                            Status: {result.isCorrect ? "Correct" : "Incorrect"}
                          </p>
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>

                <Button onClick={() => setResults(null)}>Retake Test</Button>
                <Button
                  className="ml-5"
                  onClick={() => (window.location.href = "/")}
                >
                  Home Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Test</CardTitle>
            <CardDescription>
              Answer all questions to the best of your ability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {categories.length > 0 ? (
                <QuestionDisplay
                  categories={categories}
                  onAnswerChange={handleAnswerChange}
                />
              ) : (
                <p>No questions available</p>
              )}

              <Button
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  answers.length !==
                    categories.flatMap((cat) => cat.questions).length
                }
                className="w-full"
              >
                {submitting ? "Submitting..." : "Submit Answers"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
