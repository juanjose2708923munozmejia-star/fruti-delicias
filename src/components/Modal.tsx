"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  label: string;
  variant: "sheet" | "drawer";
  children: React.ReactNode;
};

/** Diálogo nativo <dialog>: maneja foco, tecla Esc y accesibilidad sin librerías. */
export function Modal({ open, onClose, label, variant, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog dialog-${variant}`}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        // Un clic en el fondo oscuro llega al <dialog> mismo (no a su contenido).
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}
