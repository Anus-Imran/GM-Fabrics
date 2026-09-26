import "./globals.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import { AuthProvider } from "../context/authContext.jsx";
import { ThemeProvider } from "../context/themeContext.jsx";
import { SidebarProvider } from "../components/navigation/sidebarContext.jsx";

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
        <ThemeProvider>
          <AuthProvider>
            <SidebarProvider defaultOpen={true} defaultVariant="sidebar" defaultCollapsible="icon">
              {children}
              <ToastContainer />
            </SidebarProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
