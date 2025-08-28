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
  scale?: string;
}

interface UserAnswer {
  questionId: string;
  answer: string;
}

export default function TestPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<any>(null);

  // Get documentId from URL query params
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
      if (data.questions) {
        setQuestions(data.questions);
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

      // Get documentId from URL query params
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
          questions,
          answers,
        }),
      });

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Error submitting test:", error);
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
              {questions.map((question) => (
                <QuestionDisplay
                  key={question.id}
                  question={question}
                  onAnswerChange={handleAnswerChange}
                />
              ))}

              <Button
                onClick={handleSubmit}
                disabled={submitting || answers.length !== questions.length}
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
