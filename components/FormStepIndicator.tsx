
import React from 'react';
import { FormStep } from '../types';
import { Icons } from '../constants';

interface Props {
  currentStep: FormStep;
}

const steps: { key: FormStep; label: string; icon: React.ReactNode }[] = [
  { key: 'personal', label: 'Siswa', icon: <Icons.User /> },
  { key: 'address', label: 'Alamat', icon: <Icons.Home /> },
  { key: 'family', label: 'Ortu', icon: <Icons.Family /> },
  { key: 'guardian', label: 'Wali', icon: <Icons.User /> },
  { key: 'assistance', label: 'Sosial', icon: <Icons.Sparkles /> },
  { key: 'school', label: 'Sekolah', icon: <Icons.Academic /> },
  { key: 'review', label: 'Review', icon: <Icons.Sparkles /> },
];

const FormStepIndicator: React.FC<Props> = ({ currentStep }) => {
  return (
    <div className="flex justify-between items-center mb-10 overflow-x-auto py-4 px-2 no-scrollbar">
      {steps.map((step, idx) => {
        const isActive = currentStep === step.key;
        const isPast = steps.findIndex(s => s.key === currentStep) > idx;

        return (
          <div key={step.key} className="flex flex-col items-center min-w-[70px] relative">
            <div 
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 z-10 ${
                isActive 
                ? 'bg-maroon text-white scale-110 shadow-lg shadow-red-900/50 ring-4 ring-maroon/20' 
                : isPast 
                ? 'bg-red-900/40 text-red-200' 
                : 'bg-slate-800 text-slate-500'
              }`}
            >
              {step.icon}
            </div>
            <span className={`text-[8px] mt-2 font-bold uppercase tracking-widest ${isActive ? 'text-maroon' : 'text-slate-500'}`}>
              {step.label}
            </span>
            
            {idx < steps.length - 1 && (
              <div className="absolute top-5 left-[50px] w-full h-[1px] bg-slate-800 -z-0">
                <div 
                  className="h-full bg-maroon transition-all duration-500" 
                  style={{ width: isPast ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FormStepIndicator;
