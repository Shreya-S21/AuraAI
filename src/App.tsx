
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SessionProvider } from "./context/SessionContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AuthScreen } from "./pages/AuthScreen";
import { Navbar, Page } from "./components/Navbar";
import { Browse } from "./pages/Browse";
import { Dashboard } from "./pages/Dashboard";
import { Profile } from "./pages/Profile";
import { ProductDetail } from "./components/ProductDetail";
import { Product } from "./data/products";

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const { user } = useAuth();
  if (!user) return <AuthScreen />;
  return (
    <SessionProvider>
      <Shell />
    </SessionProvider>
  );
}

function Shell() {
  const [page, setPage] = useState<Page>("browse");
  const [active, setActive] = useState<Product | null>(null);

  return (
    <div className="min-h-screen bg-[#07070b] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-violet-700/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[34rem] w-[34rem] rounded-full bg-sky-700/10 blur-[120px]" />
      </div>

      <div className="relative">
        <Navbar page={page} setPage={setPage} />

        <AnimatePresence mode="wait">
          <motion.main
            key={page}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {page === "browse" && <Browse onOpen={setActive} />}
            {page === "dashboard" && <Dashboard onOpen={setActive} />}
            {page === "profile" && <Profile onOpen={setActive} />}
          </motion.main>
        </AnimatePresence>

        <footer className="border-t border-white/5 px-4 py-8 text-center md:px-8">
          <p className="text-xs text-zinc-600">
            AuraAI • Behavioral Recommendation Intelligence • Built with React, Vite, MediaPipe & Firebase
          </p>
        </footer>
      </div>

      <ProductDetail
        product={active}
        onClose={() => setActive(null)}
        onOpen={setActive}
      />
    </div>
  );
}
