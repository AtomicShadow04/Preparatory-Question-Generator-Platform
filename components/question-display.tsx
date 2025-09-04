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
    <div className="flex justify-between items-center text-sm">
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          question.difficulty === "easy"
            ? "bg-green-100 text-green-800"
            : question.difficulty === "medium"
            ? "bg-yellow-100 text-yellow-800"
            : "bg-red-100 text-red-800"
        }`}
      >
        {question.difficulty}
      </span>
      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
        Weight: {question.weight}
      </span>
    </div>
  );

  return (
    <div>
      {categories.map((category, idx) => (
        <div key={idx} className="mb-12">
          <h2 className="text-2xl font-bold mb-8 text-slate-800 border-b border-slate-200 pb-2">
            {category.title}
          </h2>
          {category.questions.map((question) => {
            const answer = answers[question.id] || "";

            switch (question.type) {
              case "yes-no":
                return (
                  <Card
                    key={question.id}
                    className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow"
                  >
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-slate-800 leading-relaxed">
                        {question.question}
                      </CardTitle>
                      <QuestionMeta question={question} />
                    </CardHeader>
                    <Separator className="my-2" />
                    <CardContent className="pt-4">
                      <RadioGroup
                        value={answer}
                        onValueChange={(val) =>
                          handleAnswerChange(question.id, val)
                        }
                        className="flex space-x-6"
                      >
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem
                            value="Yes"
                            id={`yes-${question.id}`}
                            className="border-slate-300"
                          />
                          <Label
                            htmlFor={`yes-${question.id}`}
                            className="text-slate-700 font-medium cursor-pointer"
                          >
                            Yes
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem
                            value="No"
                            id={`no-${question.id}`}
                            className="border-slate-300"
                          />
                          <Label
                            htmlFor={`no-${question.id}`}
                            className="text-slate-700 font-medium cursor-pointer"
                          >
                            No
                          </Label>
                        </div>
                      </RadioGroup>
                    </CardContent>
                  </Card>
                );

              case "multiple-choice-single":
                return (
                  <Card
                    key={question.id}
                    className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow"
                  >
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-slate-800 leading-relaxed">
                        {question.question}
                      </CardTitle>
                      <QuestionMeta question={question} />
                    </CardHeader>
                    <Separator className="my-2" />
                    <CardContent className="pt-4">
                      <RadioGroup
                        value={answer}
                        onValueChange={(val) =>
                          handleAnswerChange(question.id, val)
                        }
                        className="space-y-3"
                      >
                        {question.options?.map((option, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <RadioGroupItem
                              value={option}
                              id={`option-${question.id}-${index}`}
                              className="border-slate-300"
                            />
                            <Label
                              htmlFor={`option-${question.id}-${index}`}
                              className="text-slate-700 cursor-pointer flex-1"
                            >
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
                  <Card
                    key={question.id}
                    className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow"
                  >
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-slate-800 leading-relaxed">
                        {question.question}
                      </CardTitle>
                      <QuestionMeta question={question} />
                    </CardHeader>
                    <Separator className="my-2" />
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        {question.options?.map((option, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
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
                              className="border-slate-300"
                            />
                            <Label
                              htmlFor={`checkbox-${question.id}-${index}`}
                              className="text-slate-700 cursor-pointer flex-1"
                            >
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
                  <Card
                    key={question.id}
                    className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow"
                  >
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-slate-800 leading-relaxed">
                        {question.question}
                      </CardTitle>
                      <QuestionMeta question={question} />
                    </CardHeader>
                    <Separator className="my-2" />
                    <CardContent className="pt-4">
                      <div className="space-y-6">
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
                        <div className="flex justify-between text-sm text-slate-600">
                          <span className="font-medium">1</span>
                          <span className="bg-blue-100 px-3 py-1 rounded-full text-blue-800 font-medium">
                            Current: {answer || "5"}
                          </span>
                          <span className="font-medium">10</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );

              case "rating":
                return (
                  <Card
                    key={question.id}
                    className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow"
                  >
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-slate-800 leading-relaxed">
                        {question.question}
                      </CardTitle>
                      <QuestionMeta question={question} />
                    </CardHeader>
                    <Separator className="my-2" />
                    <CardContent className="pt-4">
                      <div className="space-y-6">
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
                        <div className="flex justify-between text-sm text-slate-600">
                          <span className="font-medium">1</span>
                          <span className="bg-green-100 px-3 py-1 rounded-full text-green-800 font-medium">
                            Current: {answer || "3"}
                          </span>
                          <span className="font-medium">5</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );

              default:
                return (
                  <Card
                    key={question.id}
                    className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow"
                  >
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-slate-800 leading-relaxed">
                        {question.question}
                      </CardTitle>
                      <QuestionMeta question={question} />
                    </CardHeader>
                    <Separator className="my-2" />
                    <CardContent className="pt-4">
                      <Textarea
                        placeholder="Enter your answer..."
                        value={answer}
                        onChange={(e) =>
                          handleAnswerChange(question.id, e.target.value)
                        }
                        className="min-h-[100px] border-slate-300 focus:border-blue-500 focus:ring-blue-500"
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
