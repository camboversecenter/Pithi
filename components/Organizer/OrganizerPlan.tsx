
import React, { useState } from 'react';
import { Ceremony } from '../../types';
import { generateCeremonyPlan } from '../../services/geminiService';
import { Card, Button, MarkdownRenderer } from '../UIComponents';
import { Sparkles, Loader2 } from 'lucide-react';

interface OrganizerPlanProps {
    ceremony: Ceremony;
}

const OrganizerPlan: React.FC<OrganizerPlanProps> = ({ ceremony }) => {
    const [aiPlan, setAiPlan] = useState('');
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

    const handleGeneratePlan = async () => {
        setIsGeneratingPlan(true);
        const p = await generateCeremonyPlan(ceremony.type);
        setAiPlan(p);
        setIsGeneratingPlan(false);
    };

    return (
        <div className="animate-fade-in-up">
            <Card title="AI Planner" action={
                <Button onClick={handleGeneratePlan} disabled={isGeneratingPlan} className="bg-blue-600 hover:bg-blue-700 border-transparent">
                    {isGeneratingPlan ? <Loader2 size={16} className="animate-spin mr-2"/> : <Sparkles size={16} className="mr-2"/>}
                    {aiPlan ? 'បង្កើតម្តងទៀត' : 'បង្កើតផែនការ'}
                </Button>
            }>
                {aiPlan ? (
                    <MarkdownRenderer content={aiPlan} />
                ) : (
                    <div className="text-center py-12 text-slate-400">
                        <Sparkles size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>ប្រើប្រាស់ AI ដើម្បីបង្កើតផែនការលម្អិតសម្រាប់កម្មវិធីរបស់អ្នក។</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default OrganizerPlan;
