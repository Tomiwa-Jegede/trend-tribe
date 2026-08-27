// src/context/TutorialContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {Joyride,  STATUS } from "react-joyride";
import { useAuth } from "./AuthContext";
import { markTutorialSeen } from "../services/authService";

const TutorialContext = createContext(null);

// Mirrors Navbar's own responsive breakpoint (Tailwind's `md:`, 768px) —
// needed because buyer/seller nav targets exist twice in the DOM
// (desktop bar vs. mobile dropdown) and only one is visible at a time.
const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia("(min-width: 768px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
};

const getSteps = (role, isDesktop) => {
  const suffix = isDesktop ? "desktop" : "mobile";
  const isBuyer = role === "BUYER";

  return [
    {
      target: isBuyer
        ? `[data-tour="tour-marketplace-${suffix}"]`
        : `[data-tour="tour-sell-item-${suffix}"]`,
      content: isBuyer
        ? "Browse everything students on your campus are selling — books, electronics, clothing, and more."
        : "Ready to sell something? Tap here to list an item in under a minute.",
      disableBeacon: true,
    },
    {
      target: `[data-tour="tour-profile-${suffix}"]`,
      content: isBuyer
        ? "This is your profile — manage your account and check your activity here."
        : "Manage your listings and account details from your profile.",
    },
  ];
};

export const TutorialProvider = ({ children }) => {
  const { user, setUser, isAuthenticated } = useAuth();
  const isDesktop = useIsDesktop();
  const [manualRun, setManualRun] = useState(false);
  const [tourKey, setTourKey] = useState(0);

  const shouldAutoRun = Boolean(isAuthenticated && user && !user.hasSeenTutorial);
  const run = shouldAutoRun || manualRun;
  const steps = user ? getSteps(user.role, isDesktop) : [];

  const startTutorial = useCallback(() => {
    setTourKey((prev) => prev + 1);
    setManualRun(true);
  }, []);

  const handleCallback = async (data) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setManualRun(false);
      if (!user?.hasSeenTutorial) {
        try {
          const updatedUser = await markTutorialSeen();
          setUser(updatedUser);
        } catch {
          // Non-critical: if this fails, the tour just auto-runs again
          // next session. Not worth blocking or surfacing an error for.
        }
      }
    }
  };

  return (
    <TutorialContext.Provider value={{ startTutorial }}>
      {children}
      {isAuthenticated && steps.length > 0 && (
        <Joyride
          key={tourKey}
          run={run}
          steps={steps}
          continuous
          showSkipButton
          debug
          callback={handleCallback}
          styles={{ options: { primaryColor: "#1340B8", zIndex: 10000 } }}
        />
      )}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
};