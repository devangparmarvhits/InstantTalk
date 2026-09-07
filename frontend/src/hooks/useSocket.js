import { useEffect, useRef } from 'react';
import { getSocket } from '../socket/socket';

const useSocket = (eventHandlers = {}) => {
  const handlersRef = useRef(eventHandlers);
  handlersRef.current = eventHandlers;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const registeredEvents = Object.keys(handlersRef.current);

    registeredEvents.forEach((event) => {
      socket.on(event, handlersRef.current[event]);
    });

    return () => {
      registeredEvents.forEach((event) => {
        socket.off(event, handlersRef.current[event]);
      });
    };
  }, []);

  return getSocket();
};

export default useSocket;
