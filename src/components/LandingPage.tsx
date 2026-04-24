import { createDrawing, getAllDrawings } from '@/lib/drawingManager';
import { motion } from 'framer-motion';
import { Pencil, ArrowRight, GitForkIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Button } from './ui/button';

export default function LandingPage() {
  const navigate = useNavigate();

  const handleDrawingRedirect = () => {
    const stored = getAllDrawings();
    if (stored.length === 0) {
      // No drawings exist → force user to create one
      const name = prompt("Create your first drawing:", "Untitled");
      const meta = createDrawing(name || "Untitled");
      navigate(`/${meta.id}`);
      return;
    }
    // Drawings exist → open the first one
    navigate(`/${stored[0].id}`);


  };

  // Framer motion variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-200">

      {/* Navbar */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2 font-bold text-xl tracking-tight">
          <div className="bg-slate-900 p-1.5 rounded-lg">
            <Pencil className="w-5 h-5 text-white" />
          </div>
          <span>Ycalidraw</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link to="https://github.com/wiseyxd/ycalidraw" target="_blank">
            <Button variant="ghost" className="hidden sm:inline-flex">
              <GitForkIcon className="w-4 h-4 mr-2" />
              Star on GitHub
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-32 text-center flex flex-col items-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-3xl flex flex-col items-center"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium mb-6">
            <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            Powered by Cloudflare Durable Objects
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
            Draw together, <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-600 to-slate-900">in absolute real-time.</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl">
            A blazing fast, multiplayer whiteboarding tool built on the Excalidraw engine. Share a link and start collaborating instantly with zero lag.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <Button onClick={handleDrawingRedirect}>
              Start Drawing Now
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        </motion.div>

        {/* Browser Mockup Illustration */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="mt-20 w-full max-w-5xl relative"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent z-10 bottom-0 top-1/2 rounded-b-2xl" />
          <div className="rounded-2xl border border-slate-200/60 bg-white shadow-2xl overflow-hidden aspect-[16/9] md:aspect-[21/9] flex flex-col">
            {/* Mockup Header */}
            <div className="h-12 border-b border-slate-100 bg-slate-50 flex items-center px-4 space-x-2">
              <div className="flex space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="mx-auto w-1/3 h-6 bg-white border border-slate-200 rounded-md text-[10px] text-slate-400 flex items-center justify-center font-mono">
                ycalidraw.app/room/a1b2c3d4
              </div>
            </div>
            {/* Mockup Body */}
            <div className="flex-1 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50/50 relative flex items-center justify-center">
              <div className="text-slate-400 font-medium">Your Drawing Canvas </div>

              {/* Fake Multiplayer Cursors */}
              <motion.div
                animate={{ x: [0, 100, 50], y: [0, -50, 20] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="absolute top-1/3 left-1/3 flex flex-col items-center pointer-events-none"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-500 drop-shadow-md">
                  <path d="M5.65376 21.3113L3.89648 3.01026C3.7663 1.65431 5.25055 0.722659 6.42533 1.42449L21.3655 10.3475C22.4939 11.0215 22.2536 12.7212 20.9575 13.0441L14.7745 14.5843C14.4079 14.6757 14.1102 14.9395 13.9669 15.299L11.3742 21.8021C10.8876 23.0223 9.1172 22.9734 8.70519 21.724L5.65376 21.3113Z" fill="currentColor" />
                </svg>
                <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium ml-4">Aryan</span>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 py-12 border-t border-slate-200 text-center text-slate-500 text-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <p>© {new Date().getFullYear()} Ycalidraw. Built by an Aryan Sanjay Nagbanshi.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="https://x.com/AryanNagbanshi" className="hover:text-slate-900 transition-colors">Twitter</a>
            <a href="https://github.com/wiseyxd" className="hover:text-slate-900 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
