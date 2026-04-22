/**
 * DEV-ONLY: Skip the brainstorm interview by injecting the last session's data
 * into localStorage and auto-triggering the research pipeline.
 *
 * Usage: navigate to /brainstorm?skip=true
 */

import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env" });

const sql = neon(process.env.DATABASE_URL);

// The extracted context from the last session (from the error log)
const extractedContext = {
  intent:
    "Build a mobile scanning application that analyzes product ingredients to identify toxins and harmful substances like plastics and pesticides.",
  domain: "Health and Wellness / Consumer Goods",
  target_user_hints: [
    "Health-conscious consumers",
    "People concerned about chemical exposure",
  ],
  problem_hints: [
    "Presence of toxins in consumer products",
    "Difficulty identifying harmful ingredients like plastics and pesticides",
    "Information overload from media regarding product safety",
  ],
  constraints: [],
  gaps: [
    "What is the source of the toxicology database?",
    "Does the app use OCR, image recognition, or barcode scanning?",
    "Is this intended for mobile platforms (iOS/Android)?",
    "What is the monetization strategy or business model?",
    "How will the app handle false positives or regulatory liability?",
  ],
  confidence: "medium",
};

const transcript =
  "Why are you- So we wanna build a scan app with Cali Eye user experience for toxins in products like plastics or bad ingredients. Lots of Netflix documentaries talk about how many bad things there are in products like plastics, pesticides, et cetera. So we want to build a scanner-type product like Cali Eye to determine toxins and other bad things";

const brainstormMessages = [
  {
    role: "agent",
    message:
      "Hey! I read your brain-dump. Let's dig into your idea. First question: Build a mobile scanning application that analyzes product ingredients to identify toxins and harmful substances like plastics and pesticides. — who specifically is this for? Not 'everyone' — give me a real person.",
    timestamp: "2026-04-22T19:29:57.584Z",
  },
  {
    role: "user",
    message:
      "It's for people who are health conscious and want to make sure they're not ingesting toxins or harmful ingredients.",
    timestamp: "2026-04-22T19:30:28.149Z",
  },
  {
    role: "agent",
    message:
      "That is a good starting point, but let us narrow it down to find the specific pain point. What job are these health conscious people hiring this product to do when they are standing in the grocery store aisle?",
    timestamp: "2026-04-22T19:30:28.890Z",
  },
  {
    role: "user",
    message:
      "They're basically looking for an intelligent health consultant in their pocket.",
    timestamp: "2026-04-22T19:30:50.726Z",
  },
  {
    role: "agent",
    message:
      "I hear you, but let us focus on the specific outcome they are seeking. When they are holding a product and feeling uncertain, what is the primary job they are hiring this tool to accomplish for them in that exact moment?",
    timestamp: "2026-04-22T19:30:51.348Z",
  },
  {
    role: "user",
    message:
      "To give them confidence that they are going to be not ingesting anything harmful like plastic, microplastics and pesticides. I love you.",
    timestamp: "2026-04-22T19:31:18.070Z",
  },
  {
    role: "agent",
    message:
      "I appreciate the enthusiasm, and I am excited to help you build this out. To make sure we are solving a real problem rather than just a perceived one, have you talked to anyone who currently struggles with this anxiety while shopping, and if so, what are they doing to manage it right now?",
    timestamp: "2026-04-22T19:31:18.931Z",
  },
  {
    role: "user",
    message:
      "So, my wife actually saw something like this on TikTok as an ad, and that's where we got the idea from. There's already, like, a proven demand because they wouldn't be running an ad for no reason. So, they would be really pulling out an app, scanning a product, like a shampoo or a deodorant to make sure that there's no harmful chemicals in it.",
    timestamp: "2026-04-22T19:32:00.891Z",
  },
  {
    role: "agent",
    message:
      "It is great that you have seen market signals like advertisements, but relying on ads as proof of demand can be tricky since companies often run them to test interest rather than confirm a viable business. To get closer to the truth, have you personally observed or spoken with someone who actually stopped buying a specific product because they were worried about those ingredients?",
    timestamp: "2026-04-22T19:32:02.046Z",
  },
  {
    role: "user",
    message: "Yes, my wife.",
    timestamp: "2026-04-22T19:32:26.987Z",
  },
  {
    role: "agent",
    message:
      "That is a fantastic data point to start with. Since your wife is a clear example of the target user, what specific information or label detail does she currently look for, and how does she feel when she cannot find that information on the packaging?",
    timestamp: "2026-04-22T19:32:27.681Z",
  },
  {
    role: "user",
    message:
      "So it's things like dyes, like red 40 and other things, but you should do the research for me. She's not currently here for me to ask.",
    timestamp: "2026-04-22T19:32:53.873Z",
  },
  {
    role: "agent",
    message:
      "That is perfectly fine, and we will flag that as a gap for our background research to identify the most common ingredients that trigger consumer concern. Moving on to the core problem, what makes you confident that people will be willing to pay for this service rather than just using free online databases or simple search engines to check their products?",
    timestamp: "2026-04-22T19:32:54.887Z",
  },
  {
    role: "user",
    message:
      "You'll have to do the research for me, but Superior UX is a good start.",
    timestamp: "2026-04-22T19:33:23.701Z",
  },
  {
    role: "agent",
    message:
      "That is a fair point, and we will definitely look into how user experience differentiates successful apps in this space. Since we are focusing on the problem before the solution, what is the biggest risk you see in relying on a third party toxicology database to power your results?",
    timestamp: "2026-04-22T19:33:24.614Z",
  },
  {
    role: "user",
    message:
      "Well, realistically, we should be running our own AI agent to go research this and filling it in our database, but you should research the best way to accomplish that for me.",
    timestamp: "2026-04-22T19:33:55.563Z",
  },
  {
    role: "agent",
    message:
      "I will certainly add the best practices for building and maintaining a reliable toxicology database to our research list. Before we move on, what does success look like for you in the first thirty days after launching this application?",
    timestamp: "2026-04-22T19:33:56.211Z",
  },
  {
    role: "user",
    message:
      "Well, we would need to have a viral loop and be able to record UGC so that the app can go viral on its own and there should be shareability within the app. But I defer to you and your research.",
    timestamp: "2026-04-22T19:34:22.112Z",
  },
  {
    role: "agent",
    message:
      "That is a clear goal for growth, and I will research effective viral loops and user generated content strategies for health and wellness applications. Before we wrap up this phase, what is the one thing that must be true for this product to actually work in the real world?",
    timestamp: "2026-04-22T19:34:22.883Z",
  },
  {
    role: "user",
    message: "It should be very quick and easy to use.",
    timestamp: "2026-04-22T19:34:42.496Z",
  },
  {
    role: "agent",
    message:
      "That is a critical non-negotiable for any consumer tool. I have noted that speed and ease of use are your primary requirements for success. We have covered your target user, the core problem, success metrics, and your key constraints. The riskiest assumption in your idea is that users will trust an automated scanner enough to change their purchasing behavior without questioning the underlying data source or potential for errors. Great work! I will now run background research on the most common ingredients that trigger consumer concern, the best practices for building a reliable toxicology database, and effective viral loop strategies for health apps. This will take about a minute, then you will get your Kiro steering files.",
    timestamp: "2026-04-22T19:34:45.052Z",
  },
];

const userId = "8de07461-52ed-4fa0-aa37-c724a06b3e03";

// Output the JSON blob that should be pasted into the browser console
const sessionData = {
  transcript,
  extractedContext,
  userId,
};

const skipData = {
  brainstormMessages,
  transcript,
  extractedContext,
  userId,
};

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  DEV SKIP: Paste these commands in your browser console     ║
╚══════════════════════════════════════════════════════════════╝

// Step 1: Set the session data
localStorage.setItem('specdraft_v2_session', '${JSON.stringify(sessionData).replace(/'/g, "\\'")}');

// Step 2: Set the skip flag with brainstorm messages
localStorage.setItem('specdraft_v2_skip', '${JSON.stringify(skipData).replace(/'/g, "\\'")}');

// Step 3: Navigate
window.location.href = '/brainstorm?skip=true';
`);
