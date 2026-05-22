"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  getMenuItems,
  getCategories,
  saveMenuItem,
  deleteMenuItem,
  saveCategory,
  deleteCategory,
  type MenuItem,
  type Category,
} from "@/utils/dataService"
import { auth } from "@/utils/firebase"

export default function SettingsContent() {
  const { toast } = useToast()

  // State for categories and items
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  // State for add category dialog
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  // State for add menu item dialog
  const [showAddItemDialog, setShowAddItemDialog] = useState(false)
  const [itemFormData, setItemFormData] = useState({ name: "", price: "", category: "" })

  // State for edit menu item dialog
  const [showEditItemDialog, setShowEditItemDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [editItemForm, setEditItemForm] = useState({ name: "", price: "" })

  // State for category selection
  const [selectedCategory, setSelectedCategory] = useState<string>("")

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const user = auth.currentUser
      if (!user) throw new Error("User not authenticated")

      const [items, cats] = await Promise.all([getMenuItems(), getCategories()])

      setMenuItems(items)
      setCategories(cats)

      // Set first category as selected if available
      if (cats.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0].id)
      }

      // If no categories exist, create default ones
      if (cats.length === 0) {
        const defaultCategories = ["Dose", "Juice", "Tea & Coffee", "Others"]
        const newCats = await Promise.all(defaultCategories.map((cat) => saveCategory(cat)))
        const newCategoriesData = defaultCategories.map((name, index) => ({
          id: newCats[index],
          name: name,
          userId: user.uid,
        }))
        setCategories(newCategoriesData)
        if (defaultCategories.length > 0) {
          setSelectedCategory(newCats[0])
        }
      }

      setLoading(false)
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load settings data",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  // Handle add category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category name",
        variant: "destructive",
      })
      return
    }

    try {
      await saveCategory(newCategoryName)
      const updatedCategories = await getCategories()
      setCategories(updatedCategories)
      setNewCategoryName("")
      setShowAddCategoryDialog(false)

      toast({
        title: "Success",
        description: `Category "${newCategoryName}" added successfully`,
      })
    } catch (error) {
      console.error("Error adding category:", error)
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive",
      })
    }
  }

  // Handle delete category
  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCategory(categoryId)
      const updatedCategories = await getCategories()
      setCategories(updatedCategories)

      if (selectedCategory === categoryId && updatedCategories.length > 0) {
        setSelectedCategory(updatedCategories[0].id)
      }

      toast({
        title: "Success",
        description: "Category deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting category:", error)
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      })
    }
  }

  // Handle add menu item
  const handleAddMenuItem = async () => {
    if (!itemFormData.name.trim() || !itemFormData.price.trim() || !itemFormData.category) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    try {
      await saveMenuItem({
        name: itemFormData.name,
        price: Number(itemFormData.price),
        section: itemFormData.category,
        userId: auth.currentUser?.uid || "",
      })

      const updatedItems = await getMenuItems()
      setMenuItems(updatedItems)
      setItemFormData({ name: "", price: "", category: "" })
      setShowAddItemDialog(false)

      toast({
        title: "Success",
        description: `Item "${itemFormData.name}" added successfully`,
      })
    } catch (error) {
      console.error("Error adding menu item:", error)
      toast({
        title: "Error",
        description: "Failed to add menu item",
        variant: "destructive",
      })
    }
  }

  // Handle edit menu item
  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item)
    setEditItemForm({ name: item.name, price: item.price.toString() })
    setShowEditItemDialog(true)
  }

  const handleEditItemSubmit = async () => {
    if (!editingItem) return

    if (!editItemForm.name.trim() || !editItemForm.price.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    try {
      const updatedItem = {
        ...editingItem,
        name: editItemForm.name,
        price: Number(editItemForm.price),
      }

      await saveMenuItem(updatedItem)
      const updatedItems = await getMenuItems()
      setMenuItems(updatedItems)

      setShowEditItemDialog(false)
      setEditingItem(null)

      toast({
        title: "Success",
        description: "Menu item updated successfully",
      })
    } catch (error) {
      console.error("Error updating menu item:", error)
      toast({
        title: "Error",
        description: "Failed to update menu item",
        variant: "destructive",
      })
    }
  }

  // Handle delete menu item
  const handleDeleteMenuItem = async (itemId: string) => {
    try {
      await deleteMenuItem(itemId)
      const updatedItems = await getMenuItems()
      setMenuItems(updatedItems)

      toast({
        title: "Success",
        description: "Item deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting menu item:", error)
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  // Filter items by selected category
  const itemsByCategory = selectedCategory
    ? menuItems.filter(
        (item) => item.section === selectedCategory || item.section === categories.find((c) => c.id === selectedCategory)?.name
      )
    : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="text-gray-400">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Settings</h1>
        <p className="text-gray-400">Manage menu categories and items</p>
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="items">Menu Items</TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4">
            <Button
              onClick={() => setShowAddCategoryDialog(true)}
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Category
            </Button>

            <div className="grid gap-3">
              {categories.length === 0 ? (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="pt-6">
                    <p className="text-center text-gray-400">No categories found. Create one to get started!</p>
                  </CardContent>
                </Card>
              ) : (
                categories.map((category) => (
                  <Card
                    key={category.id}
                    className={`bg-slate-800 border-slate-700 cursor-pointer transition-all ${
                      selectedCategory === category.id ? "border-green-500 bg-slate-700" : "hover:bg-slate-700"
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{category.name}</h3>
                          <p className="text-sm text-gray-400">
                            {menuItems.filter((item) => item.section === category.id || item.section === category.name).length} items
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCategory(category.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* Menu Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <div className="space-y-4">
            <Button
              onClick={() => {
                setItemFormData({ name: "", price: "", category: selectedCategory })
                setShowAddItemDialog(true)
              }}
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Item
            </Button>

            {/* Category selector */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg">Select Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "outline"}
                      className={`${
                        selectedCategory === category.id ? "bg-green-500 hover:bg-green-600" : "bg-slate-700 hover:bg-slate-600"
                      }`}
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      {category.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Menu items grid */}
            {selectedCategory && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">
                  {categories.find((c) => c.id === selectedCategory)?.name} Items ({itemsByCategory.length})
                </h3>

                {itemsByCategory.length === 0 ? (
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="pt-6">
                      <p className="text-center text-gray-400">No items in this category yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {itemsByCategory.map((item) => (
                      <Card key={item.id} className="bg-gradient-to-r from-slate-800 to-slate-700 border-slate-600 hover:border-green-500 transition-colors">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">{item.name}</h4>
                              <p className="text-green-500 font-semibold text-lg">₹{item.price.toFixed(2)}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(item)}
                                className="bg-blue-600 hover:bg-blue-700 border-blue-500"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteMenuItem(item.id || "")}
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
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Category Dialog */}
      <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>Create a new menu category</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="categoryName">Category Name</Label>
              <Input
                id="categoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Appetizers, Desserts"
                className="bg-slate-700 border-slate-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCategoryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory} className="bg-green-600 hover:bg-green-700">
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Menu Item Dialog */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle>Add New Menu Item</DialogTitle>
            <DialogDescription>Add a new item to your menu</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="itemName">Item Name</Label>
              <Input
                id="itemName"
                value={itemFormData.name}
                onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                placeholder="Enter item name"
                className="bg-slate-700 border-slate-600"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="itemPrice">Price (₹)</Label>
              <Input
                id="itemPrice"
                type="number"
                value={itemFormData.price}
                onChange={(e) => setItemFormData({ ...itemFormData, price: e.target.value })}
                placeholder="Enter price"
                className="bg-slate-700 border-slate-600"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="itemCategory">Category</Label>
              <select
                id="itemCategory"
                value={itemFormData.category}
                onChange={(e) => setItemFormData({ ...itemFormData, category: e.target.value })}
                className="bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItemDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMenuItem} className="bg-green-600 hover:bg-green-700">
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Menu Item Dialog */}
      <Dialog open={showEditItemDialog} onOpenChange={setShowEditItemDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
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
                className="bg-slate-700 border-slate-600"
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
                className="bg-slate-700 border-slate-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditItemDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditItemSubmit} className="bg-green-600 hover:bg-green-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
