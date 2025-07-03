import { useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import FarmerManagement from "@/components/admin/FarmerManagement";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function AdminFarmersPage() {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  
  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      toast({
        title: "Authentication required",
        description: "Please log in to access the admin area",
        variant: "destructive"
      });
      navigate('/admin/login');
    }
  }, [toast, navigate]);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Farmer Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage farmer profiles that appear on the website. Create, update, or remove farmers from the platform.
          </p>
        </div>
        
        <FarmerManagement />
      </div>
    </AdminLayout>
  );
}