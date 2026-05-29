import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "https://esm.sh/@google/genai@0.2.0";

// Declare Deno to satisfy TypeScript in environments without Deno types
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in Edge Function secrets.');
    }

    // Initialize Gemini
    const ai = new GoogleGenAI({ apiKey });

    // Parse request body
    const { action, payload } = await req.json();

    let result;

    switch (action) {
      case 'generateContent': {
        // payload: { model, contents, config }
        const { model, contents, config } = payload;
        const response = await ai.models.generateContent({
          model: model || 'gemini-3-flash-preview',
          contents,
          config
        });
        // We return the full serialized response to let the client handle parsing logic (text, functionCalls, etc)
        // However, edge functions return JSON, so we extract relevant parts
        result = {
            text: response.text,
            functionCalls: response.functionCalls,
            candidates: response.candidates,
            usageMetadata: response.usageMetadata
        };
        break;
      }

      case 'generateImages': {
        // payload: { model, contents, config }
        const { model, contents, config } = payload;
        
        // For 'gemini-2.5-flash-image', we use generateContent.
        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash-image',
            contents,
            config
        });
        
        // Extract base64 image data manually because response.text might be empty for images
        let images = [];
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    images.push({
                        mimeType: part.inlineData.mimeType,
                        data: part.inlineData.data
                    });
                }
            }
        }
        result = { images };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});