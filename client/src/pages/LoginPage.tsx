import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { FileText, Upload, CheckCircle, ShieldCheck, FolderKanban, Phone, Moon, Sun, ArrowRight, Shield, Sparkles, Globe } from "lucide-react";
import { SiGoogle, SiFacebook } from "react-icons/si";
import { FaMicrosoft } from "react-icons/fa";
import { useState, useEffect } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "react-hot-toast";

const loginSchema = z.object({
  username: z.string().min(1, "Email is required").email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginPageProps {
  onLogin?: (data: LoginFormValues) => Promise<boolean> | void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.classList.toggle('dark', newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const handleSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const success = await onLogin?.(data);

      if (success) {
        // Trigger colorful transition for success
        setIsLoggingIn(true);
        toast.success('Access Granted! Establishing Secure Connection...', {
          icon: '🔐',
          style: {
            borderRadius: '12px',
            background: '#0F172A',
            color: '#F8FAFC',
          },
        });
        // We don't need to setIsLoading(false) if we are navigating away
      } else {
        // Login failed (notifications are handled in parent)
        setIsLoggingIn(false);
        setIsLoading(false);
      }
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
      setIsLoggingIn(false);
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Globe, title: "Global Standard", desc: "One World, One Quality philosophy" },
    { icon: ShieldCheck, title: "Colorant Integrity", desc: "Secure batch & revision control" },
    { icon: Upload, title: "Smart Repository", desc: "Automated document lifecycle" },
    { icon: CheckCircle, title: "Quality Assurance", desc: "Multi-tier approval workflows" },
  ];

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col relative overflow-hidden font-sans">
      <Toaster position="top-right" />

      {/* Full Screen Colorful Login Transition */}
      <AnimatePresence>
        {isLoggingIn && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-white dark:bg-slate-950"
          >
            <motion.div
              animate={{
                rotate: 360,
                scale: [1, 1.5, 1],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute w-[150vw] h-[150vw] bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-500 rounded-full blur-[150px] opacity-60"
            />
            <div className="relative z-10 flex flex-col items-center gap-6">
              <img src="/logo.png" alt="Logo" className="h-16 w-auto animate-pulse" />
              <div className="flex flex-col items-center">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-[4px] uppercase">Initializing</h2>
                <div className="flex gap-1 mt-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 bg-blue-600 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Pigment Blobs (Background) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 dark:opacity-20">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1.2, 1, 1.2],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-purple-500 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            x: [100, 0, 100],
            y: [50, 0, 50],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-pink-500 rounded-full blur-[100px]"
        />
      </div>

      <header className="relative z-20 flex items-center justify-between px-8 py-3 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-b border-white/20 dark:border-slate-800/20">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-4"
        >
          <img src="/logo.png" alt="Neelikon Logo" className="h-8 w-auto" />
          <div className="h-6 w-px bg-slate-300 dark:bg-slate-700"></div>
          <span className="text-base font-black tracking-tight text-slate-900 dark:text-white uppercase">
            Document Management System
          </span>
        </motion.div>

        <div className="flex items-center gap-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="hidden md:flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[2px]"
          >
            <Globe className="w-3 h-3 text-blue-500" />
            One World One Quality
          </motion.div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full w-8 h-8 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row relative z-10 overflow-hidden">
        {/* Branding Section */}
        <div className="lg:w-2/5 flex flex-col justify-center p-8 lg:p-16 space-y-6">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 text-white text-[9px] font-black uppercase tracking-[3px] rounded-full shadow-lg shadow-blue-500/30">
              <Sparkles className="w-3 h-3" />
              Specialty Colorants
            </div>
            <h1 className="text-3xl md:text-5xl font-black leading-[1.1] text-slate-900 dark:text-white">
              Revolutionary <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Digital Repository
              </span>
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed font-medium">
              Neelikon's world-class platform ensuring document integrity and global quality standards.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {features.map((f, i) => (
              <div key={i} className="p-3 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-xl border border-white/20 dark:border-slate-800/20 group hover:border-blue-500/50 transition-all">
                <div className="p-1.5 bg-blue-500/10 rounded-lg w-fit mb-2 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                  <f.icon className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:text-white" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-xs mb-0.5">{f.title}</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{f.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Login Section */}
        <div className="lg:w-3/5 flex items-center justify-center p-4 lg:p-8 relative">
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="w-full max-w-2xl relative"
          >
            {/* Login Card with Glassmorphism */}
            <Card className="p-6 lg:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-white/40 dark:border-slate-800/40 rounded-[2.5rem] overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500"></div>

              <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">System Portal</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Authorized Access Only</p>
                </div>
                <img src="/logo.png" alt="Logo" className="h-10 w-auto self-start sm:self-auto" />
              </div>

              <div className="max-w-md mx-auto w-full">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] font-black uppercase tracking-[2px] text-slate-500 dark:text-slate-400">Corporate Identity</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Input
                                type="email"
                                placeholder="email@neelikon.com"
                                {...field}
                                className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 focus:bg-white dark:focus:bg-slate-950 px-4 transition-all duration-300 ring-offset-blue-600"
                              />
                              <div className="absolute inset-y-0 right-3 flex items-center text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                <Shield className="w-4 h-4" />
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] font-black uppercase tracking-[2px] text-slate-500 dark:text-slate-400">Access Key</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••••••"
                              {...field}
                              className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 focus:bg-white dark:focus:bg-slate-950 px-4 transition-all duration-300"
                            />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-[2px] rounded-xl shadow-xl shadow-blue-500/25 transition-all duration-300 relative group overflow-hidden mt-2"
                    >
                      <AnimatePresence mode="wait">
                        {isLoading ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2"
                          >
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Validating...
                          </motion.div>
                        ) : (
                          <motion.span
                            key="text"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2"
                          >
                            Establish Session
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Button>
                  </form>
                </Form>

                <div className="mt-6 flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Connect with</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
                </div>

                <div className="flex justify-center gap-3 mt-4">
                  <Button type="button" variant="outline" size="icon" className="rounded-full w-9 h-9 border-slate-200 dark:border-slate-800 hover:bg-white group"><SiGoogle className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 transition-colors" /></Button>
                  <Button type="button" variant="outline" size="icon" className="rounded-full w-9 h-9 border-slate-200 dark:border-slate-800 hover:bg-white group"><FaMicrosoft className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" /></Button>
                  <Button type="button" variant="outline" size="icon" className="rounded-full w-9 h-9 border-slate-200 dark:border-slate-800 hover:bg-white group"><SiFacebook className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-700 transition-colors" /></Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>

      <footer className="relative z-20 text-center py-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-t border-white/20 dark:border-slate-800/20">
        <div className="container mx-auto px-8 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[1px]">
          <p>© 2026 Neelikon Food Dyes & Chemicals Limited. All Rights Reserved by <a href="https://cybaemtech.com/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 underline underline-offset-2 transition-colors">Cybaem Tech</a></p>
        </div>
      </footer>
    </div>
  );
}
