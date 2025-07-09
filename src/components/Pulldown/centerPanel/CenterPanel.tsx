"use client"
// Discover
// Recently Played
// Top Artists
// OR
// Display Playlist


import React from 'react';
import PlaylistDisplay from './PlaylistDisplay';

interface CenterPanelProps {
    selectedPlaylist: string | null;
}

const CenterPanel: React.FC<CenterPanelProps> = ({ selectedPlaylist }) => {
    return (
        <div>
            {selectedPlaylist ? (
                <PlaylistDisplay playlistId={selectedPlaylist} />
            ) : (
                <p className='mt-4 ml-5'>Select a playlist to display</p>
            )}
        </div>
    );
};

export default CenterPanel;