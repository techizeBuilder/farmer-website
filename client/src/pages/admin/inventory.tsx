import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminAuthWrapper from '@/components/admin/AdminAuthWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Package, TrendingDown, Search, Filter, Edit, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  stockQuantity: number;
  imageUrl?: string;
}

export default function AdminInventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [editingStock, setEditingStock] = useState<{ [key: number]: number }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all products with React Query
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/admin/products'],
    queryFn: async () => {
      const response = await fetch('/api/admin/products?limit=50&sort=id&order=desc', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    select: (data: any) => data.products || [],
  });

  // Fetch low stock products
  const { data: lowStockData, isLoading: lowStockLoading } = useQuery({
    queryKey: ['/api/admin/low-stock'],
    select: (data: any) => data.lowStockProducts || [],
  });

  const products = productsData || [];
  const lowStockProducts = lowStockData || [];
  const loading = productsLoading || lowStockLoading;

  // Update stock mutation
  const updateStockMutation = useMutation({
    mutationFn: async ({ productId, newStock }: { productId: number; newStock: number }) => {
      const response = await fetch(`/api/admin/products/${productId}/stock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stockQuantity: newStock }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update stock');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/low-stock'] });
      toast({
        title: "Success",
        description: "Stock updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update stock",
        variant: "destructive",
      });
    },
  });

  // Filter products based on search and category
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Pagination calculations
  const totalProducts = filteredProducts.length;
  const totalPages = Math.ceil(totalProducts / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Get unique categories
  const categories: string[] = [];
  const categorySet = new Set<string>();
  products.forEach((p: Product) => {
    if (!categorySet.has(p.category)) {
      categorySet.add(p.category);
      categories.push(p.category);
    }
  });

  const handleStockEdit = (productId: number, currentStock: number) => {
    setEditingStock({ ...editingStock, [productId]: currentStock });
  };

  const handleStockSave = (productId: number) => {
    const newStock = editingStock[productId];
    if (newStock !== undefined && newStock >= 0) {
      updateStockMutation.mutate({ productId, newStock });
      const { [productId]: _, ...rest } = editingStock;
      setEditingStock(rest);
    }
  };

  const handleStockCancel = (productId: number) => {
    const { [productId]: _, ...rest } = editingStock;
    setEditingStock(rest);
  };

  const getStockBadgeVariant = (stock: number) => {
    if (stock === 0) return 'destructive';
    if (stock <= 10) return 'secondary';
    return 'default';
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return 'Out of Stock';
    if (stock <= 10) return 'Low Stock';
    return 'In Stock';
  };

  return (
    <AdminAuthWrapper>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
            <p className="text-muted-foreground">
              Monitor and manage product stock levels across your inventory
            </p>
          </div>

          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{products.length}</div>
                <p className="text-xs text-muted-foreground">
                  Products in inventory
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{lowStockProducts.length}</div>
                <p className="text-xs text-muted-foreground">
                  Items below threshold
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {products.filter((p: Product) => p.stockQuantity === 0).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Items unavailable
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="all-products" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all-products">All Products</TabsTrigger>
              <TabsTrigger value="low-stock">Low Stock Alerts</TabsTrigger>
            </TabsList>

            <TabsContent value="all-products" className="space-y-4">
              {/* Search and Filter */}
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products by name or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-input bg-background rounded-md"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Products Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Product Inventory</CardTitle>
                  <CardDescription>
                    Complete list of products with current stock levels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">Loading products...</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No products found
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Product</th>
                            <th className="text-left p-2">SKU</th>
                            <th className="text-left p-2">Category</th>
                            <th className="text-left p-2">Price</th>
                            <th className="text-left p-2">Stock</th>
                            <th className="text-left p-2">Status</th>
                            <th className="text-left p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentProducts.map((product: Product) => (
                            <tr key={product.id} className="border-b hover:bg-muted/50">
                              <td className="p-2">
                                <div className="flex items-center gap-3">
                                  {product.imageUrl && (
                                    <img
                                      src={product.imageUrl}
                                      alt={product.name}
                                      className="w-10 h-10 rounded object-cover"
                                    />
                                  )}
                                  <div>
                                    <div className="font-medium">{product.name}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-2 text-sm text-muted-foreground">
                                {product.sku}
                              </td>
                              <td className="p-2">
                                <Badge variant="outline">{product.category}</Badge>
                              </td>
                              <td className="p-2">₹{product.price}</td>
                              <td className="p-2">
                                {editingStock[product.id] !== undefined ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      value={editingStock[product.id]}
                                      onChange={(e) => setEditingStock({
                                        ...editingStock,
                                        [product.id]: parseInt(e.target.value) || 0
                                      })}
                                      className="w-20"
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleStockSave(product.id)}
                                      disabled={updateStockMutation.isPending}
                                    >
                                      <Save className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleStockCancel(product.id)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span>{product.stockQuantity}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleStockEdit(product.id, product.stockQuantity)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </td>
                              <td className="p-2">
                                <Badge variant={getStockBadgeVariant(product.stockQuantity)}>
                                  {getStockStatus(product.stockQuantity)}
                                </Badge>
                              </td>
                              <td className="p-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStockEdit(product.id, product.stockQuantity)}
                                  disabled={editingStock[product.id] !== undefined}
                                >
                                  Edit Stock
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(endIndex, totalProducts)} of {totalProducts} products
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        ))}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="low-stock" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Low Stock Alerts
                  </CardTitle>
                  <CardDescription>
                    Products that need immediate attention due to low stock levels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {lowStockLoading ? (
                    <div className="text-center py-8">Loading low stock products...</div>
                  ) : lowStockProducts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No low stock products found
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {lowStockProducts.map((product: Product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            {product.imageUrl && (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-12 h-12 rounded object-cover"
                              />
                            )}
                            <div>
                              <h3 className="font-medium">{product.name}</h3>
                              <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="secondary">
                              {product.stockQuantity} left
                            </Badge>
                            <Button
                              size="sm"
                              onClick={() => handleStockEdit(product.id, product.stockQuantity)}
                            >
                              Restock
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </AdminAuthWrapper>
  );
}