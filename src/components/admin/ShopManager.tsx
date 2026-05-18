import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShopProductsManager } from "./ShopProductsManager";
import { ShopCategoriesManager } from "./ShopCategoriesManager";
import { ShopVendorsManager } from "./ShopVendorsManager";
import { ShopProductImporter } from "./ShopProductImporter";

export function ShopManager() {
  return (
    <div>
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">מוצרים</TabsTrigger>
          <TabsTrigger value="import">ייבוא מוצרים</TabsTrigger>
          <TabsTrigger value="categories">קטגוריות</TabsTrigger>
          <TabsTrigger value="vendors">ספקים</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-4"><ShopProductsManager /></TabsContent>
        <TabsContent value="import" className="mt-4"><ShopProductImporter /></TabsContent>
        <TabsContent value="categories" className="mt-4"><ShopCategoriesManager /></TabsContent>
        <TabsContent value="vendors" className="mt-4"><ShopVendorsManager /></TabsContent>
      </Tabs>
    </div>
  );
}
