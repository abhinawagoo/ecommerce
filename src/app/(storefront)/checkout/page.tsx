"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { MapPin, Tag, CreditCard, Check, Loader2, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/providers/cart-provider";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import * as addressService from "@/services/address.service";
import * as couponService from "@/services/coupon.service";
import * as orderService from "@/services/order.service";
import { siteConfig } from "@/config/site";
import type { DbAddress } from "@/types/database";

const SHIPPING_FREE_ABOVE = 999;
const DEFAULT_SHIPPING = 99;

type CheckoutStep = "address" | "coupon" | "payment";

const steps: { key: CheckoutStep; label: string; icon: typeof MapPin }[] = [
  { key: "address", label: "Address", icon: MapPin },
  { key: "coupon", label: "Coupon", icon: Tag },
  { key: "payment", label: "Payment", icon: CreditCard },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { state, subtotal, mrpTotal, discount: cartDiscount, clearCart } = useCart();
  useAuth(); // Ensures user is authenticated (middleware also guards this route)
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<CheckoutStep>("address");

  // Address state
  const [addresses, setAddresses] = useState<DbAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(true);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Payment state
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Computed totals
  const shippingCharge = subtotal >= SHIPPING_FREE_ABOVE ? 0 : DEFAULT_SHIPPING;
  const totalDiscount = couponDiscount;
  const orderTotal = Math.max(0, subtotal - totalDiscount + shippingCharge);
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? null;

  const loadAddresses = useCallback(async () => {
    try {
      const data = await addressService.getAddresses();
      setAddresses(data);
      const defaultAddr = data.find((a) => a.is_default);
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      else if (data.length > 0) setSelectedAddressId(data[0].id);
    } catch {
      toast({ title: "Error", description: "Failed to load addresses", variant: "destructive" });
    } finally {
      setAddressLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (state.items.length === 0) {
      router.replace("/cart");
      return;
    }
    loadAddresses();
  }, [state.items.length, router, loadAddresses]);

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const result = await couponService.validateCoupon(couponCode.trim(), subtotal);
      if (result.valid && result.discountAmount) {
        setCouponDiscount(result.discountAmount);
        setAppliedCoupon(couponCode.trim().toUpperCase());
        toast({ title: result.message });
      } else {
        toast({ title: "Invalid coupon", description: result.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to validate coupon", variant: "destructive" });
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setCouponCode("");
    setCouponDiscount(0);
    setAppliedCoupon(null);
  }

  async function handlePayment() {
    if (!selectedAddress) {
      toast({ title: "Select an address", variant: "destructive" });
      setCurrentStep("address");
      return;
    }

    if (!razorpayLoaded || !window.Razorpay) {
      toast({ title: "Payment gateway loading...", description: "Please wait a moment and try again." });
      return;
    }

    setPaymentLoading(true);

    try {
      // Create Razorpay order
      const razorpayOrder = await orderService.createRazorpayOrder(orderTotal);

      // Open Razorpay checkout
      const options: RazorpayOptions = {
        key: razorpayOrder.key_id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: siteConfig.name,
        description: `Order - ${state.items.length} item(s)`,
        order_id: razorpayOrder.order_id,
        handler: async (response: RazorpayResponse) => {
          try {
            const result = await orderService.verifyPaymentAndCreateOrder(
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              {
                items: state.items,
                address: selectedAddress,
                subtotal,
                discount: totalDiscount,
                shippingCharge,
                total: orderTotal,
                couponCode: appliedCoupon ?? undefined,
              }
            );

            clearCart();
            router.push(`/order-success/${result.order_id}`);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Payment verification failed";
            toast({ title: "Payment Error", description: message, variant: "destructive" });
            setPaymentLoading(false);
          }
        },
        prefill: {
          name: selectedAddress.full_name,
          contact: selectedAddress.phone,
        },
        theme: { color: "#000000" },
        modal: {
          ondismiss: () => {
            setPaymentLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to initiate payment";
      toast({ title: "Error", description: message, variant: "destructive" });
      setPaymentLoading(false);
    }
  }

  const stepIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayLoaded(true)}
      />

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <h1 className="text-xl font-semibold mb-6">Checkout</h1>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === stepIndex;
            const isComplete = i < stepIndex;
            return (
              <div key={step.key} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <button
                  onClick={() => setCurrentStep(step.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isComplete
                      ? "bg-green-100 text-green-800"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isComplete ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Address */}
            {currentStep === "address" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Select Delivery Address</CardTitle>
                </CardHeader>
                <CardContent>
                  {addressLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground mb-4">No saved addresses</p>
                      <Button onClick={() => router.push("/account/addresses")}>
                        <Plus className="h-4 w-4 mr-1" /> Add Address
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {addresses.map((addr) => (
                        <button
                          key={addr.id}
                          onClick={() => setSelectedAddressId(addr.id)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                            selectedAddressId === addr.id
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-muted-foreground/20"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm">{addr.full_name}</p>
                            {addr.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {addr.address_line1}, {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{addr.phone}</p>
                        </button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => router.push("/account/addresses")}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add New Address
                      </Button>
                    </div>
                  )}
                  {selectedAddressId && (
                    <Button className="w-full mt-4" onClick={() => setCurrentStep("coupon")}>
                      Continue <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 2: Coupon */}
            {currentStep === "coupon" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Apply Coupon</CardTitle>
                </CardHeader>
                <CardContent>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          <Tag className="h-3.5 w-3.5 inline mr-1" />
                          {appliedCoupon} applied
                        </p>
                        <p className="text-xs text-green-700">
                          You save {formatCurrency(couponDiscount)}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleRemoveCoupon}>
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="uppercase"
                      />
                      <Button onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}>
                        {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                      </Button>
                    </div>
                  )}
                  <Button className="w-full mt-4" onClick={() => setCurrentStep("payment")}>
                    Continue to Payment <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Payment */}
            {currentStep === "payment" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payment</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Address summary */}
                  {selectedAddress && (
                    <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Delivering to</p>
                        <button
                          onClick={() => setCurrentStep("address")}
                          className="text-xs text-primary underline"
                        >
                          Change
                        </button>
                      </div>
                      <p className="text-sm font-medium">{selectedAddress.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedAddress.address_line1}, {selectedAddress.city} - {selectedAddress.pincode}
                      </p>
                    </div>
                  )}

                  {/* Items summary */}
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">{state.items.length} item(s)</p>
                    <div className="space-y-2">
                      {state.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground truncate mr-2">
                            {item.name} {item.size ? `(${item.size})` : ""} x{item.quantity}
                          </span>
                          <span>{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handlePayment}
                    disabled={paymentLoading || !selectedAddress}
                  >
                    {paymentLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    Pay {formatCurrency(orderTotal)}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div>
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MRP Total</span>
                    <span>{formatCurrency(mrpTotal)}</span>
                  </div>
                  {cartDiscount > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Product Discount</span>
                      <span>-{formatCurrency(cartDiscount)}</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Coupon ({appliedCoupon})</span>
                      <span>-{formatCurrency(couponDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{shippingCharge === 0 ? <span className="text-green-700">FREE</span> : formatCurrency(shippingCharge)}</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(orderTotal)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
