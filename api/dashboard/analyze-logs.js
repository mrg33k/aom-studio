// POST /api/dashboard/analyze-logs
// AI Log Analysis Agent Service
// Analyzes failure logs and returns structured analysis with actionable steps

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// System prompt for log analysis
const LOG_ANALYSIS_SYSTEM_PROMPT = `You are an expert log analysis agent. Your job is to analyze failure logs and provide:
1. A concise summary of the root cause
2. Clear, actionable steps to fix the issue

ANALYSIS RULES:
- Focus on the actual error, not surrounding noise
- Identify the root cause, not just symptoms
- Provide specific, executable steps
- Prioritize steps from most to least important
- If the log contains multiple errors, address the primary one first
- For build errors: check dependencies, configuration, syntax
- For runtime errors: check environment, permissions, data
- For network errors: check connectivity, endpoints, authentication

RESPONSE FORMAT:
Return ONLY a JSON object with exactly these two fields:
{
  "summary": "Brief one-sentence summary of the root cause",
  "actionable_steps": ["Step 1", "Step 2", "Step 3"]
}

Do NOT include any other text, explanations, or markdown.`;

// Call Gemini API for log analysis
async function analyzeLogWithGemini(logContent) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { 
          role: 'system', 
          parts: [{ text: LOG_ANALYSIS_SYSTEM_PROMPT }] 
        },
        contents: [
          { 
            role: 'user', 
            parts: [{ 
              text: `Analyze this failure log and provide a structured analysis:\n\n${logContent}` 
            }] 
          }
        ]
      }),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Gemini API error (${response.status}): ${data?.error?.message || JSON.stringify(data)}`);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Try to parse JSON from the response
  try {
    // Extract JSON from the response (Gemini might wrap it in markdown or other text)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    // If no JSON found, try to parse the whole text
    return JSON.parse(text);
  } catch (parseError) {
    // If parsing fails, create a structured response from the text
    console.warn('Failed to parse Gemini response as JSON, creating structured response:', parseError.message);
    
    // Try to extract a summary from the first meaningful line
    const lines = text.split('\n').filter(line => line.trim());
    let summary = 'Analysis completed';
    if (lines.length > 0) {
      // Take the first line that's not empty and not markdown formatting
      const firstLine = lines[0].replace(/^#+\s*/, '').trim();
      if (firstLine.length > 0) {
        summary = firstLine;
      }
    }
    
    // Extract actionable steps - look for bullet points or numbered lists
    const actionableSteps = [];
    for (const line of lines.slice(1)) {
      const trimmedLine = line.trim();
      // Match bullet points (-, *, •) or numbered items (1., 2., etc.)
      if (/^[-*•]\s+/.test(trimmedLine) || /^\d+\.\s+/.test(trimmedLine)) {
        const step = trimmedLine.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '').trim();
        if (step.length > 0) {
          actionableSteps.push(step);
        }
      }
    }
    
    // If no bullet points found, use non-empty lines as steps
    if (actionableSteps.length === 0) {
      actionableSteps.push(...lines.slice(1).filter(line => line.trim()).map(line => line.trim()));
    }
    
    // Limit to reasonable number of steps
    const limitedSteps = actionableSteps.slice(0, 10);
    
    return {
      summary,
      actionable_steps: limitedSteps.length > 0 ? limitedSteps : ['Review the log details and investigate further']
    };
  }
}

// Fetch log content from URL if provided
async function fetchLogContent(logSourceUrl) {
  try {
    const response = await fetch(logSourceUrl, { 
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch log from URL: ${response.status} ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    throw new Error(`Failed to fetch log content: ${error.message}`);
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }
  try {
    await verifyTenant('aom', req);
  } catch (e) {
    if (e instanceof TenantAuthError) return res.status(e.status).json({ error: e.message });
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const { log_content, log_source_url } = req.body || {};
    
    // Validate input
    if (!log_content && !log_source_url) {
      return res.status(400).json({ 
        error: 'Either log_content or log_source_url is required' 
      });
    }
    
    let logContent = log_content;
    
    // Fetch log from URL if provided
    if (log_source_url && !log_content) {
      logContent = await fetchLogContent(log_source_url);
    }
    
    // Validate log content
    if (!logContent || typeof logContent !== 'string' || logContent.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Log content is empty or invalid' 
      });
    }
    
    // Truncate very large logs to avoid token limits
    const MAX_LOG_LENGTH = 10000;
    if (logContent.length > MAX_LOG_LENGTH) {
      logContent = logContent.substring(0, MAX_LOG_LENGTH) + '\n...[log truncated]';
    }
    
    // Analyze log with Gemini
    const analysis = await analyzeLogWithGemini(logContent);
    
    // Ensure response has the expected structure
    const structuredResponse = {
      summary: analysis.summary || 'No summary provided',
      actionable_steps: Array.isArray(analysis.actionable_steps) 
        ? analysis.actionable_steps.filter(step => step && typeof step === 'string')
        : ['Check the error details and investigate further']
    };
    
    return res.status(200).json(structuredResponse);
    
  } catch (error) {
    console.error('[analyze-logs] Error:', error.message);
    
    // Return user-friendly error
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      summary: 'Failed to analyze log',
      actionable_steps: ['Check the API configuration', 'Verify the log format', 'Try again later']
    });
  }
}

// Vercel serverless function configuration
export const config = {
  maxDuration: 30, // 30 second maximum execution time
};