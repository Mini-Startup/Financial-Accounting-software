'use client';

import { useState, useEffect, useMemo } from 'react';
import { UniversalDropdown, DropdownOption } from './UniversalDropdown';
import { UniversalDatePicker } from './UniversalDatePicker';
import { Calendar, ListFilter } from 'lucide-react';
import { formatDateForInput, formatDateToDDMMYY } from '@/utils/dateUtils';
import { formatExpiryToDDMMMYY } from '@/utils/securityName';
import { apiFetch } from '@/utils/apiClient';

export interface ExpiryDropdownProps {
  value: string;
  onChange: (dateVal: string) => void;
  tradeDate?: string;
  expiryList?: any[];
  disabled?: boolean;
  variant?: 'default' | 'seamless';
  placeholder?: string;
  className?: string;
  onBlur?: () => void;
  id?: string;
}

export function ExpiryDropdown({
  value,
  onChange,
  tradeDate,
  expiryList: externalExpiryList,
  disabled = false,
  variant = 'default',
  placeholder = 'Select Expiry',
  className,
  onBlur,
  id,
}: ExpiryDropdownProps) {
  const [internalList, setInternalList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(!externalExpiryList);
  const [isCustomDate, setIsCustomDate] = useState<boolean>(false);

  // Fetch expiry dates if not provided by parent
  useEffect(() => {
    if (externalExpiryList) {
      setInternalList(externalExpiryList);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const fetchExpiries = async () => {
      try {
        setIsLoading(true);
        const res = await apiFetch('/expiry-dates');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data)) {
            setInternalList(data);
          }
        }
      } catch (err) {
        console.error('Failed to load expiry dates:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchExpiries();
    return () => {
      isMounted = false;
    };
  }, [externalExpiryList]);

  // If value is set to a custom date not in master options, detect it
  useEffect(() => {
    if (!value || isLoading) return;
    const match = internalList.some(
      (exp) => exp.date === value || exp.normalizedDate === value
    );
    if (!match && value !== '') {
      setIsCustomDate(true);
    }
  }, [value, internalList, isLoading]);

  // Formatted master options
  const masterOptions: DropdownOption[] = useMemo(() => {
    const tradeDateNorm = tradeDate ? formatDateForInput(tradeDate) : null;

    return (internalList || [])
      .filter((exp: any) => {
        if (!tradeDateNorm) return true;
        const expDateVal = exp.normalizedDate || exp.date || exp.expiryDate;
        const expNorm = formatDateForInput(expDateVal);
        return Boolean(expNorm && expNorm >= tradeDateNorm);
      })
      .map((exp: any) => {
        const dateVal = exp.date || exp.expiryDate;
        const formatted = formatDateToDDMMYY(dateVal);
        const code = formatExpiryToDDMMMYY(dateVal);
        return {
          value: dateVal,
          label: formatted,
          sublabel: code ? `Exchange Code: ${code}` : undefined,
        };
      });
  }, [internalList, tradeDate]);

  if (isCustomDate) {
    return (
      <div className="space-y-1 w-full">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Custom Date Selected
          </span>
          <button
            type="button"
            onClick={() => {
              setIsCustomDate(false);
              // Pick first valid master date or clear
              if (masterOptions.length > 0) {
                onChange(masterOptions[0].value);
              }
            }}
            className="text-[10px] text-[#2652C8] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <ListFilter className="w-2.5 h-2.5" />
            Choose from Master
          </button>
        </div>
        <UniversalDatePicker
          id={id}
          value={value}
          onChange={(newDate) => {
            onChange(newDate);
            if (onBlur) onBlur();
          }}
          disabled={disabled}
          variant={variant}
          placeholder="DD-MM-YY"
          className={className}
        />
      </div>
    );
  }

  return (
    <UniversalDropdown
      id={id}
      value={value}
      options={masterOptions}
      loading={isLoading}
      disabled={disabled}
      variant={variant}
      placeholder={placeholder}
      className={className}
      onChange={(newVal) => {
        onChange(newVal);
        if (onBlur) onBlur();
      }}
      stickyTopOption={{
        value: '__custom__',
        label: 'Custom Date...',
        sublabel: 'Enter specific date',
        icon: <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
        onClick: () => {
          setIsCustomDate(true);
        },
      }}
    />
  );
}
