import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Only restore dark if user explicitly chose it (flagged by "user-set")
    const saved = localStorage.getItem("theme");
    const userSet = localStorage.getItem("theme-user-set");
    return saved === "dark" && userSet === "true" ? "dark" : "light";
  });
  const location = useLocation();

  useEffect(() => {
    const root = window.document.documentElement;
    // Remove both to ensure clean slate
    root.classList.remove("light", "dark");

    // Only apply dark mode if theme is set to dark AND we are in the admin area
    const isDarkAllowed =
      location.pathname.startsWith("/admin") &&
      !location.pathname.startsWith("/admin/login");

    if (theme === "dark" && isDarkAllowed) {
      root.classList.add("dark");
    } else {
      root.classList.add("light");
    }

    // We still save the preference to localStorage, so if they go back to admin it remembers
    localStorage.setItem("theme", theme);
  }, [theme, location.pathname]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("theme-user-set", "true");
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
