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
import { Input } from "@/components/ui/input";
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
  weight: number; // ✅ added weight
  scale?: string;
}

interface UserAnswer {
  questionId: string;
  answer: string;
}

export function QuestionDisplay({
  question,
  onAnswerChange,
}: {
  question: Question;
  onAnswerChange: (questionId: string, answer: string) => void;
}) {
  const [answer, setAnswer] = useState<string>("");

  const handleAnswerChange = (value: string) => {
    setAnswer(value);
    onAnswerChange(question.id, value);
  };

  // ✅ Helper to show meta info consistently
  const QuestionMeta = () => (
    <CardDescription className="flex justify-between text-sm text-muted-foreground">
      <span>Difficulty: {question.difficulty}</span>
      <span>Weight: {question.weight}</span>
    </CardDescription>
  );

  switch (question.type) {
    case "yes-no":
      return (
        <Card className="mb-8 shadow-md border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {question.question}
            </CardTitle>
            <QuestionMeta />
          </CardHeader>
          <Separator className="my-2" />
          <CardContent>
            <RadioGroup
              value={answer}
              onValueChange={handleAnswerChange}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Yes" id={`yes-${question.id}`} />
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
        <Card className="mb-8 shadow-md border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {question.question}
            </CardTitle>
            <QuestionMeta />
          </CardHeader>
          <Separator className="my-2" />
          <CardContent>
            <RadioGroup value={answer} onValueChange={handleAnswerChange}>
              {question.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      );

    case "multiple-choice-multi":
      return (
        <Card className="mb-8 shadow-md border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {question.question}
            </CardTitle>
            <QuestionMeta />
          </CardHeader>
          <Separator className="my-2" />
          <CardContent>
            <div className="space-y-2">
              {question.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`checkbox-${index}`}
                    onCheckedChange={(checked: boolean) => {
                      if (checked) {
                        const newAnswer = answer
                          ? `${answer},${option}`
                          : option;
                        handleAnswerChange(newAnswer);
                      } else {
                        const answers = answer
                          .split(",")
                          .filter((a) => a !== option);
                        handleAnswerChange(answers.join(","));
                      }
                    }}
                  />
                  <Label htmlFor={`checkbox-${index}`}>{option}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );

    case "scale":
      return (
        <Card className="mb-8 shadow-md border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {question.question}
            </CardTitle>
            <QuestionMeta />
          </CardHeader>
          <Separator className="my-2" />
          <CardContent>
            <div className="space-y-4">
              <Slider
                min={1}
                max={10}
                step={1}
                value={[parseInt(answer) || 5]}
                onValueChange={(value: number[]) =>
                  handleAnswerChange(value[0].toString())
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
        <Card className="mb-8 shadow-md border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {question.question}
            </CardTitle>
            <QuestionMeta />
          </CardHeader>
          <Separator className="my-2" />
          <CardContent>
            <div className="space-y-4">
              <Slider
                min={1}
                max={5}
                step={1}
                value={[parseInt(answer) || 3]}
                onValueChange={(value: number[]) =>
                  handleAnswerChange(value[0].toString())
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
        <Card className="mb-8 shadow-md border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {question.question}
            </CardTitle>
            <QuestionMeta />
          </CardHeader>
          <Separator className="my-2" />
          <CardContent>
            <Textarea
              placeholder="Enter your answer..."
              value={answer}
              onChange={(e) => handleAnswerChange(e.target.value)}
            />
          </CardContent>
        </Card>
      );
  }
}
