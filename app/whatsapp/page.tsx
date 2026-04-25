import { WhatsappOffer } from "@/components/whatsapp-offer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function WhatsAppPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">WhatsApp Settings</h1>
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Manage WhatsApp Offers</CardTitle>
        </CardHeader>
        <CardContent>
          <WhatsappOffer />
        </CardContent>
      </Card>
    </div>
  )
}
