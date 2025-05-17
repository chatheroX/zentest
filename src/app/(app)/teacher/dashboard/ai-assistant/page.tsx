import { QuestionGenerator } from '@/components/teacher/question-generator';

export default function AiAssistantPage() {
  return (
    <div className="space-y-6">
      {/* The h1 and any surrounding text could be part of QuestionGenerator or here */}
      {/* <h1 className="text-3xl font-bold">AI Question Assistant</h1> */}
      <QuestionGenerator />
    </div>
  );
}

export const metadata = {
  title: 'AI Question Assistant | Teacher Dashboard | ProctorPrep',
};
