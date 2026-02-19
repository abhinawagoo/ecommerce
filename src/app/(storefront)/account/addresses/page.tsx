"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import * as addressService from "@/services/address.service";
import type { DbAddress } from "@/types/database";

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<DbAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DbAddress | null>(null);
  const { toast } = useToast();

  const loadAddresses = useCallback(async () => {
    try {
      const data = await addressService.getAddresses();
      setAddresses(data);
    } catch {
      toast({ title: "Error", description: "Failed to load addresses", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  async function handleDelete(id: string) {
    try {
      await addressService.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Address deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete address", variant: "destructive" });
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await addressService.setDefaultAddress(id);
      await loadAddresses();
      toast({ title: "Default address updated" });
    } catch {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  }

  function openEdit(address: DbAddress) {
    setEditingAddress(address);
    setDialogOpen(true);
  }

  function openNew() {
    setEditingAddress(null);
    setDialogOpen(true);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Saved Addresses</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Add Address
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingAddress ? "Edit Address" : "Add New Address"}</DialogTitle>
            </DialogHeader>
            <AddressForm
              address={editingAddress}
              onSave={() => {
                setDialogOpen(false);
                loadAddresses();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No saved addresses. Add one to get started.
        </p>
      ) : (
        <div className="grid gap-4">
          {addresses.map((address) => (
            <Card key={address.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{address.full_name}</p>
                      {address.is_default && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {address.address_line1}
                      {address.address_line2 && `, ${address.address_line2}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {address.city}, {address.state} - {address.pincode}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Phone: {address.phone}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!address.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleSetDefault(address.id)}
                        title="Set as default"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(address)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(address.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Address Form Component ---
function AddressForm({
  address,
  onSave,
}: {
  address: DbAddress | null;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: address?.full_name ?? "",
    phone: address?.phone ?? "",
    address_line1: address?.address_line1 ?? "",
    address_line2: address?.address_line2 ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
    pincode: address?.pincode ?? "",
    is_default: address?.is_default ?? false,
  });

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handlePincodeLookup() {
    if (form.pincode.length !== 6) return;
    const result = await addressService.lookupPincode(form.pincode);
    if (result) {
      setForm((prev) => ({ ...prev, city: result.city, state: result.state }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (address) {
        await addressService.updateAddress(address.id, form);
        toast({ title: "Address updated" });
      } else {
        await addressService.addAddress(form);
        toast({ title: "Address added" });
      }
      onSave();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save address";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        placeholder="Full Name"
        value={form.full_name}
        onChange={(e) => updateField("full_name", e.target.value)}
        required
      />
      <Input
        placeholder="Phone Number"
        type="tel"
        value={form.phone}
        onChange={(e) => updateField("phone", e.target.value)}
        required
      />
      <Input
        placeholder="Address Line 1"
        value={form.address_line1}
        onChange={(e) => updateField("address_line1", e.target.value)}
        required
      />
      <Input
        placeholder="Address Line 2 (optional)"
        value={form.address_line2}
        onChange={(e) => updateField("address_line2", e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          placeholder="Pincode"
          value={form.pincode}
          onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
          onBlur={handlePincodeLookup}
          maxLength={6}
          required
        />
        <Input
          placeholder="City"
          value={form.city}
          onChange={(e) => updateField("city", e.target.value)}
          required
        />
      </div>
      <Input
        placeholder="State"
        value={form.state}
        onChange={(e) => updateField("state", e.target.value)}
        required
      />
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {address ? "Update Address" : "Save Address"}
      </Button>
    </form>
  );
}
