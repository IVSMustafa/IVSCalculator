import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, Calculator, GraduationCap, User, Percent, BookPlus, Users, Layers, ClipboardCheck } from 'lucide-react';
import { generateInvoicePDF } from './InvoiceGenerator';
import { format } from 'date-fns';
import { AppSettings } from '../types';

interface AdditionalProgram {
  id: string;
  programId: string;
  gradeId: string;
  feeType: 'regular' | 'discounted';
  customDiscount: number;
  quantity: number;
  exemptFromGlobalDiscounts: boolean;
  includeRegistration: boolean;
  registrationDiscount: number;
}

interface Student {
  id: string;
  name: string;
  programId: string;
  gradeId: string;
  feeType: 'regular' | 'discounted';
  customDiscount: number;
  quantity: number;
  additionalPrograms: AdditionalProgram[];
  includeRegistration: boolean;
  registrationDiscount: number; // percentage
  exemptFromGlobalDiscounts: boolean;
}

const REGISTRATION_FEE = 200; // SAR

export default function FeeCalculator({ settings }: { settings: AppSettings }) {
  const currentRate = settings.exchangeRates[settings.selectedCurrency] || 1;
  const convert = (amount: number) => amount * currentRate;
  const formatV = (amount: number) => `${settings.selectedCurrency} ${convert(amount).toFixed(2)}`;

  const [parentName, setParentName] = useState('');
  const [fCode, setFCode] = useState('');
  const [students, setStudents] = useState<Student[]>([
    { id: '1', name: '', programId: '', gradeId: '', feeType: 'regular', customDiscount: 0, quantity: 1, additionalPrograms: [], includeRegistration: false, registrationDiscount: 50, exemptFromGlobalDiscounts: false }
  ]);
  const [month, setMonth] = useState(format(new Date(), 'MMMM yyyy'));
  const [dueDate, setDueDate] = useState(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));

  const [fixedDiscount, setFixedDiscount] = useState<number>(0);
  const [siblingDiscount, setSiblingDiscount] = useState<number>(0);
  const [multiProgramDiscount, setMultiProgramDiscount] = useState<number>(0);

  // Auto-calculate sibling discount based on number of students
  useEffect(() => {
    const count = students.length;
    let pct = 0;
    if (count === 2) pct = 10;
    else if (count === 3) pct = 15;
    else if (count === 4) pct = 20;
    else if (count >= 5) pct = 25 + (count - 5) * 5;
    setSiblingDiscount(pct);
  }, [students.length]);

  // Auto-calculate multi-program discount based on students with additional programs
  useEffect(() => {
    const studentsWithAP = students.filter(s => s.additionalPrograms.length > 0).length;
    let pct = 0;
    if (studentsWithAP === 1) pct = 5;
    else if (studentsWithAP === 2) pct = 10;
    else if (studentsWithAP >= 3) pct = 15;
    setMultiProgramDiscount(pct);
  }, [students]);

  const addStudent = () => {
    setStudents([
      ...students,
      { id: Math.random().toString(36).substr(2, 9), name: '', programId: '', gradeId: '', feeType: 'regular', customDiscount: 0, quantity: 1, additionalPrograms: [], includeRegistration: false, registrationDiscount: 50, exemptFromGlobalDiscounts: false }
    ]);
  };

  const removeStudent = (id: string) => {
    setStudents(students.filter(s => s.id !== id));
  };

  const updateStudent = (id: string, field: keyof Student, value: any) => {
    setStudents(students.map(s => {
      if (s.id === id) {
        const updated = { ...s, [field]: value };
        // Reset grade if program changes
        if (field === 'programId') {
          updated.gradeId = '';
          updated.quantity = 1;
        }
        return updated;
      }
      return s;
    }));
  };

  // --- Additional Program helpers ---
  const addAdditionalProgram = (studentId: string) => {
    setStudents(students.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          additionalPrograms: [
            ...s.additionalPrograms,
            { id: Math.random().toString(36).substr(2, 9), programId: '', gradeId: '', feeType: 'regular', customDiscount: 0, quantity: 1, exemptFromGlobalDiscounts: false, includeRegistration: false, registrationDiscount: 50 }
          ]
        };
      }
      return s;
    }));
  };

  const removeAdditionalProgram = (studentId: string, apId: string) => {
    setStudents(students.map(s => {
      if (s.id === studentId) {
        return { ...s, additionalPrograms: s.additionalPrograms.filter(ap => ap.id !== apId) };
      }
      return s;
    }));
  };

  const updateAdditionalProgram = (studentId: string, apId: string, field: keyof AdditionalProgram, value: any) => {
    setStudents(students.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          additionalPrograms: s.additionalPrograms.map(ap => {
            if (ap.id === apId) {
              const updated = { ...ap, [field]: value };
              if (field === 'programId') {
                updated.gradeId = '';
                updated.quantity = 1;
              }
              return updated;
            }
            return ap;
          })
        };
      }
      return s;
    }));
  };

  // --- Fee helpers ---
  const getStudentRegularFee = (student: Student) => {
    const program = settings.programs?.find(p => p.id === student.programId);
    const grade = program?.grades.find(g => g.id === student.gradeId);
    if (!grade) return 0;
    return grade.fee * (student.quantity || 1);
  };

  const getStudentActualFee = (student: Student) => {
    const program = settings.programs?.find(p => p.id === student.programId);
    const grade = program?.grades.find(g => g.id === student.gradeId);
    if (!grade) return 0;
    const baseFee = student.feeType === 'discounted' ? grade.discountedFee : grade.fee;
    return baseFee * (student.quantity || 1);
  };

  const getAPRegularFee = (ap: AdditionalProgram) => {
    const program = settings.programs?.find(p => p.id === ap.programId);
    const grade = program?.grades.find(g => g.id === ap.gradeId);
    if (!grade) return 0;
    return grade.fee * (ap.quantity || 1);
  };

  const getAPActualFee = (ap: AdditionalProgram) => {
    const program = settings.programs?.find(p => p.id === ap.programId);
    const grade = program?.grades.find(g => g.id === ap.gradeId);
    if (!grade) return 0;
    const baseFee = ap.feeType === 'discounted' ? grade.discountedFee : grade.fee;
    return baseFee * (ap.quantity || 1);
  };

  // --- Totals including additional programs ---
  const allAPList = students.flatMap(s => s.additionalPrograms);
  const apRegularTotal = allAPList.reduce((sum, ap) => sum + getAPRegularFee(ap), 0);
  const apActualTotal = allAPList.reduce((sum, ap) => sum + getAPActualFee(ap), 0);
  const apCustomDiscountTotal = allAPList.reduce((sum, ap) => sum + (Number(ap.customDiscount) || 0), 0);

  const totalRegularFee = students.reduce((sum, s) => sum + getStudentRegularFee(s), 0) + apRegularTotal;
  const totalActualFee = students.reduce((sum, s) => sum + getStudentActualFee(s), 0) + apActualTotal;
  const programDiscountAmount = totalRegularFee - totalActualFee;

  const customDiscountAmount = students.reduce((sum, s) => sum + (Number(s.customDiscount) || 0), 0) + apCustomDiscountTotal;

  // --- Registration fee totals ---
  const isRegularProgram = (programId: string) => {
    const prog = settings.programs?.find(p => p.id === programId);
    return prog?.name?.toLowerCase().includes('regular');
  };

  const totalRegistrationFee = students.reduce((sum, s) => {
    let studentReg = 0;
    if (s.includeRegistration && isRegularProgram(s.programId)) {
      studentReg += REGISTRATION_FEE - (REGISTRATION_FEE * (s.registrationDiscount / 100));
    }
    s.additionalPrograms.forEach(ap => {
      if (ap.includeRegistration && isRegularProgram(ap.programId)) {
        studentReg += REGISTRATION_FEE - (REGISTRATION_FEE * (ap.registrationDiscount / 100));
      }
    });
    return sum + studentReg;
  }, 0);

  const totalRegistrationFullFee = students.reduce((sum, s) => {
    let studentFull = 0;
    if (s.includeRegistration && isRegularProgram(s.programId)) studentFull += REGISTRATION_FEE;
    s.additionalPrograms.forEach(ap => {
      if (ap.includeRegistration && isRegularProgram(ap.programId)) studentFull += REGISTRATION_FEE;
    });
    return sum + studentFull;
  }, 0);

  const totalRegistrationDiscountAmount = totalRegistrationFullFee - totalRegistrationFee;

  const feeAfterStudentDiscounts = Math.max(0, totalRegularFee - programDiscountAmount - customDiscountAmount);

  // Only apply global discounts (sibling, multi-program, fixed) to NON-exempt programs
  const eligibleFee = (() => {
    let total = 0;
    students.forEach(s => {
      // Main program
      if (!s.exemptFromGlobalDiscounts) {
        const regFee = getStudentRegularFee(s);
        const actFee = getStudentActualFee(s);
        const cDisc = Number(s.customDiscount) || 0;
        total += Math.max(0, regFee - (regFee - actFee) - cDisc);
      }
      // Additional programs
      s.additionalPrograms.forEach(ap => {
        if (!ap.exemptFromGlobalDiscounts) {
          const apReg = getAPRegularFee(ap);
          const apAct = getAPActualFee(ap);
          const apCDisc = Number(ap.customDiscount) || 0;
          total += Math.max(0, apReg - (apReg - apAct) - apCDisc);
        }
      });
    });
    return total;
  })();

  const siblingDiscountAmount = eligibleFee * (siblingDiscount / 100);
  const multiProgramDiscountAmount = eligibleFee * (multiProgramDiscount / 100);
  const eligibleFixedDiscount = feeAfterStudentDiscounts > 0 ? (eligibleFee / feeAfterStudentDiscounts) * fixedDiscount : fixedDiscount;
  const totalDiscounts = programDiscountAmount + customDiscountAmount + siblingDiscountAmount + multiProgramDiscountAmount + eligibleFixedDiscount;
  const finalTotal = Math.max(0, totalRegularFee - totalDiscounts) + totalRegistrationFee;

  // ✅ IMPORTANT: async + await (for template background based PDF)
  const handleGenerateInvoice = async () => {
    if (!parentName) {
      alert('Please enter Parent Name');
      return;
    }

    const invoiceData = {
      parentName,
      fCode,
      issuedOn: format(new Date(), 'dd MMM yyyy'),
      dueDate: format(new Date(dueDate), 'dd MMM yyyy'),
      students: [
        // Main program entries
        ...students.map(s => {
          const program = settings.programs?.find(p => p.id === s.programId);
          const grade = program?.grades.find(g => g.id === s.gradeId);
          const regularFee = getStudentRegularFee(s);
          const discountedFee = getStudentActualFee(s);
          const customDisc = Number(s.customDiscount) || 0;
          const netFee = Math.max(0, discountedFee - customDisc);
          // Per-student global discounts (zero if exempt)
          const sibCut = s.exemptFromGlobalDiscounts ? 0 : netFee * (siblingDiscount / 100);
          const multiCut = s.exemptFromGlobalDiscounts ? 0 : netFee * (multiProgramDiscount / 100);
          const fixedShare = s.exemptFromGlobalDiscounts ? 0 : (feeAfterStudentDiscounts > 0 ? (netFee / feeAfterStudentDiscounts) * fixedDiscount : 0);
          const finalFee = Math.max(0, netFee - sibCut - multiCut - fixedShare);
          return {
            name: s.name || 'Student',
            grade: grade ? `${program?.name} - ${grade.name}` : '',
            month: month,
            amount: regularFee,
            regularFee: regularFee,
            discountedFee: discountedFee,
            finalFee: finalFee,
            quantity: s.quantity || 1,
            pricingType: program?.pricingType || 'class'
          };
        }),
        // Additional program entries
        ...students.flatMap(s =>
          s.additionalPrograms.map(ap => {
            const program = settings.programs?.find(p => p.id === ap.programId);
            const grade = program?.grades.find(g => g.id === ap.gradeId);
            const regularFee = getAPRegularFee(ap);
            const discountedFee = getAPActualFee(ap);
            const customDisc = Number(ap.customDiscount) || 0;
            const netFee = Math.max(0, discountedFee - customDisc);
            // Per-entry global discounts (zero if parent student exempt)
            const sibCut = ap.exemptFromGlobalDiscounts ? 0 : netFee * (siblingDiscount / 100);
            const multiCut = ap.exemptFromGlobalDiscounts ? 0 : netFee * (multiProgramDiscount / 100);
            const fixedShare = ap.exemptFromGlobalDiscounts ? 0 : (feeAfterStudentDiscounts > 0 ? (netFee / feeAfterStudentDiscounts) * fixedDiscount : 0);
            const finalFee = Math.max(0, netFee - sibCut - multiCut - fixedShare);
            return {
              name: s.name || 'Student',
              grade: grade ? `${program?.name} - ${grade.name}` : '',
              month: month,
              amount: regularFee,
              regularFee: regularFee,
              discountedFee: discountedFee,
              finalFee: finalFee,
              quantity: ap.quantity || 1,
              pricingType: program?.pricingType || 'class'
            };
          })
        )
      ].filter(s => s.regularFee > 0),
      // Add registration fee line items from both main and additional programs
      registrationEntries: students.flatMap(s => {
        const entries = [];
        // Main program registration
        if (s.includeRegistration && isRegularProgram(s.programId)) {
          entries.push({
            name: s.name || 'Student',
            fullFee: REGISTRATION_FEE,
            discount: s.registrationDiscount,
            netFee: REGISTRATION_FEE - (REGISTRATION_FEE * s.registrationDiscount / 100)
          });
        }
        // Additional programs registration
        s.additionalPrograms.forEach(ap => {
          if (ap.includeRegistration && isRegularProgram(ap.programId)) {
            const apProgram = settings.programs?.find(p => p.id === ap.programId);
            entries.push({
              name: `${s.name || 'Student'} (${apProgram?.name || 'Add-on'})`,
              fullFee: REGISTRATION_FEE,
              discount: ap.registrationDiscount,
              netFee: REGISTRATION_FEE - (REGISTRATION_FEE * ap.registrationDiscount / 100)
            });
          }
        });
        return entries;
      }),
      totalAmount: totalRegularFee + totalRegistrationFee,
      programDiscountAmount,
      customDiscountAmount,
      enrollmentDiscountAmount: siblingDiscountAmount + multiProgramDiscountAmount,
      fixedDiscountAmount: eligibleFixedDiscount,
      finalAmount: finalTotal,
      settings,
      currency: settings.selectedCurrency,
      exchangeRate: currentRate
    };

    // ✅ Await so PDF builds after assets load
    await generateInvoicePDF(invoiceData as any);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          {settings.logoBase64 ? (
            <img src={settings.logoBase64} alt="Logo" className="w-16 h-16 object-contain rounded-lg shadow-sm" />
          ) : (
            <div className="bg-blue-900 p-4 rounded-full">
              <GraduationCap className="w-12 h-12 text-white" />
            </div>
          )}
        </div>
        <h1 className="text-3xl font-bold text-slate-900">{settings.schoolName || 'Iqra Virtual School'}</h1>
        <p className="text-slate-500">Fee Calculator & Invoice Generator</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
              <User className="w-5 h-5 text-blue-600" />
              Parent Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Parent Name</label>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter parent name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Family Code (F.Code)</label>
                <input
                  type="text"
                  value={fCode}
                  onChange={(e) => setFCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Billing Month</label>
                <input
                  type="text"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                Students
              </h2>
              <button
                onClick={addStudent}
                className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Student
              </button>
            </div>

            <div className="space-y-4">
              {students.map((student) => {
                const selectedProgram = settings.programs?.find(p => p.id === student.programId);
                const selectedGrade = selectedProgram?.grades.find(g => g.id === student.gradeId);

                const pricingType = selectedProgram?.pricingType || 'class';
                const showQuantity = pricingType === 'subject' || pricingType === 'days';
                const tierLabel = pricingType === 'subject' ? 'Subject / Level' : pricingType === 'days' ? 'Days / Plan' : 'Grade / Level';
                const qtyLabel = pricingType === 'subject' ? 'No. of Subjects' : 'No. of Days';

                return (
                  <div key={student.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 relative group">
                    <button
                      onClick={() => removeStudent(student.id)}
                      className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Remove student"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Student Name</label>
                        <input
                          type="text"
                          value={student.name}
                          onChange={(e) => updateStudent(student.id, 'name', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="Student Name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Program</label>
                        <select
                          value={student.programId}
                          onChange={(e) => updateStudent(student.id, 'programId', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">Select Program</option>
                          {(settings.programs || []).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{tierLabel}</label>
                        <select
                          value={student.gradeId}
                          onChange={(e) => updateStudent(student.id, 'gradeId', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          disabled={!student.programId}
                        >
                          <option value="">Select {tierLabel.split('/')[0].trim()}</option>
                          {selectedProgram?.grades.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                      </div>

                      {showQuantity && (
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">{qtyLabel}</label>
                          <input
                            type="number"
                            min="1"
                            value={student.quantity || 1}
                            onChange={(e) => updateStudent(student.id, 'quantity', Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Individual Discount ({settings.selectedCurrency})</label>
                        <input
                          type="number"
                          min="0"
                          value={student.customDiscount || ''}
                          onChange={(e) => updateStudent(student.id, 'customDiscount', Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="0"
                        />
                      </div>

                      <div className={showQuantity ? "md:col-span-2" : ""}>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Fee Type</label>
                        <div className="flex flex-col gap-2 mt-1">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="radio"
                              name={`feeType-${student.id}`}
                              value="regular"
                              checked={student.feeType === 'regular'}
                              onChange={() => updateStudent(student.id, 'feeType', 'regular')}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            Regular Fee {selectedGrade ? `(${formatV(selectedGrade.fee)}${showQuantity ? ' each' : ''})` : ''}
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="radio"
                              name={`feeType-${student.id}`}
                              value="discounted"
                              checked={student.feeType === 'discounted'}
                              onChange={() => updateStudent(student.id, 'feeType', 'discounted')}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            Discounted Fee {selectedGrade ? `(${formatV(selectedGrade.discountedFee)}${showQuantity ? ' each' : ''})` : ''}
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Registration Fee - only for Regular Schooling */}
                    {isRegularProgram(student.programId) && (
                      <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ClipboardCheck className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-semibold text-amber-800">Registration Fee</span>
                            <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full font-medium">{formatV(REGISTRATION_FEE)}</span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={student.includeRegistration}
                              onChange={(e) => updateStudent(student.id, 'includeRegistration', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-300 peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                          </label>
                        </div>
                        {student.includeRegistration && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Registration Discount (%)</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={student.registrationDiscount || ''}
                                onChange={(e) => updateStudent(student.id, 'registrationDiscount', Number(e.target.value))}
                                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm bg-white"
                                placeholder="50"
                              />
                            </div>
                            <div className="flex flex-col justify-end pb-1">
                              <div className="text-xs text-slate-500">
                                Full: <span className="line-through">{formatV(REGISTRATION_FEE)}</span>
                              </div>
                              <div className="text-sm font-semibold text-amber-700">
                                Pay: {formatV(REGISTRATION_FEE - (REGISTRATION_FEE * student.registrationDiscount / 100))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Exempt from Global Discounts toggle */}
                    <div className="mt-4 p-3 bg-rose-50 rounded-xl border border-rose-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-rose-500" />
                          <span className="text-sm font-semibold text-rose-700">Exempt (Main Program) from Global Discounts</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={student.exemptFromGlobalDiscounts}
                            onChange={(e) => updateStudent(student.id, 'exemptFromGlobalDiscounts', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-300 peer-focus:ring-2 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                        </label>
                      </div>
                      {student.exemptFromGlobalDiscounts && (
                        <p className="text-xs text-rose-500 mt-1">This specific program enrollment is excluded from sibling, multi-program, and fixed discounts.</p>
                      )}
                    </div>

                    {/* Additional Program Enrollments */}
                    {student.additionalPrograms.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-dashed border-slate-300 space-y-3">
                        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Additional Program Enrollments</p>
                        {student.additionalPrograms.map((ap) => {
                          const apProgram = settings.programs?.find(p => p.id === ap.programId);
                          const apGrade = apProgram?.grades.find(g => g.id === ap.gradeId);
                          const apPricingType = apProgram?.pricingType || 'class';
                          const apShowQuantity = apPricingType === 'subject' || apPricingType === 'days';
                          const apTierLabel = apPricingType === 'subject' ? 'Subject / Level' : apPricingType === 'days' ? 'Days / Plan' : 'Grade / Level';
                          const apQtyLabel = apPricingType === 'subject' ? 'No. of Subjects' : 'No. of Days';

                          return (
                            <div key={ap.id} className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 relative group/ap">
                              <button
                                onClick={() => removeAdditionalProgram(student.id, ap.id)}
                                className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover/ap:opacity-100"
                                title="Remove additional program"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-slate-500 mb-1">Program</label>
                                  <select
                                    value={ap.programId}
                                    onChange={(e) => updateAdditionalProgram(student.id, ap.id, 'programId', e.target.value)}
                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                  >
                                    <option value="">Select Program</option>
                                    {(settings.programs || []).map(p => (
                                      <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-500 mb-1">{apTierLabel}</label>
                                  <select
                                    value={ap.gradeId}
                                    onChange={(e) => updateAdditionalProgram(student.id, ap.id, 'gradeId', e.target.value)}
                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    disabled={!ap.programId}
                                  >
                                    <option value="">Select {apTierLabel.split('/')[0].trim()}</option>
                                    {apProgram?.grades.map(g => (
                                      <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                  </select>
                                </div>

                                {apShowQuantity && (
                                  <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">{apQtyLabel}</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={ap.quantity || 1}
                                      onChange={(e) => updateAdditionalProgram(student.id, ap.id, 'quantity', Number(e.target.value))}
                                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                  </div>
                                )}

                                <div>
                                  <label className="block text-xs font-medium text-slate-500 mb-1">Individual Discount ({settings.selectedCurrency})</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={ap.customDiscount || ''}
                                    onChange={(e) => updateAdditionalProgram(student.id, ap.id, 'customDiscount', Number(e.target.value))}
                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="0"
                                  />
                                </div>

                                <div className={apShowQuantity ? "md:col-span-2" : ""}>
                                  <label className="block text-xs font-medium text-slate-500 mb-1">Fee Type</label>
                                  <div className="flex flex-col gap-1 mt-1">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`apFeeType-${ap.id}`}
                                        value="regular"
                                        checked={ap.feeType === 'regular'}
                                        onChange={() => updateAdditionalProgram(student.id, ap.id, 'feeType', 'regular')}
                                        className="text-emerald-600 focus:ring-emerald-500"
                                      />
                                      Regular Fee {apGrade ? `(${formatV(apGrade.fee)}${apShowQuantity ? ' each' : ''})` : ''}
                                    </label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`apFeeType-${ap.id}`}
                                        value="discounted"
                                        checked={ap.feeType === 'discounted'}
                                        onChange={() => updateAdditionalProgram(student.id, ap.id, 'feeType', 'discounted')}
                                        className="text-emerald-600 focus:ring-emerald-500"
                                      />
                                      Discounted Fee {apGrade ? `(${formatV(apGrade.discountedFee)}${apShowQuantity ? ' each' : ''})` : ''}
                                    </label>
                                  </div>
                                </div>

                                {/* AP-level Registration Fee */}
                                {isRegularProgram(ap.programId) && (
                                  <div className="md:col-span-2 p-3 bg-amber-50 rounded-xl border border-amber-200 mt-1">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs">
                                        <ClipboardCheck className="w-3.5 h-3.5 text-amber-600" />
                                        Registration Fee ({formatV(REGISTRATION_FEE)})
                                      </div>
                                      <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={ap.includeRegistration}
                                          onChange={(e) => updateAdditionalProgram(student.id, ap.id, 'includeRegistration', e.target.checked)}
                                          className="sr-only peer"
                                        />
                                        <div className="w-8 h-4 bg-slate-300 peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
                                      </label>
                                    </div>
                                    {ap.includeRegistration && (
                                      <div className="mt-2 text-xs grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-slate-500 mb-1 font-medium">Discount (%)</label>
                                          <input
                                            type="number"
                                            value={ap.registrationDiscount}
                                            onChange={(e) => updateAdditionalProgram(student.id, ap.id, 'registrationDiscount', Number(e.target.value))}
                                            className="w-full px-2 py-1 border border-amber-200 rounded bg-white"
                                          />
                                        </div>
                                        <div className="flex items-end text-amber-700 font-bold pb-1">
                                          Pay: {REGISTRATION_FEE - (REGISTRATION_FEE * ap.registrationDiscount / 100)} SAR
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* AP-level Exemption */}
                                <div className="md:col-span-2 p-3 bg-rose-50 rounded-xl border border-rose-200 mt-1">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-rose-700 font-semibold text-xs">
                                      <Percent className="w-3.5 h-3.5 text-rose-500" />
                                      Exempt from Global Discounts
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={ap.exemptFromGlobalDiscounts}
                                        onChange={(e) => updateAdditionalProgram(student.id, ap.id, 'exemptFromGlobalDiscounts', e.target.checked)}
                                        className="sr-only peer"
                                      />
                                      <div className="w-8 h-4 bg-slate-300 peer-focus:ring-2 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-rose-500"></div>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add Another Program Button */}
                    <button
                      onClick={() => addAdditionalProgram(student.id)}
                      className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-lg transition-colors w-full justify-center border border-dashed border-emerald-300"
                    >
                      <BookPlus className="w-4 h-4" />
                      Enroll in Another Program
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
              <Percent className="w-5 h-5 text-blue-600" />
              Global Discounts
            </h2>

            {/* Sibling Discount */}
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">Sibling Discount</span>
              </div>
              <p className="text-xs text-slate-500">Applied when multiple siblings are enrolled. Auto-calculated based on {students.length} student(s).</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={siblingDiscount || ''}
                    onChange={(e) => setSiblingDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                    placeholder="e.g. 10"
                  />
                </div>
                <div className="flex items-end">
                  <span className="text-xs text-blue-600 font-medium pb-2.5">
                    {siblingDiscountAmount > 0 ? `Saves ${siblingDiscountAmount.toFixed(2)} SAR` : 'No discount'}
                  </span>
                </div>
              </div>
            </div>

            {/* Multi-Program Enrollment Discount */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-800">Multi-Program Enrollment Discount</span>
              </div>
              <p className="text-xs text-slate-500">Applied when students are enrolled in additional programs. Auto-calculated based on {students.filter(s => s.additionalPrograms.length > 0).length} student(s) with add-ons.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={multiProgramDiscount || ''}
                    onChange={(e) => setMultiProgramDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                    placeholder="e.g. 5"
                  />
                </div>
                <div className="flex items-end">
                  <span className="text-xs text-emerald-600 font-medium pb-2.5">
                    {multiProgramDiscountAmount > 0 ? `Saves ${multiProgramDiscountAmount.toFixed(2)} SAR` : 'No discount'}
                  </span>
                </div>
              </div>
            </div>

            {/* Fixed Discount */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-semibold text-slate-700">Fixed Discount</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Amount (SAR)</label>
                <input
                  type="number"
                  min="0"
                  value={fixedDiscount || ''}
                  onChange={(e) => setFixedDiscount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                  placeholder="e.g. 50"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800 mb-6">
              <Calculator className="w-5 h-5 text-blue-600" />
              Fee Summary
            </h2>

            <div className="space-y-6">
              {(() => {
                // Collect all unique program IDs from main programs AND additional programs
                const allProgramIds = new Set<string>();
                students.forEach(s => {
                  if (s.programId) allProgramIds.add(s.programId);
                  s.additionalPrograms.forEach(ap => {
                    if (ap.programId) allProgramIds.add(ap.programId);
                  });
                });
                const programIdList = Array.from(allProgramIds).filter(Boolean);

                return programIdList.length > 0 ? (
                  <div className="space-y-4">
                    {programIdList.map(progId => {
                      const program = settings.programs?.find(p => p.id === progId);
                      const pricingSuffix = program?.pricingType === 'subject' ? ' (Fee per subject)' : program?.pricingType === 'days' ? ' (Fee per day/plan)' : '';
                      const progName = (program?.name || 'Unknown Program') + pricingSuffix;

                      // Main students enrolled in this program
                      const mainStudents = students.filter(s => s.programId === progId && s.gradeId);
                      // Additional programs enrolled in this program (from any student)
                      const apEntries = students.flatMap(s =>
                        s.additionalPrograms
                          .filter(ap => ap.programId === progId && ap.gradeId)
                          .map(ap => ({ ...ap, studentName: s.name, studentExempt: ap.exemptFromGlobalDiscounts }))
                      );

                      if (mainStudents.length === 0 && apEntries.length === 0) return null;

                      // Totals for this program section
                      const mainRegular = mainStudents.reduce((sum, s) => sum + getStudentRegularFee(s), 0);
                      const mainActual = mainStudents.reduce((sum, s) => sum + getStudentActualFee(s), 0);
                      const mainCustom = mainStudents.reduce((sum, s) => sum + (Number(s.customDiscount) || 0), 0);

                      const apRegular = apEntries.reduce((sum, ap) => sum + getAPRegularFee(ap), 0);
                      const apActual = apEntries.reduce((sum, ap) => sum + getAPActualFee(ap), 0);
                      const apCustom = apEntries.reduce((sum, ap) => sum + (Number(ap.customDiscount) || 0), 0);

                      const sectionRegular = mainRegular + apRegular;
                      const sectionActual = mainActual + apActual;
                      const sectionDiscountTotal = sectionRegular - sectionActual;
                      const sectionCustomTotal = mainCustom + apCustom;
                      const sectionNet = Math.max(0, sectionRegular - sectionDiscountTotal - sectionCustomTotal);
                      // Only non-exempt entries contribute to global discount calculation
                      const eligibleMainNet = mainStudents.reduce((sum, s) => {
                        if (s.exemptFromGlobalDiscounts) return sum;
                        const r = getStudentRegularFee(s); const a = getStudentActualFee(s); const c = Number(s.customDiscount) || 0;
                        return sum + Math.max(0, r - (r - a) - c);
                      }, 0);
                      const eligibleApNet = apEntries.reduce((sum, ap) => {
                        if (ap.exemptFromGlobalDiscounts) return sum; // Use ap property directly
                        const r = getAPRegularFee(ap); const a = getAPActualFee(ap); const c = Number(ap.customDiscount) || 0;
                        return sum + Math.max(0, r - (r - a) - c);
                      }, 0);
                      const eligibleSectionNet = eligibleMainNet + eligibleApNet;
                      const sectionGlobalCut = eligibleSectionNet * ((siblingDiscount + multiProgramDiscount) / 100);
                      const sectionFixedShare = feeAfterStudentDiscounts > 0 ? (eligibleSectionNet / feeAfterStudentDiscounts) * fixedDiscount : 0;
                      const sectionFinal = Math.max(0, sectionNet - sectionGlobalCut - sectionFixedShare);

                      return (
                        <div key={progId} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <h3 className="font-semibold text-sm text-slate-800 mb-3 flex justify-between items-center">
                            <span>{progName}</span>
                            <span className="text-blue-600">{formatV(sectionFinal)}</span>
                          </h3>

                          <div className="space-y-3">
                            {/* Main student entries */}
                            {mainStudents.map((student, idx) => {
                              const pricingType = program?.pricingType || 'class';
                              const showQuantity = pricingType === 'subject' || pricingType === 'days';
                              const regularFee = getStudentRegularFee(student);
                              const actualFee = getStudentActualFee(student);
                              const progDiscount = regularFee - actualFee;
                              const customDiscount = Number(student.customDiscount) || 0;
                              const netFee = Math.max(0, regularFee - progDiscount - customDiscount);
                              const gradeName = program?.grades.find(g => g.id === student.gradeId)?.name || '';
                              // Per-student global discounts (zero if exempt)
                              const studentSiblingCut = student.exemptFromGlobalDiscounts ? 0 : netFee * (siblingDiscount / 100);
                              const studentMultiProgCut = student.exemptFromGlobalDiscounts ? 0 : netFee * (multiProgramDiscount / 100);
                              const studentFixedShare = student.exemptFromGlobalDiscounts ? 0 : (feeAfterStudentDiscounts > 0 ? (netFee / feeAfterStudentDiscounts) * fixedDiscount : 0);
                              const finalStudentFee = Math.max(0, netFee - studentSiblingCut - studentMultiProgCut - studentFixedShare);

                              return (
                                <div key={student.id} className="text-sm pl-3 border-l-2 border-blue-400">
                                  <div className="flex justify-between items-start gap-2 mb-1.5 font-medium text-slate-700">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="truncate">{student.name || `Student ${idx + 1}`}</span>
                                        {showQuantity && student.quantity > 0 && (
                                          <span className="text-slate-400 font-normal text-xs whitespace-nowrap">
                                            ({student.quantity} {pricingType === 'subject' ? 'sub' : 'days'})
                                          </span>
                                        )}
                                        {student.exemptFromGlobalDiscounts && (
                                          <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-full font-bold uppercase tracking-wider whitespace-nowrap leading-none border border-rose-200">Exempt</span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-400 font-normal mt-0.5 italic truncate">
                                        {gradeName}
                                      </div>
                                    </div>
                                    <span className="shrink-0 font-bold whitespace-nowrap text-slate-900">{formatV(finalStudentFee)}</span>
                                  </div>

                                  <div className="mt-1 space-y-1 text-xs">
                                    <div className="flex justify-between text-slate-400">
                                      <span>Regular Fee:</span>
                                      <span className={progDiscount > 0 ? 'line-through' : ''}>{formatV(regularFee)}</span>
                                    </div>
                                    {progDiscount > 0 && (
                                      <div className="flex justify-between text-green-600">
                                        <span>Discounted Fee:</span>
                                        <span>{formatV(actualFee)}</span>
                                      </div>
                                    )}
                                    {progDiscount > 0 && (
                                      <div className="flex justify-between text-green-600">
                                        <span>Program Savings:</span>
                                        <div className="flex flex-col items-end">
                                          <span>-{formatV(progDiscount)}</span>
                                          {settings.selectedCurrency !== 'SAR' && (
                                            <span className="text-[10px] text-green-500">(-{progDiscount.toFixed(2)} SAR)</span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {customDiscount > 0 && (
                                      <div className="flex justify-between text-orange-500">
                                        <span>Individual Discount:</span>
                                        <div className="flex flex-col items-end">
                                          <span>-{formatV(customDiscount)}</span>
                                          {settings.selectedCurrency !== 'SAR' && (
                                            <span className="text-[10px] text-orange-400">(-{customDiscount.toFixed(2)} SAR)</span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {studentSiblingCut > 0 && (
                                      <div className="flex justify-between text-blue-600">
                                        <span>Sibling Discount ({siblingDiscount}%):</span>
                                        <div className="flex flex-col items-end">
                                          <span>-{formatV(studentSiblingCut)}</span>
                                          {settings.selectedCurrency !== 'SAR' && (
                                            <span className="text-[10px] text-blue-500">(-{studentSiblingCut.toFixed(2)} SAR)</span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {studentMultiProgCut > 0 && (
                                      <div className="flex justify-between text-emerald-600">
                                        <span>Multi-Program ({multiProgramDiscount}%):</span>
                                        <div className="flex flex-col items-end">
                                          <span>-{formatV(studentMultiProgCut)}</span>
                                          {settings.selectedCurrency !== 'SAR' && (
                                            <span className="text-[10px] text-emerald-500">(-{studentMultiProgCut.toFixed(2)} SAR)</span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {studentFixedShare > 0.01 && (
                                      <div className="flex justify-between text-slate-500">
                                        <span>Fixed Discount:</span>
                                        <div className="flex flex-col items-end">
                                          <span>-{formatV(studentFixedShare)}</span>
                                          {settings.selectedCurrency !== 'SAR' && (
                                            <span className="text-[10px] text-slate-400">(-{studentFixedShare.toFixed(2)} SAR)</span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Additional program entries */}
                            {apEntries.map((ap) => {
                              const regularFee = getAPRegularFee(ap);
                              const actualFee = getAPActualFee(ap);
                              const apDiscount = regularFee - actualFee;
                              const customDiscount = Number(ap.customDiscount) || 0;
                              const netFee = Math.max(0, regularFee - apDiscount - customDiscount);
                              const gradeName = program?.grades.find(g => g.id === ap.gradeId)?.name || '';
                              // Per-entry global discounts (zero if parent student exempt)
                              const apSiblingCut = ap.studentExempt ? 0 : netFee * (siblingDiscount / 100);
                              const apMultiProgCut = ap.studentExempt ? 0 : netFee * (multiProgramDiscount / 100);
                              const apFixedShare = ap.studentExempt ? 0 : (feeAfterStudentDiscounts > 0 ? (netFee / feeAfterStudentDiscounts) * fixedDiscount : 0);
                              const finalApFee = Math.max(0, netFee - apSiblingCut - apMultiProgCut - apFixedShare);

                              return (
                                <div key={ap.id} className="text-sm pl-3 border-l-2 border-emerald-400">
                                  <div className="flex justify-between items-start gap-2 mb-1.5 font-medium text-slate-700">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="truncate">{ap.studentName || 'Student'}</span>
                                        <span className="text-emerald-600 font-normal text-xs whitespace-nowrap">(Add-on)</span>
                                        {ap.exemptFromGlobalDiscounts && (
                                          <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-full font-bold uppercase tracking-wider whitespace-nowrap leading-none border border-rose-200">Exempt</span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-400 font-normal mt-0.5 italic truncate">
                                        {gradeName}
                                      </div>
                                    </div>
                                    <span className="shrink-0 font-bold whitespace-nowrap text-slate-900">{formatV(finalApFee)}</span>
                                  </div>

                                  <div className="mt-1 space-y-1 text-xs">
                                    <div className="flex justify-between text-slate-400">
                                      <span>Regular Fee:</span>
                                      <span className={apDiscount > 0 ? 'line-through' : ''}>{formatV(regularFee)}</span>
                                    </div>
                                    {apDiscount > 0 && (
                                      <div className="flex justify-between text-green-600">
                                        <span>Discounted Fee:</span>
                                        <span>{formatV(actualFee)}</span>
                                      </div>
                                    )}
                                    {apDiscount > 0 && (
                                      <div className="flex justify-between text-green-600">
                                        <span>Program Savings:</span>
                                        <div className="flex flex-col items-end">
                                          <span>-{formatV(apDiscount)}</span>
                                          {settings.selectedCurrency !== 'SAR' && (
                                            <span className="text-[10px] text-green-500">(-{apDiscount.toFixed(2)} SAR)</span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {customDiscount > 0 && (
                                      <div className="flex justify-between text-orange-500">
                                        <span>Individual Discount:</span>
                                        <div className="flex flex-col items-end">
                                          <span>-{formatV(customDiscount)}</span>
                                          {settings.selectedCurrency !== 'SAR' && (
                                            <span className="text-[10px] text-orange-400">(-{customDiscount.toFixed(2)} SAR)</span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {apSiblingCut > 0 && (
                                      <div className="flex justify-between text-blue-600">
                                        <span>Sibling Discount ({siblingDiscount}%):</span>
                                        <span>-{formatV(apSiblingCut)}</span>
                                      </div>
                                    )}
                                    {apMultiProgCut > 0 && (
                                      <div className="flex justify-between text-emerald-600">
                                        <span>Multi-Program ({multiProgramDiscount}%):</span>
                                        <div className="flex flex-col items-end">
                                          <span>-{formatV(apMultiProgCut)}</span>
                                          {settings.selectedCurrency !== 'SAR' && (
                                            <span className="text-[10px] text-emerald-500">(-{apMultiProgCut.toFixed(2)} SAR)</span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {apFixedShare > 0.01 && (
                                      <div className="flex justify-between text-slate-500">
                                        <span>Fixed Discount:</span>
                                        <div className="flex flex-col items-end">
                                          <span>-{formatV(apFixedShare)}</span>
                                          {settings.selectedCurrency !== 'SAR' && (
                                            <span className="text-[10px] text-slate-400">(-{apFixedShare.toFixed(2)} SAR)</span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {(sectionDiscountTotal > 0 || sectionCustomTotal > 0) && (
                            <div className="mt-3 pt-2 border-t border-slate-200 text-xs flex justify-between text-slate-600 font-medium">
                              <span>Total {progName} Savings:</span>
                              <div className="flex flex-col items-end">
                                <span className="text-green-600">-{formatV(sectionDiscountTotal + sectionCustomTotal)}</span>
                                {settings.selectedCurrency !== 'SAR' && (
                                  <span className="text-[10px] text-green-500">(-{(sectionDiscountTotal + sectionCustomTotal).toFixed(2)} SAR)</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Add students and select programs to see the breakdown.
                  </div>
                );
              })()}

              <div className="border-t-2 border-slate-100 pt-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Total Students</span>
                  <span className="font-medium">{students.filter(s => s.programId && s.gradeId).length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Subtotal (After Student Discounts)</span>
                  <div className="flex flex-col items-end">
                    <span className="font-medium">{formatV(feeAfterStudentDiscounts)}</span>
                    {settings.selectedCurrency !== 'SAR' && (
                      <span className="text-[10px] text-slate-500 font-medium">
                        ({feeAfterStudentDiscounts.toFixed(2)} SAR)
                      </span>
                    )}
                  </div>
                </div>

                {/* Registration Fee Line */}
                {totalRegistrationFee > 0 && (
                  <div className="pt-2 space-y-1">
                    <div className="flex justify-between items-center text-sm text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                      <span className="flex items-center gap-1.5">
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        Registration Fee
                      </span>
                      <span className="font-bold">+{formatV(totalRegistrationFee)}</span>
                    </div>
                    {totalRegistrationDiscountAmount > 0 && (
                      <div className="flex justify-between items-center text-xs text-amber-600 px-2">
                        <span>Reg. Discount (Full: {formatV(totalRegistrationFullFee)})</span>
                        <div className="flex flex-col items-end">
                          <span>-{formatV(totalRegistrationDiscountAmount)}</span>
                          {settings.selectedCurrency !== 'SAR' && (
                            <span className="text-[10px] text-amber-500 font-medium">(-{totalRegistrationDiscountAmount.toFixed(2)} SAR)</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Subtotal Selection */}
                <div className="flex justify-between items-center text-sm pt-2">
                  <div className="flex flex-col">
                    <span className="text-slate-800 font-semibold italic">Subtotal</span>
                    {settings.selectedCurrency !== 'SAR' && (
                      <span className="text-[10px] text-slate-500 font-medium">({totalRegularFee.toFixed(2)} SAR regular subtotal)</span>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-slate-800 font-bold">{formatV(totalRegularFee)}</span>
                  </div>
                </div>

                {(siblingDiscountAmount > 0 || multiProgramDiscountAmount > 0 || fixedDiscount > 0) && (
                  <div className="pt-2 space-y-2 border-t border-slate-100 mt-2">
                    {siblingDiscountAmount > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex flex-col">
                          <span className="text-blue-700 font-semibold">Multiple Student Discount</span>
                          <span className="text-[10px] text-blue-600 font-medium">({siblingDiscount}% sibling discount | -{siblingDiscountAmount.toFixed(2)} SAR)</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-blue-700 font-bold">-{formatV(siblingDiscountAmount)}</span>
                        </div>
                      </div>
                    )}
                    {multiProgramDiscountAmount > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex flex-col">
                          <span className="text-emerald-700 font-semibold">Multi-Program Discount</span>
                          <span className="text-[10px] text-emerald-600 font-medium">({multiProgramDiscount}% scholarship | -{multiProgramDiscountAmount.toFixed(2)} SAR)</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-emerald-700 font-bold">-{formatV(multiProgramDiscountAmount)}</span>
                        </div>
                      </div>
                    )}
                    {fixedDiscount > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex flex-col">
                          <span className="text-green-700 font-semibold">Additional Fixed Discount</span>
                          <span className="text-[10px] text-green-600 font-medium">({fixedDiscount.toFixed(2)} SAR)</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-green-700 font-bold">-{formatV(fixedDiscount)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Total Savings */}
                {(() => {
                  const allSavings = programDiscountAmount + customDiscountAmount + siblingDiscountAmount + multiProgramDiscountAmount + fixedDiscount + totalRegistrationDiscountAmount;
                  const totalReg = totalRegularFee + totalRegistrationFullFee;
                  const savingsPercent = totalReg > 0 ? (allSavings / totalReg) * 100 : 0;

                  return allSavings > 0 ? (
                    <div className="pt-3 mt-1 border-t border-dashed border-green-200">
                      <div className="flex justify-between items-center text-sm bg-green-50 border border-green-200 p-2.5 rounded-lg">
                        <div className="flex flex-col">
                          <span className="text-green-700 font-semibold">🎉 Total Savings</span>
                          <span className="text-[10px] text-green-600 font-medium">({savingsPercent.toFixed(1)}% of regular fee | {allSavings.toFixed(2)} SAR)</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-green-700 font-bold text-base">-{formatV(allSavings)}</span>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}

                <div className="pt-2">
                  <div className="flex justify-between items-end">
                    <span className="text-slate-800 font-semibold">Total Payable</span>
                    <div className="flex flex-col items-end">
                      <span className="text-2xl font-bold text-blue-900">
                        {formatV(finalTotal)}
                      </span>
                      {settings.selectedCurrency !== 'SAR' && (
                        <span className="text-xs text-slate-500 font-medium">
                          ({finalTotal.toFixed(2)} SAR)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerateInvoice}
                disabled={finalTotal === 0}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
              >
                <FileText className="w-5 h-5" />
                Generate Invoice PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}