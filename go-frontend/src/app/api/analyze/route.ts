import { AzureOpenAI } from "openai";
import { NextRequest, NextResponse } from "next/server";

const client = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview",
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4",
});

const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4";

export async function POST(req: NextRequest) {
  try {
    const { cryptoData, allMarketData, shortAnalysis } = await req.json();

    // Create system prompt for AI agent
    const systemPrompt = shortAnalysis 
      ? `You are a concise cryptocurrency analyst. Provide BRIEF, actionable insights in 2-3 short sentences.
Focus on: current sentiment, key price movement, and one clear recommendation.
Keep it under 50 words. Use simple language. Be direct.`
      : `You are an expert cryptocurrency analyst and trading advisor. 
Your role is to analyze real-time cryptocurrency data and provide actionable insights.
You should consider:
- Price trends and momentum
- Volume analysis
- Market sentiment
- Support and resistance levels
- Potential risks and opportunities
- Comparative analysis with other cryptocurrencies

Be concise, professional, and data-driven in your analysis.`;

    // Create user prompt with market data
    const userPrompt = shortAnalysis
      ? `Quick analysis for ${cryptoData.name} (${cryptoData.symbol}):
Price: $${cryptoData.price.toLocaleString()} (${cryptoData.changePercent24h >= 0 ? '+' : ''}${cryptoData.changePercent24h.toFixed(2)}% 24h)

Give: 1) Sentiment 2) Key insight 3) Action (Buy/Hold/Sell). Keep it VERY brief.`
      : `Analyze the following cryptocurrency data and provide insights:

**${cryptoData.name} (${cryptoData.symbol})**
- Current Price: $${cryptoData.price.toLocaleString()}
- 24h Change: ${cryptoData.changePercent24h >= 0 ? '+' : ''}${cryptoData.changePercent24h.toFixed(2)}%
- 24h High: $${cryptoData.high24h.toLocaleString()}
- 24h Low: $${cryptoData.low24h.toLocaleString()}
- 24h Volume: $${cryptoData.volume24h.toLocaleString()}
- Market Cap: $${cryptoData.marketCap.toLocaleString()}

**Market Context:**
${allMarketData.map((c: any) => 
  `- ${c.name} (${c.symbol}): $${c.price.toLocaleString()} (${c.changePercent24h >= 0 ? '+' : ''}${c.changePercent24h.toFixed(2)}%)`
).join('\n')}

Provide a comprehensive analysis including:
1. Current market sentiment
2. Technical analysis
3. Key observations
4. Potential trading opportunities or risks
5. Recommendation (Buy/Hold/Sell) with reasoning`;

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const events = await client.chat.completions.create({
            model: deploymentName,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: shortAnalysis ? 100 : 1000,
            temperature: 0.7,
            stream: true,
          });

          for await (const event of events) {
            const content = event.choices[0]?.delta?.content || "";
            if (content) {
              const data = `data: ${JSON.stringify({ content })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error: any) {
          console.error("Error in streaming:", error);
          const errorMessage = `data: ${JSON.stringify({ 
            error: error.message || "Failed to generate analysis" 
          })}\n\n`;
          controller.enqueue(encoder.encode(errorMessage));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Error in analyze API:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze data" },
      { status: 500 }
    );
  }
}
