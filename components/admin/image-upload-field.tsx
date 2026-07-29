"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { uploadImageFile } from "@/lib/upload-client";

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUploadField({ value, onChange, label = "Subir imagen" }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Sube el archivo original sin recomprimir ni redimensionar.
      const asset = await uploadImageFile(file);
      onChange(asset.url);
    } catch (error) {
      toast.add({
        title: "Error al subir la imagen",
        description: error instanceof Error ? error.message : undefined,
        type: "error",
      });
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="mt-1 flex items-center gap-4">
      {value ? (
        <div className="relative w-20 h-20 rounded-xl border border-gray-100 bg-gray-50 overflow-hidden group">
          <img src={value} alt="" className="w-full h-full object-contain p-1.5" />
          <button
            type="button"
            onClick={() => onChange("")}
            title="Quitar imagen"
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        <div className="w-20 h-20 rounded-xl border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300 text-xs">
          Sin imagen
        </div>
      )}

      <div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        <Button
          type="button"
          variant="outline"
          className="rounded-xl gap-2"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {label}
        </Button>
      </div>
    </div>
  );
}
