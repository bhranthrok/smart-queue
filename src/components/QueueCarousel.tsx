import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface QueueItem {
    uri: string;
    image_url: string | null;
}

interface QueueCarouselProps {
    currentQueuePosition: number;
}

export default function QueueCarousel({ currentQueuePosition }: QueueCarouselProps) {
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

    // Function to load queue from localStorage
    const loadQueueFromStorage = useCallback(() => {
        // Only show loading if this is the first load
        if (!hasLoadedOnce) {
            setIsLoading(true);
        }
        
        const queueStr = localStorage.getItem('queue');
        if (queueStr) {
            try {
                const parsedQueue = JSON.parse(queueStr);
                setQueue(parsedQueue);
                console.log('QueueCarousel: Loaded queue with', parsedQueue.length, 'items');
                
                // Add delay only on first load
                if (!hasLoadedOnce) {
                    setTimeout(() => {
                        setIsLoading(false);
                        setHasLoadedOnce(true);
                    }, 500);
                } else {
                    // Immediate update for subsequent loads
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('Error parsing queue from localStorage:', error);
                setQueue([]);
                setIsLoading(false);
                setHasLoadedOnce(true);
            }
        } else {
            setQueue([]);
            setIsLoading(false);
            setHasLoadedOnce(true);
        }
    }, [hasLoadedOnce]);

    // Load queue on mount and when currentQueuePosition changes
    useEffect(() => {
        loadQueueFromStorage();
    }, [currentQueuePosition, loadQueueFromStorage]);

    // Listen for localStorage changes (when queue is updated from other components)
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'queue') {
                loadQueueFromStorage();
            }
        };

        // Listen for storage events
        window.addEventListener('storage', handleStorageChange);

        // Also listen for custom events if localStorage is updated in the same tab
        const handleCustomQueueUpdate = () => {
            loadQueueFromStorage();
        };

        window.addEventListener('queueUpdated', handleCustomQueueUpdate);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('queueUpdated', handleCustomQueueUpdate);
        };
    }, [loadQueueFromStorage]);

    return (
        <div className="absolute mt-42 w-full left-0 h-97 z-7 p-5 overflow-hidden">
            {/* Debug info 
            <div className="absolute top-0 left-0 text-xs text-theme-text-primary z-10">
                Queue: {queue.length} items, Position: {currentQueuePosition}
            </div>*/}
            
            {/* Loading state */}
            {isLoading ? (
                <div className="flex h-full items-center justify-center">
                    <div className="loader"></div>
                </div>
            ) : (
                /* Horizontal scrolling container */
                <div 
                    className="flex h-full transition-transform duration-500 ease-in-out"
                    style={{
                        transform: `translateX(${172 - (currentQueuePosition * 468)}px)` // Position current song at left-43 (172px)
                    }}
                >
                    {queue.map((item, index) => (
                        <div
                            key={index}
                            className={`flex-shrink-0 h-full mx-15 rounded-lg overflow-hidden
                                ${index === currentQueuePosition ? 'ring-2 ring-theme-primary scale-110' : ''}
                                ${index < currentQueuePosition ? 'opacity-50' : ''}
                                transition-all duration-300`}
                        >
                            {item.image_url ? (
                                <Image
                                    src={item.image_url}
                                    alt={`Track ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    width={600}
                                    height={600}
                                    unoptimized={false}
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                    <span className="text-xs text-theme-text-secondary">♪</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}