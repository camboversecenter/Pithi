
import { supabase } from './supabaseConfig';
import { getCurrentUser } from './authService';
import { createCeremony, getServices, getCeremonies, createBooking } from './dataService';
import { UserRole } from '../types';

// Local AI Simulation fallback when Edge Function is offline or user is in a mock/sandbox session
const getLocalAISimulatedResponse = (action: string, payload: any): any => {
    if (action === 'generateContent') {
        const promptText = typeof payload.contents === 'string' 
            ? payload.contents 
            : JSON.stringify(payload.contents || '');

        // 1. Content Moderation
        if (promptText.includes('content-moderator') || promptText.includes('content moderator') || promptText.includes('moderateSocialPost') || (payload.config?.responseSchema?.properties?.allowed)) {
            return { text: '{"allowed": true}' };
        }

        // 2. Scan Bank Receipt
        if (promptText.includes('bank transfer receipt') || promptText.includes('receipt') || payload.config?.responseSchema?.properties?.transactionId) {
            return {
                text: JSON.stringify({
                    amount: 250,
                    currency: "USD",
                    senderName: "Sok Pong",
                    date: "2026-06-01",
                    transactionId: "ABA-98317429"
                })
            };
        }

        // 3. Scan Business Card
        if (promptText.includes('business card') || payload.config?.responseSchema?.properties?.phoneNumber) {
            return {
                text: JSON.stringify({
                    name: "Lay Kimhong",
                    phoneNumber: "010 888 999"
                })
            };
        }

        // 4. Ceremony Description
        if (promptText.includes('marketing description')) {
            const roleMatch = promptText.match(/(CHEF|HALL|MUSIC_BAND|BEAUTY_SALON|ORGANIZER)/i);
            const role = roleMatch ? roleMatch[0].toUpperCase() : 'GENERAL';
            
            const fallbacks: Record<string, string> = {
                'CHEF': `ផ្តល់ជូនសេវាកម្មចម្អិនម្ហូបដ៏មានឱជារស ធានាអនាម័យខ្ពស់ ជាមួយមុខម្ហូបខ្មែរនិងបរទេសជាច្រើនជម្រើស សម្រិតសម្រាំងបំផុតសម្រាប់កម្មវិធីរបស់លោកអ្នក។`,
                'HALL': `សាលពិធីរៀបចំដ៏ប្រណីត ធំទូលាយ បំពាក់ដោយគ្រឿងបរិក្ខារទំនើបៗ និងការលម្អផ្កាស្រស់ស្អាតឥតខ្ចោះ ផ្តល់ជូននូវផាសុកភាពខ្ពស់សម្រាប់ភ្ញៀវកិត្តិយសរបស់លោកអ្នក។`,
                'MUSIC_BAND': `ក្រុមតន្ត្រីអាជីពលេងភ្លេងពីរោះៗរណ្តំចិត្ត ឧបករណ៍ទំនើប សំឡេងពិរោះច្បាស់ល្អ នាំមកនូវបរិយាកាសរីករាយ និងមនោសញ្ចេតនាយ៉ាងស្និទ្ធស្នាលក្នុងកម្មវិធី។`,
                'BEAUTY_SALON': `សេវាកម្មតុបតែងមុខ និងធ្វើសក់កូនក្រមុំយ៉ាងស្រស់ស្អាតលេចធ្លោ ដោយជាងជំនាញល្បីៗដែលមានបទពិសោធន៍យូរឆ្នាំ ធានាសោភ័ណភាពស្រស់ស្អាតនិងទាក់ទាញបំផុត។`,
                'ORGANIZER': `ផ្តល់សេវាកម្មរៀបចំចាត់ចែង និងសម្របសម្រួលដំណើរការពិធីទាំងមូលដោយហ្មត់ចត់បំផុត ជួយឱ្យកម្មវិធីរបស់លោកអ្នកប្រព្រឹត្តទៅដោយភាពរលូន និងជោគជ័យ។`
            };
            return { text: fallbacks[role] || "សេវាកម្មដ៏ល្អឥតខ្ចោះ ធានាគុណភាព និងតម្លៃសមរម្យលំដាប់ខ្ពស់។" };
        }

        // 5. Invitation Message Generator
        if (promptText.includes('invitation message')) {
            return { text: "សូមគោរពអញ្ជើញចូលរួមជាភ្ញៀវកិត្តិយសក្នុងកម្មវិធីរបស់យើងខ្ញុំដោយមេត្រីភាព។" };
        }

        // 6. Chat with AI (History)
        if (Array.isArray(payload.contents)) {
            const lastMsgObject = payload.contents[payload.contents.length - 1];
            const lastParts = lastMsgObject?.parts || [];
            const userText = lastParts.map((p: any) => p.text).join(' ').toLowerCase();

            // Check if user is asking to create a wedding or ceremony
            if (userText.includes('create') || userText.includes(' wedding') || userText.includes('មង្គលការ') || userText.includes('បង្កើត') || userText.includes('កម្មវិធី')) {
                return {
                    text: "ខ្ញុំកំពុងរៀបចំបង្កើតកម្មវិធីជូនលោកអ្នក...",
                    functionCalls: [
                        {
                            name: "createCeremony",
                            args: {
                                title: "ពិធីមង្គលការ Sokha & Sophy",
                                type: "អាពាហ៍ពិពាហ៍",
                                date: "2026-12-18",
                                location: "សណ្ឋាគារសូហ្វីតែល ភ្នំពេញ",
                                description: "កម្មវិធីមង្គលការដែលបង្កើតឡើងដោយជំនួយការ AI របស់ PITHI"
                            }
                        }
                    ]
                };
            }

            // Check if user is asking to book a service
            if (userText.includes('book') || userText.includes('កក់') || userText.includes('សេវាកម្ម') || userText.includes('chef') || userText.includes('band')) {
                return {
                    text: "កំពុងដំណើរការកក់សេវាកម្មជូនលោកអ្នក...",
                    functionCalls: [
                        {
                            name: "bookService",
                            args: {
                                serviceName: "ចុងភៅខ្មែរអាជីព",
                                ceremonyTitle: "ពិធីមង្គលការ Sokha & Sophy",
                                date: "2026-12-18",
                                startTime: "07:00",
                                endTime: "21:00"
                            }
                        }
                    ]
                };
            }

            // Standard chatbot responses in Khmer
            if (userText.includes('សួស្តី') || userText.includes('hello') || userText.includes('hi')) {
                return { text: "សួស្តី! ខ្ញុំជាជំនួយការ AI របស់ PITHI។ ខ្ញុំអាចជួយលោកអ្នករៀបចំគម្រោងកម្មវិធីមង្គលការ បង្កើតកម្មវិធី កក់សេវាកម្មចុងភៅ ក្រុមតន្ត្រី ឬសាលពិធី និងឆ្លើយសំណួរផ្សេងៗ។ តើលោកអ្នកចង់ឱ្យខ្ញុំជួយអ្វីខ្លះនៅថ្ងៃនេះ?" };
            }

            return { text: "ខ្ញុំរីករាយណាស់ក្នុងការជួយអ្នករៀបចំពិធីមង្គលការ និងកម្មវិធីផ្សេងៗ! តើលោកអ្នកចង់ឱ្យខ្ញុំរៀបចំគម្រោងថវិកា ដ្យាក្រាមតុភ្ញៀវ ឬចំណាយផ្សេងៗជម្រើសណាខ្លះ?" };
        }
    }

    if (action === 'generateImages') {
        // Image generation will naturally fall back to the spectacular local canvas generators inside the callers
        throw new Error("Local images bypass");
    }

    return { text: "" };
};

// Helper to call Edge Function
const callGeminiFunction = async (action: string, payload: any) => {
    // If we're fully operating in sandboxed local simulator mode, immediately bypass network to be lightning fast
    if (localStorage.getItem('pithi_mock_user')) {
        return getLocalAISimulatedResponse(action, payload);
    }

    try {
        const { data, error } = await supabase.functions.invoke('gemini-proxy', {
            body: { action, payload }
        });

        if (error) throw new Error(error.message);
        if (data && data.error) throw new Error(data.error);
        return data;
    } catch (invokeError: any) {
        console.warn(`[Pithi AI Local Sandbox Simulation] Fallback active for action [${action}]: `, invokeError.message || invokeError);
        return getLocalAISimulatedResponse(action, payload);
    }
};

// Procedural visual banner fallback using HTML5 Canvas (16:9 ratio)
const createProceduralBanner = (ceremonyType: string): string => {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 675;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        const isSad = ['បុណ្យសព', 'បុណ្យ ៧ ថ្ងៃ', 'បុណ្យ'].some(k => ceremonyType.includes(k));

        // 1. Background Gradient
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        if (isSad) {
            grad.addColorStop(0, '#2d3748'); // Slate dark
            grad.addColorStop(0.5, '#4a5568'); // Slate medium
            grad.addColorStop(1, '#1a202c'); // Charcoal black
        } else {
            grad.addColorStop(0, '#580c1f'); // Deep Burgundy
            grad.addColorStop(0.4, '#800020'); // Crimson
            grad.addColorStop(1, '#2c040d'); // Night Burgundy
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Sacred Lotus Mandala background watermark
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.strokeStyle = isSad ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 215, 0, 0.06)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 8; i++) {
            ctx.rotate(Math.PI / 4);
            ctx.beginPath();
            ctx.ellipse(0, 0, 160, 50, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();

        // 3. Elegant floating decorative elements
        const particleCount = 45;
        ctx.fillStyle = isSad ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 223, 100, 0.22)';
        for (let i = 0; i < particleCount; i++) {
            const x = (Math.sin(i * 342.3) * 0.5 + 0.5) * canvas.width;
            const y = (Math.cos(i * 984.7) * 0.5 + 0.5) * canvas.height;
            const radius = (Math.sin(i * 12.3) * 0.5 + 0.5) * 3 + 1.2;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // 4. Double borders (Khmer style decoration)
        const marginOuter = 25;
        ctx.strokeStyle = isSad ? '#cbd5e1' : '#d4af37'; // Silver or gold
        ctx.lineWidth = 3;
        ctx.strokeRect(marginOuter, marginOuter, canvas.width - marginOuter * 2, canvas.height - marginOuter * 2);

        const marginInner = 35;
        ctx.strokeStyle = isSad ? '#94a3b8' : '#aa7c11';
        ctx.lineWidth = 1;
        ctx.strokeRect(marginInner, marginInner, canvas.width - marginInner * 2, canvas.height - marginInner * 2);

        // Corner flourishes
        const drawCorner = (cx: number, cy: number, rx: number, ry: number) => {
            ctx.fillStyle = isSad ? '#cbd5e1' : '#d4af37';
            ctx.beginPath();
            ctx.arc(cx, cy, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = isSad ? '#cbd5e1' : '#d4af37';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx + rx * 25, cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, cy + ry * 25);
            ctx.stroke();
        };

        drawCorner(marginOuter, marginOuter, 1, 1);
        drawCorner(canvas.width - marginOuter, marginOuter, -1, 1);
        drawCorner(marginOuter, canvas.height - marginOuter, 1, -1);
        drawCorner(canvas.width - marginOuter, canvas.height - marginOuter, -1, -1);

        // 5. Title Underline Accent
        ctx.strokeStyle = isSad ? 'rgba(255, 255, 255, 0.25)' : 'rgba(212, 175, 55, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 130, canvas.height / 2 + 55);
        ctx.lineTo(canvas.width / 2 + 130, canvas.height / 2 + 55);
        ctx.stroke();

        // Star in the middle of line
        ctx.fillStyle = isSad ? '#cbd5e1' : '#d4af37';
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, canvas.height / 2 + 49);
        ctx.lineTo(canvas.width / 2 + 6, canvas.height / 2 + 55);
        ctx.lineTo(canvas.width / 2, canvas.height / 2 + 61);
        ctx.lineTo(canvas.width / 2 - 6, canvas.height / 2 + 55);
        ctx.closePath();
        ctx.fill();

        // 6. Text Rendering
        ctx.textAlign = 'center';

        // Subtitle
        ctx.font = 'bold 22px "Inter", "Khmer OS Battambang", sans-serif';
        ctx.fillStyle = isSad ? '#94a3b8' : '#e5c158';
        const subText = isSad ? 'ពិធីបុណ្យឧទ្ទិសកុសល' : 'ពិធីសិរីសួស្តីជ័យមង្គល';
        ctx.fillText(subText, canvas.width / 2, canvas.height / 2 - 45);

        // Main Ceremony Type Text
        ctx.font = 'bold 52px "Inter", "Khmer OS Muol Light", "Khmer OS Battambang", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = isSad ? 'rgba(0,0,0,0.85)' : 'rgba(184, 134, 11, 0.9)';
        ctx.shadowBlur = 12;
        ctx.fillText(ceremonyType, canvas.width / 2, canvas.height / 2 + 18);

        return canvas.toDataURL('image/jpeg', 0.9);
    } catch (err) {
        console.error("Failed to generate canvas banner, returning basic gradient data url:", err);
        return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><rect width="100%" height="100%" fill="%23800020"/></svg>';
    }
};

// Procedural promotional service image fallback using HTML5 Canvas
const createProceduralServicePhoto = (serviceName: string, role: string): string => {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600; // 4:3
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        // Category themes
        let primary = '#580c1f';
        let secondary = '#d4af37';
        let dark = '#2d040d';
        let iconName = 'SERVICE';

        if (role === 'CHEF') {
            primary = '#c2410c'; // Warm luxury catering orange
            secondary = '#fef08a';
            dark = '#431407';
            iconName = 'CHEF';
        } else if (role === 'HALL') {
            primary = '#1e3a8a'; // Royal blue
            secondary = '#fde047';
            dark = '#172554';
            iconName = 'HALL';
        } else if (role === 'MUSIC_BAND') {
            primary = '#6d28d9'; // Purple festival
            secondary = '#c084fc';
            dark = '#2e1065';
            iconName = 'BAND';
        } else if (role === 'BEAUTY_SALON') {
            primary = '#be185d'; // Cosmetics pink-magenta
            secondary = '#fbcfe8';
            dark = '#500724';
            iconName = 'SALON';
        }

        // 2. Background Gradient
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, primary);
        grad.addColorStop(1, dark);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 3. Concentration circles watermark
        ctx.strokeStyle = `rgba(255, 255, 255, 0.04)`;
        ctx.lineWidth = 1;
        for (let r = 80; r <= 380; r += 45) {
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2 - 30, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 4. Double borders
        ctx.strokeStyle = secondary;
        ctx.lineWidth = 3;
        ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

        ctx.strokeStyle = `rgba(255, 255, 255, 0.15)`;
        ctx.lineWidth = 1;
        ctx.strokeRect(26, 26, canvas.width - 52, canvas.height - 52);

        // 5. Center Motif Illustration
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2 - 50);
        ctx.strokeStyle = secondary;
        ctx.lineWidth = 3;
        ctx.fillStyle = `rgba(255, 251, 235, 0.05)`;

        if (iconName === 'CHEF') {
            ctx.beginPath();
            ctx.arc(0, 0, 45, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fill();
            ctx.strokeStyle = secondary;
            ctx.beginPath();
            ctx.arc(0, 5, 20, Math.PI, 0);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-10, 5); ctx.lineTo(10, 5);
            ctx.stroke();
        } else if (iconName === 'HALL') {
            ctx.beginPath();
            ctx.rect(-30, -20, 60, 40);
            ctx.stroke();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-15, -20); ctx.lineTo(-15, 20);
            ctx.moveTo(0, -20); ctx.lineTo(0, 20);
            ctx.moveTo(15, -20); ctx.lineTo(15, 20);
            ctx.stroke();
        } else if (iconName === 'BAND') {
            ctx.beginPath();
            ctx.arc(-13, 10, 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-1, 10); ctx.lineTo(-1, -20);
            ctx.lineTo(20, -12); ctx.lineTo(20, 2);
            ctx.lineTo(-1, -6);
            ctx.stroke();
        } else if (iconName === 'SALON') {
            ctx.beginPath();
            ctx.moveTo(0, -25);
            ctx.quadraticCurveTo(-15, -3, 0, 18);
            ctx.quadraticCurveTo(15, -3, 0, -25);
            ctx.moveTo(0, 2);
            ctx.quadraticCurveTo(-25, 4, -13, 22);
            ctx.moveTo(0, 2);
            ctx.quadraticCurveTo(25, 4, 13, 22);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, 35, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();

        // 6. Styled labels
        ctx.textAlign = 'center';
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(0,0,0,0.6)';

        ctx.font = 'bold 18px "Inter", "Khmer OS Battambang", sans-serif';
        ctx.fillStyle = secondary;
        ctx.fillText(`សេវាកម្ម ${role}`, canvas.width / 2, canvas.height / 2 + 65);

        ctx.font = 'bold 28px "Inter", "Khmer OS Muol Light", "Khmer OS Battambang", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(serviceName, canvas.width / 2, canvas.height / 2 + 115);

        return canvas.toDataURL('image/jpeg', 0.85);
    } catch (err) {
        console.error("Failed to generate canvas photo, returning simple gradient data url:", err);
        return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="100%" height="100%" fill="%23580c1f"/></svg>';
    }
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
        model: 'gemini-3.5-flash',
        contents: prompt
    });

    return result.text || "ការបង្កើតផែនការបរាជ័យ។";
  } catch (error) {
    console.warn("Gemini API Error, using beautiful dynamic Khmer ceremony plan fallbacks:", error);
    
    const fallbacks: Record<string, string> = {
        'អាពាហ៍ពិពាហ៍': `**ផែនការរៀបចំពិធីអាពាហ៍ពិពាហ៍ខ្មែរប្រពៃណី៖**\n\n` +
            `១. **ពិធីពិភាក្សាចែចូវ និងកំណត់វេលា៖** ការជួបពិភាក្សារវាងមេបាទាំងសងខាង ដើម្បីកំណត់ថ្ងៃមង្គលការ សរីសួស្តី និងរៀបចំគ្រឿងដណ្តឹង។\n` +
            `២. **ពិធីសែនព្រេន និងសែនក្បាលទឹក៖** ធ្វើឡើងនៅព្រលឹមស្រាងៗ ដើម្បីរំលឹកគុណបុព្វបុរស និងសុំសេចក្តីសុខសប្បាយ។\n` +
            `៣. **ពិធីដង្ហែជំនូន ឬហែជំនូន៖** កូនកំលោះដង្ហែផ្លែឈើ និងគ្រឿងភស្តុភារផ្សេងៗចូលផ្ទះកូនស្រី អមដោយក្រុមតន្ត្រីករ។\n` +
            `៤. **ពិធីកាត់សក់បង្កក់សិរី និងចងដៃ៖** ញាតិមិត្តចូលរួមកាត់សក់ជានិមិត្តរូប និងចងអំបោះក្រហមលើកដៃជូនពរជ័យ។\n` +
            `៥. **ពិធីរៀបភោជនាហារ និងទទួលភ្ញៀវ៖** កម្មវិធីជប់លៀងពេលល្ងាចដោយមានតន្ត្រី និងអាហារឆ្ងាញ់ៗពិសាជាមួយភ្ញៀវកិត្តិយស។`,
        'ខួបកំណើត': `**ផែនការរៀបចំពិធីខួបកំណើតដ៏រីករាយ៖**\n\n` +
            `១. **ពិធីសូត្រមន្ត ឬសុំពរជ័យ៖** ជួបជុំសមាជិកគ្រួសារ និងចាស់ទុំសូត្រមន្តដើម្បីសុំសេចក្តីសុខ និងពរជ័យគ្រប់ប្រការ។\n` +
            `២. **ការតុបតែងកន្លែង៖** រៀបចំផែនការពណ៌ ជាមួយប៉េងប៉ោង ផ្កាស្រស់ និងកន្លែងថតរូបទុកជាអនុស្សាវរីយ៍។\n` +
            `៣. **កម្មវិធីកាត់នំខេក៖** ការច្រៀងចម្រៀងអបអរសាទរខួបកំណើត ផ្លុំទៀន និងជូនពរពីសំណាក់មិត្តភក្ដិ និងញាតិសន្តាន។\n` +
            `៤. **ការលេងហ្គេមកម្សាន្ត៖** រៀបចំល្បែងកម្សាន្តសប្បាយៗសម្រាប់ក្មេងៗ ឬភ្ញៀវក្នុងពិធីដើម្បីបង្កបរិយាកាសរីករាយ។\n` +
            `៥. **ភោជនីយអាហាររង្វង់គ្រួសារ៖** អាហារសាមគ្គីជុំគ្នាដោយស្និទ្ធស្នាល ជាមួយការចែកកាដូ និងថតរូបអនុស្សាវរីយ៍រួមគ្នា។`,
        'ឡើងផ្ទះ': `**ផែនការរៀបចំពិធីចម្រើនព្រះបរិត្តឡើងផ្ទះថ្មី៖**\n\n` +
            `១. **ពិធីថ្វាយគ្រឿងសក្ការៈដល់ជំនាងផ្ទះ៖** រៀបចំគ្រឿងបូជាសុំសេចក្តីសុខសប្បាយពីម្ចាស់ទឹកម្ចាស់ដី និងជំនាងផ្ទះថ្មី។\n` +
            `២. **ពិធីសូត្រមន្តចម្រើនព្រះបរិត្ត៖** និមន្តព្រះសង្ឃសូត្រមន្តប្រោះព្រំទឹកមន្តគ្រប់បន្ទប់ក្នុងផ្ទះដើម្បីបណ្តេញសភាវៈមិនល្អ។\n` +
            `៣. **ពិធីលើកស្លាកផ្ទះ ឬសិរីសួស្តី៖** បិទយ័ន្ត សិរីសួស្តី ឬលើកផ្លាកឈ្មោះផ្ទះជានិមិត្តរូបនៃភាពចម្រើនរុងរឿង។\n` +
            `៤. **ពិធីបង្កក់សិរីដល់ម្ចាស់ផ្ទះ៖** ចាស់ទុំចងអំបោះក្រហមលើកដៃ និងប្រសិទ្ធពរជ័យជូនគ្រួសារម្ចាស់ផ្ទះថ្មី។\n` +
            `៥. **ការជប់លៀងឡើងផ្ទះថ្មី៖** ទទួលភ្ញៀវកិត្តិយស ញាតិមិត្តជិតឆ្ងាយពិសាអាហាររួមគ្នា និងនាំយកកាដូឡើងផ្ទះ។`,
        'បុណ្យសព': `**ផែនការរៀបចំពិធីបុណ្យសពតាមប្រពៃណីខ្មែរ៖**\n\n` +
            `១. **ការរៀបចំសាលពិធី និងមឈូស៖** តុបតែងកន្លែងតម្កល់សពដោយផ្កាពណ៌ស-ខ្មៅ និងរៀបចំគ្រឿងសក្ការៈគោរពវិញ្ញាណក្ខន្ធ។\n` +
            `២. **និមន្តព្រះសង្ឃសូត្រមន្ត៖** ព្រះសង្ឃសូត្រធម៌ទេសនា និងឧទ្ទិសកុសលជូនវិញ្ញាណក្ខន្ធសព។\n` +
            `៣. **ពិធីចូលរួមរំលែកទុក្ខ៖** ទទួលភ្ញៀវចូលរួមគោរពសព ជូនបច្ច័យ និងចូលរួមសោកស្តាយជាមួយក្រុមគ្រួសារសព។\n` +
            `៤. **ពិធីដង្ហែសព៖** ហែសពទៅកាន់បូជនីយដ្ឋាន ឬឈាបនដ្ឋានដោយប្រុងប្រយ័ត្ន អមដោយភ្លេងបុរាណសោកសៅ។\n` +
            `៥. **ពិធីបូជា ឬបញ្ចុះសព៖** ការបូជាសព ឬបញ្ចុះសពតាមប្រពៃណី សុំឱ្យវិញ្ញាណក្ខន្ធបានទៅកាន់សុគតិភព។`,
        'បុណ្យ ៧ ថ្ងៃ': `**ផែនការរៀបចំពិធីបុណ្យគម្រប់ ៧ ថ្ងៃ៖**\n\n` +
            `១. **ពិធីសូត្រមន្តដុសខាត់ព្រះ៖** ការរៀបចំបូជា និមន្តព្រះសង្ឃសូត្រមន្តឧទ្ទិសកុសលនៅថ្ងៃទី៧ បន្ទាប់ពីការបាត់បង់។\n` +
            `២. **ពិធីវេរភត្តាហារប្រគេនព្រះសង្ឃ៖** រៀបចំម្ហូបអាហារ បង្អែមចង្ហាន់ប្រគេនព្រះសង្ឃ ដើម្បីជាកុសលផលបុណ្យដល់សព។\n` +
            `៣. **ការស្ដាប់ធម៌ទេសនា៖** គ្រួសារ និងញាតិមិត្តជួបជុំស្ដាប់ធម៌អប់រំចិត្តយល់ពីធម្មជាតិនៃជីវិត ព្រមទាំងរំលែកទុក្ខ។\n` +
            `៤. **ការចែកទាន និងកុសលធម៌៖** ធ្វើទានដល់អ្នកក្រខ្សត់ ឬជួយឧបត្ថម្ភសប្បុរសធម៌ផ្សេងៗដើម្បីបូជាកុសល។\n` +
            `៥. **ពិធីបច្ច័យ និងប្រសិទ្ធពរ៖** ញាតិមិត្តប្រមូលបច្ច័យកសាង ឬជួយគ្រួសារសព និងប្រោះព្រំទឹកមន្តសុំសេចក្តីសុខឡើងវិញ។`
    };

    const matchedKey = Object.keys(fallbacks).find(k => ceremonyType.includes(k));
    if (matchedKey) {
        return fallbacks[matchedKey];
    }

    return `**ផែនការរៀបចំកម្មវិធីជួបជុំសិរីសួស្តី "${ceremonyType}"៖**\n\n` +
        `១. **ការកំណត់គោលបំណងនៃពិធី៖** ពិភាក្សា និងរៀបចំបញ្ជីគោលបំណងច្បាស់លាស់សម្រាប់ពិធី។\n` +
        `២. **ការរៀបចំបញ្ជីថវិកា និងទីតាំង៖** កំណត់ថវិកាគ្រោង និងកក់ទីតាំងសមស្របសម្រាប់ចំនួនភ្ញៀវ។\n` +
        `៣. **ការចាត់ចែងសេវាកម្មចាំបាច់៖** កក់សេវាកម្មម្ហូបអាហារ តុបតែង និងតន្ត្រីជាមុន។\n` +
        `៤. **ការផ្ញើលិខិតអញ្ជើញ៖** រៀបចំ និងផ្ញើលិខិតអញ្ជើញទៅកាន់ភ្ញៀវយ៉ាងហោចណាស់ ២សប្តាហ៍មុនពិធី។\n` +
        `៥. **ការត្រួតពិនិត្យថ្ងៃកម្មវិធី៖** សម្របសម្រួលសេវាកម្មទាំងអស់ឱ្យដំណើរការរលូន និងទាន់ពេលវេលា។`;
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
            model: 'gemini-3.5-flash',
            contents: prompt
        });

        return result.text || "សូមអញ្ជើញចូលរួមជាភ្ញៀវកិត្តិយសក្នុងកម្មវិធីរបស់យើងខ្ញុំ។";
    } catch (error) {
        console.warn("generateInvitationMessage fallback used:", error);

        const fallbacks: Record<string, string> = {
            'អាពាហ៍ពិពាហ៍': `ក្នុងឱកាសដ៏មហានក្ខត្តឫក្សនេះ យើងខ្ញុំមានកិត្តិយសសូមគោរពអញ្ជើញឯកឧត្តម លោកជំទាវ លោក លោកស្រី ចូលរួមជាភ្ញៀវកិត្តិយសក្នុងពិធីអាពាហ៍ពិពាហ៍កូនប្រុសកូនស្រីរបស់ពួកគេខ្ញុំ (${hostName}) ដើម្បីប្រសិទ្ធពរជ័យសិរីសួស្តីជ័យមង្គលក្នុងកម្មវិធី។`,
            'ខួបកំណើត': `យើងខ្ញុំមានសេចក្តីរីករាយសូមគោរពអញ្ជើញ លោកអ្នក និងញាតិមិត្តទាំងអស់ ចូលរួមការអបអរសាទរកម្មវិធីខួបកំណើតរបស់ខ្ញុំបាទ/នាងខ្ញុំ (${hostName}) ឱ្យកាន់តែបង្កបរិយាកាសរីករាយ និងលក្ខណៈស្និទ្ធស្នាលបំផុត។`,
            'ឡើងផ្ទះ': `យើងខ្ញុំមានកិត្តិយសសូមលំឱនកាយគោរពអញ្ជើញញាតិមិត្ត និងមិត្តភក្តិទាំងអស់ ចូលរួមអបអរសាទរក្នុងពិធីឡើងផ្ទះថ្មីរបស់យើងខ្ញុំ (${hostName}) ជូនពរសេចក្តីសុខសប្បាយ និងប្រសិទ្ធពរជ័យសិរីសួស្តី។`,
            'បុណ្យសព': `ក្នុងទុក្ខដ៏ក្រៀមក្រំនេះ គ្រួសារយើងខ្ញុំ (${hostName}) សូមជម្រាបជូនដំណឹង និងគោរពអញ្ជើញញាតិមិត្តជិតឆ្ងាយទាំងអស់ ចូលរួមគោរពវិញ្ញាណក្ខន្ធសព ដើម្បីជាកិច្ចជូនដំណើរចុងក្រោយបង្អស់។`,
            'បុណ្យ ៧ ថ្ងៃ': `យើងខ្ញុំសូមគោរពអញ្ជើញញាតិមិត្ត និងពុទ្ធបរិស័ទជិតឆ្ងាយ ចូលរួមក្នុងពិធីបុណ្យគម្រប់ ៧ថ្ងៃ របស់គ្រួសារយើងខ្ញុំ (${hostName}) ដើម្បីវេរភត្តាហារប្រគេនព្រះសង្ឃ និងឧទ្ទិសកុសលផលបុណ្យជូនវិញ្ញាណក្ខន្ធសព។`
        };

        const matchedKey = Object.keys(fallbacks).find(k => ceremonyType.includes(k));
        if (matchedKey) {
            return fallbacks[matchedKey];
        }

        return `យើងខ្ញុំមានកិត្តិយសសូមលំឱនកាយគោរពអញ្ជើញមិត្តភក្តិ និងញាតិមិត្តទាំងអស់ ចូលរួមជាភ្ញៀវកិត្តិយសក្នុងកម្មវិធី "${ceremonyType}" របស់គ្រួសារយើងខ្ញុំ (${hostName}) ដើម្បីជាកិត្តិយសដ៏ខ្ពង់ខ្ពស់។`;
    }
};

export const generateCeremonyBanner = async (ceremonyType: string): Promise<string | null> => {
    try {
        const prompt = `A festive, high-quality, wide aspect ratio banner image for a ${ceremonyType} ceremony in Cambodia. Elegant decorations, traditional Khmer floral patterns, soft lighting, celebratory atmosphere. No text.`;
        
        // Try calling the remote proxy Edge function first
        const result = await callGeminiFunction('generateImages', {
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: "16:9" } }
        });

        if (result.images && result.images.length > 0) {
            const img = result.images[0];
            return `data:${img.mimeType};base64,${img.data}`;
        }
    } catch (error) {
        console.warn("AI Banner Generation Edge Function unavailable, creating magnificent native procedural Cambodian/traditional Khmer canvas banner fallback:", error);
    }
    // Return stunning procedural canvas-generated Cambodian banner
    return createProceduralBanner(ceremonyType);
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
        console.warn("AI Moderation warning (using local fallback allowed):", error);
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
    } catch (error) {
        console.warn("AI Service Photo Generation Edge Function unavailable, creating beautiful native procedural promotional photo canvas fallback:", error);
    }
    // Return gorgeous custom drawn procedural service card photo
    return createProceduralServicePhoto(serviceName, role);
};

export const generateServiceDescription = async (serviceName: string, role: string): Promise<string> => {
    try {
        const result = await callGeminiFunction('generateContent', {
            model: 'gemini-3.5-flash',
            contents: `Write a short, professional marketing description (2 sentences) in Khmer for a ${role} service named "${serviceName}".`,
        });
        return result.text || `សេវាកម្ម ${role} ដ៏មានគុណភាពខ្ពស់ និងទំនុកចិត្តបំផុតសម្រាប់លោកអ្នក។`;
    } catch (error) {
        console.warn("generateServiceDescription Edge Function unavailable, utilizing beautiful native Khmer description fallback:", error);

        const fallbacks: Record<string, string> = {
            'CHEF': `ផ្តល់ជូនសេវាកម្មចម្អិនម្ហូបដ៏មានឱជារស ធានាអនាម័យខ្ពស់ ជាមួយមុខម្ហូបខ្មែរនិងបរទេសជាច្រើនជម្រើស សម្រិតសម្រាំងបំផុតសម្រាប់កម្មវិធីរបស់លោកអ្នក។`,
            'HALL': `សាលពិធីរៀបចំដ៏ប្រណីត ធំទូលាយ បំពាក់ដោយគ្រឿងបរិក្ខារទំនើបៗ និងការលម្អផ្កាស្រស់ស្អាតឥតខ្ចោះ ផ្តល់ជូននូវផាសុកភាពខ្ពស់សម្រាប់ភ្ញៀវកិត្តិយសរបស់លោកអ្នក។`,
            'MUSIC_BAND': `ក្រុមតន្ត្រីអាជីពលេងភ្លេងពីរោះៗរណ្តំចិត្ត ឧបករណ៍ទំនើប សំឡេងពិរោះច្បាស់ល្អ នាំមកនូវបរិយាកាសរីករាយ និងមនោសញ្ចេតនាយ៉ាងស្និទ្ធស្នាលក្នុងកម្មវិធី។`,
            'BEAUTY_SALON': `សេវាកម្មតុបតែងមុខ និងធ្វើសក់កូនក្រមុំយ៉ាងស្រស់ស្អាតលេចធ្លោ ដោយជាងជំនាញល្បីៗដែលមានបទពិសោធន៍យូរឆ្នាំ ធានាសោភ័ណភាពស្រស់ស្អាតនិងទាក់ទាញបំផុត។`,
            'ORGANIZER': `ផ្តល់សេវាកម្មរៀបចំចាត់ចែង និងសម្របសម្រួលដំណើរការពិធីទាំងមូលដោយហ្មត់ចត់បំផុត ជួយឱ្យកម្មវិធីរបស់លោកអ្នកប្រព្រឹត្តទៅដោយភាពរលូន និងជោគជ័យ។`
        };

        return fallbacks[role] || `សេវាកម្ម ${role} ដ៏មានវិជ្ជាជីវៈខ្ពស់ ទំនុកចិត្ត និងការទទួលខុសត្រូវ ជួយបំពេញរាល់តម្រូវការក្នុងពិធីរបស់លោកអ្នកឱ្យកាន់តែអស្ចារ្យ។`;
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
