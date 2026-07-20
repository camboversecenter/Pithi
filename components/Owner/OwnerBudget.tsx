
import React, { useState } from 'react';
import { Ceremony, Transaction, ReportedTransaction } from '../../types';
import { addTransaction, deleteTransaction, confirmReportedTransaction, rejectReportedTransaction } from '../../services/dataService';
import { Card, Button, Modal, Input, Select } from '../UIComponents';
import { Plus, AlertCircle, Eye, Check, X, TrendingUp, TrendingDown, Trash2, Wallet, AlertTriangle } from 'lucide-react';
import { useGlobalDialog } from '../../contexts/GlobalDialogContext';

interface OwnerBudgetProps {
    ceremony: Ceremony;
    transactions: Transaction[];
    pendingReports: ReportedTransaction[];
    onRefresh: () => void;
}

const OwnerBudget: React.FC<OwnerBudgetProps> = ({ ceremony, transactions, pendingReports, onRefresh }) => {
    const { showAlert, showConfirm } = useGlobalDialog();
    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    // 1. Set type = INCOME (Revenue) and category = Gift as default
    const [newTx, setNewTx] = useState({ description: '', amount: '', type: 'INCOME', category: 'Gift' });

    // Computed
    const income = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
    const balance = income - expense;

    // Budget vs actual
    const plannedBudget = ceremony.budget || 0;
    const budgetUsedPercent = plannedBudget > 0 ? Math.round((expense / plannedBudget) * 100) : 0;
    const remainingBudget = plannedBudget - expense;
    const isOverBudget = plannedBudget > 0 && expense > plannedBudget;
    const isNearBudget = plannedBudget > 0 && !isOverBudget && budgetUsedPercent >= 80;

    const categoryLabels: { [key: string]: string } = {
        'Gift': 'ចំណងដៃ',
        'General': 'ទូទៅ',
        'Food': 'អាហារ',
        'Decoration': 'ការតុបតែង'
    };

    const expenseByCategory = transactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((acc, t) => {
            const cat = t.category || 'General';
            acc[cat] = (acc[cat] || 0) + t.amount;
            return acc;
        }, {} as { [key: string]: number });
    const categoryEntries = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);

    const handleConfirmReport = async (report: ReportedTransaction) => {
        try {
            await confirmReportedTransaction(report.id);
            onRefresh();
            await showAlert("ជោគជ័យ", "បានទទួល និងកត់ត្រាចូលបញ្ជីថវិកា។", "success");
        } catch (error: any) {
            await showAlert("បរាជ័យ", error.message || "មិនអាចទទួលយកការរាយការណ៍បានទេ។", "danger");
        }
    };

    const handleRejectReport = async (report: ReportedTransaction) => {
        const confirm = await showConfirm("បដិសេធ?", "តើអ្នកចង់លុបសំណើនេះមែនទេ?", "danger");
        if (confirm) {
            try {
                await rejectReportedTransaction(report.id);
                onRefresh();
                await showAlert("ជោគជ័យ", "បានច្រានចោលសំណើដោយជោគជ័យ។", "success");
            } catch (error: any) {
                await showAlert("បរាជ័យ", error.message || "មិនអាចច្រានចោលសំណើបានឡើយ។", "danger");
            }
        }
    };

    const handleAddTx = async () => {
        if(!newTx.amount) return;
        try {
            await addTransaction({
                ceremonyId: ceremony.id, 
                amount: Number(newTx.amount), 
                type: newTx.type as any, 
                category: newTx.category, 
                date: new Date().toISOString(), 
                expenseName: newTx.description
            });
            setIsTxModalOpen(false);
            // Reset to defaults
            setNewTx({ description: '', amount: '', type: 'INCOME', category: 'Gift' });
            onRefresh();
            await showAlert("ជោគជ័យ", "ប្រាក់ចំណូល/ចំណាយ ត្រូវបានបន្ថែមដោយជោគជ័យ។", "success");
        } catch (error: any) {
            await showAlert("បរាជ័យ", error.message || "មិនអាចបន្ថែមប្រតិបត្តិការឡើយ។", "danger");
        }
    };

    const handleDeleteTx = async (id: string) => {
        const confirm = await showConfirm("លុបប្រតិបត្តិការ?", "តើអ្នកចង់លុបប្រតិបត្តិការនេះពីបញ្ជីថវិកាមែនទេ?", "danger");
        if (confirm) {
            try {
                await deleteTransaction(id);
                onRefresh();
                await showAlert("ជោគជ័យ", "ប្រតិបត្តិការត្រូវបានលុប។", "success");
            } catch (error: any) {
                await showAlert("បរាជ័យ", error.message || "មិនអាចលុបប្រតិបត្តិការបានឡើយ។", "danger");
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Summary Cards - Forced 3 Columns */}
            <div className="grid grid-cols-3 gap-3 md:gap-4">
                <div className="bg-red-50 p-3 md:p-4 rounded-xl border border-red-100 text-red-700">
                    <p className="text-[10px] md:text-xs font-bold uppercase mb-1">ចំណាយ (Exp)</p>
                    <p className="text-lg md:text-2xl font-bold font-serif">${expense}</p>
                </div>
                <div className="bg-emerald-50 p-3 md:p-4 rounded-xl border border-emerald-100 text-emerald-700">
                    <p className="text-[10px] md:text-xs font-bold uppercase mb-1">ចំណូល (Rev)</p>
                    <p className="text-lg md:text-2xl font-bold font-serif">${income}</p>
                </div>
                <div className={`p-3 md:p-4 rounded-xl border ${balance >= 0 ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-orange-50 border-orange-100 text-orange-700'}`}>
                    <p className="text-[10px] md:text-xs font-bold uppercase mb-1">សមតុល្យ (Bal)</p>
                    <p className="text-lg md:text-2xl font-bold font-serif">${balance}</p>
                </div>
            </div>

            {/* Budget vs Actual */}
            {plannedBudget > 0 && (
                <Card title="ថវិកាគ្រោង vs ចំណាយជាក់ស្តែង">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-slate-600 font-medium">
                                <Wallet size={16} className="text-rose-500" />
                                ថវិកាគ្រោង៖ <span className="font-bold text-slate-900">${plannedBudget}</span>
                            </div>
                            <span className={`font-bold ${isOverBudget ? 'text-red-600' : isNearBudget ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {budgetUsedPercent}%
                            </span>
                        </div>

                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-red-500' : isNearBudget ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, budgetUsedPercent)}%` }}
                            ></div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">បានចំណាយ៖ <span className="font-bold text-slate-800">${expense}</span></span>
                            <span className={remainingBudget >= 0 ? 'text-slate-500' : 'text-red-600 font-bold'}>
                                {remainingBudget >= 0 ? <>នៅសល់៖ <span className="font-bold text-slate-800">${remainingBudget}</span></> : <>លើសថវិកា៖ ${Math.abs(remainingBudget)}</>}
                            </span>
                        </div>

                        {isOverBudget && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
                                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                                ការចំណាយបានលើសថវិកាដែលបានគ្រោងទុក។ សូមពិនិត្យមើលការចំណាយឡើងវិញ ឬកែតម្រូវថវិកាកម្មវិធី។
                            </div>
                        )}
                        {isNearBudget && (
                            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-sm">
                                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                                ការចំណាយជិតដល់កម្រិតថវិកាដែលបានគ្រោងទុកហើយ។
                            </div>
                        )}

                        {categoryEntries.length > 0 && (
                            <div className="pt-3 border-t border-slate-100 space-y-2.5">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">ចំណាយតាមប្រភេទ</p>
                                {categoryEntries.map(([category, amount]) => (
                                    <div key={category} className="flex items-center gap-3">
                                        <span className="text-sm text-slate-600 font-medium w-24 flex-shrink-0 truncate">{categoryLabels[category] || category}</span>
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-rose-400 rounded-full"
                                                style={{ width: `${expense > 0 ? Math.round((amount / expense) * 100) : 0}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-sm font-bold text-slate-800 w-16 text-right flex-shrink-0">${amount}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Pending Transfers Section */}
            {pendingReports.length > 0 && (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 space-y-4">
                    <h4 className="font-bold text-rose-800 flex items-center">
                        <AlertCircle size={20} className="mr-2"/> សំណើផ្ទេរប្រាក់ដែលរង់ចាំការបញ្ជាក់ ({pendingReports.length})
                    </h4>
                    <div className="grid gap-3">
                        {pendingReports.map(report => (
                            <div key={report.id} className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
                                {/* Thumbnail */}
                                <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 cursor-pointer flex-shrink-0 relative group" onClick={() => window.open(report.receiptImageUrl, '_blank')}>
                                    <img src={report.receiptImageUrl} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <Eye size={16} className="text-white opacity-0 group-hover:opacity-100"/>
                                    </div>
                                </div>
                                
                                {/* Details */}
                                <div className="flex-1 text-center md:text-left">
                                    <p className="font-bold text-slate-800">{report.guestName}</p>
                                    <p className="text-sm text-slate-500">បានផ្ទេរ: <span className="font-bold text-rose-600">{report.amount} {report.currency}</span></p>
                                    <p className="text-xs text-slate-400">{new Date(report.date).toLocaleDateString('km-KH')}</p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button onClick={() => handleConfirmReport(report)} className="bg-emerald-600 hover:bg-emerald-700 border-transparent text-white shadow-none h-9 px-3 py-1.5 text-xs h-auto">
                                        <Check size={16} className="mr-1"/> ទទួល
                                    </Button>
                                    <Button variant="secondary" onClick={() => handleRejectReport(report)} className="text-red-600 hover:bg-red-50 border-red-200 shadow-none h-9 px-3 py-1.5 text-xs h-auto">
                                        <X size={16} className="mr-1"/> បដិសេធ
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Card title="ប្រតិបត្តិការហិរញ្ញវត្ថុ" action={<Button onClick={() => setIsTxModalOpen(true)}><Plus size={18} className="mr-2"/> បន្ថែម</Button>}>
                <div className="space-y-3">
                    {transactions.length > 0 ? transactions.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-all">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${t.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    {t.type === 'INCOME' ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{t.expenseName || t.donorName || 'ប្រតិបត្តិការ'}</p>
                                    <p className="text-xs text-slate-500">{t.category} • {new Date(t.date).toLocaleDateString('km-KH')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`font-bold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {t.type === 'INCOME' ? '+' : '-'}${t.amount}
                                </span>
                                <button onClick={() => handleDeleteTx(t.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-8 text-slate-400">មិនទាន់មានប្រតិបត្តិការ។</div>
                    )}
                </div>
            </Card>

            <Modal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} title="បន្ថែមប្រតិបត្តិការ">
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Select label="ប្រភេទ" options={[{value: 'INCOME', label: 'ចំណូល (Revenue)'}, {value: 'EXPENSE', label: 'ចំណាយ (Expense)'}]} value={newTx.type} onChange={e => setNewTx({...newTx, type: e.target.value})} />
                        </div>
                            <div className="flex-1">
                            <Input label="ចំនួនទឹកប្រាក់ ($)" type="number" value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})} required />
                        </div>
                    </div>
                    <Input label="បរិយាយ / ឈ្មោះ" value={newTx.description} onChange={e => setNewTx({...newTx, description: e.target.value})} placeholder="ឧ. ទិញភេសជ្ជៈ ឬ ចំណងដៃ សុខ" required />
                    <Select label="ប្រភេទចំណាយ/ចំណូល" options={[{value: 'Gift', label: 'Gift/ចំណងដៃ'}, {value: 'General', label: 'General'}, {value: 'Food', label: 'Food'}, {value: 'Decoration', label: 'Decoration'}]} value={newTx.category} onChange={e => setNewTx({...newTx, category: e.target.value})} />
                    <Button className="w-full" onClick={handleAddTx}>បន្ថែម</Button>
                </div>
            </Modal>
        </div>
    );
};

export default OwnerBudget;
