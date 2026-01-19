import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

interface Option {
    id: string | number;
    label: string;
    value: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    required?: boolean;
    name?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder,
    className = "",
    required
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div
                className={`min-h-[42px] px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${!selectedOption?.label ? 'text-gray-500' : 'text-gray-900'}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="truncate block mr-2 flex-1">
                    {selectedOption ? selectedOption.label : placeholder || 'Select...'}
                </span>

                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {value && (
                        <div onClick={(e) => { e.stopPropagation(); onChange(''); }} className="p-1 hover:bg-gray-100 rounded-full">
                            <X className="w-3 h-3 text-gray-400" />
                        </div>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {/* Native Select for Required validation */}
            <input
                value={value}
                required={required}
                onChange={() => { }}
                className="absolute inset-0 opacity-0 pointer-events-none -z-10 h-full w-full"
                tabIndex={-1}
            />

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-fade-in text-left">
                    <div className="sticky top-0 bg-white p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                autoFocus
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search..."
                                className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    {filteredOptions.length > 0 ? (
                        <div className="py-1">
                            {filteredOptions.map(option => (
                                <div
                                    key={option.id}
                                    onClick={() => handleSelect(option.value)}
                                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between ${option.value === value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'}`}
                                >
                                    {option.label}
                                    {option.value === value && <Check className="w-4 h-4" />}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            No matches found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
