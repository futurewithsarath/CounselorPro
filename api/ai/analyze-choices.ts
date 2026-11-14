import { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuth } from "firebase-admin/auth";
import { getAIClient, checkServerlessRateLimit, validateProfileAndOptions } from "../_lib/index";

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
  const rateLimit = checkServerlessRateLimit(`ai_${clientIp}`, 10, 60000);
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: "Too many AI analysis requests. Please try again after 1 minute." });
  }

  // Require a verified Firebase ID token if user is logged in
  const authHeader = req.headers.authorization;
  if (authHeader) {
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Invalid Authorization header format. Expected Bearer token." });
    }
    const token = authHeader.slice(7).trim();
    try {
      await getAuth().verifyIdToken(token, true);
    } catch (authErr: any) {
      console.warn("[AI SERVICE] Failed to verify provided Firebase ID token:", authErr.message);
      return res.status(401).json({ error: "Invalid or expired Firebase ID token." });
    }
  }

  // Validate profile and options (strict max 50 options, length limits, allowlist for exam/stream/category)
  const { profile, options } = req.body || {};
  const validation = validateProfileAndOptions(profile, options);
  if (!validation.valid || !validation.validatedProfile || !validation.validatedOptions) {
    return res.status(400).json({ error: validation.error || "Invalid request payload." });
  }

  const { validatedProfile, validatedOptions } = validation;

  const optionsStr = validatedOptions
    .map(opt => `#${opt.priority}: College ${opt.collegeCode} - ${opt.collegeName} [Branch: ${opt.branch}]`)
    .join("\n");

  // Fixed, immutable server-side prompt — client-supplied prompts are completely rejected
  const prompt = `
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

      // Return a realistic mock response if API Key is not set in development
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
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const analysisText = response.text || "No response received from counselor AI.";
    return res.json({ analysis: analysisText });

  } catch (err: any) {
    console.error("[AI SERVICE ERROR] Gemini API Error:", err);
    return res.status(500).json({ error: "Failed to generate AI analysis. Please try again later." });
  }
}
