'use server';

/**
 * @fileOverview An AI assistant for teachers to generate exam questions based on a topic.
 *
 * - generateExamQuestions - A function that handles the exam question generation process.
 * - GenerateExamQuestionsInput - The input type for the generateExamQuestions function.
 * - GenerateExamQuestionsOutput - The return type for the generateExamQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateExamQuestionsInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate exam questions.'),
  numQuestions: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe('The number of questions to generate.'),
  difficulty: z
    .enum(['easy', 'medium', 'hard'])
    .default('medium')
    .describe('The difficulty level of the questions.'),
});

export type GenerateExamQuestionsInput = z.infer<typeof GenerateExamQuestionsInputSchema>;

const GenerateExamQuestionsOutputSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().describe('The generated exam question.'),
      answer: z.string().describe('The answer to the generated question.'),
    })
  ),
});

export type GenerateExamQuestionsOutput = z.infer<typeof GenerateExamQuestionsOutputSchema>;

export async function generateExamQuestions(input: GenerateExamQuestionsInput): Promise<GenerateExamQuestionsOutput> {
  return generateExamQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateExamQuestionsPrompt',
  input: {schema: GenerateExamQuestionsInputSchema},
  output: {schema: GenerateExamQuestionsOutputSchema},
  prompt: `You are an AI assistant that helps teachers generate exam questions.

  Generate {{numQuestions}} questions about {{topic}} with {{difficulty}} difficulty.

  Make sure to include an answer for each question.

  The output should be a JSON object with a 'questions' field that is an array of objects, where each object has a 'question' and an 'answer' field.

  Example:
  {
    "questions": [
      {
        "question": "What is the capital of France?",
        "answer": "Paris"
      },
      {
        "question": "What is the highest mountain in the world?",
        "answer": "Mount Everest"
      }
    ]
  }`,
});

const generateExamQuestionsFlow = ai.defineFlow(
  {
    name: 'generateExamQuestionsFlow',
    inputSchema: GenerateExamQuestionsInputSchema,
    outputSchema: GenerateExamQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
