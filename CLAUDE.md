# Claude Code Instructions for This Project

## CRITICAL: Debugging and Bug Fix Policy

### Strictly Prohibited: Ad-hoc Fixes Based on Speculation

When debugging issues, the following workflow is **MANDATORY**:

1. **NEVER attempt fixes based on speculation or possibility**
   - Do not make changes based on "this might be the cause" or "possibly"
   - Do not propose multiple potential fixes hoping one will work

2. **Root cause identification MUST come first**
   - Add logging/debugging code to trace actual execution flow
   - Verify assumptions with concrete evidence
   - Identify the exact line(s) where behavior diverges from expectation

3. **Only after confirmed root cause, propose a fix**
   - The fix must directly address the identified root cause
   - Explain why the fix resolves the issue based on the evidence gathered

### Debugging Steps (Required Order)

1. **Reproduce**: Understand the exact steps to reproduce the issue
2. **Analyze**: Fully explain the user's reported phenomenon through code analysis
   - The explanation must account for **ALL** observed behaviors reported by the user
   - If the analysis cannot explain any part of the phenomenon, continue investigating
   - Do NOT proceed to hypothesis until the phenomenon is fully understood
3. **Hypothesize**: Form a hypothesis about what might be wrong
4. **Verify**: Add logging or use debugging tools to verify the hypothesis
5. **Confirm**: Only proceed with a fix when you have concrete evidence
6. **Fix**: Apply a targeted fix that addresses the confirmed root cause
7. **Validate**: Confirm the fix resolves the issue

### Critical Rule: Complete Phenomenon Explanation

Before attempting ANY fix, you MUST be able to fully explain the user's described phenomenon:
- What code path causes the observed behavior?
- Why does it happen in that specific order?
- What conditions trigger this behavior?

If you cannot answer these questions with certainty based on code analysis, you are NOT ready to propose a fix. Continue investigation instead.

### Example of What NOT to Do

```
❌ "The issue might be caused by X, let me try changing Y"
❌ "This could be a timing issue, let me add a setTimeout"
❌ "Perhaps the state isn't updating correctly, let me switch to useRef"
```

### Example of Correct Approach

```
✅ "Let me add console.log to trace the value of X at points A, B, and C"
✅ "The logs show X is 'foo' at point A but 'bar' at point B, which confirms the issue is in function Z"
✅ "Based on this evidence, the fix is to..."
```

## Project-Specific Notes

- This is a Next.js project with Japanese vertical text (縦書き) support
- The BookReader functionality is modularized into:
  - `src/components/BookReader.tsx` - Main component
  - `src/components/reader/` - Sub-components (ReaderHeader, ReaderContent, PageNavigation)
  - `src/hooks/` - Custom hooks (useBookProgress, useTouchNavigation, useMouseNavigation, etc.)
  - `src/lib/reader/` - Utilities and constants
- See `docs/VERTICAL_MODE_SPEC.md` for vertical mode scroll behavior specification

## Development Environment

- The development server is managed by the user and runs at http://localhost:3000
- DO NOT attempt to start, stop, or restart the development server
- The user will handle all development server operations

## Version Management

- The app version is displayed on the About page (`src/app/about/page.tsx`)
- **Before each commit**, increment the version number in the About page
- Current format: `DeusLibri {t.about.version} X.XX`
- Increment the minor version (e.g., 0.11 → 0.12) for regular changes
