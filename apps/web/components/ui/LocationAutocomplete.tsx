"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Loader2, Check } from "lucide-react";

interface LocationAutocompleteProps {
  onSelect: (location: string) => void;
}

export function LocationAutocomplete({ onSelect }: LocationAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(false);

  // Using OpenStreetMap Nominatim for zero-config global geocoding
  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error("Geocoding error", err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <MapPin className="absolute left-4 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelected(false);
          }}
          placeholder="Birth City (e.g., New Delhi, India)"
          className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none font-medium text-gray-900"
        />
        {loading && <Loader2 className="absolute right-4 w-5 h-5 text-indigo-500 animate-spin" />}
        {selected && !loading && <Check className="absolute right-4 w-5 h-5 text-green-500" />}
      </div>

      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden"
          >
            {results.map((place, idx) => (
              <li
                key={idx}
                onClick={() => {
                  setQuery(place.display_name);
                  onSelect(place.display_name);
                  setIsOpen(false);
                  setSelected(true);
                }}
                className="px-4 py-3 hover:bg-indigo-50 cursor-pointer flex items-start gap-3 transition-colors border-b border-gray-50 last:border-0"
              >
                <MapPin className="w-4 h-4 mt-1 text-indigo-400 shrink-0" />
                <span className="text-sm text-gray-700 line-clamp-2">{place.display_name}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
