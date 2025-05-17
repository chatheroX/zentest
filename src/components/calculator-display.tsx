import type React from 'react';

interface CalculatorDisplayProps {
  value: string;
  expression: string;
}

const CalculatorDisplay: React.FC<CalculatorDisplayProps> = ({ value, expression }) => {
  return (
    <div className="bg-muted p-4 rounded-md shadow-inner min-h-[6rem] flex flex-col justify-end text-right break-all">
      <div 
        className="text-muted-foreground text-sm h-6 truncate"
        aria-label="Calculation expression"
      >
        {expression}
      </div>
      <div 
        className="text-foreground text-4xl font-bold h-10"
        aria-label="Current input or result"
      >
        {value}
      </div>
    </div>
  );
};

export default CalculatorDisplay;
