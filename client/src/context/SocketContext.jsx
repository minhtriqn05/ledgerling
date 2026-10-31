import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { setSocketId } from '../api/axios.js';
import { useAuth } from './AuthContext.jsx';

// The real-time connection of a signed-in device (the server side is services/realtimeService.js).
// AppLayout holds this provider, so the socket exists exactly as long as somebody is signed in.
// A new token (after "log out of all devices" on this device) means a new socket.
//
// Pages do not touch the socket, they subscribe to what it hears:
//   useSocketEvent('notification:new', handler)   any event of the server
//   useSocketEvent('reconnected', handler)        back after a lost connection: events may have been missed
//   useLiveStatus()                               'live' or 'reconnecting'
// Without a provider (a unit test of one page) these simply do nothing.

const SocketContext = createContext(null);

// How long a closed socket waits before it tries again
export const RETRY_AFTER_CLOSED_MS = 1000;
const RETRY_AFTER_ERROR_MS = 5000;

// VITE_API_URL ends in /api; the socket connects to the server itself
function serverAddress() {
  try {
    return new URL(import.meta.env.VITE_API_URL).origin;
  } catch {
    return null;
  }
}

export function SocketProvider({ children }) {
  const { token, logout } = useAuth();
  const [status, setStatus] = useState('reconnecting');
  const listeners = useRef(new Map()); // event name -> Set of handlers
  // The latest logout, so a new render never opens a new socket
  const latestLogout = useRef(logout);
  useEffect(() => {
    latestLogout.current = logout;
  });

  const subscribe = useCallback((event, handler) => {
    if (!listeners.current.has(event)) listeners.current.set(event, new Set());
    const handlers = listeners.current.get(event);
    handlers.add(handler);
    return () => handlers.delete(handler);
  }, []);

  useEffect(() => {
    const address = serverAddress();
    if (!token || !address) return undefined;

    const publish = (event, payload) => listeners.current.get(event)?.forEach((handler) => handler(payload));
    const socket = io(address, { auth: { token } });
    let connectedBefore = false;
    let retry = null;

    function tryAgainAfter(ms) {
      clearTimeout(retry);
      retry = setTimeout(() => socket.connect(), ms);
    }

    socket.on('connect', () => {
      setSocketId(socket.id);
      setStatus('live');
      if (connectedBefore) publish('reconnected');
      connectedBefore = true;
    });

    socket.on('disconnect', (reason) => {
      setSocketId(null);
      setStatus('reconnecting');
      // A lost connection comes back on its own, but after the server closed a socket the client has to ask.
      // The tokens of the user may have just stopped working: the handshake below then answers TOKEN_INVALID.
      // The short wait lets the device that asked for it receive its new token first; that replaces this socket.
      if (reason === 'io server disconnect') tryAgainAfter(RETRY_AFTER_CLOSED_MS);
    });

    socket.on('connect_error', (error) => {
      // The session ended on another device, by an admin or because the token expired: log out right away
      if (error.message === 'TOKEN_INVALID') {
        if (localStorage.getItem('token') === token) latestLogout.current();
        return;
      }
      // Refused by the server for another reason (socket.active is false): it does not try again by itself
      if (!socket.active) tryAgainAfter(RETRY_AFTER_ERROR_MS);
    });

    socket.on('data:changed', (payload) => publish('data:changed', payload));
    socket.on('notification:new', (payload) => publish('notification:new', payload));

    return () => {
      clearTimeout(retry);
      socket.close();
      setSocketId(null);
      setStatus('reconnecting');
    };
  }, [token]);

  const value = useMemo(() => ({ status, subscribe }), [status, subscribe]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

// Calls handler(payload) for every such event while the component is on screen. The handler may be a new function on every render.
export function useSocketEvent(event, handler) {
  const subscribe = useContext(SocketContext)?.subscribe;
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });

  useEffect(() => {
    if (!subscribe) return undefined;
    return subscribe(event, (payload) => latest.current(payload));
  }, [subscribe, event]);
}

export function useLiveStatus() {
  return useContext(SocketContext)?.status ?? 'reconnecting';
}
