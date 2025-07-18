import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminAuthWrapper from "@/components/admin/AdminAuthWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import placeholderImage from "../../../../public/uploads/products/No-Image.png";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Star,
  StarOff,
  Loader2,
  Package,
  Tag,
  Leaf,
  Shield,
  Crown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import ImageUpload from "@/components/admin/ImageUpload";

// Enhanced Product type with all fields
interface EnhancedProduct {
  id: number;
  name: string;
  shortDescription: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: string;
  subcategory?: string;
  sku?: string;
  unit: string;
  quantity?: number;
  stockQuantity: number;
  imageUrl: string;
  imageUrls?: string[];
  videoUrl?: string;
  farmerId: number;
  featured: boolean;
  // Product Attributes
  naturallyGrown: boolean;
  chemicalFree: boolean;
  premiumQuality: boolean;
  // SEO Fields
  metaTitle?: string;
  metaDescription?: string;
  slug?: string;
  // Social Sharing Options
  enableShareButtons: boolean;
  enableWhatsappShare: boolean;
  enableFacebookShare: boolean;
  enableInstagramShare: boolean;
}

// Enhanced form schema for product with all fields
const enhancedProductFormSchema = z.object({
  // Basic Information
  name: z.string().min(3, "Name must be at least 3 characters"),
  shortDescription: z
    .string()
    .min(10, "Short description must be at least 10 characters"),
  description: z
    .string()
    .min(20, "Full description must be at least 20 characters"),
  category: z.string().min(1, "Please select a category"),
  subcategory: z.string().optional(),
  unit: z.string().min(1, "Please select a unit"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  // Pricing & Inventory
  price: z.number().min(0.01, "Price must be greater than 0"),
  discountPrice: z.number().optional(),
  stockQuantity: z.number().int().min(0, "Stock quantity must be 0 or greater"),
  sku: z.string().optional(),

  // Product Attributes
  naturallyGrown: z.boolean().default(false),
  chemicalFree: z.boolean().default(false),
  premiumQuality: z.boolean().default(false),

  // Media
  imageUrl: z.string().optional(),
  imageUrls: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal("")),

  // Farmer Details
  farmerId: z.number().int().positive("Please select a valid farmer"),

  // SEO
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  slug: z.string().optional(),

  // Social Sharing
  enableShareButtons: z.boolean().default(true),
  enableWhatsappShare: z.boolean().default(true),
  enableFacebookShare: z.boolean().default(true),
  enableInstagramShare: z.boolean().default(true),

  featured: z.boolean().default(false),
});

export default function EnhancedAdminProducts() {
  const [products, setProducts] = useState<EnhancedProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] =
    useState<EnhancedProduct | null>(null);
  const [productToEdit, setProductToEdit] = useState<EnhancedProduct | null>(
    null
  );
  const [categories, setCategories] = useState<string[]>([]);
  const [mainCategories, setMainCategories] = useState<
    { id: number; name: string; slug: string }[]
  >([]);
  const [subcategories, setSubcategories] = useState<
    { id: number; name: string; slug: string; parentId: number }[]
  >([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [farmers, setFarmers] = useState<
    { id: number; name: string; location: string }[]
  >([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [primaryImage, setPrimaryImage] = useState<string>("");
  const [isImageGalleryOpen, setIsImageGalleryOpen] = useState(false);
  const productsPerPage = 5;
  const { toast } = useToast();

  // Form for creating/editing products
  const form = useForm<z.infer<typeof enhancedProductFormSchema>>({
    resolver: zodResolver(enhancedProductFormSchema),
    defaultValues: {
      name: "",
      shortDescription: "",
      description: "",
      price: 0,
      discountPrice: undefined,
      category: "",
      subcategory: "",
      unit: "",
      quantity: 0,
      sku: "",
      stockQuantity: 0,
      imageUrl: "",
      imageUrls: "",
      videoUrl: "",
      farmerId: 1,
      naturallyGrown: false,
      chemicalFree: false,
      premiumQuality: false,
      metaTitle: "",
      metaDescription: "",
      slug: "",
      enableShareButtons: true,
      enableWhatsappShare: true,
      enableFacebookShare: true,
      enableInstagramShare: true,
      featured: false,
    },
  });

  // Fetch products from API
  const fetchProducts = async (page = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch(
        `/api/admin/products?page=${page}&limit=${productsPerPage}&sort=id&order=desc`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();
      setProducts(data.products || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setCurrentPage(data.pagination?.page || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to fetch products",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch main categories
  const fetchMainCategories = async () => {
    try {
      const response = await fetch("/api/categories/main", {
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMainCategories(data);
      }
    } catch (error) {
      console.error("Failed to fetch main categories:", error);
    }
  };

  // Fetch subcategories for a specific parent category
  const fetchSubcategories = async (parentId: number) => {
    try {
      const response = await fetch(
        `/api/categories/${parentId}/subcategories`,
        {
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSubcategories(data);
      }
    } catch (error) {
      console.error("Failed to fetch subcategories:", error);
      setSubcategories([]);
    }
  };

  // Fetch categories (existing function for backward compatibility)
  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) return;

      const response = await fetch("/api/admin/product-categories", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      // Silent error handling for categories
    }
  };

  // Fetch farmers for product creation/editing
  const fetchFarmers = async () => {
    try {
      const response = await fetch("/api/farmers");

      if (response.ok) {
        const data = await response.json();
        setFarmers(
          data.map((farmer: any) => ({
            id: farmer.id,
            name: farmer.name,
            location: farmer.location || "",
          }))
        );
      }
    } catch (err) {
      // Silent error handling for farmers
    }
  };

  // Load products, categories, and farmers on component mount
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchMainCategories();
    fetchFarmers();
  }, []);

  // Handle category change to load subcategories
  const handleCategoryChange = (categoryName: string) => {
    const selectedCategory = mainCategories.find(
      (cat) => cat.name === categoryName
    );
    if (selectedCategory) {
      setSelectedCategoryId(selectedCategory.id);
      fetchSubcategories(selectedCategory.id);
      // Clear subcategory when category changes
      form.setValue("subcategory", "");
    } else {
      setSelectedCategoryId(null);
      setSubcategories([]);
    }
  };

  // Filter products based on search term
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku &&
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    fetchProducts(page);
  };

  // Delete a product
  const handleDeleteProduct = async (id: number) => {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete product");
      }

      fetchProducts(currentPage);

      toast({
        title: "Product deleted",
        description: "The product has been deleted successfully.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to delete product",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  // Toggle product featured status
  const handleToggleFeatured = async (id: number, currentFeatured: boolean) => {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch(`/api/admin/products/${id}/featured`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to update product");
      }

      fetchProducts(currentPage);

      toast({
        title: currentFeatured ? "Product unfeatured" : "Product featured",
        description: `The product has been ${
          currentFeatured ? "removed from" : "added to"
        } featured products.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to update product",
        variant: "destructive",
      });
    }
  };

  // Set up form for editing
  const setupEditForm = (product: EnhancedProduct) => {
    form.reset({
      name: product.name,
      shortDescription:
        product.shortDescription || product.description.substring(0, 100),
      description: product.description,
      price: product.price,
      discountPrice: product.discountPrice,
      category: product.category,
      unit: product.unit || "",
      quantity: product.quantity,
      sku: product.sku || "",
      stockQuantity: product.stockQuantity,
      imageUrl: product.imageUrl,
      imageUrls: product.imageUrls?.join(", ") || "",
      videoUrl: product.videoUrl || "",
      farmerId: product.farmerId,
      naturallyGrown: product.naturallyGrown || false,
      chemicalFree: product.chemicalFree || false,
      premiumQuality: product.premiumQuality || false,
      metaTitle: product.metaTitle || "",
      metaDescription: product.metaDescription || "",
      slug: product.slug || "",
      enableShareButtons: product.enableShareButtons !== false,
      enableWhatsappShare: product.enableWhatsappShare !== false,
      enableFacebookShare: product.enableFacebookShare !== false,
      enableInstagramShare: product.enableInstagramShare !== false,
      featured: product.featured || false,
    });

    // Set existing images for the upload components
    setPrimaryImage(product.imageUrl);
    setUploadedImages(product.imageUrls || []);

    setProductToEdit(product);
    setIsEditDialogOpen(true);
  };

  // Handle primary image upload
  const handlePrimaryImageUpload = (
    imagePath: string,
    thumbnailPath: string
  ) => {
    setPrimaryImage(imagePath);
    form.setValue("imageUrl", imagePath);
  };

  // Handle additional images upload
  const handleAdditionalImageUpload = (
    imagePath: string,
    thumbnailPath: string
  ) => {
    setUploadedImages((prev) => [...prev, imagePath]);
    const currentImages = form.getValues("imageUrls");
    const imageArray = currentImages
      ? currentImages
          .split(",")
          .map((img) => img.trim())
          .filter((img) => img)
      : [];
    imageArray.push(imagePath);
    form.setValue("imageUrls", imageArray.join(","));
  };

  // Handle image removal
  const handleImageRemove = (imagePath: string) => {
    if (imagePath === primaryImage) {
      setPrimaryImage("");
      form.setValue("imageUrl", "");
    } else {
      setUploadedImages((prev) => prev.filter((img) => img !== imagePath));
      const currentImages = form.getValues("imageUrls");
      const imageArray = currentImages
        ? currentImages
            .split(",")
            .map((img) => img.trim())
            .filter((img) => img && img !== imagePath)
        : [];
      form.setValue("imageUrls", imageArray.join(","));
    }
  };

  // Set up form for creating
  const setupCreateForm = () => {
    form.reset({
      name: "",
      shortDescription: "",
      description: "",
      price: 0,
      discountPrice: undefined,
      category: "",
      unit: "",
      quantity: 0,
      sku: "",
      stockQuantity: 0,
      imageUrl: "",
      imageUrls: "",
      videoUrl: "",
      farmerId: farmers[0]?.id || 1,
      naturallyGrown: false,
      chemicalFree: false,
      premiumQuality: false,
      metaTitle: "",
      metaDescription: "",
      slug: "",
      enableShareButtons: true,
      enableWhatsappShare: true,
      enableFacebookShare: true,
      enableInstagramShare: true,
      featured: false,
    });
    setUploadedImages([]);
    setPrimaryImage("");
    setIsCreateDialogOpen(true);
  };

  // Handle form submission for creating/editing
  const onSubmit = async (data: z.infer<typeof enhancedProductFormSchema>) => {
    try {
      console.log("Form submission started with data:", data);

      const token = localStorage.getItem("adminToken");
      if (!token) {
        throw new Error("Authentication required");
      }

      // Ensure we have an image URL from uploads
      if (!primaryImage) {
        toast({
          title: "Validation Error",
          description: "Please upload a primary image",
          variant: "destructive",
        });
        return;
      }

      // Use uploaded image
      const finalImageUrl = primaryImage;

      // Process image URLs if provided
      const imageUrls = data.imageUrls
        ? data.imageUrls
            .split(",")
            .map((url) => url.trim())
            .filter((url) => url)
        : uploadedImages;

      const requestData = {
        ...data,
        imageUrl: finalImageUrl,
        imageUrls: imageUrls.length > 0 ? imageUrls : null,
        videoUrl: data.videoUrl || null,
        discountPrice: data.discountPrice || null,
        sku: data.sku || null,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        slug: data.slug || null,
      };

      console.log("Sending request data:", requestData);

      let response;

      if (productToEdit) {
        // Update existing product
        response = await fetch(`/api/admin/products/${productToEdit.id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        });
      } else {
        // Create new product
        response = await fetch("/api/admin/products", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        });
      }

      const responseData = await response.json();
      console.log("Response:", response.status, responseData);

      if (!response.ok) {
        throw new Error(
          responseData.message ||
            (productToEdit
              ? "Failed to update product"
              : "Failed to create product")
        );
      }

      // Refresh to first page to show newly created product
      if (productToEdit) {
        fetchProducts(currentPage);
      } else {
        fetchProducts(1);
        setCurrentPage(1);
      }

      toast({
        title: productToEdit ? "Product updated" : "Product created",
        description: productToEdit
          ? "The product has been updated successfully."
          : "The product has been created successfully.",
      });

      // Close dialogs and reset state
      setIsEditDialogOpen(false);
      setIsCreateDialogOpen(false);
      setProductToEdit(null);
      setUploadedImages([]);
      setPrimaryImage("");

      // Reset form
      form.reset();
    } catch (err) {
      console.error("Form submission error:", err);
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to save product",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Enhanced Product Management
          </h1>
          <p className="text-muted-foreground">
            Comprehensive product catalog management with advanced features
          </p>
        </div>
        <Button onClick={setupCreateForm}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product List</CardTitle>
          <div className="flex w-full max-w-sm items-center space-x-2 mt-2">
            <Input
              type="search"
              placeholder="Search products, categories, SKUs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9"
            />
            <Button type="submit" size="sm" variant="ghost">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-md text-red-500">{error}</div>
          ) : (
            <>
              <Table className="border">
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Attributes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        No products found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="w-[300px] align-top">
                          <div className="flex items-start gap-3">
                            <div className="relative w-24 h-20 flex-shrink-0">
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover rounded-md"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = placeholderImage;
                                }}
                              />
                              {product.imageUrls?.length > 0 && (
                                <div className="absolute -bottom-1 -right-1 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                  +{product.imageUrls.length}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <p className="font-medium truncate">
                                {product.name}
                              </p>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {product.shortDescription}
                              </p>
                              {product.sku && (
                                <p className="text-xs text-muted-foreground">
                                  SKU: {product.sku}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="w-[150px]">
                          {product.category}
                        </TableCell>
                        <TableCell className="w-[150px]">
                          <div>
                            <p>₹{product.price.toFixed(2)}</p>
                            {product.discountPrice && (
                              <p className="text-sm text-green-600">
                                Discount: ₹{product.discountPrice.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-[150px]">
                          {product.stockQuantity === 0 ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                          ) : product.stockQuantity < 10 ? (
                            <Badge variant="outline">
                              Low: {product.stockQuantity}
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              {product.stockQuantity}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="w-[160px]">
                          <div className="flex flex-col gap-1 space-x-1">
                            {product.naturallyGrown && (
                              <>
                                <Badge variant="secondary" className="text-xs">
                                  <Leaf className="h-3 w-3 mr-1" />
                                  Natural
                                </Badge>
                              </>
                            )}
                            {product.chemicalFree && (
                              <>
                                <Badge variant="secondary" className="text-xs">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Chemical-Free
                                </Badge>
                              </>
                            )}
                            {product.premiumQuality && (
                              <Badge variant="secondary" className="text-xs">
                                <Crown className="h-3 w-3 mr-1" />
                                Premium
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.featured ? (
                            <Badge variant="default">Featured</Badge>
                          ) : (
                            <Badge variant="outline">Standard</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleToggleFeatured(
                                  product.id,
                                  Boolean(product.featured)
                                )
                              }
                            >
                              {product.featured ? (
                                <StarOff className="h-4 w-4 text-amber-500" />
                              ) : (
                                <Star className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setupEditForm(product)}
                              title="Edit Product"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setProductToEdit(product);
                                setIsImageGalleryOpen(true);
                              }}
                              title="View Images"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setProductToDelete(product);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * productsPerPage + 1} to{" "}
                  {Math.min(
                    currentPage * productsPerPage,
                    products.length * totalPages
                  )}{" "}
                  of {products.length * totalPages} products
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Product Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setProductToEdit(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {productToEdit ? "Edit Product" : "Create New Product"}
            </DialogTitle>
            <DialogDescription>
              {productToEdit
                ? "Update the product information below."
                : "Fill in the details to create a new product in your catalog."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing</TabsTrigger>
                  <TabsTrigger value="attributes">Attributes</TabsTrigger>
                  <TabsTrigger value="media">Media</TabsTrigger>
                  <TabsTrigger value="seo">SEO & Social</TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Premium Tea Leaves"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleCategoryChange(value);
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {mainCategories.map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.name}
                                >
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subcategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subcategory (Optional)</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={subcategories.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    subcategories.length === 0
                                      ? "Select a category first"
                                      : "Select a subcategory"
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subcategories.map((subcategory) => (
                                <SelectItem
                                  key={subcategory.id}
                                  value={subcategory.name}
                                >
                                  {subcategory.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose a specific subcategory to help customers find
                            your product more easily
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="shortDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Short Description</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Brief product description for listings"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          This appears in product listings and search results
                          (max 100 chars recommended)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Detailed product description..."
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Detailed description shown on product pages
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="farmerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Farmer/Producer</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(parseInt(value))
                          }
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a farmer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {farmers.map((farmer) => (
                              <SelectItem
                                key={farmer.id}
                                value={farmer.id.toString()}
                              >
                                {farmer.name}{" "}
                                {farmer.location && `- ${farmer.location}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Pricing & Inventory Tab */}
                <TabsContent value="pricing" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (₹)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...(!isCreateDialogOpen ? field : {})}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (value < 0) {
                                  e.target.value = "0";
                                } else {
                                  field.onChange(value);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="discountPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount Price (₹)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Optional discount price"
                              {...(!isCreateDialogOpen ? field : {})}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (value < 0) {
                                  e.target.value = "0";
                                } else {
                                  field.onChange(value);
                                }
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Leave empty if no discount
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...(!isCreateDialogOpen ? field : {})}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (value < 0) {
                                  e.target.value = "0";
                                } else {
                                  field.onChange(value);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={(value) => field.onChange(value)}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a unit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="kg">Kg</SelectItem>
                                <SelectItem value="gram">gram</SelectItem>
                                <SelectItem value="l">L</SelectItem>
                                <SelectItem value="pcs">pcs</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stockQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock Quantity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="100"
                              {...(!isCreateDialogOpen ? field : {})}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (value < 0) {
                                  e.target.value = "0";
                                } else {
                                  field.onChange(value);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU/Product Code</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Optional SKU or product code"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            For inventory management
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Product Attributes Tab */}
                <TabsContent value="attributes" className="space-y-4">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Product Qualities</h4>

                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="naturallyGrown"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Naturally Grown</FormLabel>
                              <FormDescription>
                                Product is grown using natural farming methods
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="chemicalFree"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Chemical-Free</FormLabel>
                              <FormDescription>
                                No chemicals or pesticides used in production
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="premiumQuality"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Premium Quality</FormLabel>
                              <FormDescription>
                                High-quality product with superior
                                characteristics
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="featured"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Featured Product</FormLabel>
                              <FormDescription>
                                Display this product prominently on the homepage
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Media Tab */}
                <TabsContent value="media" className="space-y-4">
                  <div>
                    <FormLabel>Primary Image</FormLabel>
                    <FormDescription className="mb-3">
                      Main product image displayed in listings
                    </FormDescription>
                    <ImageUpload
                      onImageUpload={handlePrimaryImageUpload}
                      onImageRemove={handleImageRemove}
                      existingImages={primaryImage ? [primaryImage] : []}
                      maxImages={1}
                      multiple={false}
                    />
                  </div>

                  <div>
                    <FormLabel>Additional Images</FormLabel>
                    <FormDescription className="mb-3">
                      Multiple images for product gallery (up to 5 images)
                    </FormDescription>
                    <ImageUpload
                      onImageUpload={handleAdditionalImageUpload}
                      onImageRemove={handleImageRemove}
                      existingImages={uploadedImages}
                      maxImages={5}
                      multiple={true}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="videoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Video URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://youtube.com/watch?v=..."
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Optional video showcasing the product or farm story
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* SEO & Social Tab */}
                <TabsContent value="seo" className="space-y-4">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">SEO Settings</h4>

                    <FormField
                      control={form.control}
                      name="metaTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meta Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="SEO title for search engines"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Leave empty to use product name
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="metaDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meta Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Brief description for search engines (150-160 chars)"
                              rows={2}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Leave empty to use short description
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL Slug</FormLabel>
                          <FormControl>
                            <Input placeholder="product-url-slug" {...field} />
                          </FormControl>
                          <FormDescription>
                            URL-friendly version of product name
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">
                      Social Sharing Options
                    </h4>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="enableShareButtons"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Enable Share Buttons</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="enableWhatsappShare"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>WhatsApp Share</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="enableFacebookShare"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Facebook Share</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="enableInstagramShare"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Instagram Share</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setIsEditDialogOpen(false);
                    setProductToEdit(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {productToEdit ? "Update Product" : "Create Product"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Image Gallery Dialog */}
      <Dialog open={isImageGalleryOpen} onOpenChange={setIsImageGalleryOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Images - {productToEdit?.name}</DialogTitle>
            <DialogDescription>
              View all images associated with this product
            </DialogDescription>
          </DialogHeader>
          {productToEdit && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Primary Image</h4>
                <img
                  src={productToEdit.imageUrl}
                  alt={`${productToEdit.name} - Primary`}
                  className="w-full max-w-md h-64 object-cover rounded-lg border"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/api/images/placeholder.png";
                  }}
                />
              </div>
              {productToEdit.imageUrls &&
                productToEdit.imageUrls.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Additional Images ({productToEdit.imageUrls.length})
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {productToEdit.imageUrls.map((imageUrl, index) => (
                        <div key={index} className="relative">
                          <img
                            src={imageUrl}
                            alt={`${productToEdit.name} - Image ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/api/images/placeholder.png";
                            }}
                          />
                          <div className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs rounded px-1">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              {(!productToEdit.imageUrls ||
                productToEdit.imageUrls.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  No additional images available
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{productToDelete?.name}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                productToDelete && handleDeleteProduct(productToDelete.id)
              }
            >
              Delete Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
