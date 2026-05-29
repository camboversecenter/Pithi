
import { supabase } from './supabaseConfig';
import { getCurrentUser } from './authService';
import { createCeremony, getServices, getCeremonies, createBooking } from './dataService';
import { UserRole } from '../types';

// Helper to call Edge Function
const callGeminiFunction = async (action: string, payload: any) => {
    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: { action, payload }
    });

    if (error) throw new Error(error.message);
    if (data.error) throw new Error(data.error);
    return data;
};

export const generateCeremonyPlan = async (ceremonyType: string): Promise<string> => {
  try {
    const prompt = `
      You are an expert event planner in Cambodia. Create a structured 5-point plan for a "${ceremonyType}".
      
      CRITICAL TONE INSTRUCTION:
      - If the event is a Wedding (អាពាហ៍ពិពាហ៍), Birthday (ខួបកំណើត), or Housewarming (ឡើងផ្ទះ), use a CHEERFUL, EXCITING, and CELEBRATORY tone.
      - If the event is a Funeral (បុណ្យសព) or Memorial (បុណ្យរំលឹកវិញ្ញាណក្ខន្ធ), use a RESPECTFUL, SOLEMN, CALM, and SUPPORTIVE tone. Use formal Khmer language appropriate for sadness.
      
      Output Language: Khmer ONLY.
    `;
    
    const result = await callGeminiFunction('generateContent', {
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    return result.text || "ការបង្កើតផែនការបរាជ័យ។";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "សុំទោស ជំនួយការ AI កំពុងមានបញ្ហា។ សូមព្យាយាមម្តងទៀត។";
  }
};

export const generateInvitationMessage = async (ceremonyType: string, hostName: string): Promise<string> => {
    try {
        const prompt = `
            Write a short, polite, and warm invitation message in Khmer for a "${ceremonyType}".
            Host Name: ${hostName}.
            
            Style:
            - Formal yet welcoming.
            - Suitable for a digital invitation card.
            - Length: 2-3 sentences max.
            
            Example output structure: "We are honored to invite you to join our [Event]..."
        `;
        
        const result = await callGeminiFunction('generateContent', {
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        return result.text || "សូមអញ្ជើញចូលរួមជាភ្ញៀវកិត្តិយសក្នុងកម្មវិធីរបស់យើងខ្ញុំ។";
    } catch (error) {
        return "សូមអញ្ជើញចូលរួមជាភ្ញៀវកិត្តិយសក្នុងកម្មវិធីរបស់យើងខ្ញុំ។";
    }
};

export const generateCeremonyBanner = async (ceremonyType: string): Promise<string | null> => {
    try {
        const prompt = `A festive, high-quality, wide aspect ratio banner image for a ${ceremonyType} ceremony in Cambodia. Elegant decorations, traditional Khmer floral patterns, soft lighting, celebratory atmosphere. No text.`;
        
        // Note: We use 'generateImages' action mapping in our proxy for simplicity, 
        // though underneath it might use generateContent with image model
        const result = await callGeminiFunction('generateImages', {
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: "16:9" } }
        });

        if (result.images && result.images.length > 0) {
            const img = result.images[0];
            return `data:${img.mimeType};base64,${img.data}`;
        }
        return null;
    } catch (error) {
        console.error("AI Banner Gen Error:", error);
        throw new Error("AI Banner Generation Failed");
    }
};

export const moderateSocialPost = async (title: string, content: string): Promise<{ allowed: boolean; reason?: string }> => {
    try {
        const prompt = `
            Act as a content moderator for PITHI, a Cambodian Ceremony Management platform. 
            Evaluate the following social post for:
            1. Spam (Promotional links, repeated phrases).
            2. Impolite or aggressive language.
            3. Hate speech or discrimination.
            4. Illegal activities.
            
            Post Title: "${title}"
            Post Content: "${content}"
            
            Output strictly in JSON format: {"allowed": boolean, "reason": "Short reason in Khmer if allowed is false"}.
        `;

        const result = await callGeminiFunction('generateContent', {
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        allowed: { type: "BOOLEAN" },
                        reason: { type: "STRING" }
                    },
                    required: ["allowed"]
                }
            }
        });

        return JSON.parse(result.text || '{"allowed": true}');
    } catch (error) {
        console.error("AI Moderation Error:", error);
        return { allowed: true }; // Default to allowed on error
    }
}

export const generateServicePhoto = async (serviceName: string, role: string): Promise<string | null> => {
    try {
        const prompt = `A professional, high-quality, clear promotional photo for a ${role} service in Cambodia named '${serviceName}'. Elegant setting, natural lighting, professional presentation, appealing to customers. High resolution, 4k. No text.`;
        
        const result = await callGeminiFunction('generateImages', {
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: "4:3" } }
        });

        if (result.images && result.images.length > 0) {
            const img = result.images[0];
            return `data:${img.mimeType};base64,${img.data}`;
        }
        return null;
    } catch (error) {
        console.error("AI Service Photo Gen Error:", error);
        throw new Error("AI Service Photo Generation Failed");
    }
};

export const generateServiceDescription = async (serviceName: string, role: string): Promise<string> => {
    try {
        const result = await callGeminiFunction('generateContent', {
            model: 'gemini-2.5-flash',
            contents: `Write a short, professional marketing description (2 sentences) in Khmer for a ${role} service named "${serviceName}".`,
        });
        return result.text || "ការបង្កើតការពិពណ៌នាបរាជ័យ។";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "សូមសរសេរការពិពណ៌នាដោយខ្លួនឯង។";
    }
}

export const scanBankReceipt = async (base64Image: string): Promise<{ amount?: number; currency?: string; senderName?: string; date?: string; transactionId?: string } | null> => {
    try {
        const base64Data = base64Image.split(',')[1] || base64Image;
        const result = await callGeminiFunction('generateContent', {
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    { text: "Analyze this bank transfer receipt image. Extract the transaction amount, currency (USD or KHR), sender name, transaction date, and transaction ID/Reference Number." }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        amount: { type: "NUMBER" },
                        currency: { type: "STRING" },
                        senderName: { type: "STRING" },
                        date: { type: "STRING" },
                        transactionId: { type: "STRING" }
                    }
                }
            }
        });
        return JSON.parse(result.text || '{}');
    } catch (error) {
        console.error("Gemini Scan Error:", error);
        return null;
    }
}

export const scanBusinessCard = async (base64Image: string): Promise<{ name?: string; phoneNumber?: string } | null> => {
    try {
        const base64Data = base64Image.split(',')[1] || base64Image;
        const result = await callGeminiFunction('generateContent', {
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    { text: "Analyze this business card image. Extract the person's full name and primary phone number." }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING" },
                        phoneNumber: { type: "STRING" }
                    }
                }
            }
        });
        return JSON.parse(result.text || '{}');
    } catch (error) {
        console.error("Gemini Scan Error:", error);
        return null;
    }
}

// --- Chat & Tools ---

const createCeremonyTool = {
    name: "createCeremony",
    description: "Create a new ceremony or event in the system. Use this when the user explicitly asks to create, schedule, or add a new event/ceremony with specific details like title, date, and type.",
    parameters: {
        type: "OBJECT",
        properties: {
            title: { type: "STRING", description: "The title of the ceremony" },
            type: { type: "STRING", description: "The type of ceremony" },
            date: { type: "STRING", description: "The date of the event in YYYY-MM-DD format" },
            location: { type: "STRING", description: "The location of the event" },
            description: { type: "STRING", description: "A short description of the event" }
        },
        required: ["title", "type", "date"]
    }
};

const bookServiceTool = {
    name: "bookService",
    description: "Book a service provider (Chef, Band, Hall, etc.) for a specific ceremony. Use this when the user wants to make a booking.",
    parameters: {
        type: "OBJECT",
        properties: {
            serviceName: { type: "STRING", description: "The name of the service or provider to book" },
            ceremonyTitle: { type: "STRING", description: "The title of the ceremony to book for" },
            date: { type: "STRING", description: "Date of booking YYYY-MM-DD" },
            startTime: { type: "STRING", description: "Start time HH:mm" },
            endTime: { type: "STRING", description: "End time HH:mm" }
        },
        required: ["serviceName", "ceremonyTitle", "date", "startTime", "endTime"]
    }
};

export const chatWithAI = async (context: string, history: { role: string, parts: { text: string }[] }[]): Promise<string> => {
    try {
        const systemInstruction = `You are a smart and helpful AI assistant for PITHI (Cambodian Ceremony Management Platform). Respond in Khmer. Context: ${context}`;
        
        // We pass the tool definitions to the edge function
        const result = await callGeminiFunction('generateContent', {
            model: 'gemini-3-flash-preview',
            contents: history,
            config: { 
                systemInstruction,
                tools: [{ functionDeclarations: [createCeremonyTool, bookServiceTool] }]
            }
        });

        const functionCalls = result.functionCalls;
        
        // Client-side tool execution logic
        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            const user = getCurrentUser();
            if (!user) return "សូមអភ័យទោស អ្នកត្រូវចូលគណនីជាមុនសិន។";

            if (call.name === 'createCeremony') {
                const args = call.args;
                await createCeremony({ 
                    title: args.title, 
                    type: args.type, 
                    date: args.date, 
                    description: args.description || `បង្កើតដោយ AI Assistant`, 
                    organizerId: user.id, 
                    ownerId: user.id 
                });
                return `✅ ខ្ញុំបានបង្កើតកម្មវិធី "${args.title}" រួចរាល់ហើយ!`;
            }

            if (call.name === 'bookService') {
                const args = call.args;
                const roleToFetch = user.role === UserRole.ORGANIZER ? UserRole.ORGANIZER : UserRole.GENERAL_USER;
                const myCeremonies = await getCeremonies(user.id, roleToFetch, 1, 1000, 'ALL');
                const targetCeremony = myCeremonies.data.find(c => c.title.toLowerCase().includes(args.ceremonyTitle.toLowerCase()));
                if (!targetCeremony) return `❌ ខ្ញុំរកមិនឃើញកម្មវិធីឈ្មោះ "${args.ceremonyTitle}" ទេ។`;
                
                const allServices = await getServices(undefined, 1, 1000);
                const targetService = allServices.data.find(s => s.name.toLowerCase().includes(args.serviceName.toLowerCase()));
                if (!targetService) return `❌ ខ្ញុំរកមិនឃើញសេវាកម្មឈ្មោះ "${args.serviceName}" ទេ។`;
                
                await createBooking({ 
                    serviceId: targetService.id, 
                    ceremonyId: targetCeremony.id, 
                    bookedByUserId: user.id, 
                    bookedByUserName: user.name, 
                    providerId: targetService.providerId, 
                    date: args.date, 
                    startTime: args.startTime, 
                    endTime: args.endTime, 
                    serviceName: targetService.name, 
                    price: targetService.price 
                });
                return `✅ ជោគជ័យ! បានកក់ "${targetService.name}"។`;
            }
        }
        return result.text || "ខ្ញុំមិនអាចឆ្លើយតបបានទេនៅពេលនេះ។";
    } catch (error) {
        console.error(error);
        return "មានបញ្ហាបច្ចេកទេសក្នុងការភ្ជាប់ទៅកាន់ AI។ សូមព្យាយាមម្តងទៀត។";
    }
};
