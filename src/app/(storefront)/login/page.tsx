"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { siteConfig } from "@/config/site";

type Step = "phone" | "otp";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";
  const { session, sendOtp, verifyOtp } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Redirect if already authenticated
  useEffect(() => {
    if (session.isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [session.isAuthenticated, router, redirectTo]);

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      toast({ title: "Invalid phone", description: "Enter a valid 10-digit mobile number.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const result = await sendOtp(`+91${cleanPhone}`);
    setIsLoading(false);

    if (result.success) {
      setStep("otp");
      setCooldown(30);
      toast({ title: "OTP Sent", description: "Check your WhatsApp for the OTP." });
    } else {
      toast({ title: "Failed to send OTP", description: result.message, variant: "destructive" });
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      toast({ title: "Invalid OTP", description: "Enter the 6-digit OTP.", variant: "destructive" });
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    setIsLoading(true);
    const result = await verifyOtp(`+91${cleanPhone}`, otp);
    setIsLoading(false);

    if (result.success) {
      toast({ title: "Welcome!", description: "You are now logged in." });
      router.replace(redirectTo);
    } else {
      toast({ title: "Verification failed", description: result.message, variant: "destructive" });
    }
  }

  async function handleResend() {
    const cleanPhone = phone.replace(/\D/g, "");
    setIsLoading(true);
    const result = await sendOtp(`+91${cleanPhone}`);
    setIsLoading(false);

    if (result.success) {
      setCooldown(30);
      toast({ title: "OTP Resent", description: "Check your WhatsApp." });
    } else {
      toast({ title: "Failed", description: result.message, variant: "destructive" });
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{siteConfig.name}</CardTitle>
          <CardDescription>
            {step === "phone"
              ? "Enter your mobile number to continue"
              : `Enter the OTP sent to your WhatsApp`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  +91
                </span>
                <Input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="pl-[4.5rem]"
                  autoFocus
                  maxLength={10}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || phone.replace(/\D/g, "").length !== 10}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Send OTP via WhatsApp
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Sent to +91 {phone}
                <button
                  type="button"
                  onClick={() => { setStep("phone"); setOtp(""); }}
                  className="ml-2 text-primary underline"
                >
                  Change
                </button>
              </p>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-lg tracking-widest"
                autoFocus
                maxLength={6}
              />
              <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verify OTP
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || isLoading}
                  className="text-sm text-primary underline disabled:text-muted-foreground disabled:no-underline"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
