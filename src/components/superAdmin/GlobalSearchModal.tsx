import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Building2, Package, Store, Truck, DollarSign, ArrowLeft, Loader2 } from 'lucide-react';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import { safeFetchJson } from '../../utils/apiClient';

interface SearchResult {
  type: 'company' | 'order' | 'merchant' | 'courier' | 'payment';
  title: string;
  subtitle: string;
  id: string;
  companyId?: string;
  status?: string;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const { token } = useSuperAdmin();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { ok, data } = await safeFetchJson<any>(`/api/super-admin/search?q=${encodeURIComponent(query.trim())}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (ok && data?.success) {
          setResults(data.results || []);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, token]);

  if (!isOpen) return null;

  const handleSelect = (item: SearchResult) => {
    onClose();
    if (item.type === 'company') {
      onNavigate(`/super-admin/companies/${item.id}`);
    } else if (item.type === 'payment') {
      onNavigate('/super-admin/payments');
    } else if (item.companyId) {
      onNavigate(`/super-admin/companies/${item.companyId}`);
    } else {
      onNavigate('/super-admin/companies');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'company':
        return <Building2 className="w-4 h-4 text-blue-600" />;
      case 'order':
        return <Package className="w-4 h-4 text-emerald-600" />;
      case 'merchant':
        return <Store className="w-4 h-4 text-purple-600" />;
      case 'courier':
        return <Truck className="w-4 h-4 text-amber-600" />;
      case 'payment':
        return <DollarSign className="w-4 h-4 text-rose-600" />;
      default:
        return <Search className="w-4 h-4 text-slate-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'company':
        return <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">شركة</span>;
      case 'order':
        return <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">شحنة</span>;
      case 'merchant':
        return <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">متجر</span>;
      case 'courier':
        return <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">مندوب</span>;
      case 'payment':
        return <span className="text-xs px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-medium">دفعة</span>;
      default:
        return null;
    }
  };

  return (
    <div id="global-search-modal-backdrop" className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-xs">
      <div id="global-search-modal-box" className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            id="global-search-input"
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن شركة، رقم شحنة، متجر، مندوب، أو رقم دفعة..."
            className="w-full text-slate-800 placeholder-slate-400 text-sm focus:outline-hidden bg-transparent"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />}
          {query && (
            <button
              id="clear-search-btn"
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            id="close-search-btn"
            onClick={onClose}
            className="text-xs font-medium px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md"
          >
            ESC
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {query.trim().length < 2 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              اكتب حرفين على الأقل للبحث السريع في كافة بيانات منصة DELIXA
            </div>
          ) : loading && results.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              جاري البحث...
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              لم يتم العثور على أي نتائج مطابقة لـ &quot;{query}&quot;
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((item, idx) => (
                <button
                  key={`${item.type}-${item.id}-${idx}`}
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 text-right transition border border-transparent hover:border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100">
                      {getTypeIcon(item.type)}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-slate-900">{item.title}</div>
                      <div className="text-xs text-slate-500">{item.subtitle}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTypeBadge(item.type)}
                    <ArrowLeft className="w-4 h-4 text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
