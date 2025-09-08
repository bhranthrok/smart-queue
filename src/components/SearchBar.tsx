"use client"

import React from "react";

interface SearchBarProps {
    onChange: (val: string) => void;
    setSearchBarFocused: (focused: boolean) => void;
}

const SearchBar = ({onChange, setSearchBarFocused} : SearchBarProps)=> {
    const handleBlur = (e: React.FocusEvent) => {
        // Check if the related target is within the search dropdown
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (relatedTarget && relatedTarget.closest('.search-dropdown')) {
            return; // Don't hide if clicking inside dropdown
        }
        
        setSearchBarFocused(false);
    };

    return (
            <input 
                type="text" 
                placeholder="What do you want to play?" 
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setSearchBarFocused(true)}
                onBlur={handleBlur}
                className="search-bar transition flex justify-center px-6 py-2.5 w-[25rem] bg-theme-bg-card-accent hover:bg-theme-bg-card-lighter text-theme-text-primary rounded-full text-sm focus:outline-none focus:ring-1"
            />
    );
};

export default SearchBar;