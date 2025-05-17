import type React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Minus, X, Divide } from 'lucide-react';

interface KeypadProps {
  onNumberClick: (number: string) => void;
  onOperatorClick: (operator: string) => void;
  onEqualsClick: () => void;
  onClearClick: () => void;
  onDecimalClick: () => void;
}

const Keypad: React.FC<KeypadProps> = ({
  onNumberClick,
  onOperatorClick,
  onEqualsClick,
  onClearClick,
  onDecimalClick,
}) => {
  const buttonClassName = "p-4 text-xl h-16 shadow-md hover:shadow-lg transition-shadow";

  return (
    <div className="grid grid-cols-4 gap-2">
      <Button
        variant="outline"
        onClick={onClearClick}
        className={`${buttonClassName} col-span-2`}
        aria-label="Clear"
      >
        C
      </Button>
      <Button
        variant="accent"
        onClick={() => onOperatorClick('/')}
        className={buttonClassName}
        aria-label="Divide"
      >
        <Divide size={24} />
      </Button>
      <Button
        variant="accent"
        onClick={() => onOperatorClick('*')}
        className={buttonClassName}
        aria-label="Multiply"
      >
        <X size={24} />
      </Button>

      {['7', '8', '9'].map((num) => (
        <Button
          key={num}
          variant="secondary"
          onClick={() => onNumberClick(num)}
          className={buttonClassName}
        >
          {num}
        </Button>
      ))}
      <Button
        variant="accent"
        onClick={() => onOperatorClick('-')}
        className={buttonClassName}
        aria-label="Subtract"
      >
        <Minus size={24} />
      </Button>

      {['4', '5', '6'].map((num) => (
        <Button
          key={num}
          variant="secondary"
          onClick={() => onNumberClick(num)}
          className={buttonClassName}
        >
          {num}
        </Button>
      ))}
      <Button
        variant="accent"
        onClick={() => onOperatorClick('+')}
        className={buttonClassName}
        aria-label="Add"
      >
        <Plus size={24} />
      </Button>

      {['1', '2', '3'].map((num) => (
        <Button
          key={num}
          variant="secondary"
          onClick={() => onNumberClick(num)}
          className={buttonClassName}
        >
          {num}
        </Button>
      ))}
       <Button
        variant="default"
        onClick={onEqualsClick}
        className={`${buttonClassName} row-span-2`}
        aria-label="Equals"
      >
        =
      </Button>

      <Button
        variant="secondary"
        onClick={() => onNumberClick('0')}
        className={`${buttonClassName} col-span-2`}
      >
        0
      </Button>
      <Button
        variant="secondary"
        onClick={onDecimalClick}
        className={buttonClassName}
        aria-label="Decimal point"
      >
        .
      </Button>
    </div>
  );
};

export default Keypad;
