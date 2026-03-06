'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionItem {
  id: string;
  category: string;
  question: string;
}

interface AccordionProps {
  items: AccordionItem[];
  categoryLabels: Record<string, string>;
}

const categoryColors: Record<string, string> = {
  marketing: 'border-gold/40 bg-gold/5',
  translation: 'border-blue-500/40 bg-blue-500/5',
  performance: 'border-green-500/40 bg-green-500/5',
  ai_landscape: 'border-purple-500/40 bg-purple-500/5',
};

const categoryTextColors: Record<string, string> = {
  marketing: 'text-gold',
  translation: 'text-blue-400',
  performance: 'text-green-400',
  ai_landscape: 'text-purple-400',
};

export function ResearchAccordion({ items, categoryLabels }: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const grouped = items.reduce<Record<string, AccordionItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([category, questions]) => (
        <div key={category}>
          <h4
            className={`text-sm tracking-[0.2em] uppercase mb-4 ${categoryTextColors[category] ?? 'text-gold'}`}
          >
            {categoryLabels[category] ?? category}
          </h4>
          <div className="space-y-2">
            {questions.map((q) => {
              const isOpen = openId === q.id;
              return (
                <button
                  key={q.id}
                  onClick={() => setOpenId(isOpen ? null : q.id)}
                  className={`w-full text-left p-4 rounded border transition-all duration-300 ${
                    isOpen
                      ? categoryColors[category] ?? 'border-border-gold bg-surface'
                      : 'border-border bg-surface/50 hover:border-border-gold'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span
                        className={`text-xs font-mono mt-0.5 ${categoryTextColors[category] ?? 'text-gold'}`}
                      >
                        {q.id}
                      </span>
                      <span className="text-cream/90 text-sm leading-relaxed">
                        {q.question}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-muted shrink-0 mt-0.5 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
