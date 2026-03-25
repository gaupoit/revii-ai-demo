/**
 * Demo 1: Smart Roleplay Scoring Engine for Revii AI
 * PRODUCTION VERSION - Calls OpenAI GPT-4o for real scoring
 *
 * Current Revii AI: Basic roleplay with single score
 * Improvement: Multi-dimensional scoring with actionable coaching feedback
 */

import 'dotenv/config';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================
// SCORING DIMENSIONS
// ============================================================

const SCORING_RUBRIC = {
  rapport_building: {
    name: "Rapport Building",
    weight: 0.20,
    criteria: [
      "Uses prospect's name naturally",
      "Acknowledges their situation/feelings",
      "Finds common ground or shared interests",
      "Warm, conversational tone (not scripted)"
    ]
  },
  needs_discovery: {
    name: "Needs Discovery",
    weight: 0.25,
    criteria: [
      "Asks open-ended questions",
      "Listens before pitching",
      "Identifies timeline, motivation, and constraints",
      "Uncovers the 'why' behind the move"
    ]
  },
  objection_handling: {
    name: "Objection Handling",
    weight: 0.25,
    criteria: [
      "Acknowledges the objection without being defensive",
      "Uses 'feel, felt, found' or similar framework",
      "Provides specific evidence or social proof",
      "Redirects to value without being pushy"
    ]
  },
  call_to_action: {
    name: "Call to Action",
    weight: 0.15,
    criteria: [
      "Proposes a clear next step",
      "Offers specific time/date options",
      "Creates urgency without pressure",
      "Confirms commitment before ending"
    ]
  },
  market_knowledge: {
    name: "Market Knowledge",
    weight: 0.15,
    criteria: [
      "References current market conditions",
      "Uses relevant comparable data",
      "Demonstrates local area expertise",
      "Connects market data to prospect's situation"
    ]
  }
};

// ============================================================
// ROLEPLAY SCENARIOS
// ============================================================

const SCENARIOS = {
  expired_listing: {
    name: "Expired Listing Call",
    context: "You're calling a homeowner whose listing expired 3 days ago after 120 days on market. They're frustrated and skeptical of agents.",
    prospect_personality: "Frustrated, defensive, had a bad experience with their previous agent who overpromised. They still want to sell but don't trust agents.",
    key_objections: [
      "I'm done with agents, they're all the same",
      "My last agent promised it would sell in 30 days",
      "I'm thinking about trying FSBO"
    ]
  },
  fsbo: {
    name: "FSBO Prospecting",
    context: "You're reaching out to a For Sale By Owner who has been trying to sell for 45 days with no offers.",
    prospect_personality: "Independent, cost-conscious, believes they can save the commission. Starting to get worried about lack of activity.",
    key_objections: [
      "I don't want to pay 6% commission",
      "I've gotten some interest, just no offers yet",
      "My neighbor sold their house themselves last year"
    ]
  },
  buyer_consultation: {
    name: "First-Time Buyer Consultation",
    context: "Meeting with a first-time buyer couple who are pre-approved but overwhelmed by the process and scared of making the wrong decision.",
    prospect_personality: "Excited but anxious, information overload from internet research, worried about overpaying in this market.",
    key_objections: [
      "Should we wait for prices to come down?",
      "We've been looking online and prices seem too high",
      "What if we buy and the market crashes?"
    ]
  }
};

// ============================================================
// SYSTEM PROMPT
// ============================================================

function buildSystemPrompt(scenario) {
  return `You are an AI roleplay scoring engine for real estate agent training, built for Revii AI by Tom Ferry International.

ROLEPLAY SCENARIO: ${scenario.name}
CONTEXT: ${scenario.context}
PROSPECT PERSONALITY: ${scenario.prospect_personality}
KEY OBJECTIONS TO EXPECT: ${scenario.key_objections.join("; ")}

YOUR TASK: Analyze the agent's roleplay performance and provide a detailed, multi-dimensional score.

SCORING RUBRIC:
${Object.entries(SCORING_RUBRIC).map(([key, dim]) =>
  `${dim.name} (${dim.weight * 100}% weight):
  ${dim.criteria.map(c => `  - ${c}`).join('\n')}`
).join('\n\n')}

IMPORTANT SCORING RULES:
- Each dimension score MUST be on a 0-100 scale (not weighted). For example, if rapport was decent but not great, score it 75, not 15.
- The overall_score is the weighted average of all dimension scores using the weights above.
- Be specific - reference exact phrases the agent used.
- Use Tom Ferry's coaching style: direct, high-energy, no-BS, but always supportive.

Respond ONLY with valid JSON, no markdown code fences.`;
}

// ============================================================
// JSON SCHEMA for structured output
// ============================================================

const SCORING_SCHEMA = {
  name: "roleplay_scoring",
  strict: true,
  schema: {
    type: "object",
    properties: {
      overall_score: { type: "number", description: "Overall score 0-100" },
      dimensions: {
        type: "object",
        properties: {
          rapport_building: {
            type: "object",
            properties: {
              score: { type: "number" },
              highlights: { type: "array", items: { type: "string" } },
              improvements: { type: "array", items: { type: "string" } }
            },
            required: ["score", "highlights", "improvements"],
            additionalProperties: false
          },
          needs_discovery: {
            type: "object",
            properties: {
              score: { type: "number" },
              highlights: { type: "array", items: { type: "string" } },
              improvements: { type: "array", items: { type: "string" } }
            },
            required: ["score", "highlights", "improvements"],
            additionalProperties: false
          },
          objection_handling: {
            type: "object",
            properties: {
              score: { type: "number" },
              highlights: { type: "array", items: { type: "string" } },
              improvements: { type: "array", items: { type: "string" } }
            },
            required: ["score", "highlights", "improvements"],
            additionalProperties: false
          },
          call_to_action: {
            type: "object",
            properties: {
              score: { type: "number" },
              highlights: { type: "array", items: { type: "string" } },
              improvements: { type: "array", items: { type: "string" } }
            },
            required: ["score", "highlights", "improvements"],
            additionalProperties: false
          },
          market_knowledge: {
            type: "object",
            properties: {
              score: { type: "number" },
              highlights: { type: "array", items: { type: "string" } },
              improvements: { type: "array", items: { type: "string" } }
            },
            required: ["score", "highlights", "improvements"],
            additionalProperties: false
          }
        },
        required: ["rapport_building", "needs_discovery", "objection_handling", "call_to_action", "market_knowledge"],
        additionalProperties: false
      },
      tom_ferry_tip: { type: "string", description: "Coaching tip in Tom Ferry's style" },
      suggested_script: { type: "string", description: "2-3 sentence alternative script for weakest area" },
      improvement_priority: { type: "string", description: "The ONE thing to focus on next session" }
    },
    required: ["overall_score", "dimensions", "tom_ferry_tip", "suggested_script", "improvement_priority"],
    additionalProperties: false
  }
};

// ============================================================
// LLM SCORING CALL
// ============================================================

async function scoreConversation(scenario, conversation) {
  const conversationText = conversation.map(turn => {
    const label = turn.role === "agent" ? "AGENT" : "PROSPECT";
    return `[${label}]: ${turn.text}`;
  }).join("\n\n");

  console.log("\n[LLM] Sending conversation to GPT-4o for scoring...");
  const startTime = Date.now();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: buildSystemPrompt(scenario) },
      { role: "user", content: `Score this roleplay conversation:\n\n${conversationText}` }
    ],
    response_format: {
      type: "json_schema",
      json_schema: SCORING_SCHEMA
    },
    temperature: 0.3
  });

  const latency = Date.now() - startTime;
  const usage = response.usage;

  console.log(`[LLM] Response received in ${latency}ms`);
  console.log(`[LLM] Tokens: ${usage.prompt_tokens} input + ${usage.completion_tokens} output = ${usage.total_tokens} total`);
  console.log(`[LLM] Est. cost: $${((usage.prompt_tokens / 1000 * 0.005) + (usage.completion_tokens / 1000 * 0.015)).toFixed(4)}`);

  return JSON.parse(response.choices[0].message.content);
}

// ============================================================
// DISPLAY RESULTS
// ============================================================

function displayResults(scoring) {
  console.log("\n" + "=".repeat(60));
  console.log("SCORING ANALYSIS (GPT-4o)");
  console.log("=".repeat(60));

  console.log(`\nOVERALL SCORE: ${scoring.overall_score}/100\n`);

  Object.entries(scoring.dimensions).forEach(([key, dim]) => {
    const rubric = SCORING_RUBRIC[key];
    const bar = "█".repeat(Math.floor(dim.score / 5)) + "░".repeat(20 - Math.floor(dim.score / 5));
    console.log(`${rubric.name}: ${dim.score}/100 [${bar}]`);
    dim.highlights.forEach(h => console.log(`  + ${h}`));
    dim.improvements.forEach(i => console.log(`  > ${i}`));
    console.log();
  });

  console.log("=".repeat(60));
  console.log("TOM FERRY'S COACHING TIP:");
  console.log(scoring.tom_ferry_tip);
  console.log("\nSUGGESTED SCRIPT:");
  console.log(scoring.suggested_script);
  console.log("\n#1 PRIORITY FOR NEXT SESSION:");
  console.log(scoring.improvement_priority);
  console.log("=".repeat(60));
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const scenarioKey = process.argv[2] || "expired_listing";
  const scenario = SCENARIOS[scenarioKey];

  if (!scenario) {
    console.error(`Unknown scenario: ${scenarioKey}`);
    console.error(`Available: ${Object.keys(SCENARIOS).join(", ")}`);
    process.exit(1);
  }

  // Sample conversation (replace with real-time input in production)
  const conversations = {
    expired_listing: [
      { role: "agent", text: "Hi, is this Mrs. Johnson? Hey, this is Paul from Premier Realty. I noticed your home on Oak Street just came off the market and I wanted to reach out." },
      { role: "prospect", text: "Yeah, and I'm not interested in listing with another agent. My last agent was terrible." },
      { role: "agent", text: "I completely understand your frustration, Mrs. Johnson. After 120 days on market, that's a really tough experience. Can I ask - what was the most disappointing part of working with your previous agent?" },
      { role: "prospect", text: "He promised it would sell in 30 days and then barely communicated with me. I don't even know what marketing he did." },
      { role: "agent", text: "That's unacceptable. You deserved better communication and a clear marketing strategy. Here's what I do differently - I send weekly video updates showing exactly what marketing is running, how many views your listing got, and what feedback buyers are giving. Complete transparency. Would it be worth 15 minutes of your time this Thursday at 2pm for me to show you my specific marketing plan for your home? No commitment, just information." },
      { role: "prospect", text: "I don't know... I was thinking about trying to sell it myself." },
      { role: "agent", text: "I respect that. A lot of homeowners consider that route. What I've found is that homes in your neighborhood that sell with professional marketing and pricing strategy net the seller about 8-12% more even after commission. I just helped the Smiths on Maple Street sell for $15,000 over asking in 21 days. What if I showed you exactly how I'd position your home to get similar results? If you don't see the value, no hard feelings." }
    ],
    fsbo: [
      { role: "agent", text: "Hi there, I'm looking for the homeowner at 142 Pine Street? My name is Paul from Premier Realty." },
      { role: "prospect", text: "That's me. If you're calling to list my house, I'm selling it myself." },
      { role: "agent", text: "I totally respect that. Actually, I'm calling because I work with a lot of buyers in your area and I wanted to ask - what price range are you targeting?" },
      { role: "prospect", text: "We're asking $485,000. We've had some showings but no offers yet." },
      { role: "agent", text: "Got it. 45 days with showings but no offers usually means one of two things - either the pricing needs adjustment or the marketing isn't reaching the right buyers. Can I share some data with you? Homes in your zip code that sold in the last 30 days averaged $478,000, but the ones with professional staging and marketing averaged $502,000. That's a $24,000 difference." },
      { role: "prospect", text: "I don't want to pay 6% commission though. That's almost $30,000." },
      { role: "agent", text: "I hear you. Let me put it this way - if I can net you $502,000 instead of $485,000, that's $17,000 more in your pocket even after my commission. And honestly, if I can't show you a clear path to a higher price, I'll tell you to keep doing what you're doing. Would 20 minutes on Tuesday work to look at the numbers together?" }
    ],
    buyer_consultation: [
      { role: "agent", text: "Welcome! I'm so excited to work with you both. Buying your first home is a huge milestone. Before we dive in, tell me - what made you decide now is the right time?" },
      { role: "prospect", text: "We've been renting for 3 years and feel like we're throwing money away. But honestly, prices seem really high right now." },
      { role: "agent", text: "That's a really common feeling, and I'm glad you brought it up. Here's the thing - people have been saying 'prices are too high' every year for the last 20 years, and every year, people who waited ended up paying more. In your target area, prices went up 4% last year. On a $400,000 home, that's $16,000 more if you wait 12 months. Plus your rent is what, $2,500 a month? That's $30,000 a year building someone else's equity." },
      { role: "prospect", text: "What if the market crashes after we buy?" },
      { role: "agent", text: "Great question. If you're buying a home to live in for 5+ years, short-term dips don't matter. The average home appreciates 3-4% per year over any 10-year period in US history. What matters more is finding the RIGHT home at a price that fits your monthly budget. You're pre-approved for $420,000 - let's focus on finding you something you love within that range. How does Saturday at 10am work to tour three homes I've picked out for you?" }
    ]
  };

  const conversation = conversations[scenarioKey];

  console.log("=".repeat(60));
  console.log("REVII AI - SMART ROLEPLAY SCORING ENGINE");
  console.log("Powered by GPT-4o | Production Mode");
  console.log("=".repeat(60));
  console.log(`\nScenario: ${scenario.name}`);
  console.log(`Context: ${scenario.context}\n`);

  console.log("--- CONVERSATION ---");
  conversation.forEach(turn => {
    const label = turn.role === "agent" ? "AGENT" : "PROSPECT";
    console.log(`\n[${label}]: ${turn.text}`);
  });

  try {
    const scoring = await scoreConversation(scenario, conversation);
    displayResults(scoring);
  } catch (error) {
    console.error("\n[ERROR]", error.message);
    process.exit(1);
  }
}

main();
