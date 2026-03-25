/**
 * Demo 3: AI Agent Cost Optimizer for Revii AI
 * PRODUCTION VERSION - Uses GPT-4o to generate executive analysis
 *
 * Deterministic cost calculations + LLM-powered strategic recommendations.
 * Demonstrates how a Team Lead thinks about scaling AI infrastructure.
 */

import 'dotenv/config';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================
// MODEL ROUTING ENGINE
// ============================================================

const MODELS = {
  "gpt-4o": {
    name: "GPT-4o",
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
    latencyMs: 800,
    quality: 95,
    bestFor: ["complex_reasoning", "roleplay_scoring", "architecture"]
  },
  "gpt-4o-mini": {
    name: "GPT-4o Mini",
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    latencyMs: 300,
    quality: 82,
    bestFor: ["simple_qa", "content_generation", "summarization", "market_news"]
  },
  "gemini-flash": {
    name: "Gemini 2.0 Flash",
    costPer1kInput: 0.0001,
    costPer1kOutput: 0.0004,
    latencyMs: 200,
    quality: 80,
    bestFor: ["classification", "extraction", "simple_chat"]
  },
  "gemini-pro": {
    name: "Gemini 2.5 Pro",
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.01,
    latencyMs: 500,
    quality: 92,
    bestFor: ["nuanced_feedback", "coaching_advice", "long_context"]
  }
};

function classifyTask(task) {
  const complexTasks = ["roleplay_scoring", "architecture", "complex_reasoning", "coaching_advice"];
  const mediumTasks = ["nuanced_feedback", "content_generation", "long_context"];
  if (complexTasks.includes(task)) return "high";
  if (mediumTasks.includes(task)) return "medium";
  return "low";
}

function routeToModel(task, userTier = "free") {
  const complexity = classifyTask(task);
  if (userTier === "premium" && complexity === "high") return MODELS["gpt-4o"];
  switch (complexity) {
    case "high": return MODELS["gemini-pro"];
    case "medium": return MODELS["gpt-4o-mini"];
    case "low": return MODELS["gemini-flash"];
    default: return MODELS["gpt-4o-mini"];
  }
}

// ============================================================
// PROMPT OPTIMIZATION DATA
// ============================================================

const PROMPT_OPTIMIZATIONS = {
  roleplay_scoring: {
    before: { tokens: 2500, description: "Verbose system prompt with full rubric inline" },
    after: { tokens: 800, description: "Compressed rubric with few-shot example reference IDs", technique: "Move rubric to RAG retrieval, use structured output format, compress instructions" },
    savings: "68%"
  },
  market_analysis: {
    before: { tokens: 1800, description: "Full market data embedded in every prompt" },
    after: { tokens: 400, description: "RAG-retrieved relevant data only, pre-summarized", technique: "Retrieve only relevant market data via vector search, pre-summarize before injection" },
    savings: "78%"
  },
  content_generation: {
    before: { tokens: 1200, description: "Generic instruction with examples in every call" },
    after: { tokens: 350, description: "Fine-tuned model with cached few-shot examples", technique: "Use cached prefix (OpenAI) or fine-tuned model for repetitive content tasks" },
    savings: "71%"
  }
};

// ============================================================
// COST SIMULATION
// ============================================================

function simulateMonthlyUsage(userCount) {
  const usagePerUser = {
    roleplay_sessions: 8,
    market_queries: 12,
    content_generation: 15,
    coaching_qa: 20,
    admin_automation: 10
  };

  const taskMapping = {
    roleplay_sessions: { task: "roleplay_scoring", avgTokensIn: 2500, avgTokensOut: 1500 },
    market_queries: { task: "market_news", avgTokensIn: 1800, avgTokensOut: 800 },
    content_generation: { task: "content_generation", avgTokensIn: 1200, avgTokensOut: 2000 },
    coaching_qa: { task: "simple_qa", avgTokensIn: 800, avgTokensOut: 600 },
    admin_automation: { task: "simple_chat", avgTokensIn: 600, avgTokensOut: 400 }
  };

  let beforeCost = 0, afterCost = 0, totalRequests = 0, cachedRequests = 0;
  const details = {};

  Object.entries(usagePerUser).forEach(([activity, countPerUser]) => {
    const totalCalls = countPerUser * userCount;
    const mapping = taskMapping[activity];
    totalRequests += totalCalls;

    const gpt4o = MODELS["gpt-4o"];
    const beforePerCall = (mapping.avgTokensIn / 1000 * gpt4o.costPer1kInput) + (mapping.avgTokensOut / 1000 * gpt4o.costPer1kOutput);
    const activityBeforeCost = beforePerCall * totalCalls;
    beforeCost += activityBeforeCost;

    const routedModel = routeToModel(mapping.task);
    const optimizedTokensIn = mapping.avgTokensIn * 0.4;
    const afterPerCall = (optimizedTokensIn / 1000 * routedModel.costPer1kInput) + (mapping.avgTokensOut / 1000 * routedModel.costPer1kOutput);

    const cacheRates = {
      roleplay_sessions: 0,
      market_queries: 0.65,
      content_generation: 0.40,
      coaching_qa: 0.70,
      admin_automation: 0.30
    };

    const cacheRate = cacheRates[activity];
    const cachedCalls = Math.floor(totalCalls * cacheRate);
    cachedRequests += cachedCalls;
    const activityAfterCost = afterPerCall * (totalCalls - cachedCalls);
    afterCost += activityAfterCost;

    details[activity] = {
      totalCalls,
      beforeCost: activityBeforeCost,
      afterCost: activityAfterCost,
      model: routedModel.name,
      cacheRate: `${(cacheRate * 100).toFixed(0)}%`,
      savings: `${((1 - activityAfterCost / activityBeforeCost) * 100).toFixed(0)}%`
    };
  });

  return { beforeCost, afterCost, totalRequests, cachedRequests, details };
}

// ============================================================
// GPT-4o EXECUTIVE ANALYSIS
// ============================================================

async function generateExecutiveAnalysis(scenarios) {
  const dataForLLM = JSON.stringify(scenarios, null, 2);

  console.log("\n[LLM] Sending cost data to GPT-4o for executive analysis...");
  const startTime = Date.now();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a senior engineering leader at a SaaS company analyzing AI infrastructure costs.

Given cost simulation data for an AI-powered real estate coaching platform (Revii AI by Tom Ferry International), provide:

1. EXECUTIVE SUMMARY (3 sentences max): Key takeaway for C-level stakeholders
2. TOP 3 RISKS: What could go wrong with this optimization strategy
3. IMPLEMENTATION PRIORITY: Which optimization layer to implement first and why
4. COMPETITIVE ADVANTAGE: How this positions the company vs competitors
5. RECOMMENDATION: Go/No-Go decision with reasoning

Be direct, data-driven, and specific. Reference actual numbers from the data. No fluff.`
      },
      {
        role: "user",
        content: `Analyze this cost optimization data for Revii AI:\n\n${dataForLLM}\n\nOptimization strategy: 3-layer approach using intelligent model routing (Gemini 2.5 Pro, GPT-4o Mini, Gemini 2.0 Flash), response caching (Redis with semantic matching), and prompt compression (RAG-based context injection). Implementation: 2-3 sprints with Team Lead + 2 engineers.`
      }
    ],
    temperature: 0.3,
    max_tokens: 800
  });

  const latency = Date.now() - startTime;
  const usage = response.usage;
  const cost = (usage.prompt_tokens / 1000 * 0.005) + (usage.completion_tokens / 1000 * 0.015);

  console.log(`[LLM] Response in ${latency}ms | ${usage.total_tokens} tokens | $${cost.toFixed(4)}`);

  return {
    content: response.choices[0].message.content,
    latency,
    tokens: usage.total_tokens,
    cost
  };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("=".repeat(70));
  console.log("REVII AI - AI AGENT COST OPTIMIZATION ENGINE");
  console.log("Powered by GPT-4o | Production Mode");
  console.log("=".repeat(70));

  // Run simulations
  const scenarios = {
    current: { label: "Current Scale (5,000 users)", users: 5000 },
    target: { label: "Target Scale (100,000 users)", users: 100000 },
    full: { label: "Full Scale (500,000 users)", users: 500000 }
  };

  const results = {};

  for (const [key, scenario] of Object.entries(scenarios)) {
    const data = simulateMonthlyUsage(scenario.users);
    results[key] = { ...scenario, ...data };

    console.log(`\n${"─".repeat(70)}`);
    console.log(`SCENARIO: ${scenario.label}`);
    console.log("─".repeat(70));
    console.log(`  BEFORE optimization: $${data.beforeCost.toFixed(2)}/month`);
    console.log(`  AFTER optimization:  $${data.afterCost.toFixed(2)}/month`);
    console.log(`  SAVINGS:             $${(data.beforeCost - data.afterCost).toFixed(2)}/month (${((1 - data.afterCost / data.beforeCost) * 100).toFixed(0)}%)`);

    if (key === "full") {
      console.log(`  ANNUAL SAVINGS:      $${((data.beforeCost - data.afterCost) * 12).toFixed(2)}`);
    }

    console.log(`  Total API calls:     ${data.totalRequests.toLocaleString()}`);
    console.log(`  Cached (no API):     ${data.cachedRequests.toLocaleString()} (${(data.cachedRequests / data.totalRequests * 100).toFixed(0)}%)`);

    if (key === "current") {
      console.log("\n  Breakdown by activity:");
      console.log("  " + "─".repeat(68));
      console.log(`  ${"Activity".padEnd(22)} ${"Model".padEnd(18)} ${"Before".padEnd(12)} ${"After".padEnd(12)} ${"Cache".padEnd(8)} Savings`);
      console.log("  " + "─".repeat(68));
      Object.entries(data.details).forEach(([activity, d]) => {
        const name = activity.replace(/_/g, " ").padEnd(22);
        console.log(`  ${name} ${d.model.padEnd(18)} $${d.beforeCost.toFixed(2).padEnd(10)} $${d.afterCost.toFixed(2).padEnd(10)} ${d.cacheRate.padEnd(8)} ${d.savings}`);
      });
    }
  }

  // Model routing summary
  console.log(`\n${"─".repeat(70)}`);
  console.log("MODEL ROUTING STRATEGY");
  console.log("─".repeat(70));
  console.log(`
  HIGH COMPLEXITY (Roleplay Scoring, Complex Coaching)
    Gemini 2.5 Pro: 92% quality at 67% less cost vs GPT-4o

  MEDIUM COMPLEXITY (Content Generation, Market Analysis)
    GPT-4o Mini: 82% quality at 97% less cost vs GPT-4o

  LOW COMPLEXITY (FAQ, Classification, Simple Chat)
    Gemini 2.0 Flash: 80% quality at 97% less cost vs GPT-4o`);

  // Prompt optimization
  console.log(`\n${"─".repeat(70)}`);
  console.log("PROMPT OPTIMIZATION RESULTS");
  console.log("─".repeat(70));
  Object.entries(PROMPT_OPTIMIZATIONS).forEach(([task, opt]) => {
    console.log(`\n  ${task.replace(/_/g, " ").toUpperCase()}`);
    console.log(`    Before: ${opt.before.tokens} tokens`);
    console.log(`    After:  ${opt.after.tokens} tokens (${opt.savings} reduction)`);
    console.log(`    Technique: ${opt.after.technique}`);
  });

  // GPT-4o Executive Analysis
  console.log(`\n${"=".repeat(70)}`);
  console.log("EXECUTIVE ANALYSIS (GPT-4o)");
  console.log("=".repeat(70));

  try {
    const scenarioData = {
      current_5k: {
        before: `$${results.current.beforeCost.toFixed(0)}/mo`,
        after: `$${results.current.afterCost.toFixed(0)}/mo`,
        savings_pct: `${((1 - results.current.afterCost / results.current.beforeCost) * 100).toFixed(0)}%`,
        api_calls: results.current.totalRequests,
        cache_rate: `${(results.current.cachedRequests / results.current.totalRequests * 100).toFixed(0)}%`
      },
      target_100k: {
        before: `$${results.target.beforeCost.toFixed(0)}/mo`,
        after: `$${results.target.afterCost.toFixed(0)}/mo`,
        savings_pct: `${((1 - results.target.afterCost / results.target.beforeCost) * 100).toFixed(0)}%`,
        annual_savings: `$${((results.target.beforeCost - results.target.afterCost) * 12).toFixed(0)}`
      },
      full_500k: {
        before: `$${results.full.beforeCost.toFixed(0)}/mo`,
        after: `$${results.full.afterCost.toFixed(0)}/mo`,
        savings_pct: `${((1 - results.full.afterCost / results.full.beforeCost) * 100).toFixed(0)}%`,
        annual_savings: `$${((results.full.beforeCost - results.full.afterCost) * 12).toFixed(0)}`
      },
      model_routing: {
        high: "Gemini 2.5 Pro (92% quality, 67% cheaper)",
        medium: "GPT-4o Mini (82% quality, 97% cheaper)",
        low: "Gemini 2.0 Flash (80% quality, 97% cheaper)"
      },
      implementation: "2-3 sprints, Team Lead + 2 engineers, ~6 person-weeks"
    };

    const analysis = await generateExecutiveAnalysis(scenarioData);
    console.log(`\n${analysis.content}`);

    console.log(`\n${"=".repeat(70)}`);
    console.log("DEMO METRICS");
    console.log("=".repeat(70));
    console.log(`  Analysis model: GPT-4o`);
    console.log(`  Analysis tokens: ${analysis.tokens}`);
    console.log(`  Analysis cost: $${analysis.cost.toFixed(4)}`);
    console.log(`  Analysis latency: ${analysis.latency}ms`);
  } catch (error) {
    console.error(`\n[ERROR] ${error.message}`);
  }
}

main();
