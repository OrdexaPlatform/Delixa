import React from 'react';
import { AlertTriangle, Phone, Mail, Shield } from 'lucide-react';

interface MaintenanceModeViewProps {
  message?: string;
  supportEmail?: string;
  supportPhone?: string;
  onGoToSuperAdmin?: () => void;
}

export const MaintenanceModeView: React.FC<MaintenanceModeViewProps> = ({
  message = 'المنصة تخضع لعمليات صيانة وتحديث مجدولة لتحسين الأداء. سنعود للعمل قريباً.',
  supportEmail = 'support@delixa.app',
  supportPhone = '+201000000000',
  onGoToSuperAdmin,
}) => {
  return (
    <div id="maintenance-mode-screen" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950" dir="rtl">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-white">المنصة في وضع الصيانة المجدولة</h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed font-medium">
            {message}
          </p>
        </div>

        <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {supportEmail && (
            <div className="flex items-center justify-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{supportEmail}</span>
            </div>
          )}
          {supportPhone && (
            <div className="flex items-center justify-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300">
              <Phone className="w-4 h-4 text-slate-400" />
              <span dir="ltr">{supportPhone}</span>
            </div>
          )}
        </div>

        {onGoToSuperAdmin && (
          <div className="pt-2">
            <button
              onClick={onGoToSuperAdmin}
              className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1.5 mx-auto transition"
            >
              <Shield className="w-3 h-3" />
              <span>دخول إدارة المنصة (Super Admin)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
