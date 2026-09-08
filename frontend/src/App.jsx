import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { CallProvider } from './context/CallContext';
import { GroupCallProvider } from './context/GroupCallContext';
import LiveMonitoringProvider from './context/LiveMonitoringContext';
import GlobalCallOverlay from './components/call/GlobalCallOverlay';
import GroupGlobalCallOverlay from './components/call/GroupGlobalCallOverlay';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <AuthProvider>
      <CallProvider>
        <GroupCallProvider>
          <LiveMonitoringProvider>
            <AppRoutes />
            <GlobalCallOverlay />
            <GroupGlobalCallOverlay />
          </LiveMonitoringProvider>
        </GroupCallProvider>
      </CallProvider>
    </AuthProvider>
  );
}

export default App;
