
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { generateExamQuestions, GenerateExamQuestionsInput, GenerateExamQuestionsOutput } from '@/ai/flows/generate-exam-questions';
import { useToast } from '@/hooks/use-toast';
import { Brain, Sparkles, Loader2, Lightbulb, ClipboardCopy, ClipboardCheck, HelpCircle, PlusCircle } from 'lucide-react'; // Added HelpCircle, PlusCircle
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Added Alert

export function QuestionGenerator() {
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState<number>(3);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [generatedQuestions, setGeneratedQuestions] = useState<GenerateExamQuestionsOutput['questions'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedStates, setCopiedStates] = useState<boolean[]>([]);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setGeneratedQuestions(null);

    try {
      const input: GenerateExamQuestionsInput = {
        topic,
        numQuestions: Number(numQuestions),
        difficulty,
      };
      const result = await generateExamQuestions(input);
      setGeneratedQuestions(result.questions);
      setCopiedStates(new Array(result.questions.length).fill(false));
      toast({ title: 'Success!', description: `${result.questions.length} questions generated.` });
    } catch (error) {
      console.error('Error generating questions:', error);
      toast({ title: 'Error', description: 'Failed to generate questions. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      const newCopiedStates = [...copiedStates];
      newCopiedStates[index] = true;
      setCopiedStates(newCopiedStates);
      toast({description: "Copied to clipboard!"});
      setTimeout(() => {
        const resetCopiedStates = [...newCopiedStates];
        resetCopiedStates[index] = false;
        setCopiedStates(resetCopiedStates);
      }, 2000);
    }).catch(err => {
      toast({description: "Failed to copy.", variant: "destructive"});
    });
  };


  return (
    <Card className="w-full max-w-2xl mx-auto modern-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Brain className="h-7 w-7 text-primary" /> AI Question Assistant
        </CardTitle>
        <CardDescription>
          Generate exam questions quickly using AI. Just provide a topic, number of questions, and difficulty level.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="topic" className="flex items-center gap-1"><Lightbulb className="h-4 w-4 text-primary/80"/>Topic</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Photosynthesis, World War II, Python Data Types"
              required
              className="modern-input"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numQuestions" className="flex items-center gap-1"><HelpCircle className="h-4 w-4 text-primary/80"/>Number of Questions</Label>
              <Input
                id="numQuestions"
                type="number"
                value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value, 10))}
                min="1"
                max="10"
                required
                className="modern-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="difficulty" className="flex items-center gap-1"><Sparkles className="h-4 w-4 text-primary/80"/>Difficulty Level</Label>
              <Select value={difficulty} onValueChange={(value) => setDifficulty(value as 'easy' | 'medium' | 'hard')}>
                <SelectTrigger id="difficulty" className="modern-input">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border shadow-lg">
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full btn-gradient" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Generate Questions
              </>
            )}
          </Button>
        </CardFooter>
      </form>

      {generatedQuestions && generatedQuestions.length > 0 && (
        <div className="p-6 border-t border-border/30">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
            <Lightbulb className="h-6 w-6 text-yellow-500" /> Generated Questions ({generatedQuestions.length})
          </h3>
          <Accordion type="single" collapsible className="w-full">
            {generatedQuestions.map((q, index) => (
              <AccordionItem value={`item-${index}`} key={index} className="border-border/30">
                <AccordionTrigger className="hover:no-underline text-foreground hover:bg-accent/50 px-4 py-3 rounded-t-md data-[state=open]:bg-accent/50">
                  <span className="text-left flex-1">Question {index + 1}: {q.question.substring(0,50)}{q.question.length > 50 ? '...' : ''}</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 bg-background/50 p-4">
                  <p className="font-medium text-foreground"><strong>Full Question:</strong> {q.question}</p>
                  <p className="text-green-700 dark:text-green-400"><strong>Answer:</strong> {q.answer}</p>
                  <div className="flex justify-end gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleCopyToClipboard(`Question: ${q.question}\nAnswer: ${q.answer}`, index)}
                      className="btn-outline-subtle"
                    >
                      {copiedStates[index] ? <ClipboardCheck className="mr-2 h-4 w-4" /> : <ClipboardCopy className="mr-2 h-4 w-4" />}
                      {copiedStates[index] ? 'Copied!' : 'Copy Q&A'}
                    </Button>
                    <Button size="sm" disabled className="btn-primary-solid opacity-50">
                      <PlusCircle className="mr-2 h-4 w-4" /> Add to Exam (Soon)
                    </Button> 
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
       {!generatedQuestions && !isLoading && (
         <Alert variant="default" className="m-6 border-primary/20 bg-primary/5 text-primary/90">
            <Lightbulb className="h-5 w-5 text-primary" />
            <AlertTitle className="font-semibold">Get Started with AI</AlertTitle>
            <AlertDescription>
              Enter a topic and other details above, then click "Generate Questions" to see the AI in action!
            </AlertDescription>
          </Alert>
       )}
    </Card>
  );
}
