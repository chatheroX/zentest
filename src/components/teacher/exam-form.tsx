
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PlusCircle, Trash2, Upload, Brain, Save, FileText, Settings2, CalendarDays, Clock, CheckCircle, Loader2, CalendarIcon, AlertTriangle, ListChecks } from 'lucide-react'; // Added ListChecks
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from "@/lib/utils";
import type { Question, QuestionOption, ExamStatus } from '@/types/supabase';
import { format, parseISO, isValid as isValidDate, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export interface ExamFormData {
  title: string;
  description: string;
  duration: number;
  allowBacktracking: boolean;
  questions: Question[];
  startTime: Date | null;
  endTime: Date | null;
  status: ExamStatus; 
  exam_id?: string; 
  exam_code?: string;
}

interface ExamFormProps {
  initialData?: ExamFormData;
  onSave: (data: ExamFormData) => Promise<{ success: boolean; error?: string; examId?: string }>;
  isEditing?: boolean;
}

export function ExamForm({ initialData, onSave, isEditing = false }: ExamFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);
  const [allowBacktracking, setAllowBacktracking] = useState(true);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [startTimeStr, setStartTimeStr] = useState("09:00"); // Default start time
  const [endTimeStr, setEndTimeStr] = useState("17:00");   // Default end time

  const [questions, setQuestions] = useState<Question[]>([]);
  
  const [currentQuestionText, setCurrentQuestionText] = useState('');
  const [currentOptions, setCurrentOptions] = useState<QuestionOption[]>(
    Array.from({ length: 4 }, (_, i) => ({ id: `opt-new-${i}-${Date.now()}`, text: '' }))
  );
  const [currentCorrectOptionId, setCurrentCorrectOptionId] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setDuration(initialData.duration || 60);
      setAllowBacktracking(initialData.allowBacktracking !== undefined ? initialData.allowBacktracking : true);
      setQuestions(initialData.questions || []);
      
      const initialStartTimeObj = initialData.startTime ? (typeof initialData.startTime === 'string' ? parseISO(initialData.startTime) : initialData.startTime) : null;
      const initialEndTimeObj = initialData.endTime ? (typeof initialData.endTime === 'string' ? parseISO(initialData.endTime) : initialData.endTime) : null;

      if (initialStartTimeObj && isValidDate(initialStartTimeObj)) {
        setStartTime(initialStartTimeObj);
        setStartTimeStr(format(initialStartTimeObj, "HH:mm"));
      } else {
        setStartTime(null);
        setStartTimeStr("09:00");
      }
      if (initialEndTimeObj && isValidDate(initialEndTimeObj)) {
        setEndTime(initialEndTimeObj);
        setEndTimeStr(format(initialEndTimeObj, "HH:mm"));
      } else {
        setEndTime(null);
        setEndTimeStr("17:00");
      }
    }
  }, [initialData]);

  const handleDateTimeChange = (date: Date | undefined, type: 'start' | 'end', timeStr: string) => {
    if (!date) {
      if (type === 'start') setStartTime(null);
      else setEndTime(null);
      return;
    }

    const [hours, minutes] = timeStr.split(':').map(Number);
    let newDateTime = new Date(date);
    newDateTime = setHours(newDateTime, hours);
    newDateTime = setMinutes(newDateTime, minutes);
    newDateTime = setSeconds(newDateTime, 0);
    newDateTime = setMilliseconds(newDateTime, 0);

    if (type === 'start') {
      setStartTime(newDateTime);
      if (endTime && newDateTime >= endTime) {
        setEndTime(null); // Clear end time if it's no longer valid
        setEndTimeStr(format(new Date(newDateTime.getTime() + 60 * 60 * 1000), "HH:mm")); // Default to 1 hour later
        toast({ title: "Time Adjusted", description: "End time was adjusted as it was before the new start time.", variant: "default" });
      }
    } else {
      setEndTime(newDateTime);
    }
  };

  const handleTimeChange = (timeValue: string, type: 'start' | 'end') => {
    let targetDate = type === 'start' ? startTime : endTime;
    if (!targetDate) { // If date part is not set, use today as a base for time setting
        targetDate = new Date();
    }
    
    if (type === 'start') setStartTimeStr(timeValue);
    else setEndTimeStr(timeValue);

    handleDateTimeChange(new Date(targetDate), type, timeValue);
  };


  const resetOptionIdsAndText = (): QuestionOption[] => {
    return Array.from({ length: 4 }, (_, i) => ({ id: `opt-new-${i}-${Date.now() + i}`, text: '' }));
  };

  // Helper for unique option IDs
  let optionIdCounter = 0; 
  const generateOptionId = () => `opt-gen-${optionIdCounter++}-${Date.now()}`;

  const handleAddQuestion = useCallback(() => {
    if (!currentQuestionText.trim()) {
      toast({ title: "Incomplete Question", description: "Please fill in the question text.", variant: "destructive" });
      return;
    }
    const filledOptions = currentOptions.filter(opt => opt.text.trim() !== '');
    if (filledOptions.length < 2) {
      toast({ title: "Not Enough Options", description: "Please provide at least two options.", variant: "destructive" });
      return;
    }
    
    const isCorrectOptionAmongFilled = filledOptions.some(opt => opt.id === currentCorrectOptionId);
    if (!currentCorrectOptionId || !isCorrectOptionAmongFilled) {
      toast({ title: "No Correct Answer", description: "Please select a valid correct answer from the provided options.", variant: "destructive" });
      return;
    }

    const newOptionsWithUniqueIds = filledOptions.map(opt => ({
      ...opt,
      id: generateOptionId() 
    }));

    const originalCorrectOptionObject = filledOptions.find(opt => opt.id === currentCorrectOptionId);
    const newCorrectOptionInArray = newOptionsWithUniqueIds.find(opt => opt.text === originalCorrectOptionObject?.text); // Match by text
    const finalCorrectOptionId = newCorrectOptionInArray ? newCorrectOptionInArray.id : '';

    if (!finalCorrectOptionId) {
        toast({ title: "Error Adding Question", description: "Could not map correct option. Please try again.", variant: "destructive" });
        return;
    }

    const newQuestion: Question = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, 
      text: currentQuestionText,
      options: newOptionsWithUniqueIds,
      correctOptionId: finalCorrectOptionId,
    };
    setQuestions(prevQuestions => [...prevQuestions, newQuestion]);
    
    setCurrentQuestionText('');
    setCurrentOptions(resetOptionIdsAndText());
    setCurrentCorrectOptionId('');
    toast({ description: "Question added to list below." });
  }, [currentQuestionText, currentOptions, currentCorrectOptionId, toast]);
  

  const handleRemoveQuestion = useCallback((id: string) => {
    setQuestions(prevQuestions => prevQuestions.filter(q => q.id !== id));
    toast({ description: "Question removed." });
  }, [toast]);

  const handleOptionChange = useCallback((index: number, value: string) => {
    setCurrentOptions(prevOptions => {
      const newOptions = [...prevOptions];
      newOptions[index] = { ...newOptions[index], text: value };
      return newOptions;
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Missing Title", description: "Exam title is required.", variant: "destructive" });
      return;
    }
    if (duration <= 0) {
      toast({ title: "Invalid Duration", description: "Duration must be greater than 0 minutes.", variant: "destructive" });
      return;
    }
     if (!startTime || !endTime) {
      toast({ title: "Scheduling Required", description: "Published exams must have both a start and end time.", variant: "destructive" });
      return;
    }
    if (startTime >= endTime) {
      toast({ title: "Invalid Dates", description: "Start time must be before end time.", variant: "destructive" });
      return;
    }
    if (questions.length === 0) {
       toast({ title: "No Questions", description: "Please add at least one question to the exam.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const examFormData: ExamFormData = {
      exam_id: initialData?.exam_id,
      title,
      description,
      duration,
      allowBacktracking,
      questions,
      startTime,
      endTime,
      status: 'Published', 
      exam_code: initialData?.exam_code,
    };

    const result = await onSave(examFormData);

    if (result.success && result.examId) {
      toast({ title: "Success!", description: `Exam ${isEditing ? 'updated' : 'created'} successfully.` });
      router.push(`/teacher/dashboard/exams/${result.examId}/details`);
    } else {
      toast({ title: "Error", description: result.error || `Failed to ${isEditing ? 'update' : 'create'} exam.`, variant: "destructive" });
    }
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="w-full modern-card">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            {isEditing ? <Edit className="h-6 w-6 text-primary" /> : <PlusCircle className="h-6 w-6 text-primary" />}
            {isEditing ? `Edit Exam: ${initialData?.title || ''}` : 'Create New Exam'}
          </CardTitle>
          <CardDescription>
            {isEditing ? 'Modify the details of your existing exam.' : 'Fill in the details to create a new exam. All exams created/edited here will be "Published".'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <section className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <h3 className="text-lg font-medium flex items-center gap-2 text-foreground"><FileText className="h-5 w-5 text-primary" /> Basic Information</h3>
            <div className="space-y-2">
              <Label htmlFor="examTitle">Exam Title</Label>
              <Input id="examTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Final Year Mathematics" required className="modern-input"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="examDescription">Description (Optional)</Label>
              <Textarea id="examDescription" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A brief overview of the exam content and instructions." className="modern-input"/>
            </div>
          </section>

          <section className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <h3 className="text-lg font-medium flex items-center gap-2 text-foreground"><Settings2 className="h-5 w-5 text-primary" /> Exam Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="examDuration" className="flex items-center gap-1"><Clock className="h-4 w-4" /> Duration (minutes)</Label>
                <Input id="examDuration" type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} min="1" required className="modern-input"/>
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch id="allowBacktracking" checked={allowBacktracking} onCheckedChange={setAllowBacktracking} />
                <Label htmlFor="allowBacktracking">Allow Backtracking</Label>
              </div>
            </div>
            <Alert variant="default" className="mt-2 bg-primary/10 border-primary/20 text-primary/90">
                <AlertTriangle className="inline h-4 w-4 mr-1 text-primary" />
                <AlertTitle className="font-semibold">Important Scheduling Note</AlertTitle>
                <AlertDescription>
                    Exams created or edited here are automatically set to &quot;Published&quot; status. 
                    Accurate start and end times are mandatory for students to access the exam.
                </AlertDescription>
             </Alert>

            <div className="space-y-2 mt-4">
              <Label className="flex items-center gap-1 font-medium text-foreground"><CalendarDays className="h-4 w-4 text-primary" /> Scheduling (Required)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="startTimeDate">Start Date & Time</Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal modern-input", // Added modern-input
                            !startTime && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startTime ? format(startTime, "PPP") : <span>Pick start date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-card border-border shadow-lg">
                        <Calendar
                          mode="single"
                          selected={startTime ?? undefined}
                          onSelect={(date) => handleDateTimeChange(date, 'start', startTimeStr)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Input 
                        type="time" 
                        value={startTimeStr}
                        onChange={(e) => handleTimeChange(e.target.value, 'start')}
                        className="w-[120px] modern-input" 
                        required
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="endTimeDate">End Date & Time</Label>
                   <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal modern-input", // Added modern-input
                            !endTime && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endTime ? format(endTime, "PPP") : <span>Pick end date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-card border-border shadow-lg">
                        <Calendar
                          mode="single"
                          selected={endTime ?? undefined}
                          onSelect={(date) => handleDateTimeChange(date, 'end', endTimeStr)}
                          initialFocus
                          disabled={(date) => startTime ? date < startTime : false}
                        />
                      </PopoverContent>
                    </Popover>
                     <Input 
                        type="time" 
                        value={endTimeStr}
                        onChange={(e) => handleTimeChange(e.target.value, 'end')}
                        className="w-[120px] modern-input"
                        required
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <h3 className="text-lg font-medium flex items-center gap-2 text-foreground"><ListChecks className="h-5 w-5 text-primary" /> Manage Questions ({questions.length} added)</h3>
            <div className="flex flex-wrap gap-2 my-4">
              <Button type="button" variant="outline" disabled className="btn-outline-subtle">
                <Upload className="mr-2 h-4 w-4" /> Upload CSV (Soon)
              </Button>
              <Button type="button" variant="outline" asChild className="btn-outline-subtle">
                <Link href="/teacher/dashboard/ai-assistant" target="_blank">
                  <Brain className="mr-2 h-4 w-4" /> Use AI Assistant
                </Link>
              </Button>
            </div>

            <Card className="bg-background shadow-sm">
              <CardHeader>
                <CardTitle className="text-md font-semibold text-foreground">Add New Question Manually</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="questionText">Question Text</Label>
                  <Textarea id="questionText" value={currentQuestionText} onChange={(e) => setCurrentQuestionText(e.target.value)} placeholder="Enter the question" className="modern-input"/>
                </div>
                <div>
                  <Label>Options & Correct Answer (Provide at least 2 options)</Label>
                  <RadioGroup value={currentCorrectOptionId} onValueChange={setCurrentCorrectOptionId} className="mt-2 space-y-2">
                    {currentOptions.map((opt, index) => (
                      <div key={opt.id} className="flex items-center gap-2 p-2 border rounded-md bg-background/50 hover:bg-accent/10 has-[[data-state=checked]]:bg-primary/10 has-[[data-state=checked]]:border-primary">
                        <RadioGroupItem value={opt.id} id={opt.id} />
                        <Label htmlFor={opt.id} className="sr-only">Select Option {index + 1} as correct</Label>
                        <Input
                          value={opt.text}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          className="flex-grow modern-input"
                        />
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="button" onClick={handleAddQuestion} size="sm" className="btn-primary-solid">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add This Question
                </Button>
              </CardFooter>
            </Card>

            {questions.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="font-semibold text-foreground">Added Questions:</h4>
                <ul className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {questions.map((q, index) => (
                    <li key={q.id} className="p-3 border rounded-md bg-background shadow-sm flex justify-between items-start">
                      <div>
                        <p className="font-medium text-foreground">{index + 1}. {q.text}</p>
                        <ul className="list-none text-sm text-muted-foreground pl-4 space-y-1">
                          {q.options.map((opt) => (
                            <li key={opt.id} className={cn("flex items-center gap-2", opt.id === q.correctOptionId ? 'text-green-600 font-semibold' : '')}>
                              {opt.id === q.correctOptionId && <CheckCircle className="h-4 w-4 text-green-600" />}
                              <span>{opt.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveQuestion(q.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 p-6 border-t">
          <Button type="button" variant="outline" onClick={() => router.back()} className="btn-outline-subtle">Cancel</Button>
          <Button type="submit" disabled={isLoading} className="btn-gradient">
            {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
            {isLoading ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Exam')}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
