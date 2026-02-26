import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { FileText, Upload, CheckCircle, ShieldCheck, FolderKanban, Phone, Moon, Sun } from "lucide-react";
import { SiGoogle, SiFacebook } from "react-icons/si";
import { useState, useEffect } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  username: z.string().min(1, "Email is required").email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginPageProps {
  onLogin?: (data: LoginFormValues) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [isDark, setIsDark] = useState(false);

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

  const handleSubmit = (data: LoginFormValues) => {
    console.log("Login attempt:", data);
    onLogin?.(data);
  };

  const features = [
    { icon: Upload, title: "Document Creation", desc: "Upload documents with metadata" },
    { icon: CheckCircle, title: "Approval Workflow", desc: "Multi-level approval process" },
    { icon: ShieldCheck, title: "Access Control", desc: "Role-based permissions" },
    { icon: FolderKanban, title: "Version Tracking", desc: "Complete version history" },
  ];

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground">Document Management System</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme}
          data-testid="button-theme-toggle"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
      </header>

      <div className="flex-1 flex">
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-12 flex-col justify-center">
          <div className="max-w-lg space-y-8">
            <div className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
              Modern Document Control
            </div>
            
            <div>
              <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                Streamline Your Document Workflows
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                A secure, role-based system for managing SOPs, forms, and revisions with approval workflows and version control.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              {features.map((feature, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg w-fit">
                    <feature.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 bg-white dark:bg-gray-900">
          <Card className="w-full max-w-md p-8 shadow-xl bg-white dark:bg-gray-800">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">Sign In</h2>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="Enter your email" 
                          {...field} 
                          data-testid="input-username" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          {...field}
                          data-testid="input-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" data-testid="button-login">
                  Sign In
                </Button>
              </form>
            </Form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-muted"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">OR CONTINUE WITH</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <Button variant="outline" size="sm" type="button" data-testid="button-google-login">
                  <SiGoogle className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" type="button" data-testid="button-facebook-login">
                  <SiFacebook className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" type="button" data-testid="button-phone-login">
                  <Phone className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-semibold text-foreground mb-2">Demo Credentials:</p>
              <div className="space-y-1 text-xs">
                <p className="text-muted-foreground">
                  <span className="font-medium text-blue-600 dark:text-blue-400">Creator:</span> Priyanka.k@cybaemtech.com / 123
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-green-600 dark:text-green-400">Approver:</span> approver@cybaem.com / 123
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-purple-600 dark:text-purple-400">Issuer:</span> issuer@cybaem.com / 123
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-orange-600 dark:text-orange-400">Admin:</span> admin@cybaem.com / 123
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <footer className="text-center py-4 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        © 2024 Document Management System. All rights reserved.
        <br />
        Designed and maintained by{" "}
        <a 
          href="https://www.cybaemtech.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Cybaem Tech
        </a>
      </footer>
    </div>
  );
}
