// Sent on `window` when the API refuses the token of this device (401). AuthContext listens and shows the
// "Session expired" dialog. An event keeps api/axios.js free of React.
export const SESSION_EXPIRED_EVENT = 'ledgerling:session-expired';
