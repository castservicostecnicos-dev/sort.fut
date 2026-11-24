import React, { useId } from 'react';
import { StarRating } from '../types/society';
import { STAR_OPTIONS, formatScore } from '../utils/drawAlgorithm';

interface StarDisplayProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showNumeric?: boolean;
  className?: string;
}

function StarIcon({ fill, sizePx }: { fill: 'full' | 'half' | 'empty'; sizePx: number }) {
  const clipId = useId();
  const starPath =
    'M12 2.25l2.92 5.91 6.53.95-4.72 4.6 1.11 6.5L12 17.14l-5.84 3.07 1.11-6.5-4.72-4.6 6.53-.95L12 2.25z';

  return (
    <svg
      width={sizePx}
      height={sizePx}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      {fill === 'half' && (
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width="12" height="24" />
          </clipPath>
        </defs>
      )}
      <path
        d={starPath}
        className="fill-[#1E2922] stroke-[#3B4C41]"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {fill === 'full' && (
        <path
          d={starPath}
          className="fill-[#FACC15] stroke-[#EAB308]"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      )}
      {fill === 'half' && (
        <path
          d={starPath}
          clipPath={`url(#${clipId})`}
          className="fill-[#FACC15] stroke-[#EAB308]"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function StarDisplay({
  rating,
  size = 'sm',
  showNumeric = true,
  className = '',
}: StarDisplayProps) {
  const sizePx = size === 'lg' ? 20 : size === 'md' ? 17 : 15;

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      aria-label={`Avaliação: ${formatScore(rating)} de 5 estrelas`}
    >
      <div className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const diff = rating - (starIndex - 1);
          const fill: 'full' | 'half' | 'empty' =
            diff >= 1 ? 'full' : diff >= 0.5 ? 'half' : 'empty';
          return <StarIcon key={starIndex} fill={fill} sizePx={sizePx} />;
        })}
      </div>
      {showNumeric && (
        <span className="font-mono text-xs font-semibold text-amber-300 tabular-nums">
          {formatScore(rating)}
        </span>
      )}
    </div>
  );
}

interface StarRatingPickerProps {
  value: StarRating;
  onChange: (value: StarRating) => void;
  label?: string;
}

export function StarRatingPicker({ value, onChange, label }: StarRatingPickerProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        {label && (
          <span className="text-sm font-medium text-[#D5E0D8]">{label}</span>
        )}
        <div className="flex items-center gap-2">
          <StarDisplay rating={value} size="md" showNumeric={false} />
          <span className="font-mono text-base font-bold text-[#FACC15] tabular-nums min-w-[3.5rem] text-right">
            {formatScore(value)} ★
          </span>
        </div>
      </div>

      {/* Tactile 10-step grid for effortless half-star precision on mobile & desktop */}
      <div
        className="grid grid-cols-5 gap-1.5 sm:gap-2"
        role="radiogroup"
        aria-label={label || 'Selecionar estrelas'}
      >
        {STAR_OPTIONS.map((option) => {
          const isSelected = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option)}
              className={`min-h-[44px] px-2 py-2 rounded-lg border text-sm font-mono font-semibold tabular-nums transition-colors flex items-center justify-center gap-1 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                isSelected
                  ? 'bg-[#FACC15]/15 border-[#FACC15] text-[#FACC15]'
                  : 'bg-[#111914] border-white/10 text-[#9FB0A5] hover:border-white/25 hover:text-white'
              }`}
            >
              <span>{formatScore(option)}</span>
              <span className="text-[#FACC15] text-xs" aria-hidden="true">
                ★
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
