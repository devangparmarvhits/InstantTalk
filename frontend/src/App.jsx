import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { CallProvider } from './context/CallContext';
import { GroupCallProvider } from './context/GroupCallContext';
import { StreamProvider } from './context/StreamContext';
import GlobalCallOverlay from './components/call/GlobalCallOverlay';
import GroupGlobalCallOverlay from './components/call/GroupGlobalCallOverlay';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <AuthProvider>
      <CallProvider>
        <GroupCallProvider>
          <StreamProvider>
            <AppRoutes />
            <GlobalCallOverlay />
            <GroupGlobalCallOverlay />
          </StreamProvider>
        </GroupCallProvider>
      </CallProvider>
    </AuthProvider>
  );
}

export default App;
