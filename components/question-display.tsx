"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

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
}

interface Category {
  title: string;
  questions: Question[];
}

interface UserAnswer {
  questionId: string;
  answer: string;
}

export function QuestionDisplay({
  categories,
  onAnswerChange,
}: {
  categories: Category[];
  onAnswerChange: (questionId: string, answer: string) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    onAnswerChange(questionId, value);
  };

  // Reusable meta info
  const QuestionMeta = ({ question }: { question: Question }) => (
    <CardDescription className="flex justify-between text-sm text-muted-foreground">
      <span>Difficulty: {question.difficulty}</span>
      <span>Weight: {question.weight}</span>
    </CardDescription>
  );

  return (
    <div>
      {categories.map((category, idx) => (
        <div key={idx} className="mb-12">
          <h2 className="text-xl font-bold mb-6">{category.title}</h2>
          {category.questions.map((question) => {
            const answer = answers[question.id] || "";

            switch (question.type) {
              case "yes-no":
                return (
                  <Card key={question.id} className="mb-8 shadow-md border">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">
                        {question.question}
                      </CardTitle>
                      <QuestionMeta question={question} />
                    </CardHeader>
                    <Separator className="my-2" />
                    <CardContent>
                      <RadioGroup
                        value={answer}
                        onValueChange={(val) =>
                          handleAnswerChange(question.id, val)
                        }
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="Yes"
                            id={`yes-${question.id}`}
                          />
                          <Label htmlFor={`yes-${question.id}`}>Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="No" id={`no-${question.id}`} />
                          <Label htmlFor={`no-${question.id}`}>No</Label>
                        </div>
                      </RadioGroup>
                    </CardContent>
                  </Card>
                );

              case "multiple-choice-single":
                return (
                  <Card key={question.id} className="mb-8 shadow-md border">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">
                        {question.question}
                      </CardTitle>
                      <QuestionMeta question={question} />
                    </CardHeader>
                    <Separator className="my-2" />
                    <CardContent>
                      <RadioGroup
                        value={answer}
                        onValueChange={(val) =>
                          handleAnswerChange(question.id, val)
                        }
                      >
                        {question.options?.map((option, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 mb-2"
                          >
                            <RadioGroupItem
                              value={option}
                              id={`option-${question.id}-${index}`}
                            />
                            <Label htmlFor={`option-${question.id}-${index}`}>
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </CardContent>
                  </Card>
                );

              case "multiple-choice-multi":
                return (
                  <Card key={question.id} className="mb-8 shadow-md border">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">
                        {question.question}
                      </CardTitle>
                      <QuestionMeta question={question} />
                    </CardHeader>
                    <Separator className="my-2" />
                    <CardContent>
                      <div className="space-y-2">
                        {question.options?.map((option, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`checkbox-${question.id}-${index}`}
                              onCheckedChange={(checked: boolean) => {
                                let newAnswerArray = answer
                                  ? answer.split(",")
                                  : [];
                                if (checked) {
                                  newAnswerArray.push(option);
                                } else {
                                  newAnswerArray = newAnswerArray.filter(
                                    (a) => a !== option
                                  );
                                }
                                handleAnswerChange(
                                  question.id,
                                  newAnswerArray.join(",")
                                );
                              }}
                            />
                            <Label htmlFor={`checkbox-${question.id}-${index}`}>
                              {option}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );

              case "scale":
                return (
                  <Card key={question.id} className="mb-8 shadow-md border">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">
                        {question.question}
                      </CardTitle>
                      <QuestionMeta question={question} />
                    </CardHeader>
                    <Separator className="my-2" />
                    <CardContent>
                      <div className="space-y-4">
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          value={[parseInt(answer) || 5]}
                          onValueChange={(val: number[]) =>
                            handleAnswerChange(question.id, val[0].toString())
                          }
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm">
                          <span>1</span>
                          <span className="text-muted-foreground">
                            Current: {answer || "5"}
                          </span>
                          <span>10</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );

              case "rating":
                return (
                  <Card key={question.id} className="mb-8 shadow-md border">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">
                        {question.question}
                      </CardTitle>
                      <QuestionMeta question={question} />
                    </CardHeader>
                    <Separator className="my-2" />
                    <CardContent>
                      <div className="space-y-4">
                        <Slider
                          min={1}
                          max={5}
                          step={1}
                          value={[parseInt(answer) || 3]}
                          onValueChange={(val: number[]) =>
                            handleAnswerChange(question.id, val[0].toString())
                          }
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm">
                          <span>1</span>
                          <span className="text-muted-foreground">
                            Current: {answer || "3"}
                          </span>
                          <span>5</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );

              default:
                return (
                  <Card key={question.id} className="mb-8 shadow-md border">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">
                        {question.question}
                      </CardTitle>
                      <QuestionMeta question={question} />
                    </CardHeader>
                    <Separator className="my-2" />
                    <CardContent>
                      <Textarea
                        placeholder="Enter your answer..."
                        value={answer}
                        onChange={(e) =>
                          handleAnswerChange(question.id, e.target.value)
                        }
                      />
                    </CardContent>
                  </Card>
                );
            }
          })}
        </div>
      ))}
    </div>
  );
}
