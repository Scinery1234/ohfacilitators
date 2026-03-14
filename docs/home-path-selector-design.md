# Home Page Path Selector — Design Rationale

## Problem
Visitors need to choose between six distinct intents:
- **Find:** Attend an event | Check out a space | Find a facilitator
- **Share:** I have a space | Host an event | Share my gift as a facilitator

Presenting all six options at once can cause **choice overload** (Hick's Law: decision time increases with number of options) and confusion about whether they're in "find" or "share" mode.

## Research-Informed Approach

### 1. Binary first choice (Hick's Law)
- Start with **two paths**: "I'm looking for something" vs "I have something to share"
- Reduces cognitive load; users self-identify as guest or provider first
- Aligns with Airbnb/Meetup/Thumbtack pattern: separate guest vs host/seller experiences

### 2. Progressive disclosure
- After the binary choice, **reveal 3 sub-options** under each path
- Users see only relevant options; no need to parse 6 ungrouped choices
- Follows Nielsen Norman Group: "show only essential options initially"

### 3. Role-based visual distinction
- **Find path:** Neutral stone/gray styling; search icon
- **Share path:** Warm accent (primary-200); plus/add icon
- Reinforces which mode the user is in and reduces mis-clicks

### 4. Clear labeling
- **Find:** "Attend an event" | "Check out a space" | "Find a facilitator"
- **Share:** "I have a space" | "I want to host an event" | "I want to share my gift as a facilitator"
- First-person "I" language for Share path increases ownership and intent clarity

## Implementation
- Section: **"What brings you here?"** — friendly, open-ended
- Two large cards side-by-side (stack on mobile)
- Each card lists 3 clickable options; each routes to the appropriate page (Explore or Become Host)
- Explore page honors `?type=events` and `?type=spaces` from the path selector
