import type { Metadata } from "next";
import "./globals.css";
import "@/styles/theme.ide.css";
import '@/styles/ide-overrides.css';
import { AuthProvider } from "@/contexts/AuthContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { FilterProvider } from "@/contexts/FilterContext";
import { ToastProvider, ToastContainer } from "@/components/ui";
import AppLayout from "@/components/AppLayout";
import TopLoadingBar from "@/components/TopLoadingBar";

export const metadata: Metadata = {
  title: "Turboline | Streaming Agents",
  description: "AI-powered realtime data analysis with user authentication",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body data-theme="ide" className="h-full overflow-hidden">
        <AuthProvider>
          <WebSocketProvider>
            <FilterProvider>
              <SubscriptionProvider>
                <LoadingProvider>
                <ToastProvider>
                  <AppLayout>
                    {children}
                  </AppLayout>
                  <ToastContainer />
                </ToastProvider>
                </LoadingProvider>
              </SubscriptionProvider>
            </FilterProvider>
          </WebSocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
