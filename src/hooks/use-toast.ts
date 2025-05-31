
import { toast } from "sonner";

// Simple re-export of sonner toast for compatibility
export { toast };

// Create a hook that returns the toast function for components that prefer hooks
export const useToast = () => {
  return { toast };
};
