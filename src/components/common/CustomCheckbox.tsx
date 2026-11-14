import React from 'react';
import { Check } from 'lucide-react';

export interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  ariaLabel?: string;
  className?: string;
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  checked,
  onChange,
  disabled = false,
  id,
  name,
  ariaLabel,
  className = '',
}) => {
  return (
    <span className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={e => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-orange-500 ${
          disabled
            ? checked
              ? 'bg-orange-300 border-orange-300 text-white cursor-not-allowed'
              : 'bg-gray-100 border-gray-200 text-transparent cursor-not-allowed'
            : checked
            ? 'bg-orange-500 border-orange-500 text-white cursor-pointer'
            : 'bg-white border-gray-300 hover:border-orange-400 text-transparent cursor-pointer'
        }`}
      >
        <Check size={12} strokeWidth={3} className={checked ? 'opacity-100' : 'opacity-0'} />
      </span>
    </span>
  );
};

export default CustomCheckbox;
