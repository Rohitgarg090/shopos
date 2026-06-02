import { useState, useCallback } from 'react';

export function useContextualHelp(pageId) {
  const [helpState, setHelpState] = useState({
    activeStep: 0,
    isOpen: false,
    tourMode: null, // 'interactive', 'animated', 'walkthrough', null
  });

  const startTour = useCallback((mode = 'interactive') => {
    setHelpState({ activeStep: 0, isOpen: true, tourMode: mode });
  }, []);

  const nextStep = useCallback(() => {
    setHelpState(prev => ({ ...prev, activeStep: prev.activeStep + 1 }));
  }, []);

  const prevStep = useCallback(() => {
    setHelpState(prev => ({ ...prev, activeStep: Math.max(0, prev.activeStep - 1) }));
  }, []);

  const closeTour = useCallback(() => {
    setHelpState({ activeStep: 0, isOpen: false, tourMode: null });
  }, []);

  return {
    ...helpState,
    startTour,
    nextStep,
    prevStep,
    closeTour,
  };
}
