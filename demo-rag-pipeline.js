/**
 * Demo 2: RAG Pipeline for Real Estate Knowledge Retrieval
 * PRODUCTION VERSION - Calls OpenAI GPT-4o with retrieved context
 *
 * Architecture:
 * 1. Simulated vector search retrieves relevant documents
 * 2. Context injected into GPT-4o prompt
 * 3. Grounded responses with source citations
 * 4. Response caching to reduce repeat query costs
 */

import 'dotenv/config';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================
// KNOWLEDGE BASE - Simulated embeddings store
// ============================================================

const KNOWLEDGE_BASE = {
  coaching_scripts: [
    {
      id: "script_001",
      category: "expired_listing",
      title: "Tom Ferry Expired Listing Opening Script",
      content: `Hi [Name], this is [Agent] with [Brokerage]. I'm calling because I noticed your home at [Address] just came back on the market. I know that can be frustrating - especially after investing time and energy into the listing process. I'm not calling to tell you what went wrong. I'm calling because I specialize in selling homes that other agents couldn't, and I'd love to show you my specific plan. Would [Day] at [Time] work for a quick 15-minute meeting?`,
      metadata: { type: "script", scenario: "expired_listing", effectiveness_rating: 4.8 }
    },
    {
      id: "script_002",
      category: "fsbo",
      title: "FSBO Value Proposition Script",
      content: `I respect your decision to sell on your own - it shows you're resourceful. What I've found working with hundreds of sellers in [Area] is that professional pricing strategy and marketing typically nets 8-12% more for the seller, even after commission. The Zestimate says [Price], but based on recent comparable sales, I believe your home could command [Higher Price]. Would it be worth 15 minutes to see the data?`,
      metadata: { type: "script", scenario: "fsbo", effectiveness_rating: 4.6 }
    },
    {
      id: "script_003",
      category: "objection_handling",
      title: "Commission Objection Response",
      content: `I understand - commission is a real investment. Here's how I think about it: my job isn't just to find a buyer. It's to find you the RIGHT buyer at the HIGHEST price with the BEST terms. Last month, I negotiated $23,000 above asking for a home on [Street] by creating a competitive offer situation. My commission was $18,000. That's a net gain of $5,000 you wouldn't have had otherwise. Let me show you my track record.`,
      metadata: { type: "script", scenario: "commission_objection", effectiveness_rating: 4.9 }
    }
  ],

  market_data: [
    {
      id: "market_001",
      category: "market_trends",
      title: "Q1 2026 National Housing Market Summary",
      content: `Median home price: $412,000 (+3.2% YoY). Inventory up 8% from Q4 2025. Average days on market: 34. Mortgage rates: 6.1% (30-year fixed). Buyer demand index: 72/100 (moderate-strong). Key trend: Move-up buyers are the most active segment as starter home equity has grown 15% since 2024.`,
      metadata: { type: "market_data", region: "national", quarter: "Q1_2026" }
    },
    {
      id: "market_002",
      category: "market_trends",
      title: "Orange County CA Market Report - March 2026",
      content: `Median price: $1.05M (+4.1% YoY). Active listings: 2,847 (-12% from Feb). Average DOM: 22 days. Multiple offer rate: 38%. Luxury segment ($2M+): 45 days DOM. Most active price band: $700K-$900K. Cash offers: 28% of transactions. Key insight: Tech layoff wave ending, buyer confidence returning in Irvine/Costa Mesa corridors.`,
      metadata: { type: "market_data", region: "orange_county_ca", quarter: "Q1_2026" }
    }
  ],

  coaching_methodology: [
    {
      id: "method_001",
      category: "coaching",
      title: "Tom Ferry's One Thing Framework",
      content: `The most successful agents focus on ONE thing per quarter. Not 10 goals - ONE transformative goal. If your listing appointments are strong but prospecting is weak, your ONE THING is: '25 conversations per day for 90 days.' Track it daily. Review weekly. The compounding effect is massive - most agents see a 40-60% increase in production within one quarter.`,
      metadata: { type: "methodology", topic: "goal_setting" }
    },
    {
      id: "method_002",
      category: "coaching",
      title: "The 3-3-3 Prospecting Method",
      content: `Every morning before 11am: 3 calls to past clients, 3 calls to your sphere, 3 calls to new leads. That's 9 conversations. In 5 business days, that's 45 conversations. In a month, 180. At a 3% conversion rate, that's 5-6 new appointments per month. The key: do it FIRST thing. Before emails, before social media, before 'getting ready to get ready.'`,
      metadata: { type: "methodology", topic: "prospecting" }
    }
  ]
};

// ============================================================
// SIMULATED VECTOR SEARCH (in production: pgvector/Pinecone)
// ============================================================

function semanticSearch(query, topK = 3) {
  const allDocs = [
    ...KNOWLEDGE_BASE.coaching_scripts,
    ...KNOWLEDGE_BASE.market_data,
    ...KNOWLEDGE_BASE.coaching_methodology
  ];

  const queryLower = query.toLowerCase();
  const scored = allDocs.map(doc => {
    const contentLower = (doc.title + " " + doc.content + " " + doc.category).toLowerCase();
    let score = 0;
    const queryWords = queryLower.split(/\s+/);
    queryWords.forEach(word => {
      if (word.length > 3 && contentLower.includes(word)) score += 1;
    });
    return { ...doc, relevance_score: score };
  });

  return scored
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, topK)
    .filter(d => d.relevance_score > 0);
}

// ============================================================
// RAG-AUGMENTED LLM CALL
// ============================================================

async function queryWithRAG(userQuery, retrievedDocs) {
  const contextBlock = retrievedDocs.map((doc, i) =>
    `[Source ${i + 1}: ${doc.title}]\n${doc.content}`
  ).join("\n\n");

  const systemPrompt = `You are Revii AI, Tom Ferry's AI coaching assistant for real estate professionals.

IMPORTANT RULES:
1. ONLY use information from the provided context. Do not make up statistics or scripts.
2. If the context doesn't contain enough information, say so honestly.
3. Always cite which source you're referencing using [Source N] format.
4. Match Tom Ferry's coaching style: direct, high-energy, actionable.
5. End every response with a specific ACTION STEP the agent can take TODAY.
6. Keep responses concise but impactful - no fluff.

RETRIEVED CONTEXT:
${contextBlock}`;

  const startTime = Date.now();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userQuery }
    ],
    temperature: 0.4,
    max_tokens: 500
  });

  const latency = Date.now() - startTime;
  const usage = response.usage;
  const cost = (usage.prompt_tokens / 1000 * 0.005) + (usage.completion_tokens / 1000 * 0.015);

  return {
    content: response.choices[0].message.content,
    latency,
    tokens: { input: usage.prompt_tokens, output: usage.completion_tokens, total: usage.total_tokens },
    cost
  };
}

// ============================================================
// RESPONSE CACHE
// ============================================================

const responseCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;

function getCachedResponse(query) {
  const normalized = query.toLowerCase().trim();
  const cached = responseCache.get(normalized);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { hit: true, ...cached };
  }
  return { hit: false };
}

function setCachedResponse(query, data) {
  const normalized = query.toLowerCase().trim();
  responseCache.set(normalized, { ...data, timestamp: Date.now() });
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("=".repeat(60));
  console.log("REVII AI - RAG PIPELINE FOR REAL ESTATE KNOWLEDGE");
  console.log("Powered by GPT-4o | Production Mode");
  console.log("=".repeat(60));

  const queries = [
    "How do I handle an expired listing call? Give me a script.",
    "What's the current market like in Orange County?",
    "A seller says my commission is too high. What do I say?",
    "What's Tom Ferry's prospecting method?"
  ];

  const results = [];
  let totalCost = 0;
  let totalTokens = 0;

  for (const [idx, query] of queries.entries()) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`QUERY ${idx + 1}: "${query}"`);
    console.log("─".repeat(60));

    // Step 1: Check cache
    const cached = getCachedResponse(query);
    if (cached.hit) {
      console.log(`\n[CACHE HIT] Saved $${cached.cost.toFixed(4)} in API costs`);
      console.log(`\n${cached.content}`);
      results.push({ query, cached: true, cost: 0, tokens: 0, latency: 0, sources: cached.sources });
      continue;
    }

    // Step 2: Semantic search
    const searchStart = Date.now();
    const docs = semanticSearch(query, 3);
    const searchLatency = Date.now() - searchStart;

    console.log(`\n[RETRIEVAL] Found ${docs.length} documents in ${searchLatency}ms:`);
    docs.forEach((doc, i) => {
      console.log(`  ${i + 1}. ${doc.title} (relevance: ${doc.relevance_score})`);
    });

    // Step 3: Call GPT-4o with RAG context
    try {
      const result = await queryWithRAG(query, docs);

      console.log(`[LLM] Response in ${result.latency}ms | ${result.tokens.total} tokens | $${result.cost.toFixed(4)}`);
      console.log(`\n${result.content}`);

      totalCost += result.cost;
      totalTokens += result.tokens.total;

      const sourceNames = docs.map(d => d.title);
      results.push({ query, cached: false, ...result, sources: sourceNames });

      // Cache the response
      setCachedResponse(query, { content: result.content, cost: result.cost, sources: sourceNames });

    } catch (error) {
      console.error(`[ERROR] ${error.message}`);
      results.push({ query, cached: false, error: error.message });
    }
  }

  // Now test cache by re-running first query
  console.log(`\n${"─".repeat(60)}`);
  console.log(`QUERY 5 (CACHE TEST): "${queries[0]}"`);
  console.log("─".repeat(60));

  const cacheTest = getCachedResponse(queries[0]);
  if (cacheTest.hit) {
    console.log(`\n[CACHE HIT] Saved $${cacheTest.cost.toFixed(4)} - no API call needed`);
    console.log(`Response served from cache instantly.`);
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("RAG PIPELINE METRICS (PRODUCTION)");
  console.log("=".repeat(60));
  console.log(`\n  Model: GPT-4o`);
  console.log(`  Queries processed: ${queries.length} (+ 1 cache test)`);
  console.log(`  Total tokens used: ${totalTokens.toLocaleString()}`);
  console.log(`  Total API cost: $${totalCost.toFixed(4)}`);
  console.log(`  Avg cost per query: $${(totalCost / queries.length).toFixed(4)}`);
  console.log(`  Avg latency: ${Math.round(results.filter(r => !r.cached && !r.error).reduce((sum, r) => sum + r.latency, 0) / results.filter(r => !r.cached && !r.error).length)}ms`);
  console.log(`  Cache entries: ${responseCache.size}`);
  console.log(`  Knowledge base docs: ${
    KNOWLEDGE_BASE.coaching_scripts.length +
    KNOWLEDGE_BASE.market_data.length +
    KNOWLEDGE_BASE.coaching_methodology.length
  }`);

  console.log(`\n  Per-query breakdown:`);
  console.log("  " + "─".repeat(56));
  console.log(`  ${"Query".padEnd(30)} ${"Tokens".padEnd(8)} ${"Cost".padEnd(10)} Latency`);
  console.log("  " + "─".repeat(56));
  results.forEach(r => {
    const name = r.query.substring(0, 28).padEnd(30);
    if (r.cached) {
      console.log(`  ${name} ${"0".padEnd(8)} ${"$0.0000".padEnd(10)} CACHED`);
    } else if (r.error) {
      console.log(`  ${name} ${"ERROR".padEnd(8)}`);
    } else {
      console.log(`  ${name} ${String(r.tokens.total).padEnd(8)} $${r.cost.toFixed(4).padEnd(9)} ${r.latency}ms`);
    }
  });
}

main();
