"use client"

import React from "react";

interface SearchBarProps {
    onChange: (val: string) => void;
    setSearchBarFocused: (focused: boolean) => void;
}

const SearchBar = ({onChange, setSearchBarFocused} : SearchBarProps)=> {
    return (
            <input type="text" placeholder="What do you want to play?" 
            onChange={(e) => onChange(e.target.value)}
            onFocus = {() => setSearchBarFocused(true)}
            onBlur = {() => setSearchBarFocused(false)}
            className="transition  flex justify-center px-6 py-2.5 w-[25rem] bg-my-black-accent hover:bg-my-lighter-black text-white rounded-full text-sm focus:outline-none focus:ring-1"/>
    );
};

export default SearchBar;