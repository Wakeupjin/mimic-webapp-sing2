# Word Quiz Difficulty Implementation Guide

## Overview
This document explains how to implement difficulty modes for the word quiz feature. The difficulty feature was explored but not implemented in the current version. This guide preserves the design for future implementation.

## Current Implementation (No Difficulty)
- Single-word buttons (e.g., `["Clay,", "you", "back", "here?"]`)
- 10 word buttons per question
- Simple click-to-start overlay
- All users get the same experience

## Proposed Difficulty System

### Difficulty Levels

#### Level 1: Easy (Default - Current Implementation)
- **Chunk size**: 1 word per button
- **Example**: "Clay, you back here?" → 4 buttons
  - Button 1: `Clay,`
  - Button 2: `you`
  - Button 3: `back`
  - Button 4: `here?`
- **Challenge**: Arrange individual words in correct order

#### Level 2: Medium
- **Chunk size**: 2 words per button
- **Example**: "Clay, you back here?" → 2 buttons
  - Button 1: `Clay, you`
  - Button 2: `back here?`
- **Challenge**: Arrange 2-word phrases in correct order

#### Level 3: Hard (Needs Redesign)
**Problem**: 3-word chunks aren't challenging enough
- Current approach: 3 words per button is too easy
- Better alternatives:
  1. **Full sentence ordering** - Arrange complete sentences
  2. **Fewer buttons** - Only 6 buttons instead of 10
  3. **Remove visual hints** - Hide some UI assistance
  4. **Mixed difficulty** - Combine sentence structure challenges

## Implementation Details

### 1. Add Difficulty Parameter
```typescript
const difficulty = parseInt(searchParams.get('difficulty') || '1', 10);
const [selectedDifficulty, setSelectedDifficulty] = useState(difficulty);
```

### 2. Create Chunk Helper Function
```typescript
const createChunks = (wordArray: string[], chunkSize: number): string[] => {
  if (chunkSize === 1) return wordArray;

  const chunks: string[] = [];
  for (let i = 0; i < wordArray.length; i += chunkSize) {
    const chunk = wordArray.slice(i, i + chunkSize).join(' ');
    chunks.push(chunk);
  }
  return chunks;
};
```

### 3. Update Question Generation
```typescript
const generateQuestion = () => {
  // ... existing code ...

  const chunkSize = selectedDifficulty;
  const words = createChunks(filteredWords, chunkSize);

  // Also apply chunking to distractor words
  const lineChunks = createChunks(lineWords, chunkSize);
  otherWords.push(...lineChunks);
};
```

### 4. Add Difficulty Selection UI

#### Option A: Click-to-Start Overlay (Recommended)
```tsx
{showStartOverlay && (
  <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
    <div className="text-center">
      <div className="text-white text-3xl font-bold mb-8">
        Choose Difficulty
      </div>
      <div className="flex gap-6 justify-center">
        <button onClick={() => handleStart(1)}>Easy</button>
        <button onClick={() => handleStart(2)}>Medium</button>
        <button onClick={() => handleStart(3)}>Hard</button>
      </div>
    </div>
  </div>
)}
```

#### Option B: Header Dropdown
```tsx
<select
  value={selectedDifficulty}
  onChange={(e) => setSelectedDifficulty(parseInt(e.target.value))}
>
  <option value={1}>Easy</option>
  <option value={2}>Medium</option>
  <option value={3}>Hard</option>
</select>
```

#### Option C: URL Parameter (No UI)
```
/sing2/word?id=001:1&difficulty=1  // Easy
/sing2/word?id=001:1&difficulty=2  // Medium
/sing2/word?id=001:1&difficulty=3  // Hard
```

### 5. Update handleStart Function
```typescript
const handleStart = (chosenDifficulty: number) => {
  setSelectedDifficulty(chosenDifficulty);
  setShowStartOverlay(false);
  setIsStarted(true);

  // Regenerate question with new difficulty
  setTimeout(() => {
    generateQuestion();
    setTimeout(() => {
      setPlayNonce(1);
      playVideo();
    }, 100);
  }, 200);
};
```

## Recommendations for Future Implementation

### Hard Mode Redesign Options

#### Option 1: Full Sentence Ordering (Best for Hard Mode)
- Show 3-5 complete sentences from the lesson
- User arranges them in the order they appear in the video
- More challenging and tests comprehension, not just word order

#### Option 2: Adaptive Difficulty
- Start at Easy
- Automatically increase difficulty based on performance
- If user gets 3 in a row correct, bump to Medium
- If user gets 2 wrong, drop to Easy

#### Option 3: Time Pressure
- Easy: Unlimited time
- Medium: 30 seconds per question
- Hard: 20 seconds per question

#### Option 4: Reduced Hints
- Easy: 10 buttons (current)
- Medium: 8 buttons (fewer distractors)
- Hard: 6 buttons (minimal distractors)

### Progressive Implementation Plan

1. **Phase 1**: Implement Easy/Medium (1-word and 2-word chunks)
2. **Phase 2**: Test with users to validate Medium difficulty
3. **Phase 3**: Design and implement proper Hard mode based on feedback
4. **Phase 4**: Add difficulty selection UI
5. **Phase 5**: Save user preference in localStorage

## Testing URLs

Once implemented, test with these URLs:

```
http://localhost:3003/sing2/word?id=001:1&difficulty=1
http://localhost:3003/sing2/word?id=001:1&difficulty=2
http://localhost:3003/sing2/word?id=001:1&difficulty=3
```

## Notes

- Current implementation only supports Easy mode (1 word per button)
- Difficulty selection was removed because Hard mode (3-word chunks) wasn't challenging enough
- Future implementation should focus on making Hard mode genuinely difficult
- Consider user testing before implementing difficulty modes
- Difficulty preference should persist across sessions (localStorage)

## Files to Modify

When implementing difficulty modes:

1. `/app/sing2/word/page.tsx` - Main word quiz component
2. `/app/components/WordCompleteButtons.tsx` - May need difficulty in navigation
3. `/docs/word-difficulty-implementation.md` - Update this document with learnings

## Related Features

- Guessing mode also has multi-question structure
- Mimicking mode has progressive difficulty through 8 steps
- Consider consistency across all three modes

---

**Last Updated**: 2025-10-09
**Status**: Not Implemented (Design Complete)
**Reason for Removal**: Hard mode (3-word chunks) wasn't challenging enough
