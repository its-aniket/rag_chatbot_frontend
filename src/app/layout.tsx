import type { Metadata } from "next";
import { AuthProvider } from "../contexts/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAG Chatbot - AI Document Intelligence",
  description: "Modern AI-powered chatbot with advanced document retrieval and analysis capabilities. Upload PDFs and get intelligent answers from your documents.",
  keywords: "AI, chatbot, RAG, document search, artificial intelligence, PDF analysis",
  authors: [{ name: "RAG Chatbot Team" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="color-scheme" content="dark" />
      </head>
      <body className="font-inter bg-gradient-to-br from-slate-900 to-slate-800 text-white antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
