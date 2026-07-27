"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Send, Truck, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  updateOrderStatus,
  updateOrderTracking,
  resendOrderStatusEmail,
} from "@/actions/admin/orders";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  SHIPPING_CARRIERS,
} from "@/lib/order-status";

interface OrderControlsProps {
  orderId: string;
  status: string;
  trackingNumber: string | null;
  carrier: string | null;
  trackingUrl: string | null;
}

export function OrderControls({
  orderId,
  status,
  trackingNumber,
  carrier,
  trackingUrl,
}: OrderControlsProps) {
  const router = useRouter();

  const [currentStatus, setCurrentStatus] = useState(status);
  const [statusNote, setStatusNote] = useState("");
  const [notifyOnStatus, setNotifyOnStatus] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);

  const [tracking, setTracking] = useState(trackingNumber ?? "");
  const [selectedCarrier, setSelectedCarrier] = useState(carrier ?? "");
  const [url, setUrl] = useState(trackingUrl ?? "");
  const [notifyOnTracking, setNotifyOnTracking] = useState(true);
  const [savingTracking, setSavingTracking] = useState(false);

  const [resending, setResending] = useState(false);

  const statusItems = useMemo(
    () => Object.fromEntries(ORDER_STATUSES.map((s) => [s, ORDER_STATUS_LABELS[s]])),
    []
  );
  const carrierItems = useMemo(
    () => Object.fromEntries(SHIPPING_CARRIERS.map((c) => [c.name, c.name])),
    []
  );

  async function handleStatusChange(next: string | null) {
    if (!next || next === currentStatus) return;

    const previous = currentStatus;
    setCurrentStatus(next);
    setSavingStatus(true);

    const result = await updateOrderStatus(orderId, next, {
      note: statusNote.trim() || undefined,
      notify: notifyOnStatus,
    });

    if (result.success) {
      toast.add({
        title: `Estado: ${ORDER_STATUS_LABELS[next]}`,
        description: result.message,
      });
      setStatusNote("");
      router.refresh();
    } else {
      // Se revierte el select si el servidor rechazó el cambio.
      setCurrentStatus(previous);
      toast.add({ title: result.error, type: "error" });
    }

    setSavingStatus(false);
  }

  async function handleSaveTracking() {
    setSavingTracking(true);

    const result = await updateOrderTracking(orderId, {
      trackingNumber: tracking,
      carrier: selectedCarrier,
      trackingUrl: url,
      notify: notifyOnTracking,
    });

    if (result.success) {
      toast.add({ title: "Seguimiento guardado", description: result.message });
      router.refresh();
    } else {
      toast.add({ title: result.error, type: "error" });
    }

    setSavingTracking(false);
  }

  async function handleResend() {
    setResending(true);
    const result = await resendOrderStatusEmail(orderId);
    toast.add(
      result.success
        ? { title: "Email reenviado", description: result.message }
        : { title: result.error, type: "error" }
    );
    setResending(false);
  }

  return (
    <div className="space-y-6">
      {/* Estado */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-gray-400" aria-hidden="true" />
          Estado del pedido
        </h2>

        <div>
          <Label htmlFor="order-status">Estado</Label>
          <div className="flex items-center gap-2 mt-1">
            <Select items={statusItems} value={currentStatus} onValueChange={handleStatusChange}>
              <SelectTrigger id="order-status" className="w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {savingStatus && (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" aria-hidden="true" />
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="status-note">Mensaje para el cliente (opcional)</Label>
          <Textarea
            id="status-note"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            rows={2}
            className="mt-1 rounded-xl"
            placeholder="Si lo dejás vacío se envía el texto estándar de ese estado."
          />
        </div>

        <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-gray-50">
          <Label htmlFor="notify-status" className="cursor-pointer text-sm">
            Notificar al cliente por email
          </Label>
          <Switch id="notify-status" checked={notifyOnStatus} onCheckedChange={setNotifyOnStatus} />
        </div>

        <Button
          type="button"
          variant="outline"
          className="rounded-xl gap-2 w-full"
          disabled={resending}
          onClick={handleResend}
        >
          {resending ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="w-4 h-4" aria-hidden="true" />
          )}
          Reenviar email del estado actual
        </Button>
      </section>

      {/* Seguimiento */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Truck className="w-4 h-4 text-gray-400" aria-hidden="true" />
          Envío y seguimiento
        </h2>

        <div>
          <Label htmlFor="carrier">Empresa de envío</Label>
          <Select
            items={carrierItems}
            value={selectedCarrier}
            onValueChange={(v) => setSelectedCarrier(v ?? "")}
          >
            <SelectTrigger id="carrier" className="mt-1 w-full rounded-xl">
              <SelectValue placeholder="Elegir empresa" />
            </SelectTrigger>
            <SelectContent>
              {SHIPPING_CARRIERS.map((c) => (
                <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="tracking">Número de seguimiento</Label>
          <Input
            id="tracking"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            className="mt-1 rounded-xl"
            placeholder="Ej: AR123456789"
          />
        </div>

        <div>
          <Label htmlFor="tracking-url">Link de seguimiento (opcional)</Label>
          <Input
            id="tracking-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 rounded-xl"
            placeholder="Se completa solo según la empresa elegida"
          />
        </div>

        <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-gray-50">
          <Label htmlFor="notify-tracking" className="cursor-pointer text-sm">
            Avisarle al cliente que ya puede rastrear
          </Label>
          <Switch
            id="notify-tracking"
            checked={notifyOnTracking}
            onCheckedChange={setNotifyOnTracking}
          />
        </div>

        <Button
          type="button"
          className="rounded-xl gap-2 w-full bg-brand-blue-mid hover:bg-brand-blue-hover"
          disabled={savingTracking}
          onClick={handleSaveTracking}
        >
          {savingTracking ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="w-4 h-4" aria-hidden="true" />
          )}
          Guardar seguimiento
        </Button>
      </section>
    </div>
  );
}
