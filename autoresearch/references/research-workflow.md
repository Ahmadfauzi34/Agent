# Research Workflow — /autoresearch:research

Autonomous internet browsing and research engine. Executes targeted internet searches, fetches relevant documentation, synthesizes findings, and grounds architectural decisions in up-to-date external knowledge.

**Core idea:** Define goal → Generate search queries → Fetch web content → Synthesize knowledge → Apply to local codebase → Output report.

## Trigger

- User invokes `/autoresearch:research`
- User says "search the internet", "research this topic", "find documentation online", "what are the latest updates on"
- User wants to ground their code or architecture in external knowledge (e.g., "research the latest optimizations for SIMD in Rust").
- Chained from another autoresearch tool via `--chain research`

## Loop Support

```
# Unlimited — keep researching until satisfactory knowledge is gathered
/autoresearch:research
Goal: Find the best patterns for Write-Ahead Logs in Rust

# Bounded — exactly N research rounds
/autoresearch:research
Iterations: 5
Topic: State of the art MCTS optimizations
```

## PREREQUISITE: Interactive Setup (when invoked without full context)

**CRITICAL — BLOCKING PREREQUISITE:** If `/autoresearch:research` is invoked without a clear Goal or Topic, you MUST use `AskUserQuestion` to gather context BEFORE proceeding to ANY phase. DO NOT jump to Phase 1 without completing interactive setup.

1. **Question 1 (Goal/Topic):** "What specific topic or problem do you want to research on the internet?"
2. **Question 2 (Scope):** "Are there any specific domains, libraries, or frameworks I should focus the search on?"
3. **Question 3 (Outcome):** "What is the desired output of this research? (e.g., a summary report, code examples, architectural recommendations)"

---

## The Workflow Protocol

When executing the Research workflow, follow these phases strictly.

### Phase 1: Setup & Query Generation
1. Analyze the user's Goal/Topic.
2. Formulate 3-5 distinct, highly targeted search queries designed to yield high-quality technical documentation, academic papers, or expert discussions.
3. Establish the evaluation criteria for the gathered knowledge (e.g., "Must pertain to Rust," "Must address performance").
**Output:** `✓ Phase 1: Setup — Generated [N] search queries for topic: [Topic]`

### Phase 2: Browsing & Fetching
1. Execute the search queries using the available internet search tools (e.g., `google_search` or similar capabilities if available in the environment).
2. Fetch the text content of the most promising URLs (e.g., using `view_text_website`).
3. If a URL fails or returns irrelevant content, discard it and move to the next.
**Output:** `✓ Phase 2: Browsing — Fetched content from [N] sources`

### Phase 3: Synthesis & Verification
1. Cross-reference the fetched information across multiple sources to verify accuracy.
2. Filter out outdated or irrelevant information.
3. Synthesize the raw text into structured knowledge (e.g., Best Practices, Known Issues, Code Patterns).
**Output:** `✓ Phase 3: Synthesis — Extracted [N] key findings`

### Phase 4: Application & Reporting
1. Relate the synthesized knowledge directly back to the user's local codebase or initial problem statement. How does this research solve their specific issue?
2. Generate a comprehensive markdown report (`research-report.md`) containing:
   - Executive Summary
   - Key Findings & Sources (URLs)
   - Code/Architecture Recommendations
   - Potential Pitfalls
**Output:** `✓ Phase 4: Reporting — Report saved to research-report.md`

### Phase 5: Handoff (Optional)
If chained (`--chain plan`, `--chain fix`), write the summary of the research into `handoff.json` so the next tool can immediately use the external knowledge.
