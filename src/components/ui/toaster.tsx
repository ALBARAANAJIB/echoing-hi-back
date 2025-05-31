
import { toast } from "sonner";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster 
      position="top-right"
      expand={true}
      richColors={true}
      closeButton={true}
    />
  );
}
