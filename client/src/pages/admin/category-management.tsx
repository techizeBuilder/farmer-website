import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdminLayout from "@/components/admin/AdminLayout";

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parentId?: number;
  createdAt: string;
}

export default function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<{
    [key: number]: Category[];
  }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateSubcategoryDialog, setShowCreateSubcategoryDialog] =
    useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(
    new Set()
  );
  const { toast } = useToast();

  // Form states
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  const [subcategoryDescription, setSubcategoryDescription] = useState("");

  // Fetch all categories and subcategories
  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) return;

      const response = await fetch("/api/admin/categories", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const allCategories = await response.json();

        // Separate main categories and subcategories
        const mainCategories = allCategories.filter(
          (cat: Category) => !cat.parentId
        );
        const subcategoriesMap: { [key: number]: Category[] } = {};

        allCategories.forEach((cat: Category) => {
          if (cat.parentId) {
            if (!subcategoriesMap[cat.parentId]) {
              subcategoriesMap[cat.parentId] = [];
            }
            subcategoriesMap[cat.parentId].push(cat);
          }
        });

        setCategories(mainCategories);
        setSubcategories(subcategoriesMap);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create new category
  const createCategory = async () => {
    if (!categoryName.trim()) return;

    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: categoryName.trim(),
          description: categoryDescription.trim() || undefined,
        }),
      });

      if (response.ok) {
        await fetchCategories();
        setShowCreateDialog(false);
        setCategoryName("");
        setCategoryDescription("");
        toast({
          title: "Success",
          description: "Category created successfully",
        });
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create category",
        variant: "destructive",
      });
    }
  };

  // Create new subcategory
  const createSubcategory = async () => {
    if (!subcategoryName.trim() || !selectedCategory) return;

    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: subcategoryName.trim(),
          description: subcategoryDescription.trim() || undefined,
          parentId: selectedCategory.id,
        }),
      });

      if (response.ok) {
        await fetchCategories();
        setShowCreateSubcategoryDialog(false);
        setSubcategoryName("");
        setSubcategoryDescription("");
        setSelectedCategory(null);
        toast({
          title: "Success",
          description: "Subcategory created successfully",
        });
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create subcategory",
        variant: "destructive",
      });
    }
  };

  // Update category
  const updateCategory = async () => {
    if (!categoryName.trim() || !editingCategory) return;

    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(
        `/api/admin/categories/${editingCategory.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: categoryName.trim(),
            description: categoryDescription.trim() || undefined,
          }),
        }
      );

      if (response.ok) {
        await fetchCategories();
        setShowEditDialog(false);
        setCategoryName("");
        setCategoryDescription("");
        setEditingCategory(null);
        toast({
          title: "Success",
          description: `${
            editingCategory.parentId ? "Subcategory" : "Category"
          } updated successfully`,
        });
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update category",
        variant: "destructive",
      });
    }
  };

  // Delete category
  const deleteCategory = async (category: Category) => {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchCategories();
        toast({
          title: "Success",
          description: `${
            category.parentId ? "Subcategory" : "Category"
          } deleted successfully`,
        });
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  // Toggle category expansion
  const toggleCategoryExpansion = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Open edit dialog
  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || "");
    setShowEditDialog(true);
  };

  // Open create subcategory dialog
  const openCreateSubcategoryDialog = (category: Category) => {
    setSelectedCategory(category);
    setShowCreateSubcategoryDialog(true);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading categories...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container ">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-forest">
              Category Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage product categories and subcategories
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>

        {/* Categories List */}
        <div className="space-y-4">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCategoryExpansion(category.id)}
                      disabled={!subcategories[category.id]?.length}
                    >
                      {expandedCategories.has(category.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <div>
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      {category.description && (
                        <p className="text-sm text-muted-foreground">
                          {category.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Slug: {category.slug} | Created:{" "}
                        {new Date(category.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCreateSubcategoryDialog(category)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Subcategory
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteCategory(category)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Subcategories */}
                {expandedCategories.has(category.id) &&
                  subcategories[category.id] && (
                    <div className="mt-4 ml-8 space-y-2">
                      {subcategories[category.id].map((subcategory) => (
                        <Card key={subcategory.id} className="bg-muted/50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">
                                  {subcategory.name}
                                </h4>
                                {subcategory.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {subcategory.description}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  Slug: {subcategory.slug} | Created:{" "}
                                  {new Date(
                                    subcategory.createdAt
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(subcategory)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteCategory(subcategory)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create Category Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category-name">Category Name</Label>
                <Input
                  id="category-name"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Enter category name"
                />
              </div>
              <div>
                <Label htmlFor="category-description">
                  Description (Optional)
                </Label>
                <Input
                  id="category-description"
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  placeholder="Enter category description"
                />
              </div>
              <Button onClick={createCategory} disabled={!categoryName.trim()}>
                Create Category
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Category Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Edit {editingCategory?.parentId ? "Subcategory" : "Category"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-category-name">Name</Label>
                <Input
                  id="edit-category-name"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Enter category name"
                />
              </div>
              <div>
                <Label htmlFor="edit-category-description">
                  Description (Optional)
                </Label>
                <Input
                  id="edit-category-description"
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  placeholder="Enter category description"
                />
              </div>
              <Button onClick={updateCategory} disabled={!categoryName.trim()}>
                Update {editingCategory?.parentId ? "Subcategory" : "Category"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Subcategory Dialog */}
        <Dialog
          open={showCreateSubcategoryDialog}
          onOpenChange={setShowCreateSubcategoryDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Subcategory</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Adding subcategory to: {selectedCategory?.name}
              </p>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="subcategory-name">Subcategory Name</Label>
                <Input
                  id="subcategory-name"
                  value={subcategoryName}
                  onChange={(e) => setSubcategoryName(e.target.value)}
                  placeholder="Enter subcategory name"
                />
              </div>
              <div>
                <Label htmlFor="subcategory-description">
                  Description (Optional)
                </Label>
                <Input
                  id="subcategory-description"
                  value={subcategoryDescription}
                  onChange={(e) => setSubcategoryDescription(e.target.value)}
                  placeholder="Enter subcategory description"
                />
              </div>
              <Button
                onClick={createSubcategory}
                disabled={!subcategoryName.trim()}
              >
                Create Subcategory
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
