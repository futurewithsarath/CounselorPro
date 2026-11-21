import { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuth } from "firebase-admin/auth";
import { getAIClient, checkRateLimit, validateProfileAndOptions } from "../_lib/index";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Rate limiting (10 requests per minute per IP)
  const clientIp = (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
  const ipRateLimit = await checkRateLimit(`ai_ip_${clientIp}`, 10, 60000);
  if (!ipRateLimit.allowed) {
    return res.status(429).json({ error: "Too many AI analysis requests. Please try again after 1 minute." });
  }

  // Require a verified Firebase ID token if user is logged in, and enforce per-user daily quota (30/day)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Invalid Authorization header format. Expected Bearer token." });
    }
    const token = authHeader.slice(7).trim();
    try {
      const decoded = await getAuth().verifyIdToken(token, true);
      // Per-user daily quota (30 analyses / 24 hours)
      const userRateLimit = await checkRateLimit(`ai_user_${decoded.uid}`, 30, 86400000);
      if (!userRateLimit.allowed) {
        return res.status(429).json({ error: "Daily AI analysis quota (30 requests/day) exceeded for this account." });
      }
    } catch (authErr: any) {
      let isQaToken = false;
      // Mock JWT development bypass is strictly isolated behind an explicit test-only environment flag
      // It is disabled by default and NEVER permitted in production environments
      if (process.env.NODE_ENV !== "production" && process.env.ENABLE_TEST_AUTH_BYPASS === "true") {
        try {
          const parts = token.split(".");
          if (parts.length === 3) {
            const payloadJson = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
            if (payloadJson.role === "student" || payloadJson.email?.includes("qa") || payloadJson.uid?.includes("qa")) {
              isQaToken = true;
            }
          }
        } catch {}
      }

      if (isQaToken) {
        // Safe development QA bypass for mock JWT strictly when ENABLE_TEST_AUTH_BYPASS=true
      } else {
        console.warn("[AI SERVICE] Failed to verify provided Firebase ID token:", authErr.message);
        return res.status(401).json({ error: "Invalid or expired Firebase ID token." });
      }
    }
  }

  // Validate profile and options (strict max 50 options, length limits, allowlist for exam/stream/category)
  const { profile, options, userQuery } = req.body || {};
  const validation = validateProfileAndOptions(profile, options);
  if (!validation.valid || !validation.validatedProfile || !validation.validatedOptions) {
    return res.status(400).json({ error: validation.error || "Invalid request payload." });
  }

  const { validatedProfile, validatedOptions } = validation;

  // Sanitize student query if provided (max 300 characters, alphanumeric and basic punctuation)
  const rawQuery = typeof userQuery === "string" ? userQuery.trim().slice(0, 300) : "";
  const sanitizedQuery = rawQuery ? rawQuery.replace(/[^\w\s\?\.,!'-]/g, "") : "";

  const optionsStr = validatedOptions
    .map(opt => `#${opt.priority}: College ${opt.collegeCode} - ${opt.collegeName} [Branch: ${opt.branch}]`)
    .join("\n");

  // Dynamic server-side prompt adapted for strategic list overview vs direct student query
  const prompt = sanitizedQuery
    ? `
  You are an expert EAPCET/EAMCET/NEET/JEE admissions counselor in South India.
  The student is asking a direct question about their counselling choices:
  "${sanitizedQuery}"

  Student Profile:
  - Exam: ${validatedProfile.exam} (${validatedProfile.stream})
  - Rank: ${validatedProfile.rank}
  - Category: ${validatedProfile.category}
  - Region: ${validatedProfile.cutoffLocalAreaScope === 'NOT_REPORTED' ? 'Statewide' : validatedProfile.region}
  - Gender: ${validatedProfile.gender}

  Selected Web Options (${validatedOptions.length}):
  ${optionsStr}

  Provide a direct, concise, encouraging, and tactical counselling response (under 160 words). Directly address their question with actionable advice. Avoid vague generic statements.
  `
    : `
  You are an expert EAPCET/EAMCET/NEET/JEE admissions counselor in South India.
  Analyze the student's web options choices, and give professional, strategic, and supportive feedback.
  
  Student Details:
  - Exam: ${validatedProfile.exam}
  - Stream: ${validatedProfile.stream}
  - Rank: ${validatedProfile.rank}
  - Category: ${validatedProfile.category}
  - Region: ${validatedProfile.cutoffLocalAreaScope === 'NOT_REPORTED' ? 'Not separated in the historical cutoff source' : validatedProfile.region}
  - Gender: ${validatedProfile.gender}
  
  Selected Web Options (In Priority Order 1 to ${validatedOptions.length}):
  ${optionsStr}
  
  Please provide your analysis in the following structured format (use clear headings, bullet points, and markdown):
  
  1. **Overall Evaluation**: Is the priority order logical? (For example, higher-quality/highly-coveted colleges like CBIT/JNTU/OUCE/AIIMS/NITs should generally be above private tier-3 colleges, and branch choices should align with their rank).
  2. **Probability of Success**: Based on their rank of ${validatedProfile.rank}, which choices are "Targets" (reasonable chance), which are "Reaches" (high-ambition, lower chance), and which are "Safeties" (highly likely backup seats)? Explain the seat probability.
  3. **Ordering Logic Critique**: Are there any issues? E.g. did they place a low-cutoff safety college ABOVE a high-cutoff dream college? (Explain why this is a mistake, as they will get allotted the safety college first and never reach the dream college).
  4. **Strategic Recommendation**: What should they do next? Should they add more safety options, move any options up/down, or choose other branches? Give positive, encouraging, and clear guidance.
  
  Keep the tone professional, friendly, objective, and deeply encouraging. Avoid dry developer jargon. Focus purely on realistic counseling.
  `;

  const apiKey = process.env.GEMINI_API_KEY;

  try {
    if (!apiKey) {
      if (process.env.NODE_ENV === "production") {
        console.error("Blocked AI analysis request in production because GEMINI_API_KEY is not defined.");
        return res.status(500).json({ error: "AI analysis is temporarily unavailable. GEMINI_API_KEY environment variable is missing on this production server." });
      }

      // Return a realistic contextual response if API Key is not set in development
      if (sanitizedQuery) {
        const lowerQ = sanitizedQuery.toLowerCase();
        let reply = "";
        if (lowerQ.includes("cbit") || lowerQ.includes("vce") || lowerQ.includes("jntu") || lowerQ.includes("ou") || lowerQ.includes("au") || lowerQ.includes("svu")) {
          reply = `With your rank of **${validatedProfile.rank.toLocaleString()}** (${validatedProfile.category}), university colleges and top tier-1 autonomous institutes (CBIT, Vasavi, VNR VJIET, JNTUH, AUCE) should remain your priority choices. If your rank is within reach of CSE/IT/ECE in these campuses, keep them strictly above private affiliated colleges.`;
        } else if (lowerQ.includes("branch") || lowerQ.includes("cse") || lowerQ.includes("ece") || lowerQ.includes("aiml") || lowerQ.includes("data science")) {
          reply = `For ${validatedProfile.exam} (${validatedProfile.stream}), CSE and AI/Data Science specializations have the tightest closing ranks. If software/IT is your ambition, prioritize CSE/CSM across your top 5 preferred institutes first before branching out into ECE or allied engineering disciplines.`;
        } else if (lowerQ.includes("order") || lowerQ.includes("priority") || lowerQ.includes("move") || lowerQ.includes("sequence")) {
          reply = `In South Indian web counselling, the system evaluates choices strictly from **#1 downwards**. If you qualify for Option #3, the portal locks it and permanently discards options #4 through #${validatedOptions.length}. Always arrange strictly in the order of which college you would truly rather attend.`;
        } else {
          reply = `With rank **${validatedProfile.rank.toLocaleString()}**, your list of ${validatedOptions.length} choices is a solid starting foundation. Ensure you have at least 3-5 confirmed safety options with historical cutoffs safely above ${validatedProfile.rank.toLocaleString()} so you never risk finishing counselling rounds with zero seat allotment.`;
        }
        return res.json({ analysis: reply });
      }

      const mockReply = `### AI Counselor Analysis (Simulator Mode)

*Note: running in local simulator mode. Provide a valid GEMINI_API_KEY in environment secrets to activate full real-time AI analytics.*

#### 1. Overall Evaluation
Your list of **${validatedOptions.length} web options** is highly structured! You have focused heavily on **${validatedProfile.exam}** options under the **${validatedProfile.stream}** stream. Your ranking of **${validatedProfile.rank}** puts you in a highly strategic position.

#### 2. Probability of Success
- **Reaches**: Your top choices are excellent high-ambition seats. With rank **${validatedProfile.rank}**, getting into top branches under the **${validatedProfile.category}** category will be highly competitive but absolutely worth attempting as top-tier preferences.
- **Targets**: Choices ranked 3 to 5 are your strongest strategic bets. Your rank aligns with historical cutoff bands.
- **Safeties**: Your lower choices are highly secure backups.

#### 3. Ordering Logic Critique
Your sequence is generally **well-designed**. You have correctly followed the golden rule of counseling: **Place your absolute dream choices at the very top, followed by target colleges, and finally safeties at the bottom.**

#### 4. Strategic Recommendation
- **Don't freeze too early**: Keep this simulation list saved!
- **Add safety buffer**: Maintain at least 2 to 3 solid safety options.
- **You are ready**: You are doing an outstanding job practicing on the simulator.`;
      return res.json({ analysis: mockReply });
    }

    const client = getAIClient();
    if (!client) {
      return res.status(500).json({ error: "AI client is not configured." });
    }

    const preferredModel = (process.env.GEMINI_MODEL || "gemini-3.5-flash-lite").trim();
    let response: any;
    try {
      response = await client.models.generateContent({
        model: preferredModel,
        contents: prompt,
      });
    } catch (modelErr: any) {
      if (preferredModel !== "gemini-3.5-flash-lite" && (modelErr?.status === 404 || modelErr?.status === 503)) {
        console.warn(`[AI SERVICE] Model ${preferredModel} returned ${modelErr.status}; falling back to gemini-3.5-flash-lite.`);
        response = await client.models.generateContent({
          model: "gemini-3.5-flash-lite",
          contents: prompt,
        });
      } else {
        throw modelErr;
      }
    }

    const analysisText = response.text || "No response received from counselor AI.";
    return res.json({ analysis: analysisText });

  } catch (err: any) {
    console.error("[AI SERVICE ERROR] Gemini API Error:", err?.message || err);
    if (err?.status === 429 || err?.message?.includes("RESOURCE_EXHAUSTED") || err?.message?.includes("quota")) {
      return res.status(429).json({ error: "AI service quota temporarily exceeded. Please try again in a few moments." });
    }
    if (err?.status === 400 || err?.message?.includes("API_KEY_INVALID") || err?.message?.includes("API key not valid")) {
      return res.status(400).json({ error: "Invalid Gemini API key. Please check your GEMINI_API_KEY configuration." });
    }
    if (process.env.NODE_ENV !== "production") {
      console.warn("[AI SERVICE] Dev mode fallback to simulation due to Gemini connection issue:", err?.message);
      return res.json({
        analysis: `### AI Counselor Analysis (Dev Simulation Fallback)\n\n*Note: Real Gemini API call encountered connection issue (${err?.message || "network/offline"}). Showing local simulation fallback.* \n\n#### 1. Overall Evaluation\nYour list of **${validatedOptions.length} web options** is strategically ordered for **${validatedProfile.exam}** (${validatedProfile.stream}). With rank **${validatedProfile.rank}** in category **${validatedProfile.category}**, your top selections appropriately challenge for premier seats.\n\n#### 2. Probability of Success\n- **Reaches**: Top 2 choices are competitive reaches.\n- **Targets**: Choices 3 to 5 match your rank bracket.\n- **Safeties**: Choices beyond rank 5 provide strong backup security.\n\n#### 3. Strategic Recommendation\nMaintain at least 3 confirmed safety options with historical cutoffs safely above rank ${validatedProfile.rank}.`,
        fallback: true
      });
    }
    return res.status(500).json({ error: "Failed to generate AI analysis. Please try again later." });
  }
}
