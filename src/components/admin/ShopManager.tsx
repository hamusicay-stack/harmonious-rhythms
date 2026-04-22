import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShopProductsManager } from "./ShopProductsManager";
import { ShopCategoriesManager } from "./ShopCategoriesManager";
import { ShopVendorsManager } from "./ShopVendorsManager";

export function ShopManager() {
  return (
    <div dir="rtl">
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">מוצרים</TabsTrigger>
          <TabsTrigger value="categories">קטגוריות</TabsTrigger>
          <TabsTrigger value="vendors">ספקים</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-4"><ShopProductsManager /></TabsContent>
        <TabsContent value="categories" className="mt-4"><ShopCategoriesManager /></TabsContent>
        <TabsContent value="vendors" className="mt-4"><ShopVendorsManager /></TabsContent>
      </Tabs>
    </div>
  );
}
