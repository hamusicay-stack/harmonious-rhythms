import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShopOrdersList } from "@/components/admin/ShopOrdersList";
import { AdminOrderManager } from "@/components/admin/AdminOrderManager";

export const Route = createFileRoute("/admin/commerce/orders")({
  component: () => (
    <Tabs defaultValue="shop" dir="rtl" className="space-y-4">
      <TabsList>
        <TabsTrigger value="shop">הזמנות חנות</TabsTrigger>
        <TabsTrigger value="rhythm">הזמנות קצבים (CPI)</TabsTrigger>
      </TabsList>
      <TabsContent value="shop"><ShopOrdersList /></TabsContent>
      <TabsContent value="rhythm"><AdminOrderManager /></TabsContent>
    </Tabs>
  ),
});
