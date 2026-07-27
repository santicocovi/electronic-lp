"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { updateOrderStatus, updateOrderTracking } from "@/actions/admin/orders";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/order-status";

interface OrderControlsProps {
  orderId: string;
  status: string;
  trackingNumber: string | null;
}

export function OrderControls({ orderId, status, trackingNumber }: OrderControlsProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [tracking, setTracking] = useState(trackingNumber ?? "");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingTracking, setSavingTracking] = useState(false);

  const statusItems = useMemo(
    () => Object.fromEntries(ORDER_STATUSES.map((s) => [s, ORDER_STATUS_LABELS[s]])),
    []
  );

  async function handleStatusChange(next: string | null) {
    if (!next || next === currentStatus) return;
    const previous = currentStatus;
    setCurrentStatus(next);
    setSavingStatus(true);
    const result = await updateOrderStatus(orderId, next);
    if (result.success) {
      toast.add({ title: `Estado actualizado a "${ORDER_STATUS_LABELS[next]}"` });
      router.refresh();
    } else {
      setCurrentStatus(previous);
      toast.add({ title: result.error, type: "error" });
    }
    setSavingStatus(false);
  }

  async function handleSaveTracking() {
    setSavingTracking(true);
    const result = await updateOrderTracking(orderId, tracking);
    if (result.success) {
      toast.add({ title: "Seguimiento guardado" });
      router.refresh();
    } else {
      toast.add({ title: result.error, type: "error" });
    }
    setSavingTracking(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <h2 className="font-semibold text-gray-900">Gestión del pedido</h2>

      <div>
        <Label>Estado</Label>
        <div className="flex items-center gap-2 mt-1">
          <Select items={statusItems} value={currentStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {savingStatus && <Loader2 className="w-4 h-4 animate-spin text-gray-400 flex-shrink-0" />}
        </div>
      </div>

      <div>
        <Label>Número de seguimiento</Label>
        <div className="flex gap-2 mt-1">
          <Input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            className="rounded-xl"
            placeholder="Ej: AR123456789"
          />
          <Button
            type="button"
            variant="outline"
            className="rounded-xl flex-shrink-0 gap-2"
            disabled={savingTracking}
            onClick={handleSaveTracking}
          >
            {savingTracking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
