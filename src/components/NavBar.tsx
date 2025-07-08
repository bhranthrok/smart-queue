'use client';

import SearchBar from './SearchBar';
import LogOut from '/public/log-out1.svg';

export default function NavBar({ signedIn }: { signedIn: boolean }) {

    const handleLogout = () => {
        console.log("Logging out...");
        localStorage.removeItem("spotify_access_token");
        localStorage.removeItem("spotify_code_verifier");
        window.location.href = "/";
    }

    const handleSearch = (query : string) => {
        console.log("search: ", query);
    }

    return (
        <div className="flex justify-between items-center bg-my-black w-full h-13 fixed z-10">
            <h1 className="font-semibold text-2xl text-white ml-4">SmartQueue</h1>
            
            <div className="absolute left-1/2 transform -translate-x-1/2">
                {signedIn && <SearchBar onChange={handleSearch}/>}
            </div>
                {signedIn && <LogOut onClick={handleLogout} width={40} height={40} 
                    className="mr-4 stroke-white fill-none hover:cursor-pointer"/>}
        </div>
        );
}