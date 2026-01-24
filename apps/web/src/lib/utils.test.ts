import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility function', () => {
  // Happy Path Tests
  describe('merging class names', () => {
    it('merges multiple string class names', () => {
      const result = cn('class1', 'class2', 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('merges Tailwind utility classes', () => {
      const result = cn('px-4', 'py-2', 'bg-blue-500');
      expect(result).toBe('px-4 py-2 bg-blue-500');
    });

    it('handles single class name', () => {
      const result = cn('single-class');
      expect(result).toBe('single-class');
    });

    it('handles empty arguments', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('handles conditional classes with boolean', () => {
      const isActive = true;
      const result = cn('base-class', isActive && 'active-class');
      expect(result).toBe('base-class active-class');
    });

    it('handles conditional classes with false', () => {
      const isActive = false;
      const result = cn('base-class', isActive && 'active-class');
      expect(result).toBe('base-class');
    });

    it('handles object notation', () => {
      const result = cn({
        'class-a': true,
        'class-b': false,
        'class-c': true,
      });
      expect(result).toBe('class-a class-c');
    });

    it('handles array of class names', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('handles nested arrays', () => {
      const result = cn(['class1', ['class2', 'class3']]);
      expect(result).toBe('class1 class2 class3');
    });
  });

  describe('Tailwind merge functionality', () => {
    it('resolves conflicting padding classes', () => {
      const result = cn('p-4', 'p-8');
      expect(result).toBe('p-8');
    });

    it('resolves conflicting margin classes', () => {
      const result = cn('m-2', 'm-4');
      expect(result).toBe('m-4');
    });

    it('resolves conflicting background colors', () => {
      const result = cn('bg-red-500', 'bg-blue-500');
      expect(result).toBe('bg-blue-500');
    });

    it('resolves conflicting text colors', () => {
      const result = cn('text-gray-500', 'text-white');
      expect(result).toBe('text-white');
    });

    it('keeps non-conflicting classes', () => {
      const result = cn('px-4', 'py-2', 'bg-blue-500', 'text-white');
      expect(result).toBe('px-4 py-2 bg-blue-500 text-white');
    });

    it('resolves conflicting display classes', () => {
      const result = cn('block', 'hidden');
      expect(result).toBe('hidden');
    });

    it('resolves conflicting flex direction classes', () => {
      const result = cn('flex-row', 'flex-col');
      expect(result).toBe('flex-col');
    });

    it('resolves conflicting width classes', () => {
      const result = cn('w-full', 'w-1/2');
      expect(result).toBe('w-1/2');
    });

    it('resolves conflicting height classes', () => {
      const result = cn('h-10', 'h-20');
      expect(result).toBe('h-20');
    });

    it('handles responsive modifiers correctly', () => {
      const result = cn('md:p-4', 'lg:p-8');
      expect(result).toBe('md:p-4 lg:p-8');
    });

    it('resolves same responsive modifier conflicts', () => {
      const result = cn('md:p-4', 'md:p-8');
      expect(result).toBe('md:p-8');
    });
  });

  // Unhappy Path Tests
  describe('edge cases', () => {
    it('handles null values', () => {
      const result = cn('class1', null, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('handles undefined values', () => {
      const result = cn('class1', undefined, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('handles empty strings', () => {
      const result = cn('class1', '', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('handles false values', () => {
      const result = cn('class1', false, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('handles zero (number)', () => {
      const result = cn('class1', 0, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('handles mixed falsy values', () => {
      const result = cn('class1', null, undefined, '', false, 0, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('handles all falsy values', () => {
      const result = cn(null, undefined, '', false, 0);
      expect(result).toBe('');
    });

    it('handles whitespace-only strings', () => {
      const result = cn('class1', '   ', 'class2');
      // clsx trims whitespace strings, twMerge handles remaining
      expect(result).toBe('class1 class2');
    });

    it('handles classes with extra spaces', () => {
      const result = cn('class1   class2', 'class3');
      // Should normalize spaces
      expect(result).toContain('class1');
      expect(result).toContain('class2');
      expect(result).toContain('class3');
    });

    it('handles empty object', () => {
      const result = cn({});
      expect(result).toBe('');
    });

    it('handles empty array', () => {
      const result = cn([]);
      expect(result).toBe('');
    });

    it('handles deeply nested empty arrays', () => {
      const result = cn([[[], []]]);
      expect(result).toBe('');
    });

    it('handles object with all false values', () => {
      const result = cn({
        'class-a': false,
        'class-b': false,
      });
      expect(result).toBe('');
    });

    it('handles complex mixed input', () => {
      const isVisible = true;
      const isActive = false;
      const result = cn(
        'base',
        ['array-class'],
        { 'obj-true': true, 'obj-false': false },
        isVisible && 'visible',
        isActive && 'active',
        null,
        undefined
      );
      expect(result).toBe('base array-class obj-true visible');
    });
  });
});
