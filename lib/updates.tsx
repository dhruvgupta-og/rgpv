import React, { createContext, useContext, ReactNode, useState } from 'react';
import * as Updates from 'expo-updates';

interface UpdatesContextType {
  isUpdateAvailable: boolean;
  isChecking: boolean;
  checkForUpdates: () => Promise<void>;
  reload: () => void;
}

const UpdatesContext = createContext<UpdatesContextType | undefined>(undefined);

interface UpdatesProviderProps {
  children: ReactNode;
}

export function UpdatesProvider({ children }: UpdatesProviderProps): React.ReactElement {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkForUpdates = async () => {
    if (__DEV__) return;

    try {
      setIsChecking(true);
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        setIsUpdateAvailable(true);
        console.log('Update downloaded. Prompting user to restart.');
      }
    } catch (error) {
      console.error('Update check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  React.useEffect(() => {
    if (!__DEV__) {
      checkForUpdates();
    }
  }, []);

  const reload = () => Updates.reloadAsync();

  return (
    <UpdatesContext.Provider value={{ isUpdateAvailable, isChecking, checkForUpdates, reload }}>
      {children}
    </UpdatesContext.Provider>
  );
}

export function useUpdates() {
  const context = useContext(UpdatesContext);
  if (!context) {
    throw new Error('useUpdates must be used within UpdatesProvider');
  }
  return context;
}

