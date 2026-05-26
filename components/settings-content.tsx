"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import {
  getMenuItems,
  saveMenuItem,
  type MenuItem,
  deleteMenuItem,
  getCategories,
  saveCategory,
  deleteCategory,
  type Category,
} from "@/utils/dataService"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { auth } from "@/utils/firebase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Trash2, Pencil, RefreshCw } from "lucide-react"

function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => any {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export default function SettingsContent() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [newItem, setNewItem] = useState({ name: "", price: "", category: "" })
  const [newCategory, setNewCategory] = useState("")
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false)
  const [showEditItemDialog, setShowEditItemDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [editItemForm, setEditItemForm] = useState({ name: "", price: "" })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  // Fix for items not loading on first visit - use persistent auth state listener
  useEffect(() => {
    let isMounted = true
    
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!isMounted) return
      
      if (user) {
        try {
          setLoading(true)
          setError(null)

          // Load both menu items and categories in parallel
          const [items, cats] = await Promise.all([getMenuItems(), getCategories()])

          if (!isMounted) return

          setMenuItems(items)
          setCategories(cats)

          // If no categories exist yet, create default ones
          if (cats.length === 0) {
            const defaultCategories = ["Dose", "Juice", "Tea & Coffee", "Others"]
            const categoryPromises = defaultCategories.map((cat) => saveCategory(cat))
            const newCategoryIds = await Promise.all(categoryPromises)

            if (!isMounted) return

            const newCategories = defaultCategories.map((name, index) => ({
              id: newCategoryIds[index],
              name,
              userId: user.uid,
            }))

            setCategories(newCategories)
          }

          setLoading(false)
        } catch (error) {
          console.error("Error loading data:", error)
          if (isMounted) {
            setError("Failed to load data. Please try again.")
            setLoading(false)
            toast({
              title: "Error",
              description: "Failed to load data. Please ensure you are logged in.",
              variant: "destructive",
            })
          }
        }
      } else {
        if (isMounted) {
          setError("Please log in to access menu items.")
          setLoading(false)
        }
      }
    })

    // Cleanup function - unsubscribe from listener when component unmounts
    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [toast]) // Include toast in dependencies

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load both menu items and categories in parallel
      const [items, cats] = await Promise.all([getMenuItems(), getCategories()])

      setMenuItems(items)
      setCategories(cats)

      // If no categories exist yet, create default ones
      if (cats.length === 0) {
        const defaultCategories = ["Dose", "Juice", "Tea & Coffee", "Others"]
        const categoryPromises = defaultCategories.map((cat) => saveCategory(cat))
        const newCategoryIds = await Promise.all(categoryPromises)

        const newCategories = defaultCategories.map((name, index) => ({
          id: newCategoryIds[index],
          name,
          userId: auth.currentUser?.uid || "",
        }))

        setCategories(newCategories)
      }

      setLoading(false)
    } catch (error) {
      console.error("Error loading data:", error)
      setError("Failed to load data. Please try again.")
      setLoading(false)
      toast({
        title: "Error",
        description: "Failed to load data. Please ensure you are logged in.",
        variant: "destructive",
      })
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth.currentUser) {
      toast({
        title: "Error",
        description: "Please log in to add menu items.",
        variant: "destructive",
      })
      return
    }

    if (newItem.name && newItem.price && newItem.category) {
      try {
        // Create the menu item without an ID first
        const menuItemData = {
          name: newItem.name,
          price: Number(newItem.price),
          section: newItem.category, // Use category instead of section
        }

        // Save to Firebase and get the generated ID
        const newItemId = await saveMenuItem(menuItemData)

        // Create the complete menu item with the Firebase-generated ID
        const completeMenuItem: MenuItem = {
          id: newItemId,
          ...menuItemData,
          userId: auth.currentUser.uid,
        }

        // Update local state
        setMenuItems((prev) => [...prev, completeMenuItem])

        // Reset form
        setNewItem({ name: "", price: "", category: "" })

        toast({
          title: "Success",
          description: `${newItem.name} has been added to the menu.`,
        })

        // Reload menu items to ensure synchronization
        await loadData()
      } catch (error) {
        console.error("Error adding menu item:", error)
        toast({
          title: "Error",
          description: "Failed to add menu item. Please try again.",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateItem = async (id: string, field: keyof MenuItem, value: string) => {
    try {
      const updatedItems = menuItems.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === "price" ? Number(value) : value,
            }
          : item,
      )
      setMenuItems(updatedItems)

      const itemToUpdate = updatedItems.find((item) => item.id === id)
      if (itemToUpdate) {
        await saveMenuItem(itemToUpdate)
        toast({
          title: "Success",
          description: "Menu item updated successfully.",
        })
      }
    } catch (error) {
      console.error("Error updating menu item:", error)
      toast({
        title: "Error",
        description: "Failed to update menu item",
        variant: "destructive",
      })
    }
  }

  const debouncedHandleUpdateItem = useState(
    debounce((id: string, field: keyof MenuItem, value: string) => {
      handleUpdateItem(id, field, value)
    }, 500),
  )[0]

  const handleDeleteItem = async (id: string) => {
    // Prevent multiple delete clicks on the same item
    if (deletingItemId === id) return
    
    setDeletingItemId(id)
    try {
      await deleteMenuItem(id)
      setMenuItems((prev) => prev.filter((item) => item.id !== id))
      toast({
        title: "Success",
        description: "Menu item deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting menu item:", error)
      toast({
        title: "Error",
        description: "Failed to delete menu item. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeletingItemId(null)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category name.",
        variant: "destructive",
      })
      return
    }

    try {
      const categoryId = await saveCategory(newCategory)

      setCategories([
        ...categories,
        {
          id: categoryId,
          name: newCategory,
          userId: auth.currentUser?.uid || "",
        },
      ])

      setNewCategory("")
      setShowAddCategoryDialog(false)

      toast({
        title: "Success",
        description: "Category added successfully.",
      })
    } catch (error) {
      console.error("Error adding category:", error)
      toast({
        title: "Error",
        description: "Failed to add category. Please try again.",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item)
    setEditItemForm({ name: item.name, price: item.price.toString() })
    setShowEditItemDialog(true)
  }

  const handleEditItemSubmit = async () => {
    if (!editingItem) return

    const trimmedName = editItemForm.name.trim()
    const trimmedPrice = editItemForm.price.trim()

    if (!trimmedName || !trimmedPrice) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      })
      return
    }

    const priceNum = Number(trimmedPrice)
    if (isNaN(priceNum) || priceNum < 0) {
      toast({
        title: "Error",
        description: "Please enter a valid price.",
        variant: "destructive",
      })
      return
    }

    try {
      const updatedItem = {
        ...editingItem,
        name: trimmedName,
        price: priceNum,
      }

      await saveMenuItem(updatedItem)

      setMenuItems((prev) =>
        prev.map((item) => (item.id === editingItem.id ? updatedItem : item))
      )

      setShowEditItemDialog(false)
      setEditingItem(null)
      setEditItemForm({ name: "", price: "" })

      toast({
        title: "Success",
        description: "Menu item updated successfully.",
      })
    } catch (error) {
      console.error("Error updating menu item:", error)
      toast({
        title: "Error",
        description: "Failed to update menu item. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return

    try {
      await deleteCategory(categoryToDelete.id)

      // Remove the category from the list
      setCategories(categories.filter((cat) => cat.id !== categoryToDelete.id))

      // Update any items that were in this category to "Others" or the first available category
      const defaultCategory =
        categories.find((cat) => cat.name === "Others")?.id || (categories.length > 0 ? categories[0].id : "")

      if (defaultCategory) {
        const itemsToUpdate = menuItems.filter((item) => item.section === categoryToDelete.name)

        for (const item of itemsToUpdate) {
          await handleUpdateItem(item.id, "section", defaultCategory)
        }

        // Reload items to reflect changes
        const updatedItems = await getMenuItems()
        setMenuItems(updatedItems)
      }

      setCategoryToDelete(null)
      setShowDeleteCategoryDialog(false)

      toast({
        title: "Success",
        description: "Category deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting category:", error)
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRefreshMenuItems = async () => {
    try {
      setIsRefreshing(true)
      const [items, cats] = await Promise.all([getMenuItems(), getCategories()])
      setMenuItems(items)
      setCategories(cats)
      
      toast({
        title: "Success",
        description: "Menu items refreshed successfully.",
      })
    } catch (error) {
      console.error("Error refreshing menu items:", error)
      toast({
        title: "Error",
        description: "Failed to refresh menu items. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">{error}</p>
            <Button className="mt-4" onClick={loadData}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-3xl font-bold">Settings</h1>

      {/* Category Management */}
      <Card className="border-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manage Categories</CardTitle>
          <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="categoryName">Category Name</Label>
                  <Input
                    id="categoryName"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Enter category name"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddCategory}>Add Category</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setCategoryToDelete(category)
                        setShowDeleteCategoryDialog(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center">
                    No categories found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add New Item Form */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Add New Menu Item</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="itemName">Item Name</Label>
                <Input
                  id="itemName"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="itemCategory">Category</Label>
                <Select value={newItem.category} onValueChange={(value) => setNewItem({ ...newItem, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="itemPrice">Price</Label>
                <Input
                  id="itemPrice"
                  type="number"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  required
                />
              </div>
            </div>
            <Button type="submit">Add Item</Button>
          </form>
        </CardContent>
      </Card>

      {/* Menu Items List */}
      <Card className="border-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Menu Items</CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefreshMenuItems}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </CardHeader>
        <CardContent>
          {categories.map((category) => {
            // Find items for this category
            const categoryItems = menuItems.filter(
              (item) =>
                // Match by category ID or name (for backward compatibility)
                item.section === category.id || item.section === category.name,
            )

            if (categoryItems.length === 0) return null

            return (
              <div key={category.id} className="mb-6">
                <h3 className="text-lg font-semibold mb-4">{category.name}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-green-600 dark:text-green-400">₹{item.price.toFixed(2)}</TableCell>
<TableCell>
                                          <div className="flex gap-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => openEditDialog(item)}
                                            >
                                              <Pencil className="h-4 w-4 mr-1" />
                                              Edit
                                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                              disabled={deletingItemId === item.id}
                            >
                              {deletingItemId === item.id ? "Deleting..." : "Delete"}
                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )
                          })}

                          {/* Show items that don't have a matching category */}
          {menuItems.filter((item) => !categories.some((cat) => cat.id === item.section || cat.name === item.section))
            .length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Uncategorized Items</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuItems
                    .filter((item) => !categories.some((cat) => cat.id === item.section || cat.name === item.section))
                    .map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-green-600 dark:text-green-400">₹{item.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(item)}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                              disabled={deletingItemId === item.id}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              {deletingItemId === item.id ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Menu Item Dialog */}
      <Dialog open={showEditItemDialog} onOpenChange={setShowEditItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editItemName">Item Name</Label>
              <Input
                id="editItemName"
                value={editItemForm.name}
                onChange={(e) => setEditItemForm({ ...editItemForm, name: e.target.value })}
                placeholder="Enter item name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editItemPrice">Price (₹)</Label>
              <Input
                id="editItemPrice"
                type="number"
                value={editItemForm.price}
                onChange={(e) => setEditItemForm({ ...editItemForm, price: e.target.value })}
                placeholder="Enter price"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditItemDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditItemSubmit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <AlertDialog open={showDeleteCategoryDialog} onOpenChange={setShowDeleteCategoryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category "{categoryToDelete?.name}"? Items in this category will be
              moved to "Others" or another available category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
