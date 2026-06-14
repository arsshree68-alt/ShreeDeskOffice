import { Search } from 'lucide-react';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
}

export const SearchBar = ({ placeholder = 'Search tools...', value, onChange }: SearchBarProps) => (
  <div className="search-bar-wrapper">
    <Search className="search-icon" />
    <input 
      type="text"
      className="tool-search"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Search tools"
    />
  </div>
)
