# AI Agent Cost Optimization Proposal for Revii AI

**Author:** Paul Ng

**For:** Tom Ferry International Engineering Leadership

**Date:** March 2026

---

## Executive Summary

Revii AI is scaling from thousands to hundreds of thousands of real estate agents. Without intelligent cost management, LLM API costs will grow linearly with users, reaching **$1.7M+/year at 100K users** if every request hits GPT-4o.

This proposal presents a **3-layer cost optimization strategy** that can reduce AI infrastructure costs by **90%** while maintaining response quality. At 100K users, this translates to **$1.5M+ annual savings**. The implementation requires 2-3 sprints and pays for itself within the first month.

---

## The Problem: Linear Cost Scaling

Current architecture (estimated):
```
Every user request → GPT-4o API → Response
```

| Users    | Monthly Requests | Monthly Cost (GPT-4o only) | Annual Cost  |
|----------|-----------------|---------------------------|--------------|
| 5,000    | 325,000         | ~$7,110                   | ~$85,320     |
| 100,000  | 6,500,000       | ~$142,200                 | ~$1,706,400  |
| 500,000  | 32,500,000      | ~$711,000                 | ~$8,532,000  |

This doesn't scale. We need cost to grow **sub-linearly** with users.

---

## The Solution: 3-Layer Optimization

### Layer 1: Intelligent Model Routing (saves 30-40%)

Not every task needs GPT-4o. We will define when to deploy the right tool.

| Task Complexity | Examples | Routed Model | Cost vs GPT-4o |
|----------------|---------|-------------|----------------|
| **High** | Roleplay scoring, complex coaching | Gemini 2.5 Pro | 67% cheaper, 92% quality |
| **Medium** | Content generation, market summaries | GPT-4o Mini | 97% cheaper, 82% quality |
| **Low** | FAQ, classification, simple chat | Gemini 2.0 Flash | 97% cheaper, 80% quality |

**Implementation:**
1. Build a task classifier (can be rule based logic initially, ML later)
2. Route requests to the optimal model based on complexity and user tier
3. Premium coaching members always get GPT-4o for high-complexity tasks
4. A/B test quality between models with automated scoring

**Code pattern:**
```javascript
function routeRequest(task, userTier) {
  const complexity = classifyTask(task);

  if (userTier === 'premium' && complexity === 'high')
    return 'gpt-4o';         // Best for paying customers

  if (complexity === 'high')
    return 'gemini-pro';      // Great quality, lower cost

  if (complexity === 'medium')
    return 'gpt-4o-mini';    // Fast and cheap

  return 'gemini-flash';      // Fastest, cheapest
}
```

### Layer 2: Response Caching (saves 15-25%)

Many agents ask the same questions. "How's the market?" "What do I say when they object to commission?" so these don't need fresh LLM calls.

| Content Type | Cache TTL | Expected Hit Rate | Rationale |
|-------------|-----------|-------------------|-----------|
| Coaching FAQ | 7 days | 70% | Stable content, high reuse |
| Market data | 4 hours | 65% | Updates frequently, but many agents ask same questions |
| Content templates | 24 hours | 40% | Template-based, moderate reuse |
| Roleplay feedback | Never cache | 0% | Always unique per session |
| Admin automation | 1 hour | 30% | Somewhat unique tasks |

**Implementation:**
1. Redis cache layer with content type-aware TTL
2. Semantic similarity matching (not just exact match) if a query is 90%+ similar to a cached response, serve the cache
3. Cache warming: pre-generate responses for top 100 FAQ questions
4. Cache invalidation triggers when coaching content or market data updates

**Infrastructure:** Redis (already likely in stack) and simple middleware layer.

### Layer 3: Prompt Optimization (saves 10-15%)

Most prompts are bloated. Every unnecessary token costs money at scale.

| Optimization | Before | After | Token Savings |
|-------------|--------|-------|---------------|
| Move scoring rubric to RAG | 2,500 tokens/call | 800 tokens/call | 68% |
| Pre-summarize market data | 1,800 tokens/call | 400 tokens/call | 78% |
| Use cached prefixes (OpenAI feature) | N/A | Reuse system prompt | 50% on input |
| Structured output format | Verbose JSON | Compact schema | 30% on output |

**Key techniques:**
- **RAG-based context injection:** Instead of putting everything in the system prompt, retrieve only relevant content via vector search
- **Prompt compression:** Remove redundant instructions, use concise formatting
- **OpenAI cached prefixes:** For system prompts that don't change, use the prefix caching feature (50% discount on cached input tokens)
- **Structured outputs:** Define JSON schema for responses to reduce unnecessary tokens

---

## Combined Impact

### At Current Scale (5,000 users)

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| Monthly cost | $7,110 | $730 | $6,380 (90%) |
| Annual cost | $85,320 | $8,760 | $76,560 |

### At Target Scale (100,000 users)

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| Monthly cost | $142,200 | $14,601 | $127,599 (90%) |
| Annual cost | $1,706,400 | $175,212 | **$1,531,188** |

### At Full Scale (500,000 users)

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| Monthly cost | $711,000 | $73,007 | $637,993 (90%) |
| Annual cost | $8,532,000 | $876,084 | **$7,655,916** |

---

## Implementation Roadmap

### Sprint 1: Model Routing (Week 1-2)
- [ ] Build task complexity classifier
- [ ] Implement model routing middleware
- [ ] Add A/B testing framework for quality comparison
- [ ] Set up cost tracking dashboard
- **Expected savings: 30-40% immediately**

### Sprint 2: Response Caching (Week 3-4)
- [ ] Deploy Redis cache layer with content-type TTL
- [ ] Implement semantic similarity matching for cache lookups
- [ ] Cache warming for top 100 FAQ questions
- [ ] Build cache hit rate monitoring
- **Expected additional savings: 15-25%**

### Sprint 3: Prompt Optimization (Week 5-6)
- [ ] Audit and compress all system prompts
- [ ] Migrate static context to RAG retrieval
- [ ] Implement OpenAI cached prefix for system prompts
- [ ] Switch to structured output schemas
- **Expected additional savings: 10-15%**

### Ongoing: Quality Monitoring
- [ ] Automated quality scoring on 5% sample of responses
- [ ] Weekly model performance review
- [ ] User satisfaction tracking (thumbs up/down on responses)
- [ ] Instant fallback to GPT-4o if quality drops below threshold

---

## Quality Safeguards

Cost optimization is worthless if quality drops. Here's how we protect quality:

1. **A/B Testing Framework:** 10% of requests always go to GPT-4o as baseline. Compare quality scores across models weekly.

2. **Automated Quality Scoring:** LLM-as-judge evaluates 5% of responses on relevance, accuracy, and helpfulness.

3. **User Feedback Loop:** Thumbs up/down on every response. Alert if satisfaction drops below 4.5/5 for any model.

4. **Instant Fallback:** If any model's quality score drops below threshold, automatically route to GPT-4o until investigated.

5. **Premium User Protection:** Coaching members (highest-value customers) always get the best model for critical tasks.

---

## Team & Skills Required

| Role | Responsibility | Sprints |
|------|---------------|---------|
| Team Lead (me) | Architecture, model routing design, quality framework | All 3 |
| Senior Backend Engineer | Redis caching, API middleware, monitoring | Sprint 2-3 |
| AI/ML Engineer | Prompt optimization, RAG pipeline, evaluation | Sprint 1, 3 |

Total engineering investment: **~6 person-weeks**
ROI at 100K users: **$127K/month savings**, payback in < 1 week of savings.

---

## Why This Matters for Tom Ferry

1. **Profitable scaling:** Without this, scaling to 500K agents means $8.5M/year in API costs. With it: $876K. That's a $7.6M/year difference.

2. **Faster responses:** Model routing + caching = 56% lower latency. Users get faster answers = better experience = higher retention.

3. **Competitive moat:** Most competitors just throw GPT-4o at everything. Intelligent routing is a technical advantage that compounds over time.

4. **Premium differentiation:** "Free users get great AI. Coaching members get the best AI." — natural upsell path that aligns cost with revenue.

---

*This proposal demonstrates the kind of technical leadership thinking I bring as a Team Lead: not just writing code, but making strategic decisions that impact the business at scale.*
