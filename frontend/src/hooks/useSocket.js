import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useOutbreakStore from '../store/outbreakStore';

const SOCKET_URL = 'http://localhost:3001';

export const useSocket = () => {
    const socketRef = useRef(null);
    const { setInitialOutbreaks, addOutbreak, realtimeUpdates } = useOutbreakStore();

    useEffect(() => {
        // Initialize socket connection
        socketRef.current = io(SOCKET_URL);

        // Listen for initial full dataset
        socketRef.current.on('initial_data', (data) => {
            console.log('Received initial data:', data);
            setInitialOutbreaks(data);
        });

        // Clean up on unmount
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [setInitialOutbreaks]);

    // Separate effect for listening to updates based on user preference
    useEffect(() => {
        if (!socketRef.current) return;

        if (realtimeUpdates) {
            socketRef.current.on('NEW_OUTBREAK', (newOutbreak) => {
                console.log('New outbreak received:', newOutbreak);
                addOutbreak(newOutbreak);
            });
        } else {
            socketRef.current.off('NEW_OUTBREAK');
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.off('NEW_OUTBREAK');
            }
        };
    }, [realtimeUpdates, addOutbreak]);

    return { socket: socketRef.current };
};
