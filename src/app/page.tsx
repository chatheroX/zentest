'use client';

import { useState } from 'react';
import type React from 'react';
import CalculatorDisplay from '@/components/calculator-display';
import Keypad from '@/components/keypad';

const MAX_INPUT_LENGTH = 15;

export default function SimpleCalcPage() {
  const [currentInput, setCurrentInput] = useState<string>('0');
  const [previousInput, setPreviousInput] = useState<string | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [shouldResetDisplay, setShouldResetDisplay] = useState<boolean>(true); // True if next number should clear currentInput

  const formatNumberForDisplay = (numStr: string): string => {
    if (numStr === "Error" || numStr === "Infinity" || numStr === "-Infinity" || numStr === "NaN") return "Error";
    const num = parseFloat(numStr);
    if (isNaN(num)) return "Error"; // Should not happen if input is validated

    // Limit precision for display
    let formatted = String(num);
    if (formatted.length > MAX_INPUT_LENGTH) {
      if (Math.abs(num) > 1e10 || (Math.abs(num) < 1e-5 && Math.abs(num) > 0)) { // Use exponential for very large/small
        formatted = num.toExponential(MAX_INPUT_LENGTH - 6); // -6 for "e+NN" part
      } else { // Trim decimals
        const decimalPointIndex = formatted.indexOf('.');
        if (decimalPointIndex !== -1) {
          formatted = formatted.substring(0, MAX_INPUT_LENGTH);
        }
      }
    }
    // Ensure it does not exceed max length again after potential formatting
    return formatted.length > MAX_INPUT_LENGTH ? "Error" : formatted;
  };


  const calculate = () => {
    if (!previousInput || !operator || currentInput === "Error") {
      return;
    }

    const prev = parseFloat(previousInput);
    const curr = parseFloat(currentInput);

    if (isNaN(prev) || isNaN(curr)) {
      setCurrentInput("Error");
      setPreviousInput(null);
      setOperator(null);
      setShouldResetDisplay(true);
      return;
    }

    let result: number;
    switch (operator) {
      case '+':
        result = prev + curr;
        break;
      case '-':
        result = prev - curr;
        break;
      case '*':
        result = prev * curr;
        break;
      case '/':
        if (curr === 0) {
          setCurrentInput('Error');
          setPreviousInput(null);
          setOperator(null);
          setShouldResetDisplay(true);
          return;
        }
        result = prev / curr;
        break;
      default:
        return;
    }
    
    const resultStr = formatNumberForDisplay(String(result));
    setCurrentInput(resultStr);
    setPreviousInput(null); // Keep previousInput as null after equals
    setOperator(null); // Clear operator
    setShouldResetDisplay(true);
  };

  const handleNumberClick = (num: string) => {
    if (currentInput === "Error") {
       setCurrentInput(num);
       setShouldResetDisplay(false);
       return;
    }
    if (shouldResetDisplay) {
      setCurrentInput(num);
      setShouldResetDisplay(false);
    } else {
      if (currentInput.length < MAX_INPUT_LENGTH) {
        setCurrentInput(currentInput === '0' ? num : currentInput + num);
      }
    }
  };

  const handleDecimalClick = () => {
    if (currentInput === "Error") {
      setCurrentInput("0.");
      setShouldResetDisplay(false);
      return;
    }
    if (shouldResetDisplay) {
      setCurrentInput('0.');
      setShouldResetDisplay(false);
    } else if (!currentInput.includes('.')) {
       if (currentInput.length < MAX_INPUT_LENGTH -1) { // -1 to allow for the dot
         setCurrentInput(currentInput + '.');
       }
    }
  };

  const handleOperatorClick = (op: string) => {
    if (currentInput === "Error") return;

    if (previousInput && operator && !shouldResetDisplay) {
      // If there's already a previousInput, an operator, and currentInput is a new operand
      // (e.g. 5 + 3, then user presses another operator like '*')
      // Calculate the intermediate result first.
      calculate(); 
      // After calculate, currentInput holds the result. We want this to be the new previousInput.
      // Operator will be set after this block.
      // Need to ensure `calculate` doesn't reset `previousInput` if we intend to chain.
      // For this simple calculator, `calculate` sets previousInput to null.
      // So, we use the currentInput (which is result) as the new previousInput.
      setPreviousInput(currentInput); // currentInput is the result of the previous operation
    } else if (currentInput !== "Error") {
      // This is the first operator, or an operator after equals/clear
      setPreviousInput(currentInput);
    }
    
    setOperator(op);
    setShouldResetDisplay(true); // Ready for next operand
  };

  const handleEqualsClick = () => {
    if (currentInput === "Error") return;
    calculate();
  };

  const handleClearClick = () => {
    setCurrentInput('0');
    setPreviousInput(null);
    setOperator(null);
    setShouldResetDisplay(true);
  };

  const expressionString = () => {
    if (currentInput === "Error") return "";
    if (operator && previousInput) {
      if (shouldResetDisplay) { // Operator just pressed, waiting for second operand
        return `${formatNumberForDisplay(previousInput)} ${operator}`;
      }
      // Displaying full expression while typing second operand or after equals if we decide to show it
      // For now, previous logic shows only previousInput + operator
      return `${formatNumberForDisplay(previousInput)} ${operator}`;
    }
    return "";
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-xs p-6 space-y-6 rounded-xl shadow-2xl bg-card">
        <h1 className="text-3xl font-bold text-center text-primary">SimpleCalc</h1>
        <CalculatorDisplay value={formatNumberForDisplay(currentInput)} expression={expressionString()} />
        <Keypad
          onNumberClick={handleNumberClick}
          onOperatorClick={handleOperatorClick}
          onEqualsClick={handleEqualsClick}
          onClearClick={handleClearClick}
          onDecimalClick={handleDecimalClick}
        />
      </div>
    </main>
  );
}
