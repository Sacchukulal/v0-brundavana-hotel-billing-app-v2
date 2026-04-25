"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { saveMobileCustomer, getMobileCustomers } from "@/utils/dataService"

export function WhatsappOffer() {
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [otp, setOtp] = useState("")
  const [generatedOtp, setGeneratedOtp] = useState("")
  const [isVerified, setIsVerified] = useState(false)
  const [isExistingCustomer, setIsExistingCustomer] = useState(false)

  useEffect(() => {
    const checkExistingNumber = async () => {
      if (whatsappNumber.length === 10) {
        const customers = await getMobileCustomers()
        const exists = customers.some((customer) => customer.mobileNumber === whatsappNumber)
        setIsExistingCustomer(exists)
      } else {
        setIsExistingCustomer(false)
      }
    }
    checkExistingNumber()
  }, [whatsappNumber])

  const generateOfferCode = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString()
    setGeneratedOtp(code)
    return code
  }

  const handleSendOfferCode = () => {
    if (whatsappNumber.length !== 10) {
      toast({
        title: "Invalid Number",
        description: "Please enter a valid 10-digit mobile number.",
        variant: "destructive",
      })
      return
    }

    const code = generateOfferCode()
    const message = `Welcome to Brundavana Dose Mane! 🍽✨

A special treat awaits you! 🎉 Indulge in our delicious dosas, aromatic VEG biryanis, and much more with an exclusive offer just for you!

Your OTP for availing the offer is ${code}. Please share this with our staff to claim your discount.`
    const whatsappUrl = `whatsapp://send?phone=91${whatsappNumber}&text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const verifyOtp = async () => {
    if (otp === generatedOtp) {
      setIsVerified(true)
      if (!isExistingCustomer) {
        try {
          await saveMobileCustomer(whatsappNumber)
          toast({
            title: "Success",
            description: "Mobile number verified and saved successfully!",
          })
        } catch (error) {
          console.error("Error saving mobile customer:", error)
          toast({
            title: "Error",
            description: "Failed to save mobile customer data.",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Success",
          description: "Mobile number verified successfully!",
        })
      }
    } else {
      toast({
        title: "Invalid OTP",
        description: "Please enter the correct OTP.",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="p-4 border-2">
      <CardHeader>
        <CardTitle>WhatsApp Offer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="whatsapp-number">Customer's WhatsApp Number</Label>
          <Input
            id="whatsapp-number"
            placeholder="Enter 10-digit mobile number"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
          />
          {whatsappNumber.length === 10 && (
            <p className={isExistingCustomer ? "text-yellow-600" : "text-green-600"}>
              {isExistingCustomer ? "Existing customer" : "New customer"}
            </p>
          )}
        </div>
        {generatedOtp && !isVerified && (
          <div className="space-y-2 mt-4">
            <Label htmlFor="otp">Enter OTP</Label>
            <Input
              id="otp"
              placeholder="Enter 4-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </div>
        )}
      </CardContent>
      <CardFooter>
        {!generatedOtp && <Button onClick={handleSendOfferCode}>Send OTP</Button>}
        {generatedOtp && !isVerified && <Button onClick={verifyOtp}>Verify OTP</Button>}
        {isVerified && <p className="text-green-600">Mobile number verified!</p>}
      </CardFooter>
    </Card>
  )
}
